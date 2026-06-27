import pytest
from app.services.vault import process_evidence_upload
from datetime import datetime, timezone
import json

@pytest.mark.asyncio
async def test_ocr_vault_integration_pass(monkeypatch):
    import pytesseract
    monkeypatch.setattr(pytesseract, "image_to_string", lambda img: "TLS 1.3 endpoints verified")
    
    # Mock DB
    class MockDB:
        class MapsCollection:
            async def find_one(self, query):
                return {"_id": "MAP-123", "circular_id": "C-1", "title": "TLS Update", "kpi": "Zero TLS endpoints"}
            async def update_one(self, query, update):
                pass
        class VaultCollection:
            async def insert_one(self, doc):
                class MockResult:
                    inserted_id = "test_id"
                return MockResult()
                
        def __init__(self):
            self.maps = self.MapsCollection()
            self.evidence_vault = self.VaultCollection()
            
    db = MockDB()
    telemetry = {"time_on_page_seconds": 60, "max_scroll_percent": 100, "word_count": 100, "submitted_at": datetime.now(timezone.utc).isoformat()}
    
    result = await process_evidence_upload(
        db,
        "test.png",
        b"fakeimage",
        "MAP-123",
        {"id": "U1", "name": "Test User"},
        telemetry
    )
    
    assert result["vault_status"] == "ACCEPTED"
    assert result["ocr_verification"]["ocr_verified"] is True
    assert result["quarantine_reason"] is None

@pytest.mark.asyncio
async def test_ocr_vault_integration_ocr_fail(monkeypatch):
    import pytesseract
    monkeypatch.setattr(pytesseract, "image_to_string", lambda img: "Random picture of a cat")
    
    class MockDB:
        class MapsCollection:
            async def find_one(self, query):
                return {"_id": "MAP-123", "circular_id": "C-1", "title": "TLS Update", "kpi": "Zero TLS endpoints"}
            async def update_one(self, query, update):
                pass
        class VaultCollection:
            async def insert_one(self, doc):
                class MockResult:
                    inserted_id = "test_id"
                return MockResult()
                
        def __init__(self):
            self.maps = self.MapsCollection()
            self.evidence_vault = self.VaultCollection()
            
    db = MockDB()
    telemetry = {"time_on_page_seconds": 60, "max_scroll_percent": 100, "word_count": 100, "submitted_at": datetime.now(timezone.utc).isoformat()}
    
    result = await process_evidence_upload(
        db,
        "test.png",
        b"fakeimage",
        "MAP-123",
        {"id": "U1", "name": "Test User"},
        telemetry
    )
    
    assert result["vault_status"] == "QUARANTINED"
    assert result["ocr_verification"]["ocr_verified"] is False
    assert "OCR verification failed" in result["quarantine_reason"]

@pytest.mark.asyncio
async def test_ocr_vault_integration_behavioral_fail(monkeypatch):
    import pytesseract
    monkeypatch.setattr(pytesseract, "image_to_string", lambda img: "TLS 1.3 endpoints verified")
    
    class MockDB:
        class MapsCollection:
            async def find_one(self, query):
                return {"_id": "MAP-123", "circular_id": "C-1", "title": "TLS Update", "kpi": "Zero TLS endpoints"}
            async def update_one(self, query, update):
                pass
        class VaultCollection:
            async def insert_one(self, doc):
                class MockResult:
                    inserted_id = "test_id"
                return MockResult()
                
        def __init__(self):
            self.maps = self.MapsCollection()
            self.evidence_vault = self.VaultCollection()
            
    db = MockDB()
    # 2 seconds on page, 0% scroll -> High risk
    telemetry = {"time_on_page_seconds": 2, "max_scroll_percent": 0, "word_count": 5000, "submitted_at": datetime.now(timezone.utc).isoformat()}
    
    result = await process_evidence_upload(
        db,
        "test.png",
        b"fakeimage",
        "MAP-123",
        {"id": "U1", "name": "Test User"},
        telemetry
    )
    
    # OCR should pass, but behavioral should fail
    assert result["ocr_verification"]["ocr_verified"] is True
    assert result["vault_status"] == "QUARANTINED"
    assert "High behavioral risk detected" in result["quarantine_reason"]
