from pydantic import BaseModel, Field
from typing import Literal

class BranchBase(BaseModel):
    lgd_code: str = Field(..., description="Government Local Government Directory code")
    branch_name: str = Field(..., description="Name of the branch")
    district: str = Field(..., description="District name")
    state: str = Field(..., description="State name")
    classification: Literal["URBAN", "SEMI_URBAN", "RURAL", "METRO"] = Field(..., description="Branch classification")
    language_code: str = Field("en", description="Regional language code (e.g. kn, ta, ml, hi)")
    lat: float = Field(..., description="Latitude coordinate")
    lng: float = Field(..., description="Longitude coordinate")

class BranchResponse(BranchBase):
    pass
