# LexFlow AI ⚖️

**Autonomous Multi-Agent Compliance Enforcement Platform for Canara Bank**

LexFlow AI transforms RBI regulatory circulars from retroactive paper audit trails into real-time, georouted, cryptographically-enforced, and telemetry-validated compliance flows. It uses sovereign Indian local LLMs to eliminate "tick-box" compliance fraud.

---

## Technical Architecture

```
[RBI Circular Notification Input]
                │
                ▼
  ┌──────────────────────────────────────────────────────────┐
  │              AGENT LAYER (LangGraph Node Cycle)          │
  │                                                          │
  │  ┌──────────────┐      ┌──────────────┐     ┌─────────┐  │
  │  │  Extraction  │ ───> │  Validation  │ ──> │ Routing │  │
  │  │ (Ollama 2B)  │ <─── │   (Schema)   │     │  (LGD)  │  │
  │  └──────────────┘      └──────────────┘     └─────────┘  │
  └──────────────────────────────────────────────────────────┘
                                │
                                ▼
  ┌──────────────────────────────────────────────────────────┐
  │                     COMPLIANCE CORE                      │
  │                                                          │
  │  ┌────────────────────┐   ┌───────────────────────────┐  │
  │  │ BehaviorGuard      │   │ TrustVault (SHA-256)      │  │
  │  │ (Silent Telemetry) │   │ (Append-Only Ledger)      │  │
  │  └────────────────────┘   └───────────────────────────┘  │
  └──────────────────────────────────────────────────────────┘
```

1. **LexGraph Parser Node:** Uses a local Ollama LLM (`gaganyatri/sarvam-2b-v0.5:latest`) to ingest RBI circular texts and extract MAPs (Measurable Action Points).
2. **Schema Validation Node:** Pydantic models validate titles, KPIs, and scope criteria. If incomplete, it loops back to re-extract (max 3 times).
3. **GeoMAP Router Node:** Mapped to Gov LGD (Local Government Directory) codes for Karnataka, Tamil Nadu, Kerala, and Maharashtra to assign tasks only to branch outlets in scope.
4. **BehaviorGuard Telemetry:** Silently tracks manager interaction speed, scroll depth, active click counts, and tab-switches to detect fraudulent checkbox approvals.
5. **TrustVault Ledger:** Locks validated evidence files under server-side SHA-256 checksum receipts in an append-only collection.

---

## 🚀 Hackathon 2.5-Minute Demo Script

*A step-by-step narrative to guide judges through the live application.*

### Step 1: Ingestion & LexGraph (30 seconds)
1. Log in as **Chief Compliance Officer** (Arjun Mehta).
2. Go to **Ingest Circular** and click **"Pre-fill Demo RBI circular"** (loads the TLS 1.3/MFA cybersecurity direction).
3. Click **"Trigger LexGraph Compliance Engine"**.
4. Show the active stepper animation indicating the LangGraph nodes working offline.
5. Explain: *"Our multi-agent pipeline has parsed the RBI circular, validated fields against schemas, localized the templates to regional languages, and routed them to branch LGD clusters in Karnataka and Tamil Nadu."*

### Step 2: Legit Branch Manager Flow (30 seconds)
1. Click **Sign Out** and quick log in as **Priya Nair (Manager, Thrissur LGD 3202001)**.
2. The dashboard shows the task description translated to Malayalam (ML).
3. Click **Submit Evidence**, select a PDF, scroll down, and submit.
4. The system calculates a low risk score (`0.12`) and successfully writes the file to the TrustVault ledger, returning a **SHA-256 Receipt**.

### Step 3: Telemetry Evasion Trigger (30 seconds)
1. Sign out and quick log in as **Ravi Kumar (Mysuru LGD 2902002)**.
2. Click **Submit Evidence** for the MFA update task (translated to Kannada).
3. **Trigger Fraud:** Immediately drag a dummy file and click submit in under 5 seconds without scrolling.
4. The screen prompts a **"Validation Check Failed"** warning: *"BehaviorGuard has quarantined the upload due to compliance verification anomalies."*

### Step 4: Auditor & Risk Queue Review (45 seconds)
1. Sign out and log in as **Arjun Mehta (Compliance Officer)**.
2. Go to the **Risk Review Queue** to inspect the quarantined alerts. Show the telemetry snapshot: *Glanced for 4.2 seconds, 3% scroll depth, impossible 17,000 WPM reading speed, 2 tab-switches.*
3. Go to the **TrustVault Ledger**. Select Priya's file in the **Auditor Verification Engine** to compute its SHA-256 hash client-side and match it live against the ledger to prove its mathematical authenticity.

---

## 🛠️ Local Installation & Setup

Ensure you have **Python 3.10+**, **Node.js 18+**, and **MongoDB** running locally.

### 1. Ollama Config
Install Ollama and pull the 2B sovereign LLM:
```bash
ollama pull gaganyatri/sarvam-2b-v0.5:latest
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m app.utils.demo_data    # Seed database
uvicorn main:app --reload
```

### 3. Frontend Setup
```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

---

## 🧪 Verification & Test Results
To run the automated test suite verifying cryptographics, LGD routing, and BehaviorGuard quarantine rules:
```bash
cd backend
$env:PYTHONPATH="."
venv\Scripts\python -m pytest
```
Output:
```
tests\integration\test_evidence_vault.py .                               [  9%]
tests\unit\test_hashing.py .                                             [ 18%]
tests\unit\test_lgd_routing.py ...                                       [ 45%]
tests\unit\test_map_validation.py ...                                    [ 72%]
tests\unit\test_risk_scoring.py ...                                      [100%]

============================= 11 passed in 1.88s ==============================
```
