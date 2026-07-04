from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models.circular import CircularCreate
from app.services.lexgraph import run_compliance_pipeline
from bson import ObjectId
from typing import List
from app.services.pdf_parser import parse_pdf_content
import httpx
from bs4 import BeautifulSoup
import random
from datetime import datetime, timezone

router = APIRouter(prefix="/api/v1/circulars", tags=["Circulars"])

@router.post("/ingest-pdf", status_code=status.HTTP_201_CREATED)
async def ingest_circular_pdf(
    circular_number: str = Form(...),
    title: str = Form(...),
    issued_date: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_roles(["COMPLIANCE_OFFICER"]))
):
    from datetime import datetime
    import dateutil.parser
    
    # Parse date
    try:
        parsed_date = dateutil.parser.isoparse(issued_date)
    except Exception:
        parsed_date = datetime.now()
        
    # Check if circular number already exists
    existing = await db.circulars.find_one({"circular_number": circular_number})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Circular {circular_number} already exists"
        )
        
    content = await file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty PDF file uploaded"
        )
        
    # Extract text from PDF
    extracted_text = await parse_pdf_content(content)
    
    circular_doc = {
        "circular_number": circular_number,
        "title": title,
        "issuing_authority": "Reserve Bank of India",
        "issued_date": parsed_date,
        "raw_text": extracted_text,
        "status": "PROCESSING",
        "maps_count": 0
    }
    
    result = await db.circulars.insert_one(circular_doc)
    circular_id = str(result.inserted_id)
    
    try:
        # Run compliance state machine pipeline
        maps_generated = await run_compliance_pipeline(db, circular_id, extracted_text)
        
        # Update circular status
        await db.circulars.update_one(
            {"_id": ObjectId(circular_id)},
            {"$set": {
                "status": "PROCESSED",
                "maps_count": len(maps_generated)
            }}
        )
        
        circular_doc["id"] = circular_id
        circular_doc["status"] = "PROCESSED"
        circular_doc["maps_count"] = len(maps_generated)
        
        return {
            "message": "Circular PDF processed successfully",
            "circular_id": circular_id,
            "maps_extracted": maps_generated
        }
        
    except Exception as e:
        await db.circulars.update_one(
            {"_id": ObjectId(circular_id)},
            {"$set": {"status": "FAILED"}}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LangGraph pipeline failed: {str(e)}"
        )

@router.post("/ingest", status_code=status.HTTP_201_CREATED)
async def ingest_circular(
    payload: CircularCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_roles(["COMPLIANCE_OFFICER"]))
):
    # Check if circular number already exists
    existing = await db.circulars.find_one({"circular_number": payload.circular_number})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Circular {payload.circular_number} already exists"
        )
        
    circular_doc = {
        "circular_number": payload.circular_number,
        "title": payload.title,
        "issuing_authority": "Reserve Bank of India",
        "issued_date": payload.issued_date,
        "raw_text": payload.raw_text,
        "status": "PROCESSING",
        "maps_count": 0
    }
    
    result = await db.circulars.insert_one(circular_doc)
    circular_id = str(result.inserted_id)
    
    try:
        # Run compliance state machine pipeline
        maps_generated = await run_compliance_pipeline(db, circular_id, payload.raw_text)
        
        # Update circular status
        await db.circulars.update_one(
            {"_id": ObjectId(circular_id)},
            {"$set": {
                "status": "PROCESSED",
                "maps_count": len(maps_generated)
            }}
        )
        
        circular_doc["id"] = circular_id
        circular_doc["status"] = "PROCESSED"
        circular_doc["maps_count"] = len(maps_generated)
        
        return {
            "message": "Circular processed successfully",
            "circular_id": circular_id,
            "maps_extracted": maps_generated
        }
        
    except Exception as e:
        await db.circulars.update_one(
            {"_id": ObjectId(circular_id)},
            {"$set": {"status": "FAILED"}}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LangGraph pipeline failed: {str(e)}"
        )

@router.get("/sync", response_model=dict)
async def sync_latest_circular():
    """
    Attempt to scrape the latest circular from RBI.
    If scraping fails due to network or structure changes, fall back to a realistic mock.
    """
    fallback_mocks = [
        {
            "circular_number": "RBI/2026-27/304",
            "title": "Mandate on Multi-Factor Authentication and Transport Layer Security Upgrades",
            "raw_text": "RBI/2026-27/304 | Cybersecurity Framework Direction\n\n1. All regulated entities shall ensure that internet-facing endpoints use TLS 1.3 protocol within 30 days of this circular.\n2. Multi-factor authentication (MFA) shall be enabled for all privileged and administrator accounts within 15 days. Access logs showing successful MFA challenges must be provided.\n3. All bank staff must undergo mandatory cybersecurity awareness training within 60 days. LMS completion reports must be saved in the repository.\n4. Banks shall formulate a strict customer data protection classification guideline in accordance with DPDP requirements within 45 days.",
            "issued_date": datetime.now(timezone.utc).isoformat()
        },
        {
            "circular_number": "RBI/2026-27/312",
            "title": "Stringent Customer KYC Data Protection Guidelines",
            "raw_text": "RBI/2026-27/312 | KYC & AML Directives\n\n1. All branches must enforce Aadhaar-based biometric re-verification for high-risk accounts within 45 days.\n2. Branches must conduct a quarterly audit of safe deposit lockers. Evidence of audit completion must be submitted.\n3. Implement physical security upgrades for rural branches, including CCTV with 90-day retention.",
            "issued_date": datetime.now(timezone.utc).isoformat()
        }
    ]

    try:
        # Attempt live scraping
        async with httpx.AsyncClient(timeout=5.0) as client:
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
            response = await client.get("https://rbi.org.in/Scripts/NotificationUser.aspx", headers=headers)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, "html.parser")
            table = soup.find('table', {'class': 'tablebg'})
            if table:
                rows = table.find_all('tr')
                if len(rows) > 1:
                    first_notif = rows[1]
                    cols = first_notif.find_all('td')
                    if len(cols) >= 2:
                        date_str = cols[0].text.strip()
                        link_tag = cols[1].find('a')
                        if link_tag:
                            title = link_tag.text.strip()
                            circ_no = f"RBI/SYNC/{random.randint(100, 999)}"
                            return {
                                "status": "success",
                                "source": "live",
                                "data": {
                                    "circular_number": circ_no,
                                    "title": title,
                                    "raw_text": f"Extracted from RBI live feed on {date_str}.\n\nTitle: {title}\n\n(Full body parsing omitted to avoid excessive bot traffic on RBI site for hackathon)",
                                    "issued_date": datetime.now(timezone.utc).isoformat()
                                }
                            }
    except Exception as e:
        print(f"Scraping failed: {e}")
        pass # Fallback to mock

    # Fallback
    selected_mock = random.choice(fallback_mocks)
    return {
        "status": "success",
        "source": "mock",
        "data": selected_mock
    }

@router.get("", response_model=List[dict])
async def list_circulars(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    circulars = await db.circulars.find({}).to_list(length=100)
    for c in circulars:
        c["id"] = str(c["_id"])
        del c["_id"]
    return circulars

@router.get("/{circular_id}", response_model=dict)
async def get_circular_detail(
    circular_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:
        query = {"_id": circular_id}
        circular = await db.circulars.find_one(query)
        if not circular:
            query = {"_id": ObjectId(circular_id)}
            circular = await db.circulars.find_one(query)
    except Exception:
        raise HTTPException(status_code=404, detail="Circular not found")
        
    if not circular:
        raise HTTPException(status_code=404, detail="Circular not found")
        
    circular["id"] = str(circular["_id"])
    del circular["_id"]
    return circular
