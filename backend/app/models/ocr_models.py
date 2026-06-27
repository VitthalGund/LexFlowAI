from pydantic import BaseModel, Field
from typing import List, Optional, Dict

class EvidenceVerificationResult(BaseModel):
    extracted_text: str = Field(..., description="Raw text extracted from evidence file")
    required_keywords: List[str] = Field(default_factory=list, description="Keywords expected to be found in the evidence")
    matched_keywords: List[str] = Field(default_factory=list, description="Keywords successfully matched in the extracted text")
    content_match_score: float = Field(0.0, description="Ratio of matched keywords to required keywords (0.0 - 1.0)")
    ocr_verified: bool = Field(..., description="True if content_match_score is above the acceptable threshold")
    rejection_reason: Optional[str] = Field(None, description="Reason for rejection if ocr_verified is False")
    detected_visual_tokens: Dict[str, bool] = Field(default_factory=dict, description="Visual tokens like seals and signatures")
    rejection_codes: List[str] = Field(default_factory=list, description="Codes for specific rejection reasons like MISSING_VISUAL_ATTESTATION")

