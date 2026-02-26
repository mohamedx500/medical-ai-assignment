"""
Gemini API Router
─────────────────
Exposes endpoints for Gemini-powered diagnosis and image analysis.
Error handling maps the typed exceptions from gemini_service
into clean HTTP responses.
"""

import logging
import json
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User, Consultation, ImageScan
from auth import get_current_user
from services.gemini_service import (
    diagnose_from_symptoms,
    analyze_medical_image,
    GeminiServiceError,
    GeminiRateLimitError,
    GeminiAuthError,
)

router = APIRouter()
logger = logging.getLogger(__name__)


class DiagnoseRequest(BaseModel):
    name: str
    age: int
    gender: str
    symptoms: list[str]
    severity: str = "moderate"
    language: str = "en"


def _handle_gemini_error(e: Exception, context: str) -> HTTPException:
    """
    Convert a Gemini service exception into a properly typed HTTPException.
    This keeps the router handlers clean and consistent.
    """
    if isinstance(e, GeminiRateLimitError):
        logger.warning(f"[{context}] All models rate-limited: {e.details}")
        return HTTPException(
            status_code=429,
            detail={
                "error": e.details.get("error", "rate_limit"),
                "message": e.message,
                "retry_after": e.details.get("retry_after", 30),
                "tried_models": e.details.get("tried_models", []),
            },
        )

    if isinstance(e, GeminiAuthError):
        logger.error(f"[{context}] Auth error: {e.message}")
        return HTTPException(
            status_code=503,
            detail={
                "error": "api_key_invalid",
                "message": e.message,
            },
        )

    if isinstance(e, GeminiServiceError):
        logger.error(f"[{context}] Service error: {e.message}")
        return HTTPException(
            status_code=e.status_code,
            detail={
                "error": "gemini_error",
                "message": e.message,
            },
        )

    # Unexpected / unknown error
    error_msg = str(e)
    logger.error(f"[{context}] Unexpected error: {error_msg}")
    return HTTPException(
        status_code=500,
        detail={
            "error": "internal_error",
            "message": f"An unexpected error occurred: {error_msg[:200]}",
        },
    )


@router.post("/diagnose")
async def gemini_diagnose(
    request: DiagnoseRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get AI-powered diagnosis from Gemini based on patient symptoms.
    """
    try:
        result = await diagnose_from_symptoms(
            name=request.name,
            age=request.age,
            gender=request.gender,
            symptoms=request.symptoms,
            severity=request.severity,
            language=request.language,
        )
        
        # Save to DB
        consultation = Consultation(
            user_id=user.id,
            patient_name=request.name,
            age=request.age,
            gender=request.gender,
            symptoms=", ".join(request.symptoms),
            severity=request.severity,
            gemini_result=json.dumps(result),
            model_used=result.get("_meta", {}).get("model", ""),
            language=request.language
        )
        db.add(consultation)
        db.commit()

        return {"source": "gemini", "data": result}
    except Exception as e:
        raise _handle_gemini_error(e, "diagnose")


@router.post("/analyze-image")
async def gemini_analyze_image(
    file: UploadFile = File(...),
    language: str = "en",
    prompt: str = "",
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analyze a medical image using Gemini Vision API.
    """
    try:
        contents = await file.read()
        mime_type = file.content_type or "image/jpeg"
        result = await analyze_medical_image(
            contents, mime_type, language=language, user_prompt=prompt,
        )
        
        # Save to DB
        scan = ImageScan(
            user_id=user.id,
            filename=file.filename or "unknown",
            prompt=prompt,
            result=json.dumps(result),
            model_used=result.get("_meta", {}).get("model", ""),
            language=language
        )
        db.add(scan)
        db.commit()

        return {"source": "gemini-vision", "data": result}
    except Exception as e:
        raise _handle_gemini_error(e, "analyze-image")
