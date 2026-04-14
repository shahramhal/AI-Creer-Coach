from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, List

from dependencies import job_matcher

router = APIRouter(tags=["matching"])


class JobMatchRequest(BaseModel):
    cv_text: str
    jobs: List[Dict]
    top_k: int = 20
    filters: Optional[Dict] = None


class JobMatchResponse(BaseModel):
    success: bool
    matched_jobs: List[Dict]
    total_analyzed: int


@router.post("/api/ml/match-jobs", response_model=JobMatchResponse)
async def match_jobs(request: JobMatchRequest):
    try:
        print(f"Received matching request:")
        print(f"  - CV text length: {len(request.cv_text)} chars")
        print(f"  - Number of jobs: {len(request.jobs)}")
        print(f"  - Top K: {request.top_k}")

        matched = job_matcher.match_jobs(
            cv_text=request.cv_text,
            jobs=request.jobs,
            top_k=request.top_k,
            filters=request.filters,
        )

        print(f"Matching complete: {len(matched)} jobs matched")
        return JobMatchResponse(
            success=True,
            matched_jobs=matched,
            total_analyzed=len(request.jobs),
        )

    except Exception as e:
        print(f"Matching error: {e}")
        raise HTTPException(status_code=500, detail=f"Job matching failed: {str(e)}")


@router.post("/api/matching/find-jobs", response_model=JobMatchResponse)
async def find_jobs(request: JobMatchRequest):
    """Alias for match_jobs - used by the frontend."""
    return await match_jobs(request)
