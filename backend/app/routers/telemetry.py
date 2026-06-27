from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.telemetry import TelemetryLogCreate
from datetime import datetime, timezone

router = APIRouter(prefix="/api/v1/telemetry", tags=["Behavior Telemetry"])

@router.post("/log", status_code=status.HTTP_201_CREATED)
async def log_telemetry(
    payload: TelemetryLogCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    log_doc = payload.model_dump()
    log_doc["user_id"] = current_user.get("id")
    log_doc["logged_at"] = datetime.now(timezone.utc)
    
    result = await db.telemetry_logs.insert_one(log_doc)
    
    return {
        "status": "success",
        "telemetry_id": str(result.inserted_id)
    }

@router.get("/{map_id}", response_model=dict)
async def get_map_telemetry_history(
    map_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    logs = await db.telemetry_logs.find({"map_id": map_id}).to_list(length=100)
    for log in logs:
        log["id"] = str(log["_id"])
        del log["_id"]
        if isinstance(log["logged_at"], datetime):
            log["logged_at"] = log["logged_at"].isoformat()
        if isinstance(log["submitted_at"], datetime):
            log["submitted_at"] = log["submitted_at"].isoformat()
            
    return {"map_id": map_id, "logs": logs}
