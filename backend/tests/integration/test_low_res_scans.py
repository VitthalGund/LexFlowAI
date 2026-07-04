import pytest
from app.services.ocr_verification import verify_evidence_content

@pytest.mark.asyncio
async def test_low_res_scan_rejection():
    # Provide a minimal valid image bytes (1x1 PNG) to simulate a completely illegible/low-res scan
    img_bytes = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
    
    map_doc = {
        "title": "Branch Security Update",
        "kpi": "Install CCTV",
        "description": "Ensure branch manager has signed."
    }
    
    result = await verify_evidence_content(img_bytes, "scan.png", map_doc)
    
    # It should not be verified since the image has no legible text or signatures
    assert result.ocr_verified is False
    assert result.rejection_reason is not None
    assert "File is empty" in result.rejection_reason or "Validation Failed" in result.rejection_reason
