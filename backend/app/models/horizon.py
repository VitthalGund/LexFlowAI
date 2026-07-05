"""
LexFlow Horizon — Anticipatory Regulatory Signal Models.
Horizon signals come from RBI speeches and publications (not binding circulars).
They represent *potential* upcoming regulation based on RBI communication patterns.

Frame: clearly advisory/speculative — never binding. See architecture.md invariants.
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Literal


class HorizonSignal(BaseModel):
    source_item_id: str = Field(..., description="External item ID from the RSS feed entry")
    source_name: str = Field(..., description="Name of the RSS source (e.g. 'RBI Speeches')")
    feed_type: str = Field(..., description="SPEECHES or PUBLICATIONS")
    title: str = Field(..., description="Title of the speech/publication")
    link: str = Field(default="", description="URL of the source item")
    theme: str = Field(..., description="Inferred regulatory theme (e.g. 'Digital Lending', 'Cybersecurity')")
    confidence: float = Field(..., ge=0.0, le=1.0, description="0-1 signal confidence score")
    rationale: str = Field(..., description="Why this was flagged as a regulatory signal")
    estimated_action_window_days: Optional[int] = Field(None, description="Heuristic estimate of days until a circular may be issued (null = unknown)")
    detected_at: datetime = Field(..., description="Timestamp when signal was detected")
    status: Literal["NEW", "PREP_STARTED", "DISMISSED"] = Field("NEW", description="Signal lifecycle status")
    prep_map_id: Optional[str] = Field(None, description="ID of the anticipatory MAP created via 'Start Prep'")


class HorizonSignalResponse(HorizonSignal):
    id: str = Field(..., description="MongoDB stringified ObjectId")
