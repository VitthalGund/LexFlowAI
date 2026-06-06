# plan/01-build-plan.md
## LexFlow AI — Detailed Build Plan
### Datasets, Models, Pipeline, Testing

---

## PART A: DATASETS & DATA SOURCES

### 1. LGD (Local Government Directory) Dataset

**Source:** https://lgd.gov.in or https://mohua.gov.in/cms/local-government-directory.php
**Alternate:** NIC's open data portal at https://data.gov.in (search "LGD")
**Format:** CSV/Excel
**Fields needed:** `lgd_code`, `district_name`, `state_name`, `entity_type` (GP/ULB/Village), `state_code`

**For hackathon demo — create synthetic subset:**
```python
# demo_data/lgd_branches.json
[
  {
    "lgd_code": "2902001",
    "branch_name": "Canara Bank - MG Road, Bengaluru",
    "district": "Bengaluru Urban",
    "state": "Karnataka",
    "state_code": "29",
    "classification": "METRO",
    "language_code": "kn",
    "lat": 12.9716,
    "lng": 77.5946
  },
  {
    "lgd_code": "2902002",
    "branch_name": "Canara Bank - Mysuru Branch",
    "district": "Mysuru",
    "state": "Karnataka",
    "state_code": "29",
    "classification": "URBAN",
    "language_code": "kn",
    "lat": 12.2958,
    "lng": 76.6394
  },
  // ... 50 more Karnataka branches
  // ... 30 Tamil Nadu branches (state_code: "33", language: "ta")
  // ... 10 Kerala branches (state_code: "32", language: "ml")
  // ... 10 others
]
```

**Create this file manually** with ~100 entries. Sufficient for demo.

---

### 2. RBI Circular Dataset (For LexGraph Training/Testing)

**Source:** https://www.rbi.org.in/Scripts/BS_CircularIndexDisplay.aspx
**Recommended circulars for demo:**
- RBI/2023-24/101 — Master Direction on Information Technology Framework
- RBI/2022-23/189 — Guidelines on Digital Lending
- RBI/2023-24/062 — Cybersecurity Framework for UCBs

**Download process:**
```bash
# Download RBI circular PDFs
curl -o demo_data/rbi_it_framework.pdf "https://www.rbi.org.in/[circular_url]"

# Extract text
pip install pymupdf
python -c "
import fitz
doc = fitz.open('demo_data/rbi_it_framework.pdf')
text = ''
for page in doc:
    text += page.get_text()
with open('demo_data/rbi_it_framework.txt', 'w') as f:
    f.write(text)
"
```

**Pre-extract and store 3 circulars as .txt files.** This avoids PDF parsing errors during live demo.

---

### 3. No ML Training Required

LexFlow uses **pre-trained LLMs via API**. No custom training needed. The "training" is:
- **Prompt engineering** for the extraction agent
- **Pydantic schema** as the "training signal" for the validation agent
- **LGD dataset** as lookup data, not a trained model

**Prompt for Extraction Agent:**
```
You are a regulatory compliance expert for Indian banking. 
Analyze the following RBI circular and extract ALL compliance requirements.
For each requirement, you MUST provide:
- title: Short title (max 10 words)
- description: Full description of what must be done
- kpi: SPECIFIC, MEASURABLE success criterion (not vague - must be verifiable)
- deadline_days: Number of days from circular date (integer)
- department: One of [IT, OPERATIONS, RISK, HR, FINANCE, AUDIT]
- evidence_type: One of [POLICY_DOC, LOG_FILE, SCREENSHOT, REPORT, CERTIFICATE]
- geographic_scope: One of [NATIONAL, STATE, DISTRICT, BRANCH]
- target_states: List of state codes if scope is STATE (use LGD state codes)

If you cannot determine KPI or deadline with certainty, explicitly state UNKNOWN.
Do NOT infer or guess deadlines. Extract only what the circular explicitly states.

Return ONLY valid JSON array. No preamble, no explanation.

CIRCULAR TEXT:
{circular_text}
```

---

## PART B: HOW TO BUILD EACH COMPONENT

### Component 1: LexGraph Pipeline

**File:** `backend/app/services/lexgraph.py`

```python
from langgraph.graph import StateGraph, END
from typing import TypedDict, Literal
from pydantic import ValidationError
import json

class ComplianceState(TypedDict):
    circular_id: str
    circular_text: str
    raw_llm_output: str
    raw_maps: list[dict]
    validated_maps: list[dict]
    validation_errors: list[str]
    iteration_count: int
    status: str

MAX_ITERATIONS = 3

async def extraction_node(state: ComplianceState) -> ComplianceState:
    """Call Sarvam AI to extract MAPs from circular text."""
    prompt = build_extraction_prompt(state["circular_text"])
    
    response = await sarvam_client.complete(prompt)
    # Parse JSON from response
    try:
        raw_maps = json.loads(response)
    except json.JSONDecodeError:
        raw_maps = []
    
    return {
        **state,
        "raw_llm_output": response,
        "raw_maps": raw_maps,
        "iteration_count": state["iteration_count"] + 1,
        "status": "validating"
    }

async def validation_node(state: ComplianceState) -> ComplianceState:
    """Validate extracted MAPs against Pydantic schema."""
    validated = []
    errors = []
    
    for raw_map in state["raw_maps"]:
        try:
            validated_map = MAPSchema(**raw_map)
            # Extra checks beyond Pydantic
            if validated_map.kpi.lower() == "unknown":
                errors.append(f"MAP '{raw_map.get('title')}': KPI is UNKNOWN")
                continue
            if validated_map.deadline_days <= 0:
                errors.append(f"MAP '{raw_map.get('title')}': Invalid deadline")
                continue
            validated.append(validated_map.dict())
        except ValidationError as e:
            errors.append(f"MAP '{raw_map.get('title', 'UNKNOWN')}': {str(e)}")
    
    return {
        **state,
        "validated_maps": validated,
        "validation_errors": errors,
        "status": "validated"
    }

def should_loop_or_proceed(state: ComplianceState) -> str:
    """Decide whether to loop back or proceed to routing."""
    has_errors = len(state["validation_errors"]) > 0
    max_reached = state["iteration_count"] >= MAX_ITERATIONS
    has_valid = len(state["validated_maps"]) > 0
    
    if has_errors and not max_reached:
        return "extract"  # Loop back
    return "route"  # Proceed even with partial results

async def routing_node(state: ComplianceState) -> ComplianceState:
    """Map each MAP to LGD codes based on geographic scope."""
    routed_maps = []
    
    for map_dict in state["validated_maps"]:
        lgd_codes = await lgd_service.get_branches_for_scope(
            scope=map_dict["geographic_scope"],
            target_states=map_dict.get("target_states", [])
        )
        routed_maps.append({**map_dict, "target_lgd_codes": lgd_codes})
    
    return {**state, "validated_maps": routed_maps, "status": "routing_complete"}

async def translation_node(state: ComplianceState) -> ComplianceState:
    """Translate MAPs to regional languages."""
    # Group branches by language
    language_groups = {}
    for map_dict in state["validated_maps"]:
        for lgd_code in map_dict["target_lgd_codes"]:
            branch = await branch_service.get_by_lgd(lgd_code)
            lang = branch.language_code
            if lang not in language_groups:
                language_groups[lang] = []
            language_groups[lang].append(map_dict["id"])
    
    # Translate descriptions for each language
    translated_maps = []
    for map_dict in state["validated_maps"]:
        translations = {}
        for lang in ["kn", "ta", "ml", "hi"]:  # Priority languages
            translations[lang] = await translation_service.translate(
                map_dict["description"], 
                target_lang=lang
            )
        translated_maps.append({**map_dict, "translations": translations})
    
    return {**state, "validated_maps": translated_maps, "status": "complete"}

def build_lexgraph():
    graph = StateGraph(ComplianceState)
    graph.add_node("extract", extraction_node)
    graph.add_node("validate", validation_node)
    graph.add_node("route", routing_node)
    graph.add_node("translate", translation_node)
    
    graph.set_entry_point("extract")
    graph.add_edge("extract", "validate")
    graph.add_conditional_edges("validate", should_loop_or_proceed, 
                                 {"extract": "extract", "route": "route"})
    graph.add_edge("route", "translate")
    graph.add_edge("translate", END)
    
    return graph.compile()
```

---

### Component 2: TrustVault (SHA-256 Evidence Lock)

**File:** `backend/app/services/vault.py`

```python
import hashlib
import io
from datetime import datetime, timezone
from fastapi import UploadFile

async def process_evidence_upload(
    file: UploadFile,
    map_id: str,
    uploader: User,
    telemetry: TelemetrySnapshot,
    db: AsyncIOMotorDatabase
) -> EvidenceVaultEntry:
    """
    Critical security function. Reads file, hashes it, and writes to vault.
    All operations are server-side. Client never touches the hash.
    """
    # Read file content
    content = await file.read()
    
    # Compute SHA-256 hash (server-side only, server timestamp)
    sha256_hash = hashlib.sha256(content).hexdigest()
    server_timestamp = datetime.now(timezone.utc)  # Server time, not client
    
    # Calculate behavioral risk score
    risk_score = calculate_risk_score(telemetry)
    
    # Determine vault status
    vault_status = "QUARANTINED" if risk_score >= QUARANTINE_THRESHOLD else "ACCEPTED"
    quarantine_reason = None
    if vault_status == "QUARANTINED":
        quarantine_reason = build_quarantine_reason(telemetry, risk_score)
    
    # Build vault entry
    entry = {
        "map_id": map_id,
        "circular_id": await get_circular_id_for_map(map_id, db),
        "branch_lgd_code": uploader.branch_lgd_code,
        "uploader_id": str(uploader.id),
        "uploader_name": uploader.full_name,
        "file_name": file.filename,
        "file_size_bytes": len(content),
        "sha256_hash": sha256_hash,
        "uploaded_at": server_timestamp,
        "behavioral_risk_score": risk_score,
        "telemetry_snapshot": telemetry.dict(),
        "vault_status": vault_status,
        "quarantine_reason": quarantine_reason,
        "amendment_of": None  # For future re-submissions
    }
    
    # CRITICAL: Insert only. Never update existing vault entries.
    result = await db.evidence_vault.insert_one(entry)
    
    # Update MAP status
    if vault_status == "ACCEPTED":
        await db.maps.update_one(
            {"_id": ObjectId(map_id)},
            {"$set": {"status": "VERIFIED", "evidence_hash": sha256_hash}}
        )
    else:
        await db.maps.update_one(
            {"_id": ObjectId(map_id)},
            {"$set": {"status": "QUARANTINED"}}
        )
    
    return EvidenceVaultEntry(**entry, id=str(result.inserted_id))

async def verify_evidence_hash(
    sha256_hash: str,
    db: AsyncIOMotorDatabase
) -> HashVerificationResult:
    """Auditor endpoint: verify a hash exists in vault."""
    entry = await db.evidence_vault.find_one({"sha256_hash": sha256_hash})
    if not entry:
        return HashVerificationResult(verified=False, message="Hash not found in vault")
    
    return HashVerificationResult(
        verified=True,
        vault_entry=EvidenceVaultEntry(**entry),
        message="Hash verified against immutable vault record"
    )
```

---

### Component 3: BehaviorGuard Risk Scorer

**File:** `backend/app/services/behavior.py`

```python
from datetime import datetime
from dataclasses import dataclass

@dataclass  
class TelemetrySnapshot:
    map_id: str
    user_id: str
    time_on_page_seconds: float
    max_scroll_percent: float
    word_count: int           # Word count of the MAP/policy document
    submitted_at: datetime
    click_count: int
    tab_switches: int         # How many times user left the tab
    
def calculate_risk_score(telemetry: TelemetrySnapshot) -> float:
    """
    Calculate behavioral risk score. Higher = more suspicious.
    Score range: 0.0 (safe) to 1.0 (high risk)
    """
    score = 0.0
    flags = []
    
    # === TIME-BASED SIGNALS ===
    hour = telemetry.submitted_at.hour
    weekday = telemetry.submitted_at.weekday()  # 0=Monday, 6=Sunday
    
    if hour < 6 or hour >= 22:
        score += 0.25
        flags.append(f"Submitted at {hour:02d}:00 (off-hours)")
    
    if weekday >= 5:  # Saturday or Sunday
        score += 0.10
        flags.append("Submitted on weekend")
    
    # === READING BEHAVIOR SIGNALS ===
    if telemetry.time_on_page_seconds < 10:
        score += 0.40
        flags.append(f"Extremely short view: {telemetry.time_on_page_seconds:.1f}s")
    elif telemetry.time_on_page_seconds < 30:
        score += 0.20
        flags.append(f"Short view: {telemetry.time_on_page_seconds:.1f}s")
    
    # Reading speed check (normal human: 200-400 WPM)
    if telemetry.time_on_page_seconds > 0:
        wpm = (telemetry.word_count / telemetry.time_on_page_seconds) * 60
        if wpm > 1000:
            score += 0.30
            flags.append(f"Impossible reading speed: {wpm:.0f} WPM")
        elif wpm > 500:
            score += 0.15
            flags.append(f"Very high reading speed: {wpm:.0f} WPM")
    
    # === SCROLL BEHAVIOR ===
    if telemetry.max_scroll_percent < 10:
        score += 0.30
        flags.append(f"Did not scroll document (max: {telemetry.max_scroll_percent:.0f}%)")
    elif telemetry.max_scroll_percent < 50:
        score += 0.15
        flags.append(f"Minimal scrolling (max: {telemetry.max_scroll_percent:.0f}%)")
    
    # === ENGAGEMENT SIGNALS ===
    if telemetry.tab_switches > 5:
        score += 0.05  # Distracted, minor signal
    
    return min(round(score, 2), 1.0), flags

def build_quarantine_reason(telemetry: TelemetrySnapshot, score: float, flags: list) -> str:
    return (
        f"High behavioral risk detected (score: {score:.2f}). "
        f"Flags: {'; '.join(flags)}. "
        f"Evidence quarantined pending compliance officer review."
    )

# Thresholds
QUARANTINE_THRESHOLD = 0.60  # Auto-quarantine
FLAG_THRESHOLD = 0.30        # Flag for review
```

---

### Component 4: Frontend Telemetry Capture

**File:** `frontend/components/telemetry/TelemetryCapture.tsx`

```typescript
'use client';
import { useEffect, useRef } from 'react';
import { api } from '@/lib/api';

interface TelemetryCaptureProps {
  mapId: string;
  wordCount: number;
  onTelemetryReady: (telemetryId: string) => void;
}

// CRITICAL: This component is INVISIBLE to the user.
// No visible UI elements. Pure behavioral data collection.
export function TelemetryCapture({ mapId, wordCount, onTelemetryReady }: TelemetryCaptureProps) {
  const startTime = useRef(Date.now());
  const maxScroll = useRef(0);
  const tabSwitches = useRef(0);
  const clickCount = useRef(0);
  
  useEffect(() => {
    // Track scroll depth
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const pct = total > 0 ? (scrolled / total) * 100 : 0;
      maxScroll.current = Math.max(maxScroll.current, pct);
    };
    
    // Track tab visibility
    const handleVisibility = () => {
      if (document.hidden) tabSwitches.current++;
    };
    
    // Track clicks
    const handleClick = () => { clickCount.current++; };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('click', handleClick);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('click', handleClick);
    };
  }, []);
  
  // Called just before user submits evidence
  const submitTelemetry = async (): Promise<string> => {
    const elapsed = (Date.now() - startTime.current) / 1000;
    
    const response = await api.post('/api/v1/telemetry/log', {
      mapId,
      timeOnPageSeconds: elapsed,
      maxScrollPercent: maxScroll.current,
      wordCount,
      clickCount: clickCount.current,
      tabSwitches: tabSwitches.current,
      submittedAt: new Date().toISOString(),
    });
    
    return response.data.telemetryId;
  };
  
  // Expose submit function via ref or callback
  useEffect(() => {
    // Register the submit function with parent component
    window.__lexflow_submit_telemetry = submitTelemetry;
  }, []);
  
  return null; // Invisible
}
```

---

## PART C: TESTING SPECIFICATIONS

### Unit Tests

#### Test Suite 1: SHA-256 Hashing
```python
# tests/unit/test_hashing.py

def test_sha256_determinism():
    """Same file always produces same hash."""
    content = b"RBI Circular content here"
    hash1 = hashlib.sha256(content).hexdigest()
    hash2 = hashlib.sha256(content).hexdigest()
    assert hash1 == hash2

def test_sha256_different_files_different_hash():
    """Different files produce different hashes."""
    hash1 = hashlib.sha256(b"content 1").hexdigest()
    hash2 = hashlib.sha256(b"content 2").hexdigest()
    assert hash1 != hash2

def test_sha256_format():
    """Hash is 64-character hex string."""
    hash = hashlib.sha256(b"test").hexdigest()
    assert len(hash) == 64
    assert all(c in "0123456789abcdef" for c in hash)
```

#### Test Suite 2: Behavioral Risk Scoring
```python
# tests/unit/test_risk_scoring.py

def test_zero_risk_legitimate_submission():
    """Normal working hours, full scroll, adequate reading time → low score."""
    telemetry = TelemetrySnapshot(
        time_on_page_seconds=300,  # 5 minutes
        max_scroll_percent=95,
        word_count=1500,
        submitted_at=datetime(2025, 6, 14, 10, 30),  # 10:30 AM weekday
        tab_switches=2,
        click_count=15
    )
    score, flags = calculate_risk_score(telemetry)
    assert score < 0.30

def test_high_risk_4_second_submission():
    """4-second read of 1500-word policy → quarantine threshold."""
    telemetry = TelemetrySnapshot(
        time_on_page_seconds=4,
        max_scroll_percent=5,
        word_count=1500,
        submitted_at=datetime(2025, 6, 14, 23, 30),  # 11:30 PM
        tab_switches=0,
        click_count=1
    )
    score, flags = calculate_risk_score(telemetry)
    assert score >= QUARANTINE_THRESHOLD  # ≥ 0.60

def test_weekend_offhours_adds_score():
    telemetry = TelemetrySnapshot(
        time_on_page_seconds=200,
        max_scroll_percent=90,
        word_count=1000,
        submitted_at=datetime(2025, 6, 15, 2, 0),  # 2 AM Sunday
        tab_switches=0,
        click_count=10
    )
    score, _ = calculate_risk_score(telemetry)
    assert score >= 0.30  # Flagged at minimum

def test_impossible_reading_speed():
    """1000 WPM reading speed is flagged."""
    telemetry = TelemetrySnapshot(
        time_on_page_seconds=6,   # 6 seconds for 100 words = 1000 WPM
        max_scroll_percent=80,
        word_count=100,
        submitted_at=datetime(2025, 6, 14, 10, 0),
        tab_switches=0,
        click_count=5
    )
    score, flags = calculate_risk_score(telemetry)
    assert any("reading speed" in f.lower() for f in flags)
```

#### Test Suite 3: LGD Routing
```python
# tests/unit/test_lgd_routing.py

async def test_national_scope_reaches_all_branches():
    branches = await lgd_service.get_branches_for_scope("NATIONAL", [])
    assert len(branches) == TOTAL_DEMO_BRANCHES

async def test_state_scope_reaches_only_that_state():
    karnataka_branches = await lgd_service.get_branches_for_scope("STATE", ["29"])
    assert all(b.startswith("29") for b in karnataka_branches)
    tamil_codes = [b for b in karnataka_branches if b.startswith("33")]
    assert len(tamil_codes) == 0

async def test_unknown_lgd_code_raises_error():
    with pytest.raises(BranchNotFoundException):
        await branch_service.get_by_lgd("9999999")
```

#### Test Suite 4: MAP Validation
```python
# tests/unit/test_map_validation.py

def test_valid_map_passes():
    map_data = {
        "title": "Update TLS Configuration",
        "description": "All internet-facing endpoints must use TLS 1.3",
        "kpi": "100% of internet-facing endpoints pass TLS 1.3 scan",
        "deadline_days": 30,
        "department": "IT",
        "evidence_type": "LOG_FILE",
        "geographic_scope": "NATIONAL"
    }
    validated = MAPSchema(**map_data)
    assert validated.kpi != "UNKNOWN"

def test_map_with_unknown_kpi_fails():
    map_data = {**valid_map, "kpi": "UNKNOWN"}
    # Validation agent should reject this and loop
    with pytest.raises(MAPValidationError):
        validate_map(map_data)

def test_map_without_deadline_fails():
    map_data = {**valid_map, "deadline_days": -1}
    with pytest.raises(ValidationError):
        MAPSchema(**map_data)
```

### Integration Tests

#### Test Suite 5: Full Evidence Upload Flow
```python
# tests/integration/test_evidence_vault.py

async def test_evidence_upload_creates_vault_entry():
    """Upload → hash → vault entry created."""
    file_content = b"Fake policy PDF content"
    response = await client.post(
        "/api/v1/evidence/upload",
        data={"map_id": test_map_id},
        files={"file": ("policy.pdf", file_content, "application/pdf")},
        headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert "sha256_hash" in data
    assert len(data["sha256_hash"]) == 64

async def test_vault_entry_is_not_updated():
    """Verify vault collection never allows updates."""
    entry_id = await create_test_vault_entry()
    
    # Attempt direct MongoDB update (simulating tamper attempt)
    result = await db.evidence_vault.update_one(
        {"_id": ObjectId(entry_id)},
        {"$set": {"sha256_hash": "tampered_hash"}}
    )
    
    # In append-only mode, this should fail or be blocked
    # (In MongoDB, enforce via user permissions or application layer)
    entry = await db.evidence_vault.find_one({"_id": ObjectId(entry_id)})
    assert entry["sha256_hash"] != "tampered_hash"

async def test_hash_verification_endpoint():
    """Auditor can verify a known hash."""
    known_hash = "a3f2c8d1e9b47f2a1c..."
    response = await client.get(f"/api/v1/evidence/{known_hash}/verify")
    assert response.status_code == 200
    assert response.json()["verified"] == True

async def test_quarantined_evidence_not_counted():
    """Quarantined evidence should not count toward compliance %."""
    # Create MAP with quarantined evidence
    quarantined_map = await create_map_with_quarantined_evidence()
    
    compliance = await get_branch_compliance_percent(quarantined_map.branch_lgd)
    assert compliance < 100  # Quarantined doesn't count
```

---

## PART D: DEMO SCENARIOS

### Demo Scenario 1: The Compliance Villain (BehaviorGuard)
**Setup:** Branch KA-002 has MAP-002 (MFA Implementation) assigned
**Action:** Login as Branch Manager "Ravi Kumar" (KA-002)
1. Open MAP-002 task page
2. Wait exactly 4 seconds
3. Upload `dummy_mfa_report.pdf` (a blank PDF)
4. Click Submit
**Expected:** System shows "Evidence submitted — Under Review"
**Switch to CO Dashboard:** New risk flag appears
- Reading time: 4.2 seconds
- Document scroll: 3%
- Submission time: 11:47 PM Saturday
- Risk score: 0.87 (HIGH)
- Status: QUARANTINED
**Wow moment:** "The system caught it silently, without alerting the branch manager."

### Demo Scenario 2: Legitimate Compliance (TrustVault)
**Setup:** Branch TN-001, MAP-001 (TLS Update)
**Action:** Login as Branch Manager "Meera Krishnan" (TN-001)
1. Open MAP-001 — task shown in Tamil: "TLS v1.3 க்கு மேம்படுத்தவும்"
2. Read for 8 minutes (simulated)
3. Upload `tls_scan_report.pdf`
4. Click Submit
**Expected:** SHA-256 hash generated, vault entry created, MAP status → VERIFIED
**Switch to Auditor View:** Show vault entry with hash
**Click Verify:** Hash recomputed in real time — MATCH CONFIRMED
**Wow moment:** "This hash cannot be changed. Ever. Retroactive compliance forgery is cryptographically impossible."

### Demo Scenario 3: RBI Audit in 10 Seconds
**Setup:** CO Dashboard with full data
**Action:** Show India heatmap
- Karnataka: 78% complete (green)
- Tamil Nadu: 45% complete (yellow)
- Kerala: 12% complete (red)
- Risk flags: 3 quarantined submissions
**Click Export:** Download RBI-ready audit report PDF
**Wow moment:** "This is what used to take 3 months of manual audit preparation."
