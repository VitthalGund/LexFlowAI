from enum import Enum
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Literal

class UserRole(str, Enum):
    COMPLIANCE_OFFICER = "COMPLIANCE_OFFICER"
    REGIONAL_HEAD = "REGIONAL_HEAD"
    BRANCH_MANAGER = "BRANCH_MANAGER"
    IT_ENGINEER = "IT_ENGINEER"
    AUDITOR = "AUDITOR"


class UserBase(BaseModel):
    email: EmailStr = Field(..., description="User login email")
    name: str = Field(..., description="Full name of the user")
    role: str = Field(..., description="Authorized role")
    branch_lgd_code: Optional[str] = Field(None, description="LGD branch reference if branch manager")
    language: Optional[str] = Field("en", description="Preferred localization language code")

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str
