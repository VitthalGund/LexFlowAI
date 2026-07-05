"""
SentinelVision — Evidence Forensics Service
Detects tampering and recompression signals in uploaded evidence files.

Frame conservatively: this flags signals for HUMAN REVIEW.
It does NOT definitively "detect deepfakes" — it surfaces anomalies.

Per code-standards.md: constants in SCREAMING_SNAKE_CASE at module top.
"""
import io
from typing import List, Tuple
from PIL import Image, ExifTags
import numpy as np

from app.models.evidence import ForensicsVerdict

# --- Configurable thresholds (SCREAMING_SNAKE_CASE per code-standards) ---
FORENSICS_SUSPICIOUS_THRESHOLD = 0.30
FORENSICS_TAMPERED_THRESHOLD = 0.60
FORENSICS_ELA_QUALITY = 85          # JPEG re-save quality for ELA
FORENSICS_ELA_SCALE = 15.0          # Amplification scale for normalizing ELA score

# MIME types treated as image vs PDF
IMAGE_CONTENT_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/bmp"}
PDF_CONTENT_TYPES = {"application/pdf"}


def _count_pdf_revision_markers(pdf_bytes: bytes) -> int:
    """Count conservative raw PDF revision markers."""
    return max(pdf_bytes.count(b"startxref"), pdf_bytes.count(b"%%EOF"))


def compute_ela_score(image_bytes: bytes) -> Tuple[float, List[str]]:
    """
    Error Level Analysis (ELA): resave at lower JPEG quality, compare per-pixel difference.
    Returns a normalized 0-1 anomaly score and a list of human-readable signal strings.

    Calibration note: WhatsApp-forwarded images and low-quality scanner output can produce
    moderate ELA scores due to repeated JPEG recompression. Thresholds are set conservatively
    to avoid false-positives on genuine forwarded photos.
    """
    signals: List[str] = []

    try:
        original = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # Re-save at lower quality to JPEG
        buffer = io.BytesIO()
        original.save(buffer, format="JPEG", quality=FORENSICS_ELA_QUALITY)
        buffer.seek(0)
        recompressed = Image.open(buffer).convert("RGB")

        # Per-pixel absolute difference
        orig_array = np.array(original, dtype=np.float32)
        recomp_array = np.array(recompressed, dtype=np.float32)

        diff = np.abs(orig_array - recomp_array)
        mean_diff = float(np.mean(diff))

        # Normalize: typical unedited photo has mean diff ~2-8 at quality=85
        # Edited regions show significantly higher diff (~15-40+)
        normalized_score = min(mean_diff / FORENSICS_ELA_SCALE, 1.0)

        if normalized_score >= FORENSICS_TAMPERED_THRESHOLD:
            signals.append(f"High ELA anomaly score ({normalized_score:.2f}) — significant recompression artifacts detected in image regions")
        elif normalized_score >= FORENSICS_SUSPICIOUS_THRESHOLD:
            signals.append(f"Moderate ELA anomaly score ({normalized_score:.2f}) — possible recompression or minor editing artifacts")

        return normalized_score, signals

    except Exception as e:
        print(f"ELA computation error: {e}")
        return 0.0, []


def check_image_metadata(image_bytes: bytes) -> Tuple[float, List[str]]:
    """
    Check EXIF metadata for editing software signatures and anomalies.
    Returns a penalty score (0-1) and signal strings.
    """
    signals: List[str] = []
    penalty = 0.0

    try:
        img = Image.open(io.BytesIO(image_bytes))
        exif_data = img.getexif()

        if not exif_data:
            # No EXIF at all — could be stripped (common in edited images)
            signals.append("No EXIF metadata found — metadata may have been stripped")
            penalty += 0.1
            return penalty, signals

        # Check for camera metadata presence
        has_camera_make = any(
            exif_data.get(tag_id) for tag_id, tag_name in ExifTags.TAGS.items()
            if tag_name in ("Make", "Model")
        )

        # Check Software tag for editing tools
        software_tag = None
        for tag_id, tag_name in ExifTags.TAGS.items():
            if tag_name == "Software":
                software_tag = exif_data.get(tag_id)
                break

        EDITING_SOFTWARE_KEYWORDS = [
            "photoshop", "gimp", "paint.net", "lightroom", "affinity",
            "snapseed", "canva", "pixlr", "facetune", "picsart",
            "adobe", "preview", "inkscape"
        ]

        if software_tag:
            sw_lower = str(software_tag).lower()
            for kw in EDITING_SOFTWARE_KEYWORDS:
                if kw in sw_lower:
                    signals.append(f"Image edited with '{software_tag}' — editing software detected in EXIF")
                    penalty += 0.3
                    break

        if not has_camera_make and not software_tag:
            signals.append("No camera make/model in EXIF — may not be a direct camera capture")
            penalty += 0.05

    except Exception as e:
        print(f"EXIF check error: {e}")

    return min(penalty, 1.0), signals


def check_pdf_integrity(pdf_bytes: bytes) -> Tuple[float, List[str]]:
    """
    Check PDF structure for signs of post-creation editing:
    - Producer/Creator mismatch with editing tools
    - ModDate newer than CreationDate
    - Incremental updates (appended xref tables) indicating edits after original save

    Returns a penalty score (0-1) and signal strings.
    """
    signals: List[str] = []
    penalty = 0.0

    try:
        import pikepdf  # type: ignore

        pdf = pikepdf.open(io.BytesIO(pdf_bytes))

        with pdf.open_metadata():
            # Check docinfo for producer/creator
            producer = str(pdf.docinfo.get("/Producer", "")).strip()
            creator = str(pdf.docinfo.get("/Creator", "")).strip()
            creation_date = str(pdf.docinfo.get("/CreationDate", "")).strip()
            mod_date = str(pdf.docinfo.get("/ModDate", "")).strip()

        EDITING_PDF_KEYWORDS = [
            "adobe acrobat", "nitro", "foxit", "pdfescape", "ilovepdf",
            "smallpdf", "pdfcandy", "sejda", "pdf24", "pdfedit"
        ]

        producer_lower = producer.lower()
        creator_lower = creator.lower()

        for kw in EDITING_PDF_KEYWORDS:
            if kw in producer_lower or kw in creator_lower:
                signals.append(f"PDF edited with '{producer or creator}' — post-creation editing tool detected")
                penalty += 0.35
                break

        # Check date mismatch: ModDate significantly newer than CreationDate
        if creation_date and mod_date and creation_date != mod_date:
            signals.append("PDF modification date differs from creation date — document was modified after initial creation")
            penalty += 0.2

        revision_markers = _count_pdf_revision_markers(pdf_bytes)
        if revision_markers > 1:
            signals.append(f"PDF contains incremental updates ({revision_markers - 1} additional revision marker(s)) - document may have been modified after initial save")
            penalty += 0.15

        pdf.close()

    except ImportError:
        # pikepdf not available — skip PDF check
        pass
    except Exception as e:
        print(f"PDF integrity check error: {e}")

    return min(penalty, 1.0), signals


async def run_forensics_gate(file_bytes: bytes, file_name: str) -> ForensicsVerdict:
    """
    Main forensics entry point. Determines file type from name and runs
    the appropriate analysis path (image or PDF).

    Returns a ForensicsVerdict with combined tamper_score, signals, and verdict label.
    """
    signals: List[str] = []
    tamper_score = 0.0

    file_name_lower = file_name.lower()

    if any(file_name_lower.endswith(ext) for ext in (".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp")):
        # Image path
        ela_score, ela_signals = compute_ela_score(file_bytes)
        meta_penalty, meta_signals = check_image_metadata(file_bytes)

        signals.extend(ela_signals)
        signals.extend(meta_signals)

        # Weighted combination: ELA is the primary signal, metadata is secondary
        tamper_score = min((ela_score * 0.7) + (meta_penalty * 0.3), 1.0)

    elif file_name_lower.endswith(".pdf"):
        # PDF path
        pdf_penalty, pdf_signals = check_pdf_integrity(file_bytes)
        signals.extend(pdf_signals)
        tamper_score = pdf_penalty

    else:
        # Unknown type — pass through as CLEAN
        signals.append(f"File type not analyzed for forensic integrity ({file_name})")

    # Determine verdict from thresholds
    if tamper_score >= FORENSICS_TAMPERED_THRESHOLD:
        verdict = "LIKELY_TAMPERED"
    elif tamper_score >= FORENSICS_SUSPICIOUS_THRESHOLD:
        verdict = "SUSPICIOUS"
    else:
        verdict = "CLEAN"

    return ForensicsVerdict(
        tamper_score=round(tamper_score, 4),
        signals=signals,
        verdict=verdict
    )
