from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import get_db
from app.core.dependencies import get_current_user
from bson import ObjectId
from app.services.remediation_forge import compile_secure_payload

router = APIRouter(prefix="/api/v1/remediation", tags=["IT Remediation"])

@router.get("/{map_id}")
async def get_remediation_payload(
    map_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:
        map_doc = await db.maps.find_one({"_id": map_id})
        if not map_doc:
            map_doc = await db.maps.find_one({"_id": ObjectId(map_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="MAP not found")
        
    if not map_doc:
        raise HTTPException(status_code=404, detail="MAP not found")
        
    if map_doc.get("department") != "IT":
        raise HTTPException(status_code=400, detail="Remediation payloads only available for IT department MAPs")
        
    payload = map_doc.get("remediation_payload")
    if not payload:
        raise HTTPException(status_code=404, detail="No remediation payload generated for this MAP")
        
    return payload

from app.core.dependencies import get_current_user, require_roles

@router.post("/{map_id}/approve")
async def approve_remediation_payload(
    map_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_roles(["IT_ENGINEER"]))
):
    # Verified user has IT_ENGINEER role
    try:
        map_doc = await db.maps.find_one({"_id": map_id})
        query = {"_id": map_id}
        if not map_doc:
            map_doc = await db.maps.find_one({"_id": ObjectId(map_id)})
            query = {"_id": ObjectId(map_id)}
    except Exception:
        raise HTTPException(status_code=404, detail="MAP not found")
        
    if not map_doc:
        raise HTTPException(status_code=404, detail="MAP not found")
        
    # Mark as approved (could add an approved_by field)
    await db.maps.update_one(
        query,
        {"$set": {"remediation_approved": True, "remediation_approved_by": current_user.get("id")}}
    )
    
    return {"message": "Remediation payload approved"}

@router.get("/{map_id}/export")
async def export_secure_remediation_payload(
    map_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:
        map_doc = await db.maps.find_one({"_id": map_id})
        if not map_doc:
            map_doc = await db.maps.find_one({"_id": ObjectId(map_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="MAP not found")
        
    if not map_doc:
        raise HTTPException(status_code=404, detail="MAP not found")
        
    payload = map_doc.get("remediation_payload")
    if not payload:
        raise HTTPException(status_code=404, detail="No remediation payload generated for this MAP")
    
    # Extract config_payload as directives
    directives = payload.get("config_payload", {})
    if not directives:
        raise HTTPException(status_code=400, detail="Payload missing configuration directives")
        
    secure_package = await compile_secure_payload(directives)
    
    return secure_package

