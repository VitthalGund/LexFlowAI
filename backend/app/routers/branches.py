from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import get_db
from app.core.dependencies import get_current_user
from typing import List

router = APIRouter(prefix="/api/v1/branches", tags=["LGD Branches"])

@router.get("", response_model=List[dict])
async def list_branches(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    branches = await db.branches.find({}).to_list(length=1000)
    for b in branches:
        b["id"] = str(b["_id"])
        del b["_id"]
    return branches

@router.get("/{lgd_code}", response_model=dict)
async def get_branch_by_lgd(
    lgd_code: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    branch = await db.branches.find_one({"lgd_code": lgd_code})
    if not branch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Branch with LGD code {lgd_code} not found"
        )
    branch["id"] = str(branch["_id"])
    del branch["_id"]
    return branch
