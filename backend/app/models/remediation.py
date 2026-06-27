from pydantic import BaseModel, Field
from typing import List

class RemediationPayload(BaseModel):
    api_payload: dict = Field(default_factory=dict, description="Structured JSON payload for systems with REST APIs")
    shell_script: str = Field("", description="Bash/PowerShell script for direct CLI execution")
    rpa_instructions: List[str] = Field(default_factory=list, description="Step-by-step RPA instructions for GUI-only legacy systems")
    target_system: str = Field(..., description="Identified target system (e.g., 'Core Banking TLS Config', 'AD Password Policy')")
    risk_level: str = Field("LOW", description="Risk level: LOW, MEDIUM, or HIGH")
    requires_approval: bool = Field(True, description="Always True for production changes")

class RemediationTemplate(BaseModel):
    type: str = Field(..., description="Template type identifier")
    description: str = Field(..., description="Description of the template")
