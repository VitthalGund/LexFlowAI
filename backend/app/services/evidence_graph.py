from typing import TypedDict, Dict, Any, List, Literal
from langgraph.graph import StateGraph, END
from app.models.ocr_models import EvidenceVerificationResult
from app.services.ocr_verification import verify_evidence_content
from app.services.behavior import calculate_risk_score, build_quarantine_reason
from app.services.forensics import run_forensics_gate

class EvidenceValidationState(TypedDict):
    file_content: bytes
    file_name: str
    map_doc: Dict[str, Any]
    telemetry: Dict[str, Any]
    ocr_result: EvidenceVerificationResult
    forensics_result: Dict[str, Any]  # SentinelVision result dict
    risk_score: float
    risk_flags: List[str]
    verdict: str
    rejection_reason: str
    iteration_count: int

QUARANTINE_THRESHOLD = 0.60

async def ocr_node(state: EvidenceValidationState) -> EvidenceValidationState:
    result = await verify_evidence_content(
        file_content=state["file_content"],
        file_name=state["file_name"],
        map_doc=state["map_doc"]
    )
    
    return {
        **state,
        "ocr_result": result,
        "iteration_count": state["iteration_count"] + 1
    }

async def forensics_node(state: EvidenceValidationState) -> EvidenceValidationState:
    """
    SentinelVision: Run forensic analysis (ELA + metadata/PDF integrity checks).
    Advisory only — LIKELY_TAMPERED routes to quarantine, not outright rejection.
    This allows a Compliance Officer to override the flag after human review.
    """
    try:
        verdict = await run_forensics_gate(state["file_content"], state["file_name"])
        return {
            **state,
            "forensics_result": verdict.model_dump()
        }
    except Exception as e:
        print(f"Forensics node error (non-fatal): {e}")
        # Fail-open: if forensics crashes, don't block evidence submission
        return {
            **state,
            "forensics_result": {
                "tamper_score": 0.0,
                "signals": [f"Forensics analysis unavailable: {str(e)}"],
                "verdict": "CLEAN"
            }
        }

def ocr_conditional_edge(state: EvidenceValidationState) -> Literal["behavioral_node", "await_user_evidence"]:
    if not state["ocr_result"].ocr_verified:
        return "await_user_evidence"
    return "behavioral_node"

async def await_user_evidence(state: EvidenceValidationState) -> EvidenceValidationState:
    # Routes back to the user ingestion phase by formulating a REJECTED response
    reason = state["ocr_result"].rejection_reason
    if not reason:
        reason = "Validation Failed: Missing Branch Manager Signature or Bank Seal. Please re-sign and upload."
        
    return {
        **state,
        "verdict": "REJECTED",
        "rejection_reason": reason
    }

async def behavioral_node(state: EvidenceValidationState) -> EvidenceValidationState:
    risk_score, flags = calculate_risk_score(state["telemetry"])
    return {
        **state,
        "risk_score": risk_score,
        "risk_flags": flags
    }

async def verdict_node(state: EvidenceValidationState) -> EvidenceValidationState:
    verdict = "ACCEPTED"
    reason = None
    
    # Behavioral quarantine
    if state.get("risk_score", 0.0) >= QUARANTINE_THRESHOLD:
        verdict = "QUARANTINED"
        reason = build_quarantine_reason(state["risk_score"], state["risk_flags"])

    # SentinelVision: LIKELY_TAMPERED evidence routes to QUARANTINED (advisory — human can override)
    forensics = state.get("forensics_result", {})
    if forensics.get("verdict") == "LIKELY_TAMPERED":
        verdict = "QUARANTINED"
        forensics_signals = "; ".join(forensics.get("signals", []))
        forensics_reason = f"SentinelVision forensic analysis flagged likely tampering (score: {forensics.get('tamper_score', 0):.2f}): {forensics_signals}"
        reason = f"{reason} | {forensics_reason}" if reason else forensics_reason
        
    return {
        **state,
        "verdict": verdict,
        "rejection_reason": reason
    }

def build_evidence_validation_graph():
    graph = StateGraph(EvidenceValidationState)
    
    graph.add_node("ocr_node", ocr_node)
    graph.add_node("forensics_node", forensics_node)
    graph.add_node("behavioral_node", behavioral_node)
    graph.add_node("await_user_evidence", await_user_evidence)
    graph.add_node("verdict_node", verdict_node)
    
    # Fan-out: entry → both OCR and forensics in parallel via sequential execution
    # (LangGraph sequential; true fan-out would require LCEL — here we chain them)
    graph.set_entry_point("ocr_node")
    graph.add_edge("ocr_node", "forensics_node")
    graph.add_conditional_edges(
        "forensics_node",
        lambda state: "await_user_evidence" if not state["ocr_result"].ocr_verified else "behavioral_node",
        {"behavioral_node": "behavioral_node", "await_user_evidence": "await_user_evidence"}
    )
    graph.add_edge("await_user_evidence", END)
    graph.add_edge("behavioral_node", "verdict_node")
    graph.add_edge("verdict_node", END)
    
    return graph.compile()

async def run_evidence_validation_graph(file_content: bytes, file_name: str, map_doc: dict, telemetry: dict) -> EvidenceValidationState:
    graph = build_evidence_validation_graph()
    initial_state = {
        "file_content": file_content,
        "file_name": file_name,
        "map_doc": map_doc,
        "telemetry": telemetry,
        "ocr_result": None,
        "forensics_result": {"tamper_score": 0.0, "signals": [], "verdict": "CLEAN"},
        "risk_score": 0.0,
        "risk_flags": [],
        "verdict": "",
        "rejection_reason": "",
        "iteration_count": 0
    }
    
    result = await graph.ainvoke(initial_state)
    return result
