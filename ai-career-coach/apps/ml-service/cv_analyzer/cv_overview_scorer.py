"""
CV Overview Scorer — Job-agnostic CV quality assessment.
Evaluates CV quality across 4 categories without requiring a job description.
Reuses existing scoring modules from score_calculator.py and ats_checker.py.
"""

import logging
from datetime import datetime
from typing import Dict, List

from cv_analyzer.ats_checker import ATSChecker
from cv_analyzer.score_calculator import ScoreCalculator
from cv_analyzer.recommendation_engine import RecommendationEngine

logger = logging.getLogger(__name__)

# Weights for the 4 job-agnostic score categories
OVERVIEW_WEIGHTS = {
    "contentQuality": 0.30,
    "formatStructure": 0.20,
    "experienceClarity": 0.25,
    "atsReadability": 0.25,
}


class CVOverviewScorer:
    """
    Job-agnostic CV quality scorer.
    Produces a quality overview without needing a job description or target role.
    """

    def __init__(self):
        self.score_calculator = ScoreCalculator()
        self.ats_checker = ATSChecker()
        self.recommendation_engine = RecommendationEngine()
        logger.info("CVOverviewScorer initialized")

    def analyze(
        self,
        cv_text: str,
        parsed_data: Dict,
        filename: str = "",
    ) -> Dict:
        """
        Run job-agnostic CV quality analysis.

        Args:
            cv_text: Raw CV text
            parsed_data: Structured parsed CV data
            filename: Original filename (for format checks)

        Returns:
            Overview data with 4-category score breakdown, ATS checks,
            priority issues, and recommendations.
        """
        logger.info(f"Running CV overview analysis for: {filename}")

        # Run ATS compatibility checks (job-agnostic)
        ats_checks = self.ats_checker.check_all(cv_text, parsed_data, filename)

        # Calculate individual scores using existing methods
        content_quality = self.score_calculator._score_content_quality(parsed_data)
        format_structure = self.score_calculator._score_format_structure(cv_text, parsed_data)
        experience_clarity = self.score_calculator._score_experience_clarity(parsed_data)
        ats_readability = self.score_calculator._score_ats_compatibility(ats_checks)

        # Compute weighted overall score
        overall_score = round(
            content_quality * OVERVIEW_WEIGHTS["contentQuality"]
            + format_structure * OVERVIEW_WEIGHTS["formatStructure"]
            + experience_clarity * OVERVIEW_WEIGHTS["experienceClarity"]
            + ats_readability * OVERVIEW_WEIGHTS["atsReadability"]
        )
        overall_score = min(overall_score, 100)

        score_breakdown = {
            "contentQuality": content_quality,
            "formatStructure": format_structure,
            "experienceClarity": experience_clarity,
            "atsReadability": ats_readability,
        }

        # Compile priority issues from low scores and failed checks
        priority_issues = self._compile_priority_issues(score_breakdown, ats_checks)

        # Generate recommendations (pass empty keyword analysis to skip keyword recs)
        empty_keyword_analysis = {
            "missing_keywords": [],
            "keyword_match_score": 100,
        }
        score_result = {
            "overallScore": overall_score,
            "scoreBreakdown": score_breakdown,
        }
        recommendations = self.recommendation_engine.generate(
            score_result, ats_checks, empty_keyword_analysis, parsed_data
        )

        # Compute metadata
        word_count = len(cv_text.split()) if cv_text else 0
        section_count = sum(1 for key in ["experience", "education", "skills", "summary"]
                           if parsed_data.get(key))

        overview_data = {
            "overallScore": overall_score,
            "scoreBreakdown": score_breakdown,
            "atsChecks": ats_checks,
            "priorityIssues": priority_issues,
            "recommendations": recommendations,
            "metadata": {
                "wordCount": word_count,
                "sectionCount": section_count,
            },
            "analyzedAt": datetime.utcnow().isoformat(),
        }

        logger.info(
            f"Overview analysis complete: overall={overall_score}/100, "
            f"issues={len(priority_issues)}, recommendations={len(recommendations)}"
        )

        return overview_data

    def _compile_priority_issues(
        self,
        score_breakdown: Dict[str, int],
        ats_checks: List[Dict],
    ) -> List[Dict]:
        """Extract priority issues from scores and ATS check failures."""
        issues: List[Dict] = []

        score_thresholds = [
            ("contentQuality", "Content quality needs improvement",
             "Your CV content lacks quantifiable achievements and detailed descriptions",
             "+12% interview rate"),
            ("formatStructure", "Format and structure can be improved",
             "CV structure doesn't follow standard conventions expected by recruiters and ATS",
             "+8% readability"),
            ("experienceClarity", "Experience section lacks clarity",
             "Your experience descriptions could be more specific and impactful",
             "+10% interview rate"),
            ("atsReadability", "ATS readability issues found",
             "Several formatting or structural issues may prevent ATS from parsing your CV correctly",
             "+15% pass rate"),
        ]

        for key, title, description, impact in score_thresholds:
            score = score_breakdown.get(key, 100)
            if score < 50:
                issues.append({
                    "severity": "critical",
                    "title": title,
                    "description": description,
                    "impact": impact,
                })
            elif score < 70:
                issues.append({
                    "severity": "warning",
                    "title": title,
                    "description": description,
                    "impact": impact,
                })

        # Add critical ATS failures
        for check in ats_checks:
            if check.get("status") == "fail":
                issues.append({
                    "severity": "critical",
                    "title": check["title"],
                    "description": check["description"],
                    "impact": "+12% pass rate",
                })

        severity_order = {"critical": 0, "warning": 1, "suggestion": 2}
        issues.sort(key=lambda x: severity_order.get(x["severity"], 3))

        return issues[:6]
