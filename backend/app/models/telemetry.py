from pydantic import BaseModel, Field
from datetime import datetime

class TelemetryLogBase(BaseModel):
    map_id: str = Field(..., description="Ref to MAP being read")
    time_on_page_seconds: float = Field(..., description="Active window reading time")
    max_scroll_percent: float = Field(..., description="Highest scroll ratio reached (0 to 100)")
    word_count: int = Field(..., description="Length of circular or description text to calculate WPM")
    click_count: int = Field(0, description="Active user click interactions count")
    tab_switches: int = Field(0, description="Count of times user tabbed away or left active window")
    submitted_at: datetime = Field(..., description="Client-side timestamp of event logging")

class TelemetryLogCreate(TelemetryLogBase):
    pass

class TelemetryLogResponse(TelemetryLogBase):
    id: str = Field(..., description="MongoDB stringified ObjectId")
    user_id: str = Field(..., description="User ID associated with event")
