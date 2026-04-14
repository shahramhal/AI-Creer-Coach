from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, List

from skill_relevance.analyzer import compute_skill_relevance
from dependencies import job_matcher, skill_gap_analyzer

router = APIRouter(tags=["skills"])


class SkillGapRequest(BaseModel):
    cv_text: str
    parsed_data: Dict
    target_role: Optional[str] = None
    target_job_description: Optional[str] = Field(None, max_length=10000)


class SkillRelevanceRequest(BaseModel):
    job_title: str = Field(..., max_length=200)
    skills: List[str] = Field(..., max_length=50)


@router.post("/api/ml/skill-gap-analysis")
async def skill_gap_analysis(request: SkillGapRequest):
    try:
        print(f"Skill gap analysis: target_role={request.target_role}")

        result = skill_gap_analyzer.analyze(
            cv_text=request.cv_text,
            parsed_data=request.parsed_data,
            target_role=request.target_role,
            target_job_description=request.target_job_description,
        )

        print(
            f"Skill gap analysis complete: "
            f"coverage={result['skill_coverage']}%, "
            f"missing={len(result['missing_skills'])} skills"
        )
        return {"success": True, "data": result}

    except Exception as e:
        print(f"Skill gap analysis error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Skill gap analysis failed: {str(e)}",
        )


@router.post("/api/ml/skill-relevance")
async def skill_relevance(request: SkillRelevanceRequest):
    try:
        print(f"Skill relevance: job_title={request.job_title}, skills={len(request.skills)}")

        shared_model = job_matcher.model if hasattr(job_matcher, "model") else None
        result = compute_skill_relevance(
            job_title=request.job_title,
            skills=request.skills,
            model=shared_model,
        )

        print(f"Skill relevance complete: overall={result['overall_relevance']}, method={result['method']}")
        return {"success": True, "data": result}

    except Exception as e:
        print(f"Skill relevance error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Skill relevance analysis failed: {str(e)}",
        )
