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

## 🛠️ Detailed Installation & Setup Guide

This guide details two ways to run the LexFlow AI platform: **Option 1: Manual Setup (Local)** and **Option 2: Docker Compose Setup (One-Click)**.

### 📋 System Prerequisites
Ensure you have the following installed on your machine:
* **Node.js**: `v18.0.0` or higher (v20+ recommended)
* **Python**: `3.10.x` or `3.11.x`
* **MongoDB**: A running local MongoDB Community Server (port `27017`) or access to a MongoDB Atlas cluster.
* **Ollama**: Required for running the sovereign local 2B LLM.

---

### ⚙️ Environment Configuration

Before running, configure the environment variables for both the backend and frontend.

#### 1. Backend Config
Create or inspect the [backend/.env](file:///c:/Users/vitth/OneDrive/Documents/SEM%20VI/SuRaksha/LexFlowAI/backend/.env) file:
```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=lexflow_hackathon
JWT_SECRET_KEY=lexflow-super-secret-key-for-hackathon-min-32-chars
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440
USE_LOCAL_LLM=true
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gaganyatri/sarvam-2b-v0.5:latest
USE_OPENAI_FALLBACK=false
APP_ENV=development
SEED_DEMO_DATA=true
```

#### 2. Frontend Config
Create or inspect the [frontend/.env.local](file:///c:/Users/vitth/OneDrive/Documents/SEM%20VI/SuRaksha/LexFlowAI/frontend/.env.local) file:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

### 🚀 Option 1: Manual Local Setup (Step-by-Step)

#### Step 1. Configure and Run Ollama
1. Download and install [Ollama](https://ollama.com).
2. Start the Ollama application or service.
3. In your terminal, run the following command to download the 2B sovereign banking model:
   ```bash
   ollama pull gaganyatri/sarvam-2b-v0.5:latest
   ```

#### Step 2. Run MongoDB Locally
Ensure your local MongoDB instance is started and running:
* **Windows (Services)**: Start `MongoDB Database Server` via the Services app (`services.msc`) or run:
  ```powershell
  net start MongoDB
  ```
* **macOS (Homebrew)**: Run:
  ```bash
  brew services start mongodb-community
  ```
* **Linux (systemd)**: Run:
  ```bash
  sudo systemctl start mongod
  ```

#### Step 3. Set Up and Launch Backend (FastAPI)
1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a Python virtual environment:
   ```bash
   python -m venv venv
   ```
3. Activate the virtual environment:
   * **Windows (PowerShell)**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   * **Windows (Command Prompt)**:
     ```cmd
     .\venv\Scripts\activate.bat
     ```
   * **macOS / Linux (Bash/Zsh)**:
     ```bash
     source venv/bin/activate
     ```
4. Install all python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Seed the database with demo users, branches, and sample circular status scenarios:
   ```bash
   python -m app.utils.demo_data
   ```
6. Start the FastAPI development server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   The backend API will now be running at `http://localhost:8000`.

#### Step 4. Set Up and Launch Frontend (Next.js)
1. Open a new terminal session and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install the frontend npm packages:
   ```bash
   npm install --legacy-peer-deps
   ```
3. Launch the Next.js development server:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:3000` to interact with the application.

---

### 🐳 Option 2: Docker Compose Setup (One-Click)

If you have Docker and Docker Compose installed, you can spin up the database, backend, and frontend containers automatically.

> [!IMPORTANT]
> Since Ollama runs on your host machine to utilize GPU hardware acceleration, make sure **Ollama is started on your host machine** and model `gaganyatri/sarvam-2b-v0.5:latest` has been pulled before running docker-compose.

1. Start the Docker Desktop app or engine.
2. In the project root directory, run:
   ```bash
   docker compose up --build
   ```
3. This orchestrates:
   * **MongoDB container** mapping database storage to port `27017`
   * **FastAPI Backend container** running on port `8000` (auto-configured to connect to host Ollama using `host.docker.internal`)
   * **Next.js Frontend container** running on port `3000`
4. Access the web app at `http://localhost:3000`.

---

### 🧪 Verification & Test Suites

To verify the mathematical hashing determinism, LGD routing engines, and BehaviorGuard anti-fraud quarantine thresholds, execute the automated test suites:

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Activate your virtual environment:
   * **Windows**: `.\venv\Scripts\Activate.ps1`
   * **macOS/Linux**: `source venv/bin/activate`
3. Execute the tests:
   * **Windows (PowerShell)**:
     ```powershell
     $env:PYTHONPATH="."
     venv\Scripts\python -m pytest
     ```
   * **macOS / Linux**:
     ```bash
     export PYTHONPATH="."
     python -m pytest
     ```

#### Expected Test Output:
```text
============================= test session starts =============================
platform win32 -- Python 3.10.9, pytest-8.2.2, pluggy-1.6.0
rootdir: C:\Users\vitth\OneDrive\Documents\SEM VI\SuRaksha\LexFlowAI\backend
plugins: anyio-4.13.0, asyncio-0.23.7
asyncio: mode=strict
collected 11 items

tests\integration\test_evidence_vault.py .                               [  9%]
tests\unit\test_hashing.py .                                             [ 18%]
tests\unit\test_lgd_routing.py ...                                       [ 45%]
tests\unit\test_map_validation.py ...                                    [ 72%]
tests\unit\test_risk_scoring.py ...                                      [100%]

============================= 11 passed in 1.88s ==============================
```

