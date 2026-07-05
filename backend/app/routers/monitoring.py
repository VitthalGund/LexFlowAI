from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.services.regulatory_watcher import poll_source
from app.services.circular_ingestion import create_and_process_circular
from bson import ObjectId

router = APIRouter(prefix="/api/v1/monitoring", tags=["Monitoring"])


@router.post("/poll-now")
async def poll_now(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_roles(["COMPLIANCE_OFFICER"]))
):
    """
    Manually trigger a poll of all active regulatory sources.
    Same code path as the scheduler — not a demo-only shortcut.
    """
    sources = await db.regulatory_sources.find({"is_active": True}).to_list(length=50)
    if not sources:
        raise HTTPException(status_code=404, detail="No active regulatory sources configured.")

    results = []
    for source in sources:
        try:
            result = await poll_source(db, source)
            results.append({"source": source.get("name"), **result})
        except Exception as e:
            results.append({"source": source.get("name"), "status": "ERROR", "error_message": str(e)})

    return {"message": f"Polled {len(sources)} source(s)", "results": results}


@router.get("/runs")
async def list_monitoring_runs(
    limit: int = 20,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Return recent monitoring runs, newest first."""
    runs = await db.monitoring_runs.find({}).sort("started_at", -1).to_list(length=limit)
    for r in runs:
        r["id"] = str(r["_id"])
        del r["_id"]
    return runs


@router.get("/sources")
async def list_sources(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Return regulatory sources with live status fields."""
    sources = await db.regulatory_sources.find({}).to_list(length=50)
    for s in sources:
        s["id"] = str(s["_id"])
        del s["_id"]
    return sources


@router.get("/pending-triage")
async def list_pending_triage(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_roles(["COMPLIANCE_OFFICER"]))
):
    """Return seen_notifications awaiting manual review, newest first."""
    items = await db.seen_notifications.find(
        {"relevance_status": "PENDING_TRIAGE"}
    ).sort("first_seen_at", -1).to_list(length=100)
    for item in items:
        item["id"] = str(item["_id"])
        del item["_id"]
    return items


@router.post("/pending-triage/{notification_id}/accept")
async def accept_triage_item(
    notification_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_roles(["COMPLIANCE_OFFICER"]))
):
    """Manually accept a pending-triage notification and ingest it."""
    try:
        notif = await db.seen_notifications.find_one({"_id": ObjectId(notification_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Notification not found")
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

    from app.services.regulatory_watcher import strip_html_to_text, derive_circular_number
    clean_text = strip_html_to_text(notif.get("raw_description_html", ""))
    circular_number = derive_circular_number(
        notif.get("title", ""),
        clean_text,
        notif.get("external_id", notification_id)
    )

    try:
        result = await create_and_process_circular(
            db=db,
            circular_number=circular_number,
            title=notif.get("title", "Unknown"),
            raw_text=clean_text,
            issued_date=notif.get("pub_date")
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except RuntimeError as re:
        raise HTTPException(status_code=500, detail=str(re))

    await db.seen_notifications.update_one(
        {"_id": ObjectId(notification_id)},
        {"$set": {"relevance_status": "MANUALLY_INGESTED", "circular_id": result["circular_id"]}}
    )
    return {"message": "Notification ingested successfully", "circular_id": result["circular_id"]}


@router.post("/pending-triage/{notification_id}/reject")
async def reject_triage_item(
    notification_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_roles(["COMPLIANCE_OFFICER"]))
):
    """Mark a pending-triage notification as irrelevant."""
    try:
        result = await db.seen_notifications.update_one(
            {"_id": ObjectId(notification_id)},
            {"$set": {"relevance_status": "REJECTED"}}
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Notification not found")
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification marked as rejected"}
