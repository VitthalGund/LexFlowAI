from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from bson import ObjectId

router = APIRouter(prefix="/api/v1/risk-review", tags=["Risk Review"])

@router.post("/{entry_id}/override")
async def override_quarantine(
    entry_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_roles(["COMPLIANCE_OFFICER"]))
):
    """Override a quarantine and mark the evidence as ACCEPTED/VERIFIED"""
    try:
        query = {"_id": entry_id}
        entry = await db.evidence_vault.find_one(query)
        if not entry:
            query = {"_id": ObjectId(entry_id)}
            entry = await db.evidence_vault.find_one(query)
    except Exception:
        raise HTTPException(status_code=404, detail="Evidence entry not found")
        
    if not entry:
        raise HTTPException(status_code=404, detail="Evidence entry not found")
        
    if entry.get("vault_status") != "QUARANTINED":
        raise HTTPException(status_code=400, detail="Only quarantined entries can be overridden")

    # Update Vault Entry
    await db.evidence_vault.update_one(
        query,
        {"$set": {
            "vault_status": "ACCEPTED", 
            "override_by": current_user.get("id"),
            "override_reason": "Manual override by compliance officer"
        }}
    )
    
    # Update MAP Status
    map_id = entry.get("map_id")
    await db.maps.update_one(
        {"_id": map_id},
        {"$set": {"status": "VERIFIED", "evidence_hash": entry.get("sha256_hash")}}
    )
    
    return {"message": "Evidence quarantine overridden successfully"}

@router.post("/{entry_id}/escalate")
async def escalate_quarantine(
    entry_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_roles(["COMPLIANCE_OFFICER"]))
):
    """Escalate a quarantined submission for further investigation"""
    try:
        query = {"_id": entry_id}
        entry = await db.evidence_vault.find_one(query)
        if not entry:
            query = {"_id": ObjectId(entry_id)}
            entry = await db.evidence_vault.find_one(query)
    except Exception:
        raise HTTPException(status_code=404, detail="Evidence entry not found")
        
    if not entry:
        raise HTTPException(status_code=404, detail="Evidence entry not found")
        
    await db.evidence_vault.update_one(
        query,
        {"$set": {
            "escalated": True,
            "escalated_by": current_user.get("id")
        }}
    )
    
    return {"message": "Evidence escalated for investigation"}
    
@router.post("/{entry_id}/reject")
async def reject_quarantine(
    entry_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_roles(["COMPLIANCE_OFFICER"]))
):
    """Permanently reject a quarantined submission"""
    try:
        query = {"_id": entry_id}
        entry = await db.evidence_vault.find_one(query)
        if not entry:
            query = {"_id": ObjectId(entry_id)}
            entry = await db.evidence_vault.find_one(query)
    except Exception:
        raise HTTPException(status_code=404, detail="Evidence entry not found")
        
    if not entry:
        raise HTTPException(status_code=404, detail="Evidence entry not found")
        
    await db.evidence_vault.update_one(
        query,
        {"$set": {
            "vault_status": "REJECTED",
            "rejected_by": current_user.get("id")
        }}
    )
    
    map_id = entry.get("map_id")
    await db.maps.update_one(
        {"_id": map_id},
        {"$set": {"status": "IN_PROGRESS"}} # Re-open the MAP for the branch
    )
    
    return {"message": "Evidence permanently rejected"}
