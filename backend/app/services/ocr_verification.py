import io
import re
from typing import List
from app.models.ocr_models import EvidenceVerificationResult
import pytesseract
from PIL import Image

# Common stopwords to filter out
STOPWORDS = {"the", "and", "a", "an", "in", "to", "of", "for", "with", "on", "as", "is", "be", "are", "by", "this", "that", "it"}

def extract_keywords_from_map(map_doc: dict) -> List[str]:
    text_to_process = f"{map_doc.get('title', '')} {map_doc.get('kpi', '')} {map_doc.get('description', '')}"
    words = re.findall(r'\b[a-zA-Z0-9_]+\b', text_to_process.lower())
    keywords = list(set([word for word in words if word not in STOPWORDS and len(word) > 2]))
    return keywords

async def verify_evidence_content(file_content: bytes, file_name: str, map_doc: dict) -> EvidenceVerificationResult:
    if not file_content:
        return EvidenceVerificationResult(
            extracted_text="",
            required_keywords=[],
            matched_keywords=[],
            content_match_score=0.0,
            ocr_verified=False,
            rejection_reason="File is empty"
        )
        
    extracted_text = ""
    file_extension = file_name.split(".")[-1].lower() if "." in file_name else ""
    
    try:
        if file_extension == "pdf":
            import fitz # PyMuPDF
            doc = fitz.open("pdf", file_content)
            for page in doc:
                pix = page.get_pixmap(dpi=150)
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                extracted_text += pytesseract.image_to_string(img) + "\n"
        else:
            # Assume image
            img = Image.open(io.BytesIO(file_content))
            extracted_text = pytesseract.image_to_string(img)
    except Exception as e:
        return EvidenceVerificationResult(
            extracted_text="",
            required_keywords=[],
            matched_keywords=[],
            content_match_score=0.0,
            ocr_verified=False,
            rejection_reason=f"Failed to process file: {str(e)}"
        )

    required_keywords = extract_keywords_from_map(map_doc)
    extracted_text_lower = extracted_text.lower()
    
    matched_keywords = []
    for keyword in required_keywords:
        # Check if keyword exists as a substring (or we could use word boundaries)
        if re.search(r'\b' + re.escape(keyword) + r'\b', extracted_text_lower):
            matched_keywords.append(keyword)

    if len(required_keywords) == 0:
        content_match_score = 1.0 # If no keywords found in map doc (unlikely), pass
    else:
        content_match_score = len(matched_keywords) / len(required_keywords)
    
    OCR_MATCH_THRESHOLD = 0.3
    ocr_verified = content_match_score >= OCR_MATCH_THRESHOLD
    
    rejection_reason = None
    if not ocr_verified:
        rejection_reason = f"Keyword match score {content_match_score:.2f} is below threshold {OCR_MATCH_THRESHOLD}"

    return EvidenceVerificationResult(
        extracted_text=extracted_text,
        required_keywords=required_keywords,
        matched_keywords=matched_keywords,
        content_match_score=content_match_score,
        ocr_verified=ocr_verified,
        rejection_reason=rejection_reason
    )
