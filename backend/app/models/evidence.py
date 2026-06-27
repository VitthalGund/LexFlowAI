from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Literal, Dict

class EvidenceVaultEntryBase(BaseModel):
    map_id: str = Field(..., description="Ref to MAP")
    circular_id: str = Field(..., description="Ref to Circular")
    branch_lgd_code: str = Field(..., description="LGD code of uploader branch")
    uploader_id: str = Field(..., description="User ID of uploader")
    uploader_name: str = Field(..., description="Full name of uploader")
    file_name: str = Field(..., description="Original name of file")
    file_size_bytes: int = Field(..., description="File size in bytes")
    sha256_hash: str = Field(..., description="Immutable server-side computed SHA-256 hash")
    uploaded_at: datetime = Field(..., description="Server timestamp of upload")
    behavioral_risk_score: float = Field(0.0, description="Associated telemetry risk score")
    telemetry_snapshot: Dict = Field(default_factory=dict, description="Frozen telemetry snapshot at upload time")
    ocr_verification: Dict = Field(default_factory=dict, description="OCR content verification results")
    vault_status: Literal["ACCEPTED", "QUARANTINED"] = Field("ACCEPTED")
    quarantine_reason: Optional[str] = Field(None, description="Detailed reasoning if quarantined")
    amendment_of: Optional[str] = Field(None, description="Ref to prior vault entry if this corrects a quarantine")

class EvidenceVaultEntryResponse(EvidenceVaultEntryBase):
    id: str = Field(..., description="MongoDB stringified ObjectId")
