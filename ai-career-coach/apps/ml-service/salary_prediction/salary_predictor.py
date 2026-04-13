"""
Salary Prediction API Router (v3.0 Multi-Region)

FastAPI endpoints for multi-region salary predictions.
Supports UK and US markets with automatic currency handling.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
import logging

from salary_prediction import get_predictor

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ml", tags=["salary"])



# Request/Response Models


class SalaryPredictRequest(BaseModel):
    """Request body for salary prediction."""
    job_title: str = Field(..., description="Target job title", examples=["Senior Software Engineer"])
    country: str = Field(..., description="Country code: 'UK' or 'US'", examples=["US"])
    location: str = Field(..., description="US state code or UK city", examples=["CA"])
    skills: Optional[List[str]] = Field(default=[], description="User's technical skills")
    company: Optional[str] = Field(default=None, description="Company name for tier estimation")
    include_factors: Optional[bool] = Field(default=True, description="Include explanation factors")

    model_config = ConfigDict(json_schema_extra={
        "example": {
            "job_title": "Senior Software Engineer",
            "country": "US",
            "location": "CA",
            "skills": ["Python", "AWS", "Kubernetes"],
            "company": "Google",
            "include_factors": True
        }
    })


class SalaryFactor(BaseModel):
    """Factor contributing to salary prediction."""
    factor: str
    description: str
    impact: str  # positive, negative, neutral
    value: Optional[str] = None


class SkillAnalysis(BaseModel):
    """Skill gap analysis result."""
    matched_high_value_skills: List[str]
    suggested_skills_to_learn: List[str]
    total_matched: int
    note: str


class SalaryRange(BaseModel):
    """Salary range."""
    min: int
    max: int


class SalaryPredictResponse(BaseModel):
    """Response body for salary prediction."""
    predicted_salary: int
    salary_range: SalaryRange
    confidence: int
    country: str
    currency: str
    currency_symbol: str
    formatted_salary: str
    formatted_range: str
    data_source: str
    disclaimer: str
    factors: Optional[List[SalaryFactor]] = None
    skill_analysis: Optional[SkillAnalysis] = None



# API Endpoints


@router.post("/predict-salary", response_model=SalaryPredictResponse)
async def predict_salary(request: SalaryPredictRequest):
    """
    Predict salary for a given job title, country, and location.
    
    Supports both UK and US markets:
    - US: Based on H1B visa data (270k+ records)
    - UK: Based on Adzuna job postings (9k+ records)
    
    Returns salary in appropriate currency (USD or GBP).
    """
    try:
        predictor = get_predictor("models")
        
        result = predictor.predict(
            job_title=request.job_title,
            country=request.country,
            location=request.location,
            skills=request.skills or [],
            company=request.company,
            include_factors=request.include_factors
        )
        
        return result
        
    except ValueError as e:
        # Invalid country or input
        raise HTTPException(status_code=400, detail=str(e))
        
    except FileNotFoundError as e:
        logger.error(f"Model files not found: {e}")
        raise HTTPException(
            status_code=503,
            detail="Salary model not available. Model files not found."
        )
        
    except Exception as e:
        logger.error(f"Prediction error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}"
        )


@router.get("/salary-model/info")
async def get_model_info():
    """
    Get model metadata and performance metrics.
    
    Returns information about:
    - Model version and type
    - Supported countries
    - Training data size
    - R² score and RMSE
    - Feature and skill counts
    """
    try:
        predictor = get_predictor("models")
        return predictor.get_model_info()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/salary-model/health")
async def health_check():
    """
    Check if salary model is loaded and working.
    
    Performs test predictions for both UK and US to verify model health.
    """
    try:
        predictor = get_predictor("models")
        return predictor.health_check()
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


@router.get("/salary-model/skills")
async def get_supported_skills():
    """
    Get list of skills recognized by the model.
    
    These skills affect salary predictions when present in job title or user skills.
    """
    try:
        predictor = get_predictor("models")
        skills = predictor.feature_builder.tech_skills
        
        return {
            "skills": skills,
            "count": len(skills),
            "note": "Skills are ranked by salary impact (highest first)"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/salary-model/countries")
async def get_supported_countries():
    """
    Get list of supported countries and their configuration.
    """
    try:
        predictor = get_predictor("models")
        info = predictor.feature_builder.get_info()
        
        return {
            "supported_countries": ["UK", "US"],
            "us_tech_hubs": info.get('us_tech_hubs', []),
            "uk_tech_hubs": info.get('uk_tech_hubs', []),
            "currencies": {
                "US": {"code": "USD", "symbol": "$"},
                "UK": {"code": "GBP", "symbol": "£"}
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
