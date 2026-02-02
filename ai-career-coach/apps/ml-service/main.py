# apps/ml-service/main.py
"""
Main FastAPI application for ML services
Handles CV parsing, job matching, and ML-related endpoints
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict
from database.mongodb import get_mongodb_connection
from utils.serializers import serialize_objectid
import uvicorn
import jwt

# Import CV parser
from cv_parser.parser import CVParser

# Import job matcher
from job_matcher.matcher import JobMatcher

# Initialize FastAPI app
app = FastAPI(
    title="AI Career Coach ML Service",
    description="ML microservice for CV parsing and job matching",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
cv_parser = CVParser()
job_matcher = JobMatcher()


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



# ENDPOINTS


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "ML Service is running",
        "version": "1.0.0",
        "features": ["cv_parsing", "job_matching"]
    }


@app.post("/api/ml/parse-cv", response_model=ParseResponse)
async def parse_cv(file: UploadFile = File(...)):
    authorization: str = Header(None)
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

        # Save to MongoDB
        mongo = get_mongodb_connection()
        # Add user_id to parsed data
        parsed_data['user_id'] = user_id 
        
        doc_id = mongo.save_parsed_cv(user_id , parsed_data)

        # Serialize ObjectIds to strings before returning
        serialized_data = serialize_objectid(parsed_data)
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


if __name__ == "__main__":
    # Run server
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )