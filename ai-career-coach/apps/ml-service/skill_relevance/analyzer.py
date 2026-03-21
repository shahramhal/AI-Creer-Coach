"""
Skill Relevance Analyzer
Computes how relevant a user's skills are to a target job title
using sentence-transformers cosine similarity.
"""

import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

# Imported lazily to avoid circular imports
_ROLE_KEYWORDS = None
_ROLE_ALIASES = None


def _get_role_data():
    global _ROLE_KEYWORDS, _ROLE_ALIASES
    if _ROLE_KEYWORDS is None:
        from cv_analyzer.keyword_analyzer import ROLE_KEYWORDS, ROLE_ALIASES
        _ROLE_KEYWORDS = ROLE_KEYWORDS
        _ROLE_ALIASES = ROLE_ALIASES
    return _ROLE_KEYWORDS, _ROLE_ALIASES


def _fallback_relevance(job_title: str, skills: List[str]) -> Dict:
    """Fallback when sentence-transformers model is unavailable.
    Uses ROLE_KEYWORDS frequency data to estimate relevance."""
    role_keywords, role_aliases = _get_role_data()

    normalized_title = role_aliases.get(job_title.lower(), job_title.lower().replace(" ", "_"))
    role_kws = role_keywords.get(normalized_title)

    if not role_kws:
        for alias, role_key in role_aliases.items():
            if alias in job_title.lower() or job_title.lower() in alias:
                role_kws = role_keywords.get(role_key)
                break

    keyword_freq_map: Dict[str, float] = {}
    if role_kws:
        for entry in role_kws:
            raw_frequency = entry.get("frequency", "0")
            frequency_value = int(str(raw_frequency).replace("%", ""))
            keyword_freq_map[entry["keyword"].lower()] = frequency_value

    skill_scores = []
    for skill in skills:
        skill_lower = skill.lower().strip()
        freq = keyword_freq_map.get(skill_lower, 0)
        relevance = freq / 100.0 if freq > 0 else 0.1
        skill_scores.append({"skill": skill, "relevance": round(relevance, 3)})

    overall = sum(s["relevance"] for s in skill_scores) / len(skill_scores) if skill_scores else 0.0

    return {
        "job_title": job_title,
        "skill_scores": skill_scores,
        "overall_relevance": round(overall, 3),
        "method": "keyword_fallback",
    }


def compute_skill_relevance(
    job_title: str,
    skills: List[str],
    model: Optional[object] = None,
) -> Dict:
    """Compute how relevant each skill is to a job title.

    Uses cosine similarity between sentence-transformer embeddings of
    the job title and each skill. Falls back to keyword matching if
    the model is unavailable.

    Args:
        job_title: Target job title (e.g. "Frontend Developer")
        skills: List of user skills from CV
        model: SentenceTransformer instance (shared from job_matcher)

    Returns:
        {
            "job_title": str,
            "skill_scores": [{"skill": str, "relevance": float}],
            "overall_relevance": float,
            "method": "semantic" | "keyword_fallback"
        }
    """
    if not skills:
        return {
            "job_title": job_title,
            "skill_scores": [],
            "overall_relevance": 0.0,
            "method": "semantic" if model is not None else "keyword_fallback",
        }

    if model is None:
        logger.warning("No model available, using keyword fallback for skill relevance")
        return _fallback_relevance(job_title, skills)

    try:
        from sentence_transformers import util

        job_title_embedding = model.encode(job_title, convert_to_tensor=True)
        skill_embeddings = model.encode(skills, convert_to_tensor=True)

        raw_scores = util.cos_sim(skill_embeddings, job_title_embedding)

        # Empirically calibrated for all-MiniLM-L6-v2 on short skill/job-title phrases.
        # Recalibrate if model is swapped (e.g. all-mpnet-base-v2 has higher typical range).
        low, high = 0.1, 0.6
        skill_scores = []
        for skill, score_tensor in zip(skills, raw_scores):
            raw = float(score_tensor[0])
            normalized = (raw - low) / (high - low)
            normalized = max(0.0, min(1.0, normalized))
            skill_scores.append({
                "skill": skill,
                "relevance": round(normalized, 3),
            })

        overall = sum(s["relevance"] for s in skill_scores) / len(skill_scores)

        return {
            "job_title": job_title,
            "skill_scores": skill_scores,
            "overall_relevance": round(overall, 3),
            "method": "semantic",
        }

    except Exception as e:
        logger.error(f"Semantic skill relevance failed: {e}, using fallback")
        return _fallback_relevance(job_title, skills)
