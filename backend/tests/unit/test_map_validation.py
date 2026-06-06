import pytest
from app.services.lexgraph import validation_node, should_loop_or_proceed, ComplianceState

@pytest.mark.asyncio
async def test_map_validation_node_success():
    """Verify validation node accepts correctly formed MAP objects."""
    state: ComplianceState = {
        "circular_id": "123",
        "circular_text": "Sample circular text",
        "raw_maps": [
            {
                "title": "Enable MFA",
                "description": "Multi-factor authentication must be enabled",
                "kpi": "Zero admins without MFA",
                "deadline_days": 15,
                "department": "IT",
                "evidence_type": "SCREENSHOT",
                "geographic_scope": "NATIONAL"
            }
        ],
        "validated_maps": [],
        "validation_errors": [],
        "iteration_count": 0,
        "status": "extracting"
    }
    
    new_state = await validation_node(state)
    
    assert len(new_state["validated_maps"]) == 1
    assert len(new_state["validation_errors"]) == 0
    assert new_state["status"] == "validated"
    
    # Check conditional routing
    action = should_loop_or_proceed(new_state)
    assert action == "route"

@pytest.mark.asyncio
async def test_map_validation_node_failure_triggers_loop():
    """Verify that validation errors are logged and trigger a loop iteration."""
    # Raw map missing required field 'kpi' and having invalid enum values
    state: ComplianceState = {
        "circular_id": "123",
        "circular_text": "Sample circular text",
        "raw_maps": [
            {
                "title": "Enable MFA",
                "description": "Multi-factor authentication must be enabled",
                "deadline_days": 15,
                "department": "INVALID_DEPT",  # Invalid enum value
                "evidence_type": "SCREENSHOT",
                "geographic_scope": "NATIONAL"
            }
        ],
        "validated_maps": [],
        "validation_errors": [],
        "iteration_count": 0,
        "status": "extracting"
    }
    
    new_state = await validation_node(state)
    
    assert len(new_state["validated_maps"]) == 0
    assert len(new_state["validation_errors"]) == 1
    
    # Check conditional routing (iteration_count < 3 and has errors -> extract again)
    action = should_loop_or_proceed(new_state)
    assert action == "extract"

def test_map_validation_max_iterations():
    """Verify that after 3 iterations the graph forces route even with errors."""
    state: ComplianceState = {
        "circular_id": "123",
        "circular_text": "Sample circular text",
        "raw_maps": [],
        "validated_maps": [],
        "validation_errors": ["Error 1"],
        "iteration_count": 3,  # Max iterations reached
        "status": "validated"
    }
    
    action = should_loop_or_proceed(state)
    assert action == "route"
