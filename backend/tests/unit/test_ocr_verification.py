import pytest
from app.services.ocr_verification import extract_keywords_from_map, verify_evidence_content
from app.models.ocr_models import EvidenceVerificationResult

def test_keyword_extraction_from_map():
    map_doc = {
        "title": "Update TLS to v1.3",
        "kpi": "Zero TLS 1.0 endpoints remaining",
        "description": "Ensure compliance with network security policies."
    }
    keywords = extract_keywords_from_map(map_doc)
    # the, and, a, to, with are stopwords
    assert "tls" in keywords
    assert "endpoints" in keywords
    assert "compliance" in keywords
    assert "network" in keywords
    assert "security" in keywords

@pytest.mark.asyncio
async def test_matching_evidence_passes(monkeypatch):
    # Mock OCR extraction
    async def mock_extract(*args, **kwargs):
        pass
    
    # We will just patch pytesseract to return a known string
    import pytesseract
    monkeypatch.setattr(pytesseract, "image_to_string", lambda img: "We have updated all endpoints to TLS 1.3 and removed TLS 1.0.")
    
    # Dummy file content
    dummy_image = b"fakeimage"
    map_doc = {
        "title": "TLS Update",
        "kpi": "Zero TLS endpoints"
    }
    
    result = await verify_evidence_content(dummy_image, "evidence.png", map_doc)
    assert result.ocr_verified is True
    assert result.content_match_score > 0.0

@pytest.mark.asyncio
async def test_irrelevant_evidence_fails(monkeypatch):
    import pytesseract
    monkeypatch.setattr(pytesseract, "image_to_string", lambda img: "This is a picture of a cat. Meow.")
    
    dummy_image = b"fakeimage"
    map_doc = {
        "title": "TLS Update",
        "kpi": "Zero TLS endpoints"
    }
    
    result = await verify_evidence_content(dummy_image, "evidence.png", map_doc)
    assert result.ocr_verified is False
    assert result.content_match_score == 0.0

@pytest.mark.asyncio
async def test_empty_file_fails():
    map_doc = {"title": "Test"}
    result = await verify_evidence_content(b"", "empty.png", map_doc)
    assert result.ocr_verified is False
    assert result.rejection_reason == "File is empty"
