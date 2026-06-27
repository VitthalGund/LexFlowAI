from typing import TypedDict, Dict, Any, List, Literal
from langgraph.graph import StateGraph, END
from app.models.ocr_models import EvidenceVerificationResult
from app.services.ocr_verification import verify_evidence_content
from app.services.behavior import calculate_risk_score, build_quarantine_reason

class EvidenceValidationState(TypedDict):
    file_content: bytes
    file_name: str
    map_doc: Dict[str, Any]
    telemetry: Dict[str, Any]
    ocr_result: EvidenceVerificationResult
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
    
    # Generate AI-style rejection if failed
    if not result.ocr_verified:
        missing = [kw for kw in result.required_keywords if kw not in result.matched_keywords]
        result.rejection_reason = f"The uploaded evidence does not contain required keywords: {', '.join(missing)}. Please upload the correct document."
        
    return {
        **state,
        "ocr_result": result,
        "iteration_count": state["iteration_count"] + 1
    }

def ocr_conditional_edge(state: EvidenceValidationState) -> Literal["behavioral_node", "verdict_node"]:
    if not state["ocr_result"].ocr_verified:
        return "verdict_node"
    return "behavioral_node"

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
    
    if not state.get("ocr_result") or not state["ocr_result"].ocr_verified:
        verdict = "QUARANTINED"
        reason = f"OCR verification failed: {state['ocr_result'].rejection_reason}"
    elif state.get("risk_score", 0.0) >= QUARANTINE_THRESHOLD:
        verdict = "QUARANTINED"
        reason = build_quarantine_reason(state["risk_score"], state["risk_flags"])
        
    return {
        **state,
        "verdict": verdict,
        "rejection_reason": reason
    }

def build_evidence_validation_graph():
    graph = StateGraph(EvidenceValidationState)
    
    graph.add_node("ocr_node", ocr_node)
    graph.add_node("behavioral_node", behavioral_node)
    graph.add_node("verdict_node", verdict_node)
    
    graph.set_entry_point("ocr_node")
    graph.add_conditional_edges(
        "ocr_node",
        ocr_conditional_edge,
        {"behavioral_node": "behavioral_node", "verdict_node": "verdict_node"}
    )
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
        "risk_score": 0.0,
        "risk_flags": [],
        "verdict": "",
        "rejection_reason": "",
        "iteration_count": 0
    }
    
    result = await graph.ainvoke(initial_state)
    return result
