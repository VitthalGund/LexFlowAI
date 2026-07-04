# LexFlow AI: Cryptographic, Geo-Routed, and Behavioral Compliance Enforcement Architecture

## 1. Project Description

**LexFlow AI** is a sovereign, autonomous RegTech platform built specifically for Indian banking environments, focusing on the rigorous regulatory frameworks mandated by the Reserve Bank of India (RBI). It aims to solve the immense challenge of compliance tracking across thousands of branches. 

When the RBI issues a Master Circular, it historically creates weeks of manual tracking, email chains, and localized spreadsheets. LexFlow AI automates this entirely by ingesting the raw circular, passing it through an autonomous multi-agent pipeline (powered by LangGraph, Gemini 1.5 Flash, and local sovereign LLMs like Sarvam-2B), and extracting **Measurable Action Points (MAPs)**. 

### Key Features
1. **Autonomous Ingestion Pipeline:** Uses an advanced LangGraph state machine to parse unstructured PDF/text notifications from the RBI, enforce strict Pydantic JSON schemas, and extract actionable MAPs.
2. **Geo-Spatial Routing:** Leverages LGD (Local Government Directory) codes to route compliance tasks down to the exact target state, district, or specific branch level.
3. **TrustVault Cryptographic Ledger:** A secure, append-only MongoDB vault that captures branch-submitted evidence (e.g., screenshots, logs) and locks it with a SHA-256 cryptographic hash. This ensures evidence is tamper-proof for future audits.
4. **BehaviorGuard Risk Detection:** Employs silent telemetry hooks in the frontend to capture user behavior (copy-pasting, erratic mouse movements, rapid submissions). Submissions exceeding a dynamic risk threshold are automatically quarantined for human-in-the-loop compliance review.
5. **RemediationForge (IT Tasks):** Automatically generates secure payload scripts, bash commands, and configuration snippets for IT infrastructure compliance tasks, requiring an `IT_ENGINEER` approval gate.
6. **Sovereign Local AI & PWA Support:** Designed to work in secure, low-bandwidth bank branches. Features a Progressive Web App (PWA) architecture with Service Worker caching for offline reliability, and falls back to local Indian LLMs (Ollama + Sarvam) when cloud APIs (Gemini) are restricted.
7. **Multi-lingual Localization:** Automatically translates English MAP directives into regional languages (Kannada, Tamil, Malayalam, Hindi) to ensure ground-level staff understand compliance requirements natively.

---

## 2. Instructions to Run

To run LexFlow AI locally for testing and evaluation, follow these steps carefully. The application requires Node.js (for the Next.js frontend) and Python 3 (for the FastAPI backend), as well as a running instance of MongoDB.

### Prerequisites
- **Node.js** (v18+)
- **Python** (v3.10+)
- **MongoDB** (running locally on port `27017`)
- **Ollama** (optional, for local LLM extraction testing with `sarvam:2b`)

### Step 1: Set Up the Backend
1. Open a terminal and navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Mac/Linux:
   source venv/bin/activate
   ```
3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure the environment by ensuring your `.env` file exists or is loaded with:
   - `MONGODB_URI=mongodb://localhost:27017`
   - `GEMINI_API_KEY=<your_gemini_api_key>` (Optional: If omitted, it will fall back to Ollama or pre-seeded data).
5. Start the FastAPI server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   *Note: On startup, the backend automatically seeds the database with Demo Branches, Users, and Sample Circulars.*

### Step 2: Set Up the Frontend
1. Open a second terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install the Node modules:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
4. Access the portal at `http://localhost:3000`.

### Step 3: Test the Application
1. **Login:** Use the "Demo Quick Logins" on the login screen to sign in as the Chief Compliance Officer, a Branch Manager, or an RBI Auditor.
2. **Ingest Circular:** Log in as the Compliance Officer, navigate to "Ingest Circular", click "Pre-fill Demo RBI Circular", and hit "Trigger LexGraph Compliance Engine" to watch the agents extract JSON MAPs in real-time.
3. **Submit Evidence:** Log out, and log back in as a Branch Manager (e.g., Ravi Kumar). You will only see tasks assigned to your specific branch LGD code. Upload a dummy screenshot to fulfill a task.
4. **Audit Evidence:** Log back in as the Compliance Officer, navigate to the "TrustVault Ledger", and use the verification engine to select the file you just uploaded and verify its cryptographic SHA-256 integrity against the database ledger.

---

## 3. Current Status & Progress

The application is **Fully Functional, Responsive, and Demo-Ready**. Over the course of the latest development phase, the following enhancements were delivered:

- **Professional UI Overhaul:** Upgraded typography to `Inter` and `JetBrains Mono`. Implemented a responsive grid/flex layout with a mobile hamburger menu and slide-out sidebar, ensuring the dashboard looks enterprise-grade and functions flawlessly on mobile, tablet, and desktop.
- **PWA & Offline Resilience:** Registered a Service Worker (`sw.js`) and Web Manifest (`manifest.json`) to allow the app to cache critical assets and operate as an installable Progressive Web App. 
- **Real LLM Integration:** Replaced hardcoded mock data in the LangGraph extraction nodes with real calls to the **Gemini 1.5 Flash API**, with graceful fallbacks to localized/offline LLMs via Ollama.
- **Security Hardening:** Enforced strict Role-Based Access Control (RBAC). Branch managers are cryptographically restricted to uploading evidence only for their assigned LGD jurisdiction. 
- **Robust Telemetry & Review APIs:** Implemented fully functional backend routes to escalate, override, or permanently reject evidence that gets flagged by the BehaviorGuard risk scoring system.
