import pytest
from app.services.evidence_graph import run_evidence_validation_graph
from app.services.remediation_forge import generate_remediation_payload, compile_secure_payload
from app.services.behavior import calculate_risk_score
from app.services.ocr_verification import verify_evidence_payload
from unittest.mock import patch, MagicMock

@pytest.mark.asyncio
async def test_evidence_forgery_attack():
    # MAP requires "firewall", "port", "rule"
    map_doc = {
        "title": "Firewall Configuration",
        "description": "Ensure firewall rules block port 22",
        "kpi": "Firewall configured"
    }
    # Upload a generic bank image
    generic_text = "Welcome to XYZ Bank"
    
    with patch("app.services.ocr_verification.pytesseract.image_to_string", return_value=generic_text):
        with patch("app.services.ocr_verification.Image.open", return_value=MagicMock()):
            with patch("app.services.ocr_verification.detect_visual_tokens", return_value={"official_seal_present": False, "handwritten_signature_present": False}):
                state = await run_evidence_validation_graph(
                    file_content=b"fake_image_content",
                    file_name="evidence.png",
                    map_doc=map_doc,
                    telemetry={"submitted_at": "2024-01-01T12:00:00Z", "time_on_page_seconds": 120}
                )
                
                assert state["verdict"] == "REJECTED"
                assert state["ocr_result"].ocr_verified is False
                assert "firewall" in state["rejection_reason"].lower()

@pytest.mark.asyncio
async def test_legacy_payload_generation():
    map_doc = {
        "id": "MAP-123",
        "title": "Update Password Policy",
        "description": "Set maximum password age to 60 days from 90 days",
        "kpi": "Password rotation 60 days",
        "department": "IT"
    }
    
    payload = await generate_remediation_payload(map_doc)
    
    assert payload.status == "PENDING_IT_APPROVAL"
    assert payload.config_payload["target_system"] == "Core Banking"
    assert payload.config_payload["parameter"] == "pwd_rotation_days"
    assert payload.config_payload["old_val"] == 90
    assert payload.config_payload["new_val"] == 60

def test_ghost_click_telemetry():
    telemetry = {
        "submitted_at": "2024-01-01T12:00:00Z",
        "time_on_page_seconds": 1.2,
        "word_count": 2500, # 20 pages
        "max_scroll_percent": 100,
        "tab_switches": 0
    }
    
    score, flags = calculate_risk_score(telemetry)
    
    assert score >= 0.60
    assert any("Impossible reading speed" in flag for flag in flags)
    assert any("Extremely short view" in flag for flag in flags)

@pytest.mark.asyncio
async def test_evidence_forgery_rejection():
    """
    Validates that an upload matching keyword tokens but missing critical structural
    visual features (like handwritten signatures or seals) is explicitly failed by the engine.
    """
    mock_extracted_data = {
        "text_content": "Firewall configuration successfully updated on port 443. Admin user verified.",
        "detected_visual_tokens": {
            "official_seal_present": False,
            "handwritten_signature_present": False
        },
        "target_keywords": ["firewall", "port", "updated"]
    }
    
    # Run payload validation simulation processing
    result = await verify_evidence_payload(
        extracted_data=mock_extracted_data, 
        confidence_threshold=0.85
    )
    
    assert result.ocr_verified is False
    assert "MISSING_VISUAL_ATTESTATION" in result.rejection_codes

@pytest.mark.asyncio
async def test_air_gapped_remediation_signing():
    """
    Confirms that the configuration forge produces a deterministic, signed,
    and verified JSON runtime container block that prevents file manipulation.
    """
    mock_directives = {
        "system_target": "Finacle_Core",
        "parameter_key": "max_password_age_days",
        "target_value": 60
    }
    
    payload_container = await compile_secure_payload(directives=mock_directives)
    
    assert "payload_bytes" in payload_container
    assert "hmac_signature" in payload_container
    
    # Reconstruct verification checks to evaluate package integrity
    import os
    import hmac
    import hashlib
    secret_key = os.environ.get("BANK_SECRET_KEY", "default-hackathon-secret-key-12345").encode('utf-8')
    payload_hash = hmac.new(secret_key, payload_container["payload_bytes"].encode('utf-8'), hashlib.sha256).hexdigest()
    assert payload_container["verification_hash"] == payload_hash

