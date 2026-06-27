from pydantic import BaseModel, Field
from typing import List, Dict, Any
from enum import Enum

class RemediationStatus(str, Enum):
    PENDING_IT_APPROVAL = "PENDING_IT_APPROVAL"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class RemediationPayload(BaseModel):
    api_payload: dict = Field(default_factory=dict, description="Structured JSON payload for systems with REST APIs")
    config_payload: Dict[str, Any] = Field(default_factory=dict, description="Structured configuration changes (e.g. parameter, old_val, new_val)")
    shell_script: str = Field("", description="Bash/PowerShell script for direct CLI execution")
    rpa_instructions: List[str] = Field(default_factory=list, description="Step-by-step RPA instructions for GUI-only legacy systems")
    target_system: str = Field(..., description="Identified target system (e.g., 'Core Banking TLS Config', 'AD Password Policy')")
    risk_level: str = Field("LOW", description="Risk level: LOW, MEDIUM, or HIGH")
    requires_approval: bool = Field(True, description="Always True for production changes")
    status: RemediationStatus = Field(RemediationStatus.PENDING_IT_APPROVAL)

class RemediationTemplate(BaseModel):
    type: str = Field(..., description="Template type identifier")
    description: str = Field(..., description="Description of the template")

