from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from typing import List, Optional

from app.core.database import get_db
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/api/v1/horizon", tags=["Horizon Scanning"])


@router.get("/signals", response_model=List[dict])
async def list_signals(
    status: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List all Horizon Scanning signals."""
    query = {}
    if status:
        query["status"] = status
        
    signals = await db.horizon_signals.find(query).sort("detected_at", -1).to_list(length=100)
    for s in signals:
        s["id"] = str(s["_id"])
        del s["_id"]
    return signals


@router.post("/signals/{signal_id}/start-prep", response_model=dict)
async def start_preparation(
    signal_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Mark a signal as PREP_STARTED and create an anticipatory MAP
    to initiate draft policy prep before the official RBI circular lands.
    """
    # Enforce role-based access
    if current_user.get("role") not in ("COMPLIANCE_OFFICER", "REGIONAL_HEAD"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only compliance officers can initiate regulatory preparation."
        )

    try:
        signal = await db.horizon_signals.find_one({"_id": ObjectId(signal_id)})
    except Exception:
        signal = None

    if not signal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Horizon signal {signal_id} not found"
        )

    if signal.get("status") == "PREP_STARTED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Compliance preparation has already been started for this signal."
        )

    # Calculate deadline based on estimated window or default to 90 days
    days = signal.get("estimated_action_window_days") or 90
    deadline = datetime.now(timezone.utc) + timedelta(days=days)
    
    # Create the anticipatory MAP
    map_id = f"MAP-HORIZON-{signal_id[-8:]}"
    map_doc = {
        "_id": map_id,
        "circular_id": f"HORIZON-{signal_id[-8:]}",
        "title": f"[Anticipatory] {signal['title']}",
        "description": (
            f"Preparatory actions for upcoming regulatory changes regarding {signal['theme']}.\n"
            f"Rationale: {signal['rationale']}\n"
            f"Source link: {signal.get('link')}"
        ),
        "kpi": "Draft compliance blueprint, risk analysis, and department policy gap report completed.",
        "deadline_days": days,
        "deadline": deadline,
        "department": "RISK",
        "evidence_type": "POLICY_DOC",
        "geographic_scope": "NATIONAL",
        "target_lgd_codes": [],
        "translations": {},
        "status": "PENDING",
        "behavioral_risk_score": 0.0,
        "evidence_hash": None,
        "remediation_payload": None,
        "is_anticipatory": True,
        "horizon_signal_id": signal_id
    }
    
    # Save the MAP
    await db.maps.insert_one(map_doc)
    
    # Update the signal status and link it to the created MAP
    await db.horizon_signals.update_one(
        {"_id": ObjectId(signal_id)},
        {"$set": {
            "status": "PREP_STARTED",
            "prep_map_id": map_id
        }}
    )
    
    return {"message": "Compliance preparation started.", "map_id": map_id}


@router.post("/signals/{signal_id}/dismiss", response_model=dict)
async def dismiss_signal(
    signal_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Dismiss a signal as not requiring proactive preparation."""
    if current_user.get("role") not in ("COMPLIANCE_OFFICER", "REGIONAL_HEAD"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only compliance officers can dismiss regulatory signals."
        )

    try:
        signal = await db.horizon_signals.find_one({"_id": ObjectId(signal_id)})
    except Exception:
        signal = None

    if not signal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Horizon signal {signal_id} not found"
        )

    await db.horizon_signals.update_one(
        {"_id": ObjectId(signal_id)},
        {"$set": {"status": "DISMISSED"}}
    )
    
    return {"message": "Horizon signal dismissed successfully."}
