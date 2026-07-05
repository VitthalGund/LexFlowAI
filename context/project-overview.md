# Project Overview: LexFlow AI (Iteration 3)

## Core Objective
An autonomous, zero-trust regulatory enforcement engine engineered to process unformatted regulatory documentation, distribute precise operational mandates via local administrative codes, and enforce execution parity using multimodal verification nodes and tamper-proof WORM storage parameters.

## Scope & Core Modules
1. **Structural PDF Ingestion Engine:** Utilizes precise coordinate layout parsing to read complex regulatory tables and policy guidelines directly without format conversion artifacting.
2. **Cyclical Validation Graph:** LangGraph architecture running an adversarial cycle where evaluation nodes verify both raw text extraction data and visual compliance tokens (signatures/seals). Extended with an adversarial **Red-Team Auditor Agent** node to critique KPI clarity.
3. **Air-Gapped Remediation Engine:** Compiles configuration directives into verified, cryptographically signed payload structures for processing within isolated private bank operating grids.
4. **SentinelVision Forensics:** Multimodal evidence tampering analyzer checking EXIF metadata, ELA pixel levels, and PDF xref integrity.
5. **LexFlow Horizon:** Automated RSS monitoring and predictive pre-compliance mapper scanning RBI Speeches and Publications.
6. **ContinuumGuard:** Policy-as-Code telemetry evaluator comparing live system status configurations against generated Rego rules via OPA.

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
- Input: RBI circular PDF, text, or RSS notifications
- LangGraph state machine with Extraction Agent, OCR Validation Agent, and Remediation loops
- Output: Structured JSON MAPs with KPI, deadline, department, evidence type
- Validation: OCR verification via graph conditional edges (OCR failure triggers recursion)
- **Red-Team Auditor:** Dedicated critique node flags KPI clarity and misinterpretation risks, triggering loop-backs on HIGH severity alerts (capped at 3 iterations)
- Model: Sarvam-2B / Gemini-3.1-Flash-Lite (primary) / OpenAI GPT-4o (fallback)

#### 2. TrustVault — Cryptographic Evidence Lock
- Every uploaded evidence file receives SHA-256 hash on receipt
- Hash + timestamp + uploader metadata written to append-only MongoDB collection
- Verification endpoint: auditors can re-hash to confirm authenticity
- QR code generation for physical audit verification
- **SentinelVision Forensics:** Analyzes uploads for Error Level Analysis (ELA) anomalies, EXIF camera signatures, and PDF structural edits, automatically quarantining suspicious evidence.

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

#### 7. RemediationForge — IT Payload Auto-Generator (Implemented)
- For IT-specific mandates: extracts parameters → generates JSON API payload, Shell scripts, or RPA tasks
- IT engineer reviews → approves in one click
- Mock core banking API integration for demo

#### 8. CircularSentinel / RegulatorWatcher — Automated RBI Monitoring (Implemented)
- RSS poller scanning RBI Notifications, Speeches, and Publications
- On detection: auto-runs triage and ingests high-confidence items into LexGraph
- Triage queue lists low-confidence items for manual Officer review

#### 9. LexFlow Horizon — Foresight Scanning (Implemented)
- Pulls advisory Speeches/Publications to generate speculative pre-compliance MAP blueprints
- Officers can trigger "Start Prep" to begin early risk mitigation

#### 10. ContinuumGuard — Policy-as-Code (Implemented)
- Compiles MAP KPIs into Rego policies deployed to Open Policy Agent (OPA)
- Periodically matches live branch telemetry settings and raises alarms on compliance drifts (e.g. TLS/MFA downgrades)

---

### Hackathon Scope Boundaries

**In scope (must demo):**
- RSS notification scanning, triage queue, and manual/auto-ingest
- Circular ingestion → MAP extraction → validation & Red-Team critique loops
- SentinelVision Forensics (ELA + PDF + EXIF) on uploaded files
- OPA Rego policy-as-code evaluations and drift simulation controls
- Branch routing via LGD codes (Karnataka + Tamil Nadu subset)
- Evidence upload → SHA-256 hash → TrustVault
- Behavioral telemetry → risk flag → quarantine logic
- Multilingual output (English + Kannada + Hindi + Tamil + Malayalam)
- Basic compliance status dashboard + Horizon foresight view

**Out of scope (clearly label as future work):**
- Real core banking API integration (mock/simulate telemetry)
- Full India LGD dataset (demo subset only)
- Production-grade authentication (basic JWT for demo)

---

### Unique Value Proposition
> **LexFlow AI transforms RBI compliance from a retroactive paper audit into a real-time, cryptographically enforced, geographically-routed enforcement loop — making regulatory fraud technically impossible.**

---

### Hackathon Evaluation Mapping

| Criterion (25 pts each) | LexFlow Feature |
|---|---|
| Problem Understanding | Targets execution failure, not comprehension failure; addresses Canara Bank's specific decentralized branch risk |
| Originality & Innovation | BehaviorGuard (behavioral telemetry); TrustVault + SentinelVision (media forensics + SHA-256 immutability); Horizon (predictive pre-compliance blueprints) |
| Technical Implementation | LangGraph state machine + Red-Team critique loops + OPA/Rego policy engine + LGD routing |
| Real-World Applicability | LGD codes (government-standard), DPDP Act compliance, Sarvam AI (sovereign data residency) |

