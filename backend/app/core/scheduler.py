"""
APScheduler wiring for the RegulatorWatcher.
Uses AsyncIOScheduler — runs inside the same asyncio event loop as
FastAPI/Uvicorn. No Celery, no Redis, no extra infrastructure.
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.core.database import db_connection

scheduler = AsyncIOScheduler()


async def poll_all_active_sources():
    """Job function: polls all active regulatory sources."""
    from app.services.regulatory_watcher import poll_source

    db = db_connection.db
    if db is None:
        print("[Scheduler] DB not ready, skipping poll.")
        return

    sources = await db.regulatory_sources.find({"is_active": True}).to_list(length=50)
    if not sources:
        print("[Scheduler] No active regulatory sources configured.")
        return

    print(f"[Scheduler] Polling {len(sources)} source(s)...")
    for source in sources:
        try:
            result = await poll_source(db, source)
            print(f"[Scheduler] Poll complete for '{source.get('name')}': {result}")
        except Exception as e:
            print(f"[Scheduler] Unhandled error polling '{source.get('name')}': {e}")


async def evaluate_continuous_compliance():
    """Job function: evaluates compliance policies against system states."""
    from app.routers.continuum import run_compliance_evaluation

    db = db_connection.db
    if db is None:
        return

    try:
        alerts = await run_compliance_evaluation(db)
        if alerts:
            print(f"[Scheduler] Continuous compliance evaluation: {len(alerts)} new drift alert(s) generated.")
    except Exception as e:
        print(f"[Scheduler] Error running continuous compliance evaluation: {e}")


def start_scheduler():
    """Register jobs and start the scheduler."""
    scheduler.add_job(
        poll_all_active_sources,
        "interval",
        minutes=15,
        id="regulatory_watcher_poll",
        replace_existing=True
    )
    scheduler.add_job(
        evaluate_continuous_compliance,
        "interval",
        minutes=5,
        id="continuous_compliance_check",
        replace_existing=True
    )
    scheduler.start()
    print("[Scheduler] RegulatorWatcher & ContinuumGuard scheduler started.")


def shutdown_scheduler():
    """Gracefully stop the scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        print("[Scheduler] Scheduler stopped.")
