"""
Shared circular creation + pipeline runner.
Extracted to avoid duplication between the manual ingest router
and the automated RegulatorWatcher auto-ingest path.
"""
import re
from datetime import datetime, timezone
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.services.lexgraph import run_compliance_pipeline


async def create_and_process_circular(
    db: AsyncIOMotorDatabase,
    circular_number: str,
    title: str,
    raw_text: str,
    issued_date: datetime | None = None,
    issuing_authority: str = "Reserve Bank of India"
) -> dict:
    """
    Inserts a circular document, runs the LangGraph compliance pipeline,
    updates the circular status, and returns:
      {"circular_id": str, "maps_extracted": list, "status": "PROCESSED"|"FAILED"}

    Raises ValueError if circular_number already exists.
    Raises RuntimeError if the pipeline fails.
    """
    if issued_date is None:
        issued_date = datetime.now(timezone.utc)

    # Dedup check
    existing = await db.circulars.find_one({"circular_number": circular_number})
    if existing:
        raise ValueError(f"Circular {circular_number} already exists")

    circular_doc = {
        "circular_number": circular_number,
        "title": title,
        "issuing_authority": issuing_authority,
        "issued_date": issued_date,
        "raw_text": raw_text,
        "status": "PROCESSING",
        "maps_count": 0
    }

    result = await db.circulars.insert_one(circular_doc)
    circular_id = str(result.inserted_id)

    try:
        maps_generated = await run_compliance_pipeline(db, circular_id, raw_text)

        await db.circulars.update_one(
            {"_id": ObjectId(circular_id)},
            {"$set": {"status": "PROCESSED", "maps_count": len(maps_generated)}}
        )

        return {
            "circular_id": circular_id,
            "maps_extracted": maps_generated,
            "status": "PROCESSED"
        }
    except Exception as e:
        await db.circulars.update_one(
            {"_id": ObjectId(circular_id)},
            {"$set": {"status": "FAILED"}}
        )
        raise RuntimeError(f"LangGraph pipeline failed: {str(e)}") from e


def derive_circular_number(title: str, raw_text: str, external_id: str) -> str:
    """
    Tries to extract a circular number like RBI/DOR/2026-27/95 from the text.
    Falls back to RBI/AUTO/{external_id}.
    """
    pattern = r"RBI/[A-Z0-9._-]+/\d{4}-\d{2,4}/\d+"
    match = re.search(pattern, raw_text) or re.search(pattern, title)
    if match:
        return match.group(0)
    return f"RBI/AUTO/{external_id}"
