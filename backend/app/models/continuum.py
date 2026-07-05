"""
ContinuumGuard Models — Continuous Compliance Policy-as-Code.
Tracks the actual system states (e.g. TLS version, MFA settings)
and records drift alerts if policies are violated.
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Literal


class MockSystemState(BaseModel):
    branch_lgd_code: str = Field(..., description="LGD code of the branch being monitored")
    key: str = Field(..., description="Config parameter or KPI telemetry metric, e.g. 'tls_version', 'mfa_enabled'")
    value: str = Field(..., description="Current value of the metric")
    updated_at: datetime = Field(..., description="Timestamp of the last telemetry update")


class ComplianceDriftAlert(BaseModel):
    map_id: str = Field(..., description="Ref to the MAP that was violated")
    policy_id: str = Field(..., description="Violated Rego policy ID")
    branch_lgd_code: str = Field(..., description="Ref to the branch LGD code where drift was detected")
    detected_at: datetime = Field(..., description="Timestamp when drift was identified")
    previous_value: str = Field(..., description="Value during last compliant check or baseline")
    current_value: str = Field(..., description="Non-compliant drifted value")
    threshold: str = Field(..., description="Required value/threshold according to the policy")
    status: Literal["OPEN", "RESOLVED", "ACKNOWLEDGED"] = Field("OPEN", description="Alert lifecycle state")
    resolved_at: Optional[datetime] = Field(None, description="Timestamp of resolution, if resolved")


class ComplianceDriftAlertResponse(ComplianceDriftAlert):
    id: str = Field(..., description="MongoDB stringified ObjectId")
