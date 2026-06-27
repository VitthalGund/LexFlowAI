from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.services.vault import process_evidence_upload, verify_evidence_hash
import json
from typing import List
from datetime import datetime

router = APIRouter(prefix="/api/v1/evidence", tags=["Evidence Vault"])

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_evidence(
    map_id: str = Form(...),
    file: UploadFile = File(...),
    telemetry: str = Form(...), # Expect JSON stringified telemetry snapshot
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:
        telemetry_dict = json.loads(telemetry)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid telemetry format. Must be JSON string"
        )
        
    content = await file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty file uploaded"
        )
        
    # Process upload
    entry = await process_evidence_upload(
        db,
        file_name=file.filename,
        file_content=content,
        map_id=map_id,
        uploader=current_user,
        telemetry=telemetry_dict
    )
    
    return {
        "message": "Evidence uploaded successfully",
        "vault_entry": entry
    }

@router.get("/verify/{sha256_hash}")
async def verify_hash(
    sha256_hash: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    result = await verify_evidence_hash(db, sha256_hash)
    return result

@router.get("/ledger", response_model=List[dict])
async def get_ledger(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # Retrieve append-only ledger entries
    entries = await db.evidence_vault.find({}).to_list(length=1000)
    for e in entries:
        e["id"] = str(e["_id"])
        del e["_id"]
        if isinstance(e["uploaded_at"], datetime):
            e["uploaded_at"] = e["uploaded_at"].isoformat()
    return entries
