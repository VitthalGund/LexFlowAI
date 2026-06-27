# context/project-overview.md
## LexFlow AI — Product Definition, Goals, Features & Scope

### Product Vision
LexFlow AI is an autonomous, multi-agent compliance enforcement architecture built for Canara Bank's decentralized branch network. It converts RBI regulatory circulars into cryptographically-enforced, geographically-routed, evidence-validated Measurable Action Points (MAPs) — making compliance fraud technically impossible.

---

### Problem Being Solved
Canara Bank operates 3,000+ branches across India. When RBI issues a circular:
1. A compliance officer manually reads it (days)
2. They email tasks to regional heads (days)
3. Regional heads forward to branch managers (days)
4. Branch managers click "Done" with zero evidence (instant fraud)
5. RBI audit reveals non-compliance → penalty (months later)

**LexFlow eliminates every step of this failure chain.**

---

### Target Users
| Persona | Role | Primary Use |
|---|---|---|
| Chief Compliance Officer | HO Bengaluru | Monitor all-branch compliance status in real time |
| Branch Manager | Tier-2/3 branches | Receive tasks in regional language, submit evidence |
| IT Compliance Engineer | Central IT | Receive auto-generated remediation payloads |
| RBI Inspector | External Auditor | Access cryptographically verified evidence vault |

---

### Core Features (MVP)

#### 1. LexGraph — Cyclical MAP Extraction & Validation Engine
- Input: RBI circular PDF or text
- LangGraph state machine with Extraction Agent, OCR Validation Agent, and Remediation loops
- Output: Structured JSON MAPs with KPI, deadline, department, evidence type
- Validation: OCR verification via graph conditional edges (OCR failure triggers recursion)
- Model: Sarvam-105B (primary) / OpenAI GPT-4o (fallback)

#### 2. TrustVault — Cryptographic Evidence Lock
- Every uploaded evidence file receives SHA-256 hash on receipt
- Hash + timestamp + uploader metadata written to append-only MongoDB collection
- Verification endpoint: auditors can re-hash to confirm authenticity
- QR code generation for physical audit verification

#### 3. BehaviorGuard — Anti-Fraud Interaction Telemetry
- Frontend tracks: time-on-page, scroll depth, reading speed, submission timestamp
- Risk scoring: flags suspicious patterns (4-second policy read, 2AM submission)
- Silent flagging — branch manager is not warned
- Flagged submissions quarantined from TrustVault pending central review
- Central compliance officer sees risk flags on dashboard

#### 4. GeoMAP Router — LGD Code-Based Branch Routing
- Circular scope extracted (national / state / urban-rural classification)
- Mapped to LGD codes → exact branch list generated
- Only in-scope branches receive MAPs
- Visual map showing compliance coverage by geography

#### 5. BharatVoice — Multilingual MAP Delivery
- MAPs translated to branch's regional language (Kannada, Tamil, Telugu, Malayalam, Hindi)
- Language determined by branch LGD region
- Evidence upload prompts also translated
- Model: BharatGen Param2 17B / Sarvam Translation API

---

### Stretch Features (If Time Permits)

#### 6. CompliancePulse — Executive Dashboard
- Live heatmap: compliance % by state, region, branch
- Drill-down: task status, evidence quality, behavioral risk flags, deadline countdown
- One-click RBI-ready audit report export (PDF)

#### 7. RemediationForge — IT Payload Auto-Generator
- For IT-specific mandates: extracts parameters → generates JSON API payload
- IT engineer reviews → approves in one click
- Mock core banking API integration for demo

#### 8. CircularSentinel — Automated RBI Monitoring
- Python scraper monitoring RBI website for new circulars
- On detection: auto-triggers LexGraph pipeline
- No human input required to initiate compliance workflow

---

### Hackathon Scope Boundaries

**In scope (must demo):**
- Circular ingestion → MAP extraction → validation loop
- Branch routing via LGD codes (Karnataka + Tamil Nadu subset)
- Evidence upload → SHA-256 hash → TrustVault
- Behavioral telemetry → risk flag → quarantine logic
- Multilingual output (English + Kannada + Hindi)
- Basic compliance status dashboard

**Out of scope (clearly label as future work):**
- Real core banking API integration (mock/simulate)
- Full India LGD dataset (demo subset only)
- Production-grade authentication (basic JWT for demo)
- Real-time RBI website scraping (use pre-loaded demo circulars)

---

### Unique Value Proposition
> **LexFlow AI transforms RBI compliance from a retroactive paper audit into a real-time, cryptographically enforced, geographically-routed enforcement loop — making regulatory fraud technically impossible.**

---

### Hackathon Evaluation Mapping

| Criterion (25 pts each) | LexFlow Feature |
|---|---|
| Problem Understanding | Targets execution failure, not comprehension failure; addresses Canara Bank's specific decentralized branch risk |
| Originality & Innovation | BehaviorGuard (no competitor does behavioral telemetry); TrustVault (no competitor prevents evidence manipulation cryptographically) |
| Technical Implementation | LangGraph state machine + SHA-256 immutable vault + LGD routing |
| Real-World Applicability | LGD codes (government-standard), DPDP Act compliance, Sarvam AI (sovereign data residency) |
