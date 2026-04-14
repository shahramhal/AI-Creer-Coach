import jwt
from fastapi import APIRouter, File, Header, HTTPException, UploadFile
from pydantic import BaseModel
from typing import Optional, Dict, List

from database.mongodb import get_mongodb_connection
from utils.serializers import serialize_objectid
from dependencies import cv_analyzer, cv_parser

router = APIRouter(tags=["cv"])


class ParseResponse(BaseModel):
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None


class AnalyzeCVRequest(BaseModel):
    cv_text: str
    parsed_data: Dict
    filename: str = ""
    target_role: Optional[str] = None


class AnalyzeCVResponse(BaseModel):
    success: bool
    data: Optional[Dict] = None
    error: Optional[str] = None


class CVOverviewRequest(BaseModel):
    cv_text: str
    parsed_data: Dict
    filename: str = ""


class ATSScoreRequest(BaseModel):
    cv_text: str
    parsed_data: Dict
    job_description: str
    job_requirements: str = ""
    job_skills: Optional[List[str]] = None


@router.post("/api/ml/parse-cv", response_model=ParseResponse)
async def parse_cv(file: UploadFile = File(...), authorization: str = Header(None)):
    try:
        if not file.filename.endswith((".pdf", ".docx")):
            raise HTTPException(
                status_code=400,
                detail="Only PDF and DOCX files are supported",
            )

        user_id = None
        if authorization and authorization.startswith("Bearer "):
            token = authorization.split(" ")[1]
            try:
                payload = jwt.decode(token, options={"verify_signature": False})
                user_id = payload.get("userId") or payload.get("id")
                print(f"Parsing CV for user: {user_id}")
            except Exception as e:
                print(f"Could not decode JWT: {e}")

        content = await file.read()
        parsed_data = cv_parser.parse(content, file.filename)
        parsed_data["user_id"] = user_id

        doc_id = None
        try:
            mongo = get_mongodb_connection()
            if mongo.connect():
                doc_id = mongo.save_parsed_cv(user_id, parsed_data)
                print(f"CV saved to MongoDB: {doc_id}")
        except Exception as mongo_error:
            print(f"MongoDB save skipped: {mongo_error}")

        serialized_data = serialize_objectid(parsed_data)
        if doc_id:
            serialized_data["document_id"] = doc_id

        return ParseResponse(success=True, data=serialized_data)

    except Exception as e:
        return ParseResponse(success=False, error=str(e))


@router.post("/api/ml/analyze-cv", response_model=AnalyzeCVResponse)
async def analyze_cv(request: AnalyzeCVRequest):
    try:
        print(f"Analyzing CV: {request.filename}")

        result = cv_analyzer.analyze(
            cv_text=request.cv_text,
            parsed_data=request.parsed_data,
            filename=request.filename,
            target_role=request.target_role,
        )

        print(f"Analysis complete: score={result['overallScore']}/100")
        return AnalyzeCVResponse(success=True, data=result)

    except Exception as e:
        print(f"Analysis error: {e}")
        return AnalyzeCVResponse(success=False, error=str(e))


@router.post("/api/ml/cv-overview", response_model=AnalyzeCVResponse)
async def cv_overview(request: CVOverviewRequest):
    try:
        print(f"CV overview analysis: {request.filename}")

        result = cv_analyzer.analyze_overview(
            cv_text=request.cv_text,
            parsed_data=request.parsed_data,
            filename=request.filename,
        )

        print(f"Overview complete: score={result['overallScore']}/100")
        return AnalyzeCVResponse(success=True, data=result)

    except Exception as e:
        print(f"Overview analysis error: {e}")
        return AnalyzeCVResponse(success=False, error=str(e))


@router.post("/api/ml/ats-score", response_model=AnalyzeCVResponse)
async def ats_score(request: ATSScoreRequest):
    try:
        print(f"ATS scoring: CV vs job description ({len(request.job_description)} chars)")

        result = cv_analyzer.analyze_ats(
            cv_text=request.cv_text,
            parsed_data=request.parsed_data,
            job_description=request.job_description,
            job_requirements=request.job_requirements,
            job_skills=request.job_skills,
        )

        print(f"ATS scoring complete: score={result['atsScore']}/100")
        return AnalyzeCVResponse(success=True, data=result)

    except Exception as e:
        print(f"ATS scoring error: {e}")
        return AnalyzeCVResponse(success=False, error=str(e))
