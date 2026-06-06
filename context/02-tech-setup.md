# plan/02-tech-setup.md
## LexFlow AI — Tech Stack Setup Guide
### Exact Commands to Run from Zero to Working Demo

---

## Step 1: Repository Structure

```bash
mkdir lexflow-ai && cd lexflow-ai
mkdir -p backend/app/{core,models,routers,services,utils}
mkdir -p backend/{tests/unit,tests/integration,tests/fixtures}
mkdir -p backend/demo_data
mkdir -p frontend/app/{dashboard,circulars,maps,branch,vault,risk-review}
mkdir -p frontend/components/{ui,maps,evidence,dashboard,layout,telemetry}
mkdir -p frontend/{hooks,lib,types}
mkdir -p context plan docs
touch docker-compose.yml README.md
```

---

## Step 2: Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install \
  fastapi==0.111.0 \
  uvicorn[standard]==0.30.0 \
  motor==3.4.0 \
  pydantic==2.7.1 \
  pydantic-settings==2.3.0 \
  python-jose[cryptography]==3.3.0 \
  passlib[bcrypt]==1.7.4 \
  python-multipart==0.0.9 \
  langgraph==0.2.0 \
  langchain-core==0.2.0 \
  langchain-openai==0.1.8 \
  openai==1.35.0 \
  httpx==0.27.0 \
  pymupdf==1.24.5 \
  python-dotenv==1.0.1 \
  pytest==8.2.2 \
  pytest-asyncio==0.23.7 \
  httpx==0.27.0

pip freeze > requirements.txt
```

**Create `backend/main.py`:**
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import circulars, maps, evidence, telemetry, branches, dashboard, auth

app = FastAPI(
    title="LexFlow AI",
    description="Autonomous Regulatory Compliance Enforcement Platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(circulars.router)
app.include_router(maps.router)
app.include_router(evidence.router)
app.include_router(telemetry.router)
app.include_router(branches.router)
app.include_router(dashboard.router)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "LexFlow AI"}
```

---

## Step 3: Frontend Setup

```bash
cd frontend

# Create Next.js 14 project (if starting fresh)
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir=false

# Install additional dependencies
npm install \
  axios \
  react-simple-maps \
  recharts \
  react-dropzone \
  lucide-react \
  @radix-ui/react-dialog \
  @radix-ui/react-badge \
  @radix-ui/react-progress \
  date-fns \
  js-sha256

npm install -D @types/react-simple-maps
```

---

## Step 4: MongoDB Atlas Setup

1. Go to https://cloud.mongodb.com
2. Create free cluster (M0 Sandbox)
3. Create database: `lexflow_hackathon`
4. Create collections:
   - `circulars`
   - `maps`
   - `evidence_vault`
   - `telemetry_logs`
   - `branches`
   - `users`

5. Get connection string → add to `.env`

**Enforce append-only on evidence_vault (application layer):**
```python
# In vault service, never call update_one/delete_one on evidence_vault
# Use MongoDB Atlas App Services rules if time permits:
# Rule: evidence_vault → deny "update" and "delete" actions
```

---

## Step 5: Environment Variables

```bash
# backend/.env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true
MONGODB_DB_NAME=lexflow_hackathon

JWT_SECRET_KEY=lexflow-super-secret-key-for-hackathon-min-32-chars
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

# Primary: Sarvam AI
SARVAM_API_KEY=your_sarvam_key
SARVAM_BASE_URL=https://api.sarvam.ai

# Fallback: OpenAI (reliable for demo)
OPENAI_API_KEY=sk-your-openai-key
USE_OPENAI_FALLBACK=true  # Set to true if Sarvam unavailable

APP_ENV=development
CORS_ORIGINS=["http://localhost:3000"]
SEED_DEMO_DATA=true
```

```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Step 6: Seed Demo Data

```python
# backend/app/utils/demo_data.py
"""Run this script once to seed all demo data."""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
import json
import os

DEMO_BRANCHES = [
    {"lgd_code": "2902001", "branch_name": "MG Road, Bengaluru", "district": "Bengaluru Urban", 
     "state": "Karnataka", "state_code": "29", "classification": "METRO", 
     "language_code": "kn", "lat": 12.9716, "lng": 77.5946},
    {"lgd_code": "2902002", "branch_name": "Mysuru Main Branch", "district": "Mysuru",
     "state": "Karnataka", "state_code": "29", "classification": "URBAN",
     "language_code": "kn", "lat": 12.2958, "lng": 76.6394},
    {"lgd_code": "2902003", "branch_name": "Hubli Branch", "district": "Dharwad",
     "state": "Karnataka", "state_code": "29", "classification": "URBAN",
     "language_code": "kn", "lat": 15.3647, "lng": 75.1240},
    {"lgd_code": "3302001", "branch_name": "Chennai Anna Salai", "district": "Chennai",
     "state": "Tamil Nadu", "state_code": "33", "classification": "METRO",
     "language_code": "ta", "lat": 13.0827, "lng": 80.2707},
    {"lgd_code": "3302002", "branch_name": "Coimbatore Main", "district": "Coimbatore",
     "state": "Tamil Nadu", "state_code": "33", "classification": "URBAN",
     "language_code": "ta", "lat": 11.0168, "lng": 76.9558},
    {"lgd_code": "3202001", "branch_name": "Thrissur Branch", "district": "Thrissur",
     "state": "Kerala", "state_code": "32", "classification": "URBAN",
     "language_code": "ml", "lat": 10.5276, "lng": 76.2144},
    {"lgd_code": "3202002", "branch_name": "Kochi Main Branch", "district": "Ernakulam",
     "state": "Kerala", "state_code": "32", "classification": "METRO",
     "language_code": "ml", "lat": 9.9312, "lng": 76.2673},
    {"lgd_code": "2702001", "branch_name": "Pune Deccan Branch", "district": "Pune",
     "state": "Maharashtra", "state_code": "27", "classification": "METRO",
     "language_code": "hi", "lat": 18.5204, "lng": 73.8567},
]

DEMO_CIRCULAR = {
    "circular_number": "RBI/2023-24/101",
    "title": "Master Direction on Information Technology and Cybersecurity Framework",
    "issuing_authority": "Reserve Bank of India",
    "issued_date": datetime(2024, 6, 1),
    "status": "PROCESSED",
    "raw_text": """
    RBI/2023-24/101 | Cybersecurity Framework

    1. All regulated entities shall ensure that internet-facing endpoints use TLS 1.3 
    protocol within 30 days of this circular.
    
    2. Multi-factor authentication shall be enabled for all privileged/administrator 
    accounts within 15 days. Evidence to be provided via system-generated access logs.
    
    3. All staff shall complete cybersecurity awareness training within 60 days. 
    Completion certificates to be submitted as evidence.
    
    4. Banks shall implement a formal data classification policy for sensitive customer 
    data within 45 days. Policy document to be uploaded as evidence.
    
    5. Incident response procedures shall be updated to include ransomware response 
    protocols within 30 days of this direction.
    """,
}

DEMO_MAPS = [
    {
        "id": "MAP-2024-001",
        "title": "Update TLS to v1.3",
        "description": "All internet-facing endpoints must be configured to use TLS 1.3 protocol. This includes web banking portals, API gateways, and mobile app backends.",
        "kpi": "100% of internet-facing endpoints pass TLS 1.3 compliance scan with zero TLS 1.0/1.1 endpoints remaining",
        "deadline_days": 30,
        "department": "IT",
        "evidence_type": "LOG_FILE",
        "geographic_scope": "NATIONAL",
        "translations": {
            "kn": "ಎಲ್ಲಾ ಇಂಟರ್ನೆಟ್-ಫೇಸಿಂಗ್ ಎಂಡ್‌ಪಾಯಿಂಟ್‌ಗಳು TLS 1.3 ಅನ್ನು ಬಳಸಬೇಕು",
            "ta": "அனைத்து இணையம் எதிர்கொள்ளும் முனைப்புள்ளிகளும் TLS 1.3 பயன்படுத்த வேண்டும்",
            "ml": "എല്ലാ ഇന്റർനെറ്റ്-ഫേസിങ് എൻഡ്‌പോയിന്റുകളും TLS 1.3 ഉപയോഗിക്കണം",
            "hi": "सभी इंटरनेट-फेसिंग एंडपॉइंट्स पर TLS 1.3 का उपयोग करना आवश्यक है"
        }
    },
    {
        "id": "MAP-2024-002",
        "title": "Enable MFA for Admin Accounts",
        "description": "Multi-factor authentication must be enabled for all privileged and administrator accounts across all banking systems.",
        "kpi": "Zero admin accounts without MFA as verified by access management system audit log",
        "deadline_days": 15,
        "department": "IT",
        "evidence_type": "SCREENSHOT",
        "geographic_scope": "NATIONAL",
        "translations": {
            "kn": "ಎಲ್ಲಾ ನಿರ್ವಾಹಕ ಖಾತೆಗಳಿಗೆ MFA ಸಕ್ರಿಯಗೊಳಿಸಿ",
            "ta": "அனைத்து நிர்வாகி கணக்குகளுக்கும் MFA இயக்கவும்",
            "ml": "എല്ലാ അഡ്മിൻ അക്കൗണ്ടുകൾക്കും MFA പ്രാപ്തമാക്കുക",
            "hi": "सभी व्यवस्थापक खातों के लिए MFA सक्षम करें"
        }
    },
    {
        "id": "MAP-2024-003",
        "title": "Cybersecurity Awareness Training",
        "description": "All bank staff must complete mandatory cybersecurity awareness training.",
        "kpi": "100% staff training completion rate as shown in LMS completion report",
        "deadline_days": 60,
        "department": "HR",
        "evidence_type": "CERTIFICATE",
        "geographic_scope": "NATIONAL",
        "translations": {
            "kn": "ಸೈಬರ್ ಭದ್ರತಾ ತರಬೇತಿ ಪೂರ್ಣಗೊಳಿಸಿ",
            "ta": "இணைய பாதுகாப்பு விழிப்புணர்வு பயிற்சி",
            "ml": "സൈബർ സുരക്ഷ ബോധവൽക്കരണ പരിശീലനം",
            "hi": "साइबर सुरक्षा जागरूकता प्रशिक्षण"
        }
    },
]

async def seed_demo_data():
    client = AsyncIOMotorClient(os.environ["MONGODB_URI"])
    db = client[os.environ["MONGODB_DB_NAME"]]
    
    # Clear existing demo data
    await db.branches.delete_many({})
    await db.circulars.delete_many({})
    await db.maps.delete_many({})
    await db.users.delete_many({})
    
    # Seed branches
    await db.branches.insert_many(DEMO_BRANCHES)
    print(f"✓ Seeded {len(DEMO_BRANCHES)} branches")
    
    # Seed circular
    circular = {**DEMO_CIRCULAR, "maps_count": len(DEMO_MAPS)}
    result = await db.circulars.insert_one(circular)
    circular_id = str(result.inserted_id)
    print(f"✓ Seeded circular: {circular_id}")
    
    # Seed MAPs
    maps_with_ids = []
    for m in DEMO_MAPS:
        m["circular_id"] = circular_id
        m["status"] = "PENDING"
        m["target_lgd_codes"] = [b["lgd_code"] for b in DEMO_BRANCHES]
        m["deadline"] = datetime.now() + timedelta(days=m["deadline_days"])
        maps_with_ids.append(m)
    
    await db.maps.insert_many(maps_with_ids)
    print(f"✓ Seeded {len(DEMO_MAPS)} MAPs")
    
    # Seed demo users
    users = [
        {"email": "arjun@canarabank.com", "name": "Arjun Mehta", 
         "role": "COMPLIANCE_OFFICER", "password_hash": hash_password("demo123")},
        {"email": "priya@canarabank.com", "name": "Priya Nair",
         "role": "BRANCH_MANAGER", "branch_lgd_code": "3202001",
         "language": "ml", "password_hash": hash_password("demo123")},
        {"email": "ravi@canarabank.com", "name": "Ravi Kumar",  # The villain
         "role": "BRANCH_MANAGER", "branch_lgd_code": "2902002",
         "language": "kn", "password_hash": hash_password("demo123")},
        {"email": "inspector@rbi.org.in", "name": "RBI Inspector",
         "role": "AUDITOR", "password_hash": hash_password("demo123")},
    ]
    await db.users.insert_many(users)
    print(f"✓ Seeded {len(users)} users")
    
    # Seed pre-built evidence scenarios
    # Scenario 1: Legitimate submission (Priya Nair)
    legitimate_content = b"TLS 1.3 Security Scan Report - Branch KL-001\nScan Date: 2024-06-10\nAll endpoints: PASS\nTLS 1.0: NONE\nTLS 1.1: NONE\nTLS 1.3: 47/47 endpoints COMPLIANT"
    legitimate_hash = __import__('hashlib').sha256(legitimate_content).hexdigest()
    
    await db.evidence_vault.insert_one({
        "map_id": "MAP-2024-001",
        "circular_id": circular_id,
        "branch_lgd_code": "3202001",
        "uploader_name": "Priya Nair",
        "file_name": "tls_scan_thrissur.pdf",
        "file_size_bytes": len(legitimate_content),
        "sha256_hash": legitimate_hash,
        "uploaded_at": datetime(2025, 6, 14, 10, 32),
        "behavioral_risk_score": 0.12,
        "vault_status": "ACCEPTED",
        "quarantine_reason": None,
        "telemetry_snapshot": {
            "time_on_page_seconds": 487,
            "max_scroll_percent": 94,
            "word_count": 1200,
            "submitted_at": "2025-06-14T10:32:00"
        }
    })
    
    # Scenario 2: Quarantined submission (Ravi Kumar - the villain)
    dummy_content = b"dummy"
    quarantine_hash = __import__('hashlib').sha256(dummy_content).hexdigest()
    
    await db.evidence_vault.insert_one({
        "map_id": "MAP-2024-002",
        "circular_id": circular_id,
        "branch_lgd_code": "2902002",
        "uploader_name": "Ravi Kumar",
        "file_name": "mfa_report.pdf",
        "file_size_bytes": 5,
        "sha256_hash": quarantine_hash,
        "uploaded_at": datetime(2025, 6, 14, 23, 47),
        "behavioral_risk_score": 0.87,
        "vault_status": "QUARANTINED",
        "quarantine_reason": "High behavioral risk (0.87). Flags: Submitted at 23:00 (off-hours); Extremely short view: 4.2s; Did not scroll document (max: 3%); Impossible reading speed: 1714 WPM.",
        "telemetry_snapshot": {
            "time_on_page_seconds": 4.2,
            "max_scroll_percent": 3,
            "word_count": 1200,
            "submitted_at": "2025-06-14T23:47:00"
        }
    })
    
    print("✓ Seeded evidence vault scenarios")
    print("\n🎉 Demo data seed complete!")
    print("\nDemo credentials:")
    print("  CO: arjun@canarabank.com / demo123")
    print("  Branch (Kerala): priya@canarabank.com / demo123")
    print("  Branch (Villain): ravi@canarabank.com / demo123")
    print("  Auditor: inspector@rbi.org.in / demo123")

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    asyncio.run(seed_demo_data())
```

---

## Step 7: Run the Application

```bash
# Backend
cd backend
source venv/bin/activate
python app/utils/demo_data.py  # Seed demo data first
uvicorn main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm run dev  # Runs on http://localhost:3000

# API Docs available at:
# http://localhost:8000/docs
```

---

## Step 8: Docker Compose (Optional but Professional)

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - MONGODB_URI=${MONGODB_URI}
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./backend:/app
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
    depends_on:
      - backend
```
