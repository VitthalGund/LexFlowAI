from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, List
from enum import Enum

class Department(str, Enum):
    IT = "IT"
    OPERATIONS = "OPERATIONS"
    RISK = "RISK"
    HR = "HR"
    FINANCE = "FINANCE"
    AUDIT = "AUDIT"

class EvidenceType(str, Enum):
    POLICY_DOC = "POLICY_DOC"
    LOG_FILE = "LOG_FILE"
    SCREENSHOT = "SCREENSHOT"
    REPORT = "REPORT"
    CERTIFICATE = "CERTIFICATE"

class GeoScope(str, Enum):
    NATIONAL = "NATIONAL"
    STATE = "STATE"
    DISTRICT = "DISTRICT"
    BRANCH = "BRANCH"

class MAPStatus(str, Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    SUBMITTED = "SUBMITTED"
    VERIFIED = "VERIFIED"
    QUARANTINED = "QUARANTINED"
    OVERDUE = "OVERDUE"

class MAPBase(BaseModel):
    title: str = Field(..., max_length=100, description="Short title of the requirement")
    description: str = Field(..., description="Actionable description")
    kpi: str = Field(..., description="Measurable success metric")
    deadline_days: int = Field(..., description="Days until deadline from circular issuance")
    department: Department = Field(..., description="Responsible department")
    evidence_type: EvidenceType = Field(..., description="Expected verification artifact type")
    geographic_scope: GeoScope = Field(GeoScope.NATIONAL, description="Scope of routing")
    target_states: Optional[List[str]] = Field(default_factory=list, description="Target state LGD codes if scope is STATE")

class MAPSchema(MAPBase):
    pass

class MAPDocument(MAPBase):
    circular_id: str = Field(..., description="Parent circular reference ID")
    deadline: datetime = Field(..., description="Absolute deadline timestamp")
    target_lgd_codes: List[str] = Field(default_factory=list, description="List of assigned branches LGD codes")
    translations: Dict[str, str] = Field(default_factory=dict, description="Language mappings: lang_code -> description")
    status: MAPStatus = Field(MAPStatus.PENDING)
    behavioral_risk_score: float = Field(0.0, description="Silent fraud risk score (0 to 1)")
    evidence_hash: Optional[str] = Field(None, description="SHA-256 hash of verified submission")

class MAPResponse(MAPDocument):
    id: str = Field(..., description="Stringified MongoDB ObjectId")
