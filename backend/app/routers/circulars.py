from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models.circular import CircularCreate, CircularResponse
from app.services.lexgraph import run_compliance_pipeline
from datetime import datetime, timezone
from bson import ObjectId
from typing import List

router = APIRouter(prefix="/api/v1/circulars", tags=["Circulars"])

@router.post("/ingest", status_code=status.HTTP_201_CREATED)
async def ingest_circular(
    payload: CircularCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_roles(["COMPLIANCE_OFFICER"]))
):
    # Check if circular number already exists
    existing = await db.circulars.find_one({"circular_number": payload.circular_number})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Circular {payload.circular_number} already exists"
        )
        
    circular_doc = {
        "circular_number": payload.circular_number,
        "title": payload.title,
        "issuing_authority": "Reserve Bank of India",
        "issued_date": payload.issued_date,
        "raw_text": payload.raw_text,
        "status": "PROCESSING",
        "maps_count": 0
    }
    
    result = await db.circulars.insert_one(circular_doc)
    circular_id = str(result.inserted_id)
    
    try:
        # Run compliance state machine pipeline
        maps_generated = await run_compliance_pipeline(db, circular_id, payload.raw_text)
        
        # Update circular status
        await db.circulars.update_one(
            {"_id": ObjectId(circular_id)},
            {"$set": {
                "status": "PROCESSED",
                "maps_count": len(maps_generated)
            }}
        )
        
        circular_doc["id"] = circular_id
        circular_doc["status"] = "PROCESSED"
        circular_doc["maps_count"] = len(maps_generated)
        
        return {
            "message": "Circular processed successfully",
            "circular_id": circular_id,
            "maps_extracted": maps_generated
        }
        
    except Exception as e:
        await db.circulars.update_one(
            {"_id": ObjectId(circular_id)},
            {"$set": {"status": "FAILED"}}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LangGraph pipeline failed: {str(e)}"
        )

@router.get("", response_model=List[dict])
async def list_circulars(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    circulars = await db.circulars.find({}).to_list(length=100)
    for c in circulars:
        c["id"] = str(c["_id"])
        del c["_id"]
    return circulars

@router.get("/{circular_id}", response_model=dict)
async def get_circular_detail(
    circular_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:
        query = {"_id": circular_id}
        circular = await db.circulars.find_one(query)
        if not circular:
            query = {"_id": ObjectId(circular_id)}
            circular = await db.circulars.find_one(query)
    except Exception:
        raise HTTPException(status_code=404, detail="Circular not found")
        
    if not circular:
        raise HTTPException(status_code=404, detail="Circular not found")
        
    circular["id"] = str(circular["_id"])
    del circular["_id"]
    return circular
