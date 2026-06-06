from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import get_db
from app.core.dependencies import get_current_user
from typing import List, Optional

router = APIRouter(prefix="/api/v1/maps", tags=["MAP Tasks"])

@router.get("", response_model=List[dict])
async def list_maps(
    department: Optional[str] = None,
    status: Optional[str] = None,
    lgd_code: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if department:
        query["department"] = department
    if status:
        query["status"] = status
    if lgd_code:
        query["target_lgd_codes"] = lgd_code
        
    maps = await db.maps.find(query).to_list(length=500)
    for m in maps:
        m["id"] = str(m["_id"])
        del m["_id"]
    return maps

@router.get("/{map_id}", response_model=dict)
async def get_map_details(
    map_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    m = await db.maps.find_one({"_id": map_id})
    if not m:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"MAP with ID {map_id} not found"
        )
    m["id"] = str(m["_id"])
    del m["_id"]
    return m

@router.get("/branch/{lgd_code}", response_model=List[dict])
async def list_branch_maps(
    lgd_code: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # Enforce security: Branch Manager can only view their own branch maps
    if current_user.get("role") == "BRANCH_MANAGER" and current_user.get("branch_lgd_code") != lgd_code:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this branch's maps"
        )
        
    query = {"target_lgd_codes": lgd_code}
    maps = await db.maps.find(query).to_list(length=500)
    
    # Pre-select translation based on branch language
    branch = await db.branches.find_one({"lgd_code": lgd_code})
    lang = branch.get("language_code", "en") if branch else "en"
    
    formatted_maps = []
    for m in maps:
        m["id"] = str(m["_id"])
        del m["_id"]
        
        # Localize description and title if translation exists
        if lang != "en" and m.get("translations") and lang in m["translations"]:
            m["localized_description"] = m["translations"][lang]
        else:
            m["localized_description"] = m["description"]
            
        formatted_maps.append(m)
        
    return formatted_maps
