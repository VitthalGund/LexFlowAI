import pytest
from app.services.remediation_forge import generate_remediation_payload
from app.models.remediation import RemediationPayload

@pytest.mark.asyncio
async def test_tls_payload_generation():
    map_dict = {
        "title": "Update TLS to v1.3",
        "department": "IT",
        "id": "MAP-123"
    }
    payload = await generate_remediation_payload(map_dict)
    assert isinstance(payload, RemediationPayload)
    assert "TLS1.3" in payload.api_payload.get("body", {}).get("min_version", "")
    assert "REVIEW REQUIRED" in payload.shell_script
    assert "Windows Server" in payload.target_system

@pytest.mark.asyncio
async def test_mfa_payload_generation():
    map_dict = {
        "title": "Enable MFA for Admin Accounts",
        "department": "IT",
        "id": "MAP-124"
    }
    payload = await generate_remediation_payload(map_dict)
    assert payload.risk_level == "HIGH"
    assert "MFA" in payload.shell_script
    assert "Azure" in payload.target_system

@pytest.mark.asyncio
async def test_review_required_header():
    map_dict = {
        "title": "Generic IT Task",
        "department": "IT",
        "id": "MAP-125"
    }
    payload = await generate_remediation_payload(map_dict)
    assert "REVIEW REQUIRED — DO NOT AUTO-EXECUTE" in payload.shell_script
    assert payload.target_system == "Unknown Generic System"
