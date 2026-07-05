"""
RegulatorWatcher — RSS-based regulatory monitoring service.

Fetches the official RBI notifications RSS feed, deduplicates against
seen_notifications collection, triages for banking relevance, and
auto-ingests high-confidence actionable circulars into the pipeline.

Design principles:
- No silent mock fallbacks. If the feed is unavailable, the failure is
  logged to monitoring_runs and surfaced in the UI honestly.
- Insert-first dedup: seen_notifications is written before triage/ingest
  so a crash mid-run cannot cause double-processing on the next poll.
- Fail-open to PENDING_TRIAGE on low triage confidence — never fail-open
  to silent auto-ingestion.
"""

import asyncio
import re
from datetime import datetime, timezone
from urllib.parse import urlparse, parse_qs
from typing import Optional

import feedparser
from bs4 import BeautifulSoup
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.services.triage import classify_relevance
from app.services.circular_ingestion import create_and_process_circular, derive_circular_number

# Triage confidence threshold for auto-ingestion
AUTO_INGEST_THRESHOLD = 0.6


class RegulatorWatcherFetchError(Exception):
    """Raised when the RSS feed cannot be fetched or is malformed."""
    pass


def extract_external_id(link: str) -> Optional[str]:
    """
    Parse the 'Id' query parameter from an RBI notification link.
    e.g. 'http://www.rbi.org.in/scripts/NotificationUser.aspx?Id=13462&Mode=0' → '13462'
    Returns an MD5 hash of the link if no Id parameter can be parsed.
    """
    try:
        parsed = urlparse(link)
        params = parse_qs(parsed.query)
        # RBI uses 'Id' (capital I)
        for key in ("Id", "id", "ID"):
            if key in params and params[key]:
                return params[key][0]
    except Exception:
        pass
    
    # Fallback to MD5 hash of the URL if no parameter ID exists (common for speeches, publications, direct PDFs)
    if link:
        import hashlib
        return hashlib.md5(link.encode("utf-8")).hexdigest()
    return None



async def fetch_feed(url: str) -> list[dict]:
    """
    Fetch and parse an RSS feed via feedparser (blocking call wrapped in asyncio.to_thread).
    Returns a normalised list of {title, link, description, pub_date} dicts.
    Raises RegulatorWatcherFetchError on failure.
    """
    def _parse():
        return feedparser.parse(url)

    try:
        parsed = await asyncio.to_thread(_parse)
    except Exception as e:
        raise RegulatorWatcherFetchError(f"Feed fetch failed: {e}") from e

    # feedparser sets bozo=True for malformed XML but may still have entries
    if parsed.bozo and not parsed.entries:
        raise RegulatorWatcherFetchError(
            f"Feed is malformed and has no entries: {getattr(parsed, 'bozo_exception', 'unknown')}"
        )

    entries = []
    for entry in parsed.entries:
        # Parse pub_date
        pub_date = None
        if hasattr(entry, "published_parsed") and entry.published_parsed:
            import time
            pub_date = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
        elif hasattr(entry, "updated_parsed") and entry.updated_parsed:
            import time
            pub_date = datetime(*entry.updated_parsed[:6], tzinfo=timezone.utc)

        entries.append({
            "title": getattr(entry, "title", "").strip(),
            "link": getattr(entry, "link", "").strip(),
            "description": getattr(entry, "description", "").strip(),
            "pub_date": pub_date
        })

    return entries


def strip_html_to_text(html: str) -> str:
    """
    Convert RSS <description> HTML/CDATA to clean plain text for LangGraph.
    Uses BeautifulSoup for HTML-to-text only (NOT for web scraping).
    """
    if not html:
        return ""
    text = BeautifulSoup(html, "html.parser").get_text(separator="\n")
    # Collapse repeated blank lines
    import re as _re
    text = _re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


async def poll_source(db: AsyncIOMotorDatabase, source: dict) -> dict:
    """
    Core orchestration function for a single regulatory source.
    Returns a run-summary dict (items_fetched, items_new, items_ingested, items_skipped, status).
    """
    source_id = str(source.get("_id", source.get("id", "")))
    now = datetime.now(timezone.utc)

    # Insert a RUNNING monitoring_run record
    run_doc = {
        "source_id": source_id,
        "started_at": now,
        "finished_at": None,
        "items_fetched": 0,
        "items_new": 0,
        "items_ingested": 0,
        "items_skipped": 0,
        "status": "RUNNING",
        "error_message": None
    }
    run_result = await db.monitoring_runs.insert_one(run_doc)
    run_id = run_result.inserted_id

    # Update last_polled_at on source
    await db.regulatory_sources.update_one(
        {"_id": source["_id"]},
        {"$set": {"last_polled_at": now}}
    )

    try:
        entries = await fetch_feed(source["url"])
    except RegulatorWatcherFetchError as e:
        # Log failure honestly — no mock fallback
        print(f"[RegulatorWatcher] Feed fetch failed for {source.get('name')}: {e}")
        finished_at = datetime.now(timezone.utc)
        await db.monitoring_runs.update_one(
            {"_id": run_id},
            {"$set": {
                "status": "FAILED",
                "error_message": str(e),
                "finished_at": finished_at
            }}
        )
        await db.regulatory_sources.update_one(
            {"_id": source["_id"]},
            {"$inc": {"consecutive_failures": 1}}
        )
        return {"status": "FAILED", "error_message": str(e)}

    items_fetched = len(entries)
    items_new = 0
    items_ingested = 0
    items_skipped = 0
    feed_type = source.get("feed_type", "NOTIFICATIONS")

    for entry in entries:
        external_id = extract_external_id(entry["link"])
        if not external_id:
            items_skipped += 1
            continue

        # Dedup check
        existing = await db.seen_notifications.find_one(
            {"source_id": source_id, "external_id": external_id}
        )
        if existing:
            items_skipped += 1
            continue

        # Insert-first dedup: mark as seen before doing anything else
        clean_text = strip_html_to_text(entry["description"])
        notif_doc = {
            "source_id": source_id,
            "external_id": external_id,
            "link": entry["link"],
            "title": entry["title"],
            "pub_date": entry["pub_date"],
            "raw_description_html": entry["description"],
            "first_seen_at": datetime.now(timezone.utc),
            "relevance_status": "PENDING_TRIAGE",
            "triage_confidence": None,
            "triage_reason": None,
            "circular_id": None
        }
        notif_result = await db.seen_notifications.insert_one(notif_doc)
        notif_id = notif_result.inserted_id
        items_new += 1

        if feed_type in ("SPEECHES", "PUBLICATIONS"):
            # Horizon Scanning Path
            from app.services.triage import extract_horizon_signal
            try:
                horizon = await extract_horizon_signal(entry["title"], clean_text)
            except Exception as he:
                print(f"[RegulatorWatcher] Horizon triage error: {he}")
                horizon = {
                    "is_signal": False,
                    "theme": "Unknown",
                    "confidence": 0.0,
                    "rationale": f"Error: {he}",
                    "estimated_action_window_days": None
                }
            
            # Update seen_notification with triage result
            await db.seen_notifications.update_one(
                {"_id": notif_id},
                {"$set": {
                    "relevance_status": "AUTO_INGESTED" if horizon.get("is_signal") else "MUTED",
                    "triage_confidence": horizon.get("confidence"),
                    "triage_reason": horizon.get("rationale")
                }}
            )

            if horizon.get("is_signal"):
                # Dedup check for horizon signals
                existing_signal = await db.horizon_signals.find_one({"source_item_id": external_id})
                if not existing_signal:
                    signal_doc = {
                        "source_item_id": external_id,
                        "source_name": source.get("name", ""),
                        "feed_type": feed_type,
                        "title": entry["title"],
                        "link": entry["link"],
                        "theme": horizon.get("theme", "Unknown"),
                        "confidence": horizon.get("confidence", 0.0),
                        "rationale": horizon.get("rationale", ""),
                        "estimated_action_window_days": horizon.get("estimated_action_window_days"),
                        "detected_at": datetime.now(timezone.utc),
                        "status": "NEW",
                        "prep_map_id": None
                    }
                    await db.horizon_signals.insert_one(signal_doc)
                    items_ingested += 1
                    print(f"[RegulatorWatcher] Extracted Horizon Signal: {entry['title'][:60]} -> Theme: {horizon.get('theme')}")
                else:
                    print(f"[RegulatorWatcher] Horizon Signal already exists: {external_id}")
            else:
                print(f"[RegulatorWatcher] Muted Speeches/Publications entry: {entry['title'][:60]}")
        else:
            # Standard Notifications/Press Releases Path
            try:
                triage = await classify_relevance(entry["title"], clean_text)
            except Exception as te:
                print(f"[RegulatorWatcher] Triage error for {external_id}: {te}")
                triage = {"is_actionable": True, "confidence": 0.3, "reason": f"Triage error: {te}"}

            # Update seen_notification with triage result
            await db.seen_notifications.update_one(
                {"_id": notif_id},
                {"$set": {
                    "triage_confidence": triage.get("confidence"),
                    "triage_reason": triage.get("reason")
                }}
            )

            # Auto-ingest if high confidence actionable
            if triage.get("is_actionable") and triage.get("confidence", 0) >= AUTO_INGEST_THRESHOLD:
                try:
                    circular_number = derive_circular_number(entry["title"], clean_text, external_id)
                    result = await create_and_process_circular(
                        db=db,
                        circular_number=circular_number,
                        title=entry["title"],
                        raw_text=clean_text,
                        issued_date=entry["pub_date"]
                    )
                    await db.seen_notifications.update_one(
                        {"_id": notif_id},
                        {"$set": {
                            "relevance_status": "AUTO_INGESTED",
                            "circular_id": result["circular_id"]
                        }}
                    )
                    items_ingested += 1
                    print(f"[RegulatorWatcher] Auto-ingested: {entry['title'][:60]} → {result['circular_id']}")
                except ValueError as ve:
                    # Already exists — mark as such
                    await db.seen_notifications.update_one(
                        {"_id": notif_id},
                        {"$set": {"relevance_status": "MANUALLY_INGESTED"}}
                    )
                    print(f"[RegulatorWatcher] Already ingested: {ve}")
                except Exception as ie:
                    print(f"[RegulatorWatcher] Auto-ingest failed for {external_id}: {ie}")
            else:
                print(f"[RegulatorWatcher] Queued for triage: {entry['title'][:60]} (confidence={triage.get('confidence', 0):.2f})")

    # Finalize run record
    finished_at = datetime.now(timezone.utc)
    final_status = "SUCCESS"
    await db.monitoring_runs.update_one(
        {"_id": run_id},
        {"$set": {
            "items_fetched": items_fetched,
            "items_new": items_new,
            "items_ingested": items_ingested,
            "items_skipped": items_skipped,
            "status": final_status,
            "finished_at": finished_at
        }}
    )
    await db.regulatory_sources.update_one(
        {"_id": source["_id"]},
        {"$set": {
            "last_success_at": finished_at,
            "consecutive_failures": 0
        }}
    )

    return {
        "status": final_status,
        "items_fetched": items_fetched,
        "items_new": items_new,
        "items_ingested": items_ingested,
        "items_skipped": items_skipped
    }
