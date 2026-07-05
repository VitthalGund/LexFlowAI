from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models.circular import CircularCreate
from app.services.circular_ingestion import create_and_process_circular
from bson import ObjectId
from typing import List
from app.services.pdf_parser import parse_pdf_content
import dateutil.parser
from datetime import datetime

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
    """Ingest a circular from an uploaded PDF file."""
    try:
        parsed_date = dateutil.parser.isoparse(issued_date)
    except Exception:
        parsed_date = datetime.now()

    content = await file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty PDF file uploaded"
        )

    extracted_text = await parse_pdf_content(content)

    try:
        result = await create_and_process_circular(
            db=db,
            circular_number=circular_number,
            title=title,
            raw_text=extracted_text,
            issued_date=parsed_date
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except RuntimeError as re:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(re))

    return {
        "message": "Circular PDF processed successfully",
        "circular_id": result["circular_id"],
        "maps_extracted": result["maps_extracted"]
    }


@router.post("/ingest", status_code=status.HTTP_201_CREATED)
async def ingest_circular(
    payload: CircularCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_roles(["COMPLIANCE_OFFICER"]))
):
    """Ingest a circular from raw text."""
    try:
        result = await create_and_process_circular(
            db=db,
            circular_number=payload.circular_number,
            title=payload.title,
            raw_text=payload.raw_text,
            issued_date=payload.issued_date
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except RuntimeError as re:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(re))

    return {
        "message": "Circular processed successfully",
        "circular_id": result["circular_id"],
        "maps_extracted": result["maps_extracted"]
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
