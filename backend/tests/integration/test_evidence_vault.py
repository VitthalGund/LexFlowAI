import pytest
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from app.core.config import settings
from app.services.vault import process_evidence_upload

@pytest.mark.asyncio
async def test_evidence_vault_integration(monkeypatch):
    """Verify that uploading evidence writes to DB and updates corresponding MAP status."""
    import pytesseract
    from PIL import Image
    monkeypatch.setattr(Image, "open", lambda fp: "dummy_image")
    monkeypatch.setattr(pytesseract, "image_to_string", lambda img: "enable mfa tls")
    
    # Connect to the local MongoDB database but use a test collection
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client["lexflow_test_db"]
    
    # 1. Setup mock branch and MAP target
    await db.branches.delete_many({})
    await db.maps.delete_many({})
    await db.evidence_vault.delete_many({})
    
    mock_branch = {
        "lgd_code": "3202001",
        "branch_name": "Thrissur Branch",
        "district": "Thrissur",
        "state": "Kerala",
        "state_code": "32",
        "classification": "URBAN",
        "language_code": "ml"
    }
    await db.branches.insert_one(mock_branch)
    
    mock_map = {
        "_id": "MAP-INTEGRATION-001",
        "circular_id": "CIRCULAR-INTEGRATION",
        "title": "Enable MFA",
        "description": "Test instruction details",
        "kpi": "Test KPI",
        "deadline_days": 15,
        "department": "IT",
        "evidence_type": "SCREENSHOT",
        "geographic_scope": "NATIONAL",
        "target_lgd_codes": ["3202001"],
        "status": "PENDING",
        "behavioral_risk_score": 0.0,
        "evidence_hash": None
    }
    await db.maps.insert_one(mock_map)
    
    # 2. Legitimate Upload Scenario
    uploader = {
        "id": "user123",
        "name": "Priya Nair",
        "branch_lgd_code": "3202001"
    }
    telemetry_legit = {
        "time_on_page_seconds": 120.0,
        "max_scroll_percent": 90.0,
        "word_count": 300,
        "tab_switches": 0,
        "submitted_at": datetime.now(timezone.utc).isoformat()
    }
    
    file_content = b"Mock Screenshot Data"
    
    entry = await process_evidence_upload(
        db,
        file_name="mfa_proof.png",
        file_content=file_content,
        map_id="MAP-INTEGRATION-001",
        uploader=uploader,
        telemetry=telemetry_legit
    )
    
    # Assertions on vault entry
    assert entry["vault_status"] == "ACCEPTED"
    assert entry["file_name"] == "mfa_proof.png"
    assert entry["sha256_hash"] is not None
    assert len(entry["sha256_hash"]) == 64
    
    # Assert MAP status updated to VERIFIED in DB
    updated_map = await db.maps.find_one({"_id": "MAP-INTEGRATION-001"})
    assert updated_map["status"] == "VERIFIED"
    assert updated_map["evidence_hash"] == entry["sha256_hash"]
    
    # 3. Quarantined Upload Scenario
    mock_map_2 = {
        "_id": "MAP-INTEGRATION-002",
        "circular_id": "CIRCULAR-INTEGRATION",
        "title": "Update TLS",
        "description": "Test instruction details",
        "kpi": "Test KPI",
        "deadline_days": 30,
        "department": "IT",
        "evidence_type": "LOG_FILE",
        "geographic_scope": "NATIONAL",
        "target_lgd_codes": ["3202001"],
        "status": "PENDING",
        "behavioral_risk_score": 0.0,
        "evidence_hash": None
    }
    await db.maps.insert_one(mock_map_2)
    
    telemetry_fraud = {
        "time_on_page_seconds": 2.0,    # 2 seconds (High risk)
        "max_scroll_percent": 2.0,      # No scroll (High risk)
        "word_count": 800,
        "tab_switches": 6,
        "submitted_at": datetime.now(timezone.utc).isoformat()
    }
    
    entry_quarantined = await process_evidence_upload(
        db,
        file_name="tls_proof.log",
        file_content=b"Fraud Log Details",
        map_id="MAP-INTEGRATION-002",
        uploader=uploader,
        telemetry=telemetry_fraud
    )
    
    # Assertions on quarantined entry
    assert entry_quarantined["vault_status"] == "QUARANTINED"
    assert entry_quarantined["quarantine_reason"] is not None
    
    # Assert MAP status updated to QUARANTINED in DB
    updated_map_2 = await db.maps.find_one({"_id": "MAP-INTEGRATION-002"})
    assert updated_map_2["status"] == "QUARANTINED"
    assert updated_map_2["evidence_hash"] is None
    
    # Clean up test database collections
    await db.branches.drop()
    await db.maps.drop()
    await db.evidence_vault.drop()
