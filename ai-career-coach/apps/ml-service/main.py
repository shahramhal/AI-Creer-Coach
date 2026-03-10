# apps/ml-service/main.py
"""
Main FastAPI application for ML services
Handles CV parsing, job matching, and ML-related endpoints
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from database.mongodb import get_mongodb_connection
from utils.serializers import serialize_objectid
import uvicorn
import jwt
import os

# Import CV parser
from cv_parser.parserV2 import CVParser

# Import job matcher
from job_matcher.matcher import JobMatcher

# Import CV analyzer
from cv_analyzer.analyzer import CVAnalyzer

# Import salary predictor router
from salary_prediction.salary_predictor import router as salary_router

# Import skill gap analyzer
from skill_gap.analyzer import SkillGapAnalyzer

# Initialize FastAPI app
app = FastAPI(
    title="AI Career Coach ML Service",
    description="ML microservice for CV parsing and job matching",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:4000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import ATS scorer model sharing
from cv_analyzer.ats_scorer import set_shared_model

# Initialize services
cv_parser = CVParser(
    anthropic_api_key=os.environ.get('ANTHROPIC_API_KEY')
)
job_matcher = JobMatcher()

# Share SentenceTransformer model before CVAnalyzer init (~90MB saved)
if hasattr(job_matcher, 'model') and job_matcher.model is not None:
    set_shared_model(job_matcher.model)

cv_analyzer = CVAnalyzer()
skill_gap_analyzer = SkillGapAnalyzer()

# Register salary prediction router
app.include_router(salary_router)


# REQUEST/RESPONSE MODELS


class ParseResponse(BaseModel):
    """Response model for parsed CV data"""
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None


class JobMatchRequest(BaseModel):
    """Request model for job matching"""
    cv_text: str
    jobs: List[Dict]
    top_k: int = 20
    filters: Optional[Dict] = None


class JobMatchResponse(BaseModel):
    """Response model for job matching"""
    success: bool
    matched_jobs: List[Dict]
    total_analyzed: int


class AnalyzeCVRequest(BaseModel):
    """Request model for CV analysis"""
    cv_text: str
    parsed_data: Dict
    filename: str = ""
    target_role: Optional[str] = None


class AnalyzeCVResponse(BaseModel):
    """Response model for CV analysis"""
    success: bool
    data: Optional[Dict] = None
    error: Optional[str] = None


class CVOverviewRequest(BaseModel):
    """Request model for job-agnostic CV overview analysis"""
    cv_text: str
    parsed_data: Dict
    filename: str = ""


class ATSScoreRequest(BaseModel):
    """Request model for job-specific ATS scoring"""
    cv_text: str
    parsed_data: Dict
    job_description: str
    job_requirements: str = ""
    job_skills: Optional[List[str]] = None


class SkillGapRequest(BaseModel):
    """Request model for skill gap analysis"""
    cv_text: str
    parsed_data: Dict
    target_role: Optional[str] = None
    target_job_description: Optional[str] = Field(None, max_length=10000)


# ENDPOINTS


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "ML Service is running",
        "version": "1.0.0",
        "features": ["cv_parsing", "job_matching", "salary_prediction", "skill_gap_analysis"]
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "service": "ml-service",
        "cache_stats": job_matcher.get_cache_stats()
    }


@app.get("/api/ml/cache-stats")
async def get_cache_stats():
    """Get job embedding cache statistics"""
    return {
        "success": True,
        "stats": job_matcher.get_cache_stats()
    }


@app.post("/api/ml/clear-cache")
async def clear_cache():
    """Clear the job embedding cache"""
    job_matcher.clear_cache()
    return {
        "success": True,
        "message": "Cache cleared successfully"
    }


@app.post("/api/ml/parse-cv", response_model=ParseResponse)
async def parse_cv(file: UploadFile = File(...), authorization: str = Header(None)):
    """
    Parse uploaded CV file (PDF or DOCX)
    
    Args:
        file: Uploaded CV file
        
    Returns:
        Parsed CV data including skills, experience, education, contact info
    """
    try:
        # Validate file type
        if not file.filename.endswith(('.pdf', '.docx')):
            raise HTTPException(
                status_code=400,
                detail="Only PDF and DOCX files are supported"
            )
            # Extract user_id from JWT token
        user_id = None
        if authorization and authorization.startswith('Bearer '):
            token = authorization.split(' ')[1]
            try:
                # Decode JWT to get user_id
                payload = jwt.decode(token, options={"verify_signature": False})
                user_id = payload.get('userId') or payload.get('id')
                print(f"📝 Parsing CV for user: {user_id}")
            except Exception as e:
                print(f"⚠️ Could not decode JWT: {e}")
        
        # Read file content
        content = await file.read()

        # Parse CV
        parsed_data = cv_parser.parse(content, file.filename)
        parsed_data['user_id'] = user_id

        # Try to save to MongoDB (optional - don't fail if unavailable)
        doc_id = None
        try:
            mongo = get_mongodb_connection()
            if mongo.connect():
                doc_id = mongo.save_parsed_cv(user_id, parsed_data)
                print(f"✅ CV saved to MongoDB: {doc_id}")
        except Exception as mongo_error:
            print(f"⚠️ MongoDB save skipped: {mongo_error}")

        # Serialize and return
        serialized_data = serialize_objectid(parsed_data)
        if doc_id:
            serialized_data['document_id'] = doc_id

        return ParseResponse(
            success=True,
            data=serialized_data
        )
        
    except Exception as e:
        return ParseResponse(
            success=False,
            error=str(e)
        )


@app.post("/api/ml/analyze-cv", response_model=AnalyzeCVResponse)
async def analyze_cv(request: AnalyzeCVRequest):
    """
    Analyze CV for ATS compatibility, keyword gaps, and recommendations.
    Runs entirely locally — no external API calls.

    Args:
        request: CV text, parsed data, filename, optional target role

    Returns:
        Comprehensive analysis data (scores, ATS checks, keywords, recommendations)
    """
    try:
        print(f"Analyzing CV: {request.filename}")

        analysis_result = cv_analyzer.analyze(
            cv_text=request.cv_text,
            parsed_data=request.parsed_data,
            filename=request.filename,
            target_role=request.target_role,
        )

        print(f"Analysis complete: score={analysis_result['overallScore']}/100")

        return AnalyzeCVResponse(
            success=True,
            data=analysis_result,
        )

    except Exception as e:
        print(f"Analysis error: {e}")
        return AnalyzeCVResponse(
            success=False,
            error=str(e),
        )


@app.post("/api/ml/cv-overview", response_model=AnalyzeCVResponse)
async def cv_overview(request: CVOverviewRequest):
    """
    Job-agnostic CV quality analysis.
    Scores CV across 4 categories without requiring a job description.
    """
    try:
        print(f"CV overview analysis: {request.filename}")

        overview_result = cv_analyzer.analyze_overview(
            cv_text=request.cv_text,
            parsed_data=request.parsed_data,
            filename=request.filename,
        )

        print(f"Overview complete: score={overview_result['overallScore']}/100")

        return AnalyzeCVResponse(
            success=True,
            data=overview_result,
        )

    except Exception as e:
        print(f"Overview analysis error: {e}")
        return AnalyzeCVResponse(
            success=False,
            error=str(e),
        )


@app.post("/api/ml/ats-score", response_model=AnalyzeCVResponse)
async def ats_score(request: ATSScoreRequest):
    """
    Job-specific ATS keyword matching.
    Compares CV against a specific job description for keyword match,
    semantic similarity, and skills coverage.
    """
    try:
        print(f"ATS scoring: CV vs job description ({len(request.job_description)} chars)")

        ats_result = cv_analyzer.analyze_ats(
            cv_text=request.cv_text,
            parsed_data=request.parsed_data,
            job_description=request.job_description,
            job_requirements=request.job_requirements,
            job_skills=request.job_skills,
        )

        print(f"ATS scoring complete: score={ats_result['atsScore']}/100")

        return AnalyzeCVResponse(
            success=True,
            data=ats_result,
        )

    except Exception as e:
        print(f"ATS scoring error: {e}")
        return AnalyzeCVResponse(
            success=False,
            error=str(e),
        )


@app.post("/api/ml/skill-gap-analysis")
async def skill_gap_analysis(request: SkillGapRequest):
    """
    Analyze skill gaps between CV and target role.
    Returns missing skills, prioritized learning path, and ROI estimates.
    """
    try:
        print(f"Skill gap analysis: target_role={request.target_role}")

        result = skill_gap_analyzer.analyze(
            cv_text=request.cv_text,
            parsed_data=request.parsed_data,
            target_role=request.target_role,
            target_job_description=request.target_job_description,
        )

        print(f"Skill gap analysis complete: coverage={result['skill_coverage']}%, missing={len(result['missing_skills'])} skills")

        return {
            "success": True,
            "data": result,
        }

    except Exception as e:
        print(f"Skill gap analysis error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Skill gap analysis failed: {str(e)}"
        )


@app.post("/api/ml/match-jobs", response_model=JobMatchResponse)
async def match_jobs(request: JobMatchRequest):
    """
    Match CV with jobs using semantic similarity
    
    This is the CORE ML feature of the platform
    
    Args:
        request: CV text, list of jobs, filters
        
    Returns:
        Ranked list of matched jobs with scores
    """
    try:
        print(f"📥 Received matching request:")
        print(f"   - CV text length: {len(request.cv_text)} chars")
        print(f"   - Number of jobs: {len(request.jobs)}")
        print(f"   - Top K: {request.top_k}")
        
        # Call job matcher
        matched_jobs = job_matcher.match_jobs(
            cv_text=request.cv_text,
            jobs=request.jobs,
            top_k=request.top_k,
            filters=request.filters
        )
        
        print(f"✅ Matching complete: {len(matched_jobs)} jobs matched")
        
        return JobMatchResponse(
            success=True,
            matched_jobs=matched_jobs,
            total_analyzed=len(request.jobs)
        )
        
    except Exception as e:
        print(f"❌ Matching error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Job matching failed: {str(e)}"
        )

@app.post("/api/matching/find-jobs", response_model=JobMatchResponse)
async def find_jobs(request: JobMatchRequest):
    """
    Alias for match_jobs endpoint - used by frontend

    Args:
        request: CV text, list of jobs, filters

    Returns:
        Ranked list of matched jobs with scores
    """
    return await match_jobs(request)


if __name__ == "__main__":
    # Run server
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )