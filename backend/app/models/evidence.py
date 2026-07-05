from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Literal, Dict, List


class ForensicsVerdict(BaseModel):
    """
    Result of SentinelVision forensic analysis on an uploaded evidence file.
    Advisory only — flags signals for human review, never auto-rejects.
    """
    tamper_score: float = Field(0.0, description="0-1 anomaly score (0=clean, 1=highly suspicious)")
    signals: List[str] = Field(default_factory=list, description="Human-readable forensic signal descriptions")
    verdict: Literal["CLEAN", "SUSPICIOUS", "LIKELY_TAMPERED"] = Field("CLEAN", description="Forensic verdict")


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
    # SentinelVision forensics fields (advisory — for human review, not auto-rejection)
    forensics_verdict: Literal["CLEAN", "SUSPICIOUS", "LIKELY_TAMPERED"] = Field("CLEAN", description="Forensic integrity verdict")
    forensics_signals: List[str] = Field(default_factory=list, description="Forensic signal descriptions")
    forensics_score: float = Field(0.0, description="Forensic tamper anomaly score 0-1")


class EvidenceVaultEntryResponse(EvidenceVaultEntryBase):
    id: str = Field(..., description="MongoDB stringified ObjectId")

