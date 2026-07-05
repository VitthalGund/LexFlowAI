from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


class RegulatorySource(BaseModel):
    name: str                          # e.g. "RBI Notifications"
    url: str                           # e.g. "https://www.rbi.org.in/notifications_rss.xml"
    feed_type: Literal["NOTIFICATIONS", "PRESS_RELEASES", "PUBLICATIONS"] = "NOTIFICATIONS"
    poll_interval_minutes: int = 15
    is_active: bool = True
    last_polled_at: Optional[datetime] = None
    last_success_at: Optional[datetime] = None
    consecutive_failures: int = 0


class SeenNotification(BaseModel):
    source_id: str
    external_id: str                   # parsed "Id" query param from the RSS <link>
    link: str
    title: str
    pub_date: Optional[datetime] = None
    raw_description_html: str          # full CDATA body from the RSS item
    first_seen_at: datetime = Field(default_factory=datetime.utcnow)
    relevance_status: Literal[
        "PENDING_TRIAGE", "AUTO_INGESTED", "MANUALLY_INGESTED", "REJECTED", "IRRELEVANT"
    ] = "PENDING_TRIAGE"
    triage_confidence: Optional[float] = None
    triage_reason: Optional[str] = None
    circular_id: Optional[str] = None  # set once ingested into `circulars` collection


class MonitoringRun(BaseModel):
    source_id: str
    started_at: datetime = Field(default_factory=datetime.utcnow)
    finished_at: Optional[datetime] = None
    items_fetched: int = 0
    items_new: int = 0
    items_ingested: int = 0
    items_skipped: int = 0
    status: Literal["RUNNING", "SUCCESS", "PARTIAL", "FAILED"] = "RUNNING"
    error_message: Optional[str] = None
