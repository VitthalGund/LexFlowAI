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
        branches = await db.branches.find({"state_code": {"$in": target_states}}).to_list(length=1000)
        return [b["lgd_code"] for b in branches]
        
    elif scope == "DISTRICT":
        if not target_states:
            return []
        # In this case, target_states contains district names or codes
        branches = await db.branches.find({"district": {"$in": target_states}}).to_list(length=1000)
        return [b["lgd_code"] for b in branches]
        
    elif scope == "BRANCH":
        if not target_states:
            return []
        # In this case, target_states contains exact LGD codes
        branches = await db.branches.find({"lgd_code": {"$in": target_states}}).to_list(length=1000)
        return [b["lgd_code"] for b in branches]
        
    return []
