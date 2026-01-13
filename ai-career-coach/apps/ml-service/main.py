"""
Main FastAPI application for ML services
Handles CV parsing, job matching, and ML-related endpoints
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from database.mongodb import get_mongodb_connection
from utils.serializers import serialize_objectid
import uvicorn

# Import CV parser
from cv_parser.parser import CVParser

# Initialize FastAPI app
app = FastAPI(
    title="AI Career Coach ML Service",
    description="ML microservice for CV parsing and analysis",
    version="1.0.0"
)

# CORS middleware - allow frontend to call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize CV parser
cv_parser = CVParser()

# Request/Response models
class ParseResponse(BaseModel):
    """Response model for parsed CV data"""
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "ML Service is running", "version": "1.0.0"}

@app.post("/api/ml/parse-cv", response_model=ParseResponse)
async def parse_cv(file: UploadFile = File(...)):
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
        
        # Read file content
        content = await file.read()
        
        # Parse CV
        parsed_data = cv_parser.parse(content, file.filename)

        # Save to MongoDB
        mongo = get_mongodb_connection()
        doc_id = mongo.save_parsed_cv("temp_user", parsed_data)

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

if __name__ == "__main__":
    # Run server
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True  # Auto-reload on code changes
    )