from pydantic import BaseModel, Field
from typing import List, Literal, Optional
from datetime import datetime


class AgentDecisionLog(BaseModel):
    circular_id: Optional[str] = None    # set for compliance pipeline runs
    map_id: Optional[str] = None         # set for evidence pipeline runs
    graph_name: Literal["compliance_extraction", "evidence_validation"]
    node_name: str
    iteration: int
    input_summary: str
    output_summary: str
    validation_errors: List[str] = []
    timestamp: datetime = Field(default_factory=datetime.utcnow)
