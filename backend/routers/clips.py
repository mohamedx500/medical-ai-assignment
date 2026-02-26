import json
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User, Consultation
from auth import get_current_user
from services.clips_engine import run_diagnosis

router = APIRouter()


class ClipsDiagnoseRequest(BaseModel):
    name: str
    age: int
    gender: str
    symptoms: list[str]
    severity: str = "moderate"


@router.post("/diagnose")
async def clips_diagnose(
    request: ClipsDiagnoseRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get rule-based diagnosis from CLIPS expert system."""
    results = run_diagnosis(
        name=request.name,
        age=request.age,
        gender=request.gender,
        symptoms=request.symptoms,
        severity=request.severity,
    )
    
    # Save to DB
    consultation = Consultation(
        user_id=user.id,
        patient_name=request.name,
        age=request.age,
        gender=request.gender,
        symptoms=", ".join(request.symptoms),
        severity=request.severity,
        clips_result=json.dumps(results),
        model_used="CLIPS",
    )
    db.add(consultation)
    db.commit()

    return {"source": "clips", "data": results}
