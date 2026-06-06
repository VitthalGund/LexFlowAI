from unittest.mock import AsyncMock, MagicMock
import pytest
from app.services.lgd import get_branches_for_scope

@pytest.mark.asyncio
async def test_lgd_routing_national():
    """Verify that NATIONAL scope maps to all branch outlets."""
    db_mock = MagicMock()
    find_mock = MagicMock()
    
    # Mock motor's async to_list function
    find_mock.to_list = AsyncMock(return_value=[
        {"lgd_code": "2902001", "branch_name": "MG Road", "state_code": "29"},
        {"lgd_code": "3302001", "branch_name": "Anna Salai", "state_code": "33"},
        {"lgd_code": "3202001", "branch_name": "Thrissur", "state_code": "32"}
    ])
    db_mock.branches.find = MagicMock(return_value=find_mock)
    
    lgd_codes = await get_branches_for_scope(db_mock, "NATIONAL")
    
    assert len(lgd_codes) == 3
    assert "2902001" in lgd_codes
    assert "3302001" in lgd_codes
    assert "3202001" in lgd_codes
    db_mock.branches.find.assert_called_with({})

@pytest.mark.asyncio
async def test_lgd_routing_state():
    """Verify that STATE scope maps only to target state branches."""
    db_mock = MagicMock()
    find_mock = MagicMock()
    
    find_mock.to_list = AsyncMock(return_value=[
        {"lgd_code": "2902001", "branch_name": "MG Road", "state_code": "29"},
        {"lgd_code": "2902002", "branch_name": "Mysuru", "state_code": "29"}
    ])
    db_mock.branches.find = MagicMock(return_value=find_mock)
    
    # Target Karnataka ("29")
    lgd_codes = await get_branches_for_scope(db_mock, "STATE", target_states=["29"])
    
    assert len(lgd_codes) == 2
    assert "2902001" in lgd_codes
    assert "2902002" in lgd_codes
    db_mock.branches.find.assert_called_with({"state_code": {"$in": ["29"]}})

@pytest.mark.asyncio
async def test_lgd_routing_invalid_scope():
    """Verify that unsupported scopes or empty lists emit zero branches."""
    db_mock = MagicMock()
    
    lgd_codes_empty = await get_branches_for_scope(db_mock, "STATE", target_states=[])
    assert lgd_codes_empty == []
    
    lgd_codes_invalid = await get_branches_for_scope(db_mock, "DISTRICT")
    assert lgd_codes_invalid == []
