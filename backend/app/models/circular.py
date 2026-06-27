from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class CircularBase(BaseModel):
    circular_number: str = Field(..., description="RBI circular reference number")
    title: str = Field(..., description="Circular title")
    issuing_authority: str = Field("Reserve Bank of India")
    issued_date: datetime = Field(..., description="Date circular was issued")
    raw_text: str = Field(..., description="Parsed circular body text")
    status: str = Field("PROCESSED", description="Ingestion processing status (e.g. INGESTED, PROCESSED)")
    maps_count: int = Field(0, description="Number of MAPs generated")

class CircularCreate(BaseModel):
    circular_number: str
    title: str
    issued_date: datetime
    raw_text: str = Field("", description="Raw text, can be empty if pdf_file is provided")
    pdf_file: Optional[str] = Field(None, description="Base64 encoded PDF file")


class CircularResponse(CircularBase):
    id: str = Field(..., description="Stringified MongoDB ObjectId")
