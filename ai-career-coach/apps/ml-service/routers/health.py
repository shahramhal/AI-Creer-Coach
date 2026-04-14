from fastapi import APIRouter

from dependencies import job_matcher

router = APIRouter(tags=["health"])


@router.get("/")
async def root():
    return {
        "status": "ML Service is running",
        "version": "1.0.0",
        "features": [
            "cv_parsing",
            "job_matching",
            "salary_prediction",
            "skill_gap_analysis",
            "skill_relevance",
        ],
    }


@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "ml-service",
        "cache_stats": job_matcher.get_cache_stats(),
    }


@router.get("/api/ml/cache-stats")
async def get_cache_stats():
    return {
        "success": True,
        "stats": job_matcher.get_cache_stats(),
    }


@router.post("/api/ml/clear-cache")
async def clear_cache():
    job_matcher.clear_cache()
    return {"success": True, "message": "Cache cleared successfully"}
