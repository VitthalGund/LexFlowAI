from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import get_db
from app.core.dependencies import get_current_user
from datetime import datetime

router = APIRouter(prefix="/api/v1/dashboard", tags=["Dashboard Widgets"])

@router.get("/overview", response_model=dict)
async def get_overview_stats(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # Overall active circulars
    circulars_count = await db.circulars.count_documents({})
    
    # Overall MAPs definitions count
    maps_list = await db.maps.find({}).to_list(length=1000)
    
    # Calculate overall compliance percentage
    # Total assignments = Sum(target_lgd_codes count for all MAPs)
    total_assignments = 0
    for m in maps_list:
        total_assignments += len(m.get("target_lgd_codes", []))
        
    # Total completed (ACCEPTED in vault)
    completed_assignments = await db.evidence_vault.count_documents({"vault_status": "ACCEPTED"})
    
    compliance_rate = 0.0
    if total_assignments > 0:
        compliance_rate = round((completed_assignments / total_assignments) * 100, 1)
    else:
        # Fallback if no assignments yet
        compliance_rate = 0.0
        
    # Pending MAPs count
    pending_maps_count = total_assignments - completed_assignments
    
    # Quarantined submissions count
    quarantine_count = await db.evidence_vault.count_documents({"vault_status": "QUARANTINED"})
    
    # Recent risk alerts (Quarantined entries)
    quarantined_entries = await db.evidence_vault.find({"vault_status": "QUARANTINED"}).sort("uploaded_at", -1).to_list(length=5)
    for q in quarantined_entries:
        q["id"] = str(q["_id"])
        del q["_id"]
        if isinstance(q["uploaded_at"], datetime):
            q["uploaded_at"] = q["uploaded_at"].isoformat()
            
    return {
        "compliance_rate": compliance_rate,
        "active_circulars": circulars_count,
        "pending_tasks": max(0, pending_maps_count),
        "quarantined_alerts": quarantine_count,
        "recent_alerts": quarantined_entries
    }

@router.get("/heatmap", response_model=dict)
async def get_state_heatmap(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # Computes compliance rates by state
    # We retrieve branches, map assignments, and completed tasks
    branches = await db.branches.find({}).to_list(length=1000)
    branch_map = {b["lgd_code"]: b for b in branches}
    
    maps = await db.maps.find({}).to_list(length=500)
    
    # State-level stats
    # state_code -> {"total": int, "completed": int}
    state_stats = {}
    
    # Pre-populate KA and TN for robust visualization
    state_stats["29"] = {"state_name": "Karnataka", "total": 0, "completed": 0}
    state_stats["33"] = {"state_name": "Tamil Nadu", "total": 0, "completed": 0}
    state_stats["32"] = {"state_name": "Kerala", "total": 0, "completed": 0}
    state_stats["27"] = {"state_name": "Maharashtra", "total": 0, "completed": 0}
    
    for m in maps:
        for lgd in m.get("target_lgd_codes", []):
            b = branch_map.get(lgd)
            if b:
                state_code = b.get("state_code")
                state_name = b.get("state")
                if state_code not in state_stats:
                    state_stats[state_code] = {"state_name": state_name, "total": 0, "completed": 0}
                state_stats[state_code]["total"] += 1
                
    # Count completed by branch state
    accepted_vault = await db.evidence_vault.find({"vault_status": "ACCEPTED"}).to_list(length=1000)
    for v in accepted_vault:
        lgd = v.get("branch_lgd_code")
        b = branch_map.get(lgd)
        if b:
            state_code = b.get("state_code")
            if state_code in state_stats:
                state_stats[state_code]["completed"] += 1
                
    # Calculate percentage
    result = {}
    for code, stats in state_stats.items():
        total = stats["total"]
        completed = stats["completed"]
        
        # Real baseline calculation - no more mock data
        if total == 0:
            percentage = 0.0
        else:
            percentage = round((completed / total) * 100, 1)
            
        result[code] = {
            "state_name": stats["state_name"],
            "compliance_rate": percentage,
            "total_assigned": total,
            "total_completed": completed
        }
        
    return result
