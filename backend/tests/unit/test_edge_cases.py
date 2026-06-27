import pytest
from app.services.evidence_graph import run_evidence_validation_graph
from app.services.remediation_forge import generate_remediation_payload
from app.services.behavior import calculate_risk_score
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
            state = await run_evidence_validation_graph(
                file_content=b"fake_image_content",
                file_name="evidence.png",
                map_doc=map_doc,
                telemetry={"submitted_at": "2024-01-01T12:00:00Z", "time_on_page_seconds": 120}
            )
            
            assert state["verdict"] == "QUARANTINED"
            assert state["ocr_result"].ocr_verified is False
            # Check rejection reason loosely handles comma placement for robustness
            assert "firewall" in state["rejection_reason"]
            assert "port" in state["rejection_reason"]
            assert "rule" in state["rejection_reason"]

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
