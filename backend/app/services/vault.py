import hashlib
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

QUARANTINE_THRESHOLD = 0.60

async def process_evidence_upload(
    db: AsyncIOMotorDatabase,
    file_name: str,
    file_content: bytes,
    map_id: str,
    uploader: dict,
    telemetry: dict
) -> dict:
    # Compute SHA-256 hash server-side
    sha256_hash = hashlib.sha256(file_content).hexdigest()
    server_timestamp = datetime.now(timezone.utc)
    
    # Get circular_id and map_doc
    map_doc = await db.maps.find_one({"_id": map_id})
    if not map_doc:
        try:
            map_doc = await db.maps.find_one({"_id": ObjectId(map_id)})
        except Exception:
            map_doc = None
            
    circular_id = map_doc.get("circular_id") if map_doc else "UNKNOWN_CIRCULAR"
    
    # === EVIDENCE VALIDATION GRAPH ===
    from app.services.evidence_graph import run_evidence_validation_graph
    
    validation_state = await run_evidence_validation_graph(
        file_content=file_content,
        file_name=file_name,
        map_doc=map_doc if map_doc else {},
        telemetry=telemetry
    )
    
    ocr_result = validation_state["ocr_result"]
    risk_score = validation_state["risk_score"]
    vault_status = validation_state["verdict"]
    quarantine_reason = validation_state["rejection_reason"]
    
    entry = {
        "map_id": map_id,
        "circular_id": circular_id,
        "branch_lgd_code": uploader.get("branch_lgd_code"),
        "uploader_id": str(uploader.get("id")),
        "uploader_name": uploader.get("name"),
        "file_name": file_name,
        "file_size_bytes": len(file_content),
        "sha256_hash": sha256_hash,
        "uploaded_at": server_timestamp,
        "behavioral_risk_score": risk_score,
        "telemetry_snapshot": telemetry,
        "ocr_verification": ocr_result.model_dump(),
        "vault_status": vault_status,
        "quarantine_reason": quarantine_reason,
        "amendment_of": None
    }
    
    # Insert entry
    result = await db.evidence_vault.insert_one(entry)
    entry["id"] = str(result.inserted_id)
    
    # Update MAP
    map_query = {"_id": map_id}
    existing_map = await db.maps.find_one({"_id": map_id})
    if not existing_map:
        try:
            map_query = {"_id": ObjectId(map_id)}
        except Exception:
            pass
        
    if vault_status == "ACCEPTED":
        await db.maps.update_one(
            map_query,
            {"$set": {
                "status": "VERIFIED", 
                "evidence_hash": sha256_hash,
                "behavioral_risk_score": risk_score
            }}
        )
    else:
        await db.maps.update_one(
            map_query,
            {"$set": {
                "status": "QUARANTINED",
                "behavioral_risk_score": risk_score
            }}
        )
        
    return entry

async def verify_evidence_hash(db: AsyncIOMotorDatabase, sha256_hash: str) -> dict:
    entry = await db.evidence_vault.find_one({"sha256_hash": sha256_hash})
    if not entry:
        return {"verified": False, "message": "Hash not found in vault"}
        
    entry["id"] = str(entry["_id"])
    del entry["_id"]
    
    if isinstance(entry["uploaded_at"], datetime):
        entry["uploaded_at"] = entry["uploaded_at"].isoformat()
        
    return {
        "verified": True,
        "vault_entry": entry,
        "message": "Hash verified against immutable vault record"
    }
