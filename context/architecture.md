# System Architecture & State Invariants

## Component Mapping
- **Frontend Core:** Next.js Server Components with interactive state components running client-side tracking hooks.
- **Backend Service Frame:** FastAPI application engine running fully asynchronous handling routes.
- **Orchestration Layer:** LangGraph running continuous state preservation mechanics over processing cycles.
- **Database Architecture:** MongoDB instance configured with append-only validation schemas to protect record lines.

## State Invariants
1. **Verification Progression Rule:** A state record cannot move to `VERIFIED` or generate a cryptographic signature unless it successfully passes both contextual text validation and visual asset confirmation runs.
2. **Isolation Invariant:** The schema engine cannot rewrite or delete an established evidence record block. Corrections or modifications generate an isolated, incremented ledger entry.


## LexFlow AI — System Architecture

---

### System Boundary Overview

```
[RBI Circular Input]
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LEXFLOW AI PLATFORM                          │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              AGENT LAYER (LangGraph)                     │   │
│  │                                                          │   │
│  │  ┌─────────────────┐    ┌──────────────────────────┐    │   │
│  │  │ Extraction Agent │───▶│   Validation Agent       │    │   │
│  │  │  (Sarvam-105B)  │◀───│  (Schema Enforcement)    │    │   │
│  │  └─────────────────┘    └──────────────────────────┘    │   │
│  │          │                        │                      │   │
│  │          │ (valid MAPs only)      │ (loop if invalid)    │   │
│  │          ▼                        │                      │   │
│  │  ┌─────────────────┐             │                      │   │
│  │  │  Routing Agent  │◀────────────┘                      │   │
│  │  │  (LGD Mapper)   │                                    │   │
│  │  └─────────────────┘                                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────┐   │
│  │   FastAPI Layer   │  │  BehaviorGuard   │  │ TrustVault  │   │
│  │   (REST API)      │  │  (Telemetry)     │  │ (SHA-256)   │   │
│  └──────────────────┘  └──────────────────┘  └─────────────┘   │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    MongoDB                                │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌───────────────────┐ │  │
│  │  │  circulars   │ │    maps      │ │  evidence_vault   │ │  │
│  │  │  collection  │ │  collection  │ │  (append-only)    │ │  │
│  │  └──────────────┘ └──────────────┘ └───────────────────┘ │  │
│  │  ┌──────────────┐ ┌──────────────┐                       │  │
│  │  │ telemetry_   │ │   branches   │                       │  │
│  │  │   logs       │ │   (LGD)      │                       │  │
│  │  └──────────────┘ └──────────────┘                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Next.js Frontend                             │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌───────────────────┐ │  │
│  │  │  CO Dashboard│ │Branch Portal │ │  Auditor View     │ │  │
│  │  └──────────────┘ └──────────────┘ └───────────────────┘ │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

### Service Architecture

#### Backend: FastAPI (Python)
**Base URL:** `http://localhost:8000`

**Core Endpoints:**

```
POST   /api/v1/circulars/ingest          # Upload circular + trigger LexGraph
GET    /api/v1/circulars/{id}/status     # Pipeline execution status
GET    /api/v1/circulars/{id}/maps       # Get generated MAPs

POST   /api/v1/maps/{id}/assign          # Assign MAP to branch
GET    /api/v1/maps/{id}                 # Get MAP details (translated)
PATCH  /api/v1/maps/{id}/status          # Update MAP status

POST   /api/v1/evidence/upload           # Upload evidence (triggers SHA-256)
GET    /api/v1/evidence/{hash}/verify    # Verify evidence by hash
GET    /api/v1/evidence/{map_id}/vault   # Get vault entry for MAP

POST   /api/v1/telemetry/log             # Log interaction event (from frontend)
GET    /api/v1/telemetry/{map_id}/risk   # Get behavioral risk score

GET    /api/v1/dashboard/overview        # Compliance summary
GET    /api/v1/dashboard/heatmap         # Geographic compliance data
GET    /api/v1/branches                  # Branch list with LGD codes

POST   /api/v1/auth/login                # JWT authentication
```

#### Frontend: Next.js 14 + TypeScript + Tailwind CSS
**Screens:**
1. Compliance Officer Dashboard (`/dashboard`)
2. Circular Ingestion (`/circulars/new`)
3. MAP Management (`/maps`)
4. Branch Portal (`/branch/{lgd_code}`)
5. Auditor Evidence Vault (`/auditor/vault`)
6. Behavioral Risk Review (`/risk-review`)

---

### LangGraph State Machine

```python
# State definition
class ComplianceState(TypedDict):
    circular_text: str
    raw_maps: list[dict]
    validated_maps: list[MAP]
    validation_errors: list[str]
    routing_map: dict[str, list[str]]  # map_id -> [lgd_codes]
    iteration_count: int
    status: Literal["extracting", "validating", "routing", "complete", "failed"]

# Graph nodes
NODES = [
    "extract_maps",      # Sarvam-105B extraction
    "validate_maps",     # Pydantic schema check
    "route_maps",        # LGD code mapping
    "translate_maps",    # BharatGen multilingual output
]

# Conditional edge: if validation fails and iteration < 3 → loop back
# If iteration >= 3 → partial emit with error flags
```

---

### MAP Data Model

```python
class MAP(BaseModel):
    id: str                          # UUID
    circular_id: str                 # Parent circular
    title: str                       # Short title (max 100 chars)
    description: str                 # Full action description
    kpi: str                         # Measurable success criterion (REQUIRED)
    deadline: datetime               # Implementation deadline (REQUIRED)
    department: Department           # Enum: IT, OPERATIONS, RISK, HR, FINANCE
    evidence_type: EvidenceType      # Enum: POLICY_DOC, LOG_FILE, SCREENSHOT, REPORT
    geographic_scope: GeoScope       # Enum: NATIONAL, STATE, DISTRICT, BRANCH
    target_lgd_codes: list[str]      # List of applicable LGD codes
    translations: dict[str, str]     # language_code -> translated description
    status: MAPStatus               # PENDING, IN_PROGRESS, SUBMITTED, VERIFIED, QUARANTINED
    behavioral_risk_score: float     # 0.0 (safe) to 1.0 (high risk)
    evidence_hash: str | None        # SHA-256 of submitted evidence
```

---

### Evidence Vault Schema (MongoDB - Append Only)

```python
class EvidenceVaultEntry(BaseModel):
    _id: ObjectId                    # MongoDB ID
    map_id: str                      # Reference to MAP
    circular_id: str                 # Reference to circular
    branch_lgd_code: str             # Branch that submitted
    uploader_id: str                 # Branch manager user ID
    file_name: str                   # Original filename
    file_size_bytes: int
    sha256_hash: str                 # PRIMARY IMMUTABILITY MECHANISM
    uploaded_at: datetime            # Server-side timestamp (not client)
    behavioral_risk_score: float     # Risk score at time of submission
    telemetry_snapshot: dict         # Frozen telemetry at submission time
    vault_status: Literal["ACCEPTED", "QUARANTINED"]
    quarantine_reason: str | None    # Filled if status = QUARANTINED
```

**Invariant:** Evidence vault entries are NEVER updated or deleted. All state changes create new entries with `amendment_of` reference.

---

### Behavioral Risk Scoring Algorithm

```python
def calculate_risk_score(telemetry: TelemetryEvent) -> float:
    score = 0.0
    
    # Time-based signals
    hour = telemetry.submitted_at.hour
    if hour < 6 or hour > 22:        # Off-hours submission
        score += 0.3
    if telemetry.day_of_week >= 5:   # Weekend submission
        score += 0.1
    
    # Reading behavior signals
    reading_speed_wpm = telemetry.word_count / (telemetry.time_on_page_seconds / 60)
    if reading_speed_wpm > 800:      # Impossible reading speed
        score += 0.4
    elif reading_speed_wpm > 400:    # Very fast
        score += 0.2
    
    # Scroll behavior
    if telemetry.max_scroll_percent < 20:  # Didn't scroll through document
        score += 0.3
    
    # Immediate submission
    if telemetry.time_to_submit_seconds < 30:
        score += 0.2
    
    return min(score, 1.0)  # Cap at 1.0

QUARANTINE_THRESHOLD = 0.6  # Auto-quarantine above this score
FLAG_THRESHOLD = 0.3        # Flag for review above this score
```

---

### LGD Code Integration

**Data Source:** Ministry of Rural Development / NIC Local Government Directory
**Demo Subset:** Karnataka (29 districts, ~500 branches) + Tamil Nadu (38 districts, ~400 branches)

**Schema:**
```python
class Branch(BaseModel):
    lgd_code: str           # e.g., "2912345"
    branch_name: str
    district: str
    state: str
    classification: Literal["URBAN", "SEMI_URBAN", "RURAL", "METRO"]
    language_code: str      # e.g., "kn", "ta", "te", "ml", "hi"
    regional_head_id: str
    branch_manager_id: str
```

---

### Security Architecture

**Authentication:** JWT tokens (HS256, 24h expiry)
**Role-Based Access:**
- `COMPLIANCE_OFFICER`: Full access, can view all branches
- `REGIONAL_HEAD`: Access to branches in their LGD district cluster
- `BRANCH_MANAGER`: Access to own branch MAPs only
- `IT_ENGINEER`: Access to IT-department MAPs only
- `AUDITOR`: Read-only access to evidence vault

**Data Sovereignty:** All AI inference calls route to Sarvam AI (India-hosted) endpoints. No data leaves Indian infrastructure.

---

### Technology Stack

| Layer | Technology | Justification |
|---|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS | Modern, fast, TypeScript for correctness |
| Backend | Python 3.11, FastAPI | Async, Pydantic validation, fast development |
| AI Orchestration | LangGraph 0.2.x | Cyclical graph, state persistence, determinism |
| LLM (Primary) | Sarvam-105B API | Sovereign Indian AI, legal reasoning |
| LLM (Translation) | BharatGen Param2 17B | Indian language excellence |
| LLM (Fallback) | OpenAI GPT-4o | Demo reliability |
| Database | MongoDB Atlas | Document model, append-only collections |
| Hashing | Python hashlib (SHA-256) | Standard, verifiable |
| Auth | python-jose (JWT) | Lightweight, battle-tested |
| Maps | Leaflet.js / react-simple-maps | India branch visualization |
| Deployment | Docker Compose (local demo) | Simple, reproducible |

---

### Architecture Invariants (Never Violate These)

1. **Evidence vault is append-only.** No UPDATE or DELETE on `evidence_vault` collection.
2. **SHA-256 computed server-side only.** Client never computes hash. Trust only server timestamp.
3. **Behavioral telemetry is silent.** Frontend never notifies the branch manager that they are being monitored.
4. **MAPs with failed validation NEVER reach the database.** The LangGraph loop must resolve before persistence.
5. **Quarantined evidence NEVER counts toward compliance percentage.** Only ACCEPTED vault entries contribute.
6. **LGD routing is strict.** A branch with LGD code outside circular scope never receives a MAP.
