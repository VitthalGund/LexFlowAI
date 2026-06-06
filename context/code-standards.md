# context/code-standards.md
## LexFlow AI — Implementation Rules & Conventions

---

### Python / FastAPI Standards

#### File Structure
```
backend/
├── main.py                  # FastAPI app, CORS, router registration
├── requirements.txt
├── .env.example
├── app/
│   ├── __init__.py
│   ├── core/
│   │   ├── config.py        # Settings (pydantic-settings)
│   │   ├── database.py      # MongoDB connection
│   │   ├── security.py      # JWT auth, password hashing
│   │   └── dependencies.py  # FastAPI Depends() functions
│   ├── models/
│   │   ├── circular.py      # Pydantic models for circulars
│   │   ├── map.py           # MAP model + enums
│   │   ├── evidence.py      # Evidence vault model
│   │   ├── telemetry.py     # Behavioral telemetry model
│   │   └── branch.py        # Branch + LGD model
│   ├── routers/
│   │   ├── circulars.py
│   │   ├── maps.py
│   │   ├── evidence.py
│   │   ├── telemetry.py
│   │   ├── branches.py
│   │   ├── dashboard.py
│   │   └── auth.py
│   ├── services/
│   │   ├── lexgraph.py      # LangGraph pipeline
│   │   ├── extraction.py    # Sarvam AI extraction agent
│   │   ├── validation.py    # MAP validation agent
│   │   ├── routing.py       # LGD routing service
│   │   ├── translation.py   # BharatGen translation service
│   │   ├── vault.py         # SHA-256 hashing + evidence vault
│   │   ├── behavior.py      # Risk scoring algorithm
│   │   └── lgd.py           # LGD code lookup + mapping
│   └── utils/
│       ├── hashing.py       # SHA-256 utilities
│       ├── telemetry.py     # Telemetry processing
│       └── demo_data.py     # Seed data for hackathon demo
```

#### Coding Rules
- **All models use Pydantic v2.** No raw dicts passed between layers.
- **All DB operations are async** using `motor` (async MongoDB driver).
- **No raw SQL / ORM.** Pure MongoDB with motor.
- **Every endpoint has a response model.** Never return raw dicts.
- **Error responses use HTTPException** with meaningful detail strings.
- **All datetime values are UTC.** Convert to IST only at the API response layer.
- **Environment variables via pydantic-settings.** Never hardcode credentials.
- **SHA-256 always computed server-side.** Client upload triggers immediate hashing.

#### Naming Conventions
```python
# Models: PascalCase
class MAPDocument(BaseModel): ...

# Enums: PascalCase class, SCREAMING_SNAKE_CASE values
class MAPStatus(str, Enum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"

# Functions: snake_case
async def get_map_by_id(map_id: str) -> MAPDocument: ...

# Constants: SCREAMING_SNAKE_CASE
QUARANTINE_THRESHOLD = 0.6
SHA256_ALGORITHM = "sha256"

# Route paths: kebab-case
@router.post("/evidence/upload")
@router.get("/maps/{map_id}/telemetry-risk")
```

#### FastAPI Router Pattern
```python
# routers/evidence.py
router = APIRouter(prefix="/api/v1/evidence", tags=["Evidence Vault"])

@router.post("/upload", response_model=EvidenceVaultResponse, status_code=201)
async def upload_evidence(
    map_id: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> EvidenceVaultResponse:
    """Upload evidence for a MAP. Automatically computes SHA-256 hash."""
    ...
```

---

### LangGraph Agent Standards

#### State Machine Rules
- **State is a TypedDict.** All fields typed explicitly.
- **Nodes are pure functions** (or async functions). No side effects except to state.
- **Max validation iterations = 3.** After 3 loops, emit partial MAPs with error flags.
- **Every MAP must pass schema validation before routing.**
- **LLM prompts are defined in `prompts/` directory** as constants, not inline strings.

```python
# services/lexgraph.py
from langgraph.graph import StateGraph, END

def build_lexgraph() -> CompiledGraph:
    graph = StateGraph(ComplianceState)
    
    graph.add_node("extract", extraction_node)
    graph.add_node("validate", validation_node)
    graph.add_node("route", routing_node)
    graph.add_node("translate", translation_node)
    
    graph.set_entry_point("extract")
    graph.add_edge("extract", "validate")
    graph.add_conditional_edges(
        "validate",
        should_loop_or_proceed,  # Returns "extract" or "route"
        {"extract": "extract", "route": "route"}
    )
    graph.add_edge("route", "translate")
    graph.add_edge("translate", END)
    
    return graph.compile()
```

---

### Frontend / Next.js Standards

#### File Structure
```
frontend/
├── package.json
├── tailwind.config.js
├── next.config.js
├── tsconfig.json
├── .env.local.example
├── app/
│   ├── layout.tsx
│   ├── page.tsx              # Landing/login
│   ├── dashboard/
│   │   └── page.tsx
│   ├── circulars/
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   └── [id]/page.tsx
│   ├── maps/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── branch/
│   │   └── [lgd]/
│   │       ├── page.tsx
│   │       └── submit/[mapId]/page.tsx
│   ├── vault/
│   │   └── page.tsx
│   └── risk-review/
│       └── page.tsx
├── components/
│   ├── ui/                   # Base components
│   │   ├── Badge.tsx
│   │   ├── Card.tsx
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── Modal.tsx
│   ├── maps/
│   │   ├── MAPCard.tsx
│   │   ├── MAPStatusBadge.tsx
│   │   └── MAPList.tsx
│   ├── evidence/
│   │   ├── EvidenceUploader.tsx  # Includes telemetry capture
│   │   ├── EvidenceCard.tsx
│   │   └── HashDisplay.tsx
│   ├── dashboard/
│   │   ├── StatCard.tsx
│   │   ├── ComplianceHeatmap.tsx
│   │   └── RiskAlertPanel.tsx
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   └── telemetry/
│       └── TelemetryCapture.tsx  # Invisible component
├── hooks/
│   ├── useMAPs.ts
│   ├── useEvidence.ts
│   ├── useTelemetry.ts       # Behavioral tracking hook
│   └── useAuth.ts
├── lib/
│   ├── api.ts                # API client (axios instance)
│   ├── auth.ts               # JWT handling
│   └── telemetry.ts          # Telemetry event builders
└── types/
    ├── map.ts
    ├── evidence.ts
    ├── branch.ts
    └── user.ts
```

#### TypeScript Rules
- **Strict mode enabled.** No `any` types. No type assertions (`as`) unless documented.
- **API responses are typed.** All fetch calls use typed response interfaces.
- **Component props are typed.** No untyped props.
- **Use `interface` for objects, `type` for unions/aliases.**

```typescript
// types/evidence.ts
export interface EvidenceVaultEntry {
  id: string;
  mapId: string;
  branchLgdCode: string;
  uploaderName: string;
  fileName: string;
  fileSizeBytes: number;
  sha256Hash: string;
  uploadedAt: string;  // ISO 8601 UTC
  behavioralRiskScore: number;
  vaultStatus: 'ACCEPTED' | 'QUARANTINED';
  quarantineReason?: string;
}
```

#### Telemetry Capture (Critical — Invisible to User)
```typescript
// hooks/useTelemetry.ts
export function useTelemetry(mapId: string, wordCount: number) {
  const startTime = useRef(Date.now());
  const maxScroll = useRef(0);
  const interactions = useRef<TelemetryEvent[]>([]);
  
  // Track scroll depth
  useEffect(() => {
    const handler = () => {
      const scrollPct = (window.scrollY / document.body.scrollHeight) * 100;
      maxScroll.current = Math.max(maxScroll.current, scrollPct);
    };
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);
  
  // Submit telemetry before evidence upload
  const submitTelemetry = async () => {
    const elapsed = (Date.now() - startTime.current) / 1000;
    await api.post('/api/v1/telemetry/log', {
      mapId,
      timeOnPageSeconds: elapsed,
      maxScrollPercent: maxScroll.current,
      wordCount,
      submittedAt: new Date().toISOString(),
    });
  };
  
  return { submitTelemetry };
}
```

---

### Testing Standards

#### Backend Tests (pytest)
```
tests/
├── unit/
│   ├── test_hashing.py          # SHA-256 determinism
│   ├── test_risk_scoring.py     # Behavioral risk algorithm
│   ├── test_lgd_routing.py      # LGD code mapping
│   └── test_map_validation.py   # Pydantic validation
├── integration/
│   ├── test_evidence_vault.py   # Upload → hash → vault
│   ├── test_lexgraph.py         # Full pipeline test
│   └── test_api_endpoints.py    # FastAPI test client
└── fixtures/
    ├── rbi_circular_sample.txt
    └── lgd_data_sample.json
```

#### Test Cases (Critical Path)
1. `test_sha256_immutability`: Same file always produces same hash
2. `test_vault_append_only`: Verify no UPDATE/DELETE on vault collection
3. `test_quarantine_threshold`: Risk score ≥ 0.6 → quarantine
4. `test_lgd_routing_scope`: National circular reaches all branches; state circular reaches only that state
5. `test_map_validation_loop`: Incomplete MAP triggers validation loop; resolves on retry
6. `test_behavioral_impossible_read`: 4-second read of 5000-word policy → risk score ≥ 0.6

---

### Environment Variables

```bash
# .env.example
# MongoDB
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=lexflow_hackathon

# JWT
JWT_SECRET_KEY=your-secret-key-min-32-chars
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

# AI APIs
SARVAM_API_KEY=
SARVAM_API_BASE=https://api.sarvam.ai/v1
BHARATGEN_API_KEY=
OPENAI_API_KEY=  # Fallback only

# App
APP_ENV=development
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:3000

# Demo
SEED_DEMO_DATA=true
DEMO_CIRCULAR_PATH=./demo_data/rbi_circular_sample.txt
```

---

### Git Conventions

```
feat: add SHA-256 evidence hashing to vault service
fix: correct LGD routing for semi-urban branch classification
docs: update API endpoint documentation
test: add behavioral risk scoring unit tests
refactor: extract telemetry logic to dedicated hook
```

Branch naming: `feature/trust-vault`, `fix/lgd-routing-bug`, `demo/seed-data`
