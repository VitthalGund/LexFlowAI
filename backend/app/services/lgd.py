from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List

async def get_branches_for_scope(db: AsyncIOMotorDatabase, scope: str, target_states: List[str] = None) -> List[str]:
    """
    Returns list of lgd_codes for branches in scope.
    """
    if scope == "NATIONAL":
        branches = await db.branches.find({}).to_list(length=1000)
        return [b["lgd_code"] for b in branches]
        
    elif scope == "STATE":
        if not target_states:
            return []
        # Query where state_code is in target_states
        branches = await db.branches.find({"state_code": {"$in": target_states}}).to_list(length=1000)
        return [b["lgd_code"] for b in branches]
        
    return []
