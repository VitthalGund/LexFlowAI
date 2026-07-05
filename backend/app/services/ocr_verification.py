import io
import re
import difflib
from typing import List, Dict, Any
from app.models.ocr_models import EvidenceVerificationResult
import pytesseract
from PIL import Image
import cv2
import numpy as np

# Common stopwords to filter out
STOPWORDS = {"the", "and", "a", "an", "in", "to", "of", "for", "with", "on", "as", "is", "be", "are", "by", "this", "that", "it"}

MULTI_MODAL_DICTIONARY = ["manager", "signed", "seal", "approved", "signature", "authorized"]


def extract_keywords_from_map(map_doc: dict) -> List[str]:
    text_to_process = f"{map_doc.get('title', '')} {map_doc.get('kpi', '')} {map_doc.get('description', '')}"
    words = re.findall(r'\b[a-zA-Z0-9_]+\b', text_to_process.lower())
    keywords = list(set([word for word in words if word not in STOPWORDS and len(word) > 2]))
    return keywords

def detect_visual_tokens(image_bytes: bytes) -> Dict[str, bool]:
    """
    Lightweight heuristic check using OpenCV to detect non-text ink blobs 
    (representing stamps and signatures).
    """
    try:
        # Convert bytes to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
        
        if img is None:
            return {"official_seal_present": False, "handwritten_signature_present": False}

        # Apply threshold to isolate dark ink
        _, thresh = cv2.threshold(img, 150, 255, cv2.THRESH_BINARY_INV)
        
        # Find contours
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        official_seal_present = False
        handwritten_signature_present = False
        
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            area = cv2.contourArea(contour)
            
            # Heuristic for a stamp/seal: relatively large, often roughly square or circular
            if area > 2000 and 0.5 < w/h < 2.0 and h > 50 and w > 50:
                official_seal_present = True
                
            # Heuristic for a signature: wider than tall, reasonably large area but not blocky
            if area > 500 and w > h * 1.5 and w > 40:
                handwritten_signature_present = True
                
        return {
            "official_seal_present": official_seal_present,
            "handwritten_signature_present": handwritten_signature_present
        }
    except Exception:
        return {"official_seal_present": False, "handwritten_signature_present": False}


async def extract_evidence_data(file_content: bytes, file_name: str, map_doc: dict) -> Dict[str, Any]:
    extracted_text = ""
    file_extension = file_name.split(".")[-1].lower() if "." in file_name else ""
    visual_tokens = {"official_seal_present": False, "handwritten_signature_present": False}
    
    try:
        if file_extension == "pdf":
            import fitz # PyMuPDF
            doc = fitz.open("pdf", file_content)
            for page in doc:
                pix = page.get_pixmap(dpi=150)
                img_bytes = pix.tobytes("png")
                img = Image.open(io.BytesIO(img_bytes))
                extracted_text += pytesseract.image_to_string(img) + "\n"
                
                # Check for visual tokens on each page
                page_tokens = detect_visual_tokens(img_bytes)
                if page_tokens["official_seal_present"]:
                    visual_tokens["official_seal_present"] = True
                if page_tokens["handwritten_signature_present"]:
                    visual_tokens["handwritten_signature_present"] = True
        else:
            # Assume image
            img = Image.open(io.BytesIO(file_content))
            extracted_text = pytesseract.image_to_string(img)
            visual_tokens = detect_visual_tokens(file_content)
    except Exception:
        pass # Will handle empty/failure down the line
        
    required_keywords = extract_keywords_from_map(map_doc)
    
    # Fuzzy match for mandatory dictionary terms
    text_lower = extracted_text.lower()
    words = re.findall(r'\b[a-z]+\b', text_lower)
    detected_dict_terms = set()
    for term in MULTI_MODAL_DICTIONARY:
        if term in text_lower:
            detected_dict_terms.add(term)
        else:
            matches = difflib.get_close_matches(term, words, n=1, cutoff=0.8)
            if matches:
                detected_dict_terms.add(term)
    
    return {
        "text_content": extracted_text,
        "detected_visual_tokens": visual_tokens,
        "target_keywords": required_keywords,
        "detected_dict_terms": list(detected_dict_terms)
    }

async def verify_evidence_payload(extracted_data: dict, confidence_threshold: float = 0.3) -> EvidenceVerificationResult:
    extracted_text = extracted_data.get("text_content", "")
    visual_tokens = extracted_data.get("detected_visual_tokens", {"official_seal_present": False, "handwritten_signature_present": False})
    required_keywords = extracted_data.get("target_keywords", [])
    detected_dict_terms = extracted_data.get("detected_dict_terms", [])
    
    if not extracted_text:
        return EvidenceVerificationResult(
            extracted_text="",
            required_keywords=required_keywords,
            matched_keywords=[],
            content_match_score=0.0,
            ocr_verified=False,
            rejection_reason="File is empty or processing failed",
            detected_visual_tokens=visual_tokens,
            rejection_codes=["EMPTY_FILE"]
        )

    extracted_text_lower = extracted_text.lower()
    matched_keywords = []
    for keyword in required_keywords:
        if re.search(r'\b' + re.escape(keyword) + r'\b', extracted_text_lower):
            matched_keywords.append(keyword)

    if len(required_keywords) == 0:
        content_match_score = 1.0
    else:
        content_match_score = len(matched_keywords) / len(required_keywords)
        
    # Adjust confidence score based on multi-modal dictionary
    if detected_dict_terms:
        # Boost score slightly if standard compliance terms are found
        content_match_score = min(1.0, content_match_score + (len(detected_dict_terms) * 0.1))
    
    text_verified = content_match_score >= confidence_threshold
    visual_verified = visual_tokens.get("official_seal_present", False) or visual_tokens.get("handwritten_signature_present", False)
    
    is_compliant = text_verified and visual_verified
    
    rejection_codes = []
    rejection_reason = None
    
    if not text_verified:
        rejection_codes.append("INSUFFICIENT_KEYWORD_MATCH")
    
    if not visual_verified:
        rejection_codes.append("MISSING_VISUAL_ATTESTATION")
        
    if not is_compliant:
        rejection_reason = "Validation Failed: "
        if "MISSING_VISUAL_ATTESTATION" in rejection_codes:
            rejection_reason += "Missing Branch Manager Signature or Bank Seal. Please re-sign and upload. "
        if "INSUFFICIENT_KEYWORD_MATCH" in rejection_codes:
            missing = [kw for kw in required_keywords if kw not in matched_keywords]
            rejection_reason += f"The uploaded evidence does not contain required keywords: {', '.join(missing)}. "

    return EvidenceVerificationResult(
        extracted_text=extracted_text,
        required_keywords=required_keywords,
        matched_keywords=matched_keywords,
        content_match_score=content_match_score,
        ocr_verified=is_compliant,
        rejection_reason=rejection_reason.strip() if rejection_reason else None,
        detected_visual_tokens=visual_tokens,
        rejection_codes=rejection_codes
    )

async def verify_evidence_content(file_content: bytes, file_name: str, map_doc: dict) -> EvidenceVerificationResult:
    """Legacy wrapper for backward compatibility during refactor"""
    extracted_data = await extract_evidence_data(file_content, file_name, map_doc)
    return await verify_evidence_payload(extracted_data, confidence_threshold=0.3)

