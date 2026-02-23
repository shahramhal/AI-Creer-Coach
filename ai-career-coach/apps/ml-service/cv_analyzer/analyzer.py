"""
CV Analyzer — Main orchestrator.
Coordinates keyword analysis, ATS checks, scoring, and recommendations.
No external API calls — fully local analysis.
"""

import logging
from datetime import datetime
from typing import Dict, List, Optional

from cv_analyzer.keyword_analyzer import KeywordAnalyzer
from cv_analyzer.ats_checker import ATSChecker
from cv_analyzer.score_calculator import ScoreCalculator
from cv_analyzer.recommendation_engine import RecommendationEngine
from cv_analyzer.cv_overview_scorer import CVOverviewScorer
from cv_analyzer.ats_scorer import ATSScorer

logger = logging.getLogger(__name__)


class CVAnalyzer:
    """
    Comprehensive CV analyzer.
    Runs all analysis modules and returns a unified AnalysisData result.
    """

    def __init__(self):
        self.keyword_analyzer = KeywordAnalyzer()
        self.ats_checker = ATSChecker()
        self.score_calculator = ScoreCalculator()
        self.recommendation_engine = RecommendationEngine()
        self.overview_scorer = CVOverviewScorer()
        self.ats_scorer = ATSScorer()
        logger.info("CVAnalyzer initialized")

    def analyze(
        self,
        cv_text: str,
        parsed_data: Dict,
        filename: str = "",
        target_role: Optional[str] = None,
    ) -> Dict:
        """
        Run full CV analysis.

        Args:
            cv_text: Raw CV text
            parsed_data: Structured parsed CV data (contact_info, experience, etc.)
            filename: Original filename (for format checks)
            target_role: Target role for keyword gap analysis (auto-detected if None)

        Returns:
            Complete AnalysisData dict matching the frontend interface
        """
        logger.info(f"Starting CV analysis for: {filename}")

        # Step 1: Keyword gap analysis
        logger.info("Running keyword analysis...")
        keyword_analysis = self.keyword_analyzer.analyze_keyword_gaps(
            cv_text, parsed_data, target_role
        )

        # Step 2: ATS compatibility checks
        logger.info("Running ATS checks...")
        ats_checks = self.ats_checker.check_all(cv_text, parsed_data, filename)

        # Step 3: Calculate scores
        logger.info("Calculating scores...")
        score_result = self.score_calculator.calculate_all(
            cv_text, parsed_data, ats_checks, keyword_analysis
        )

        # Step 4: Generate recommendations
        logger.info("Generating recommendations...")
        recommendations = self.recommendation_engine.generate(
            score_result, ats_checks, keyword_analysis, parsed_data
        )

        # Step 5: Compile priority issues from lowest scores and failed checks
        priority_issues = self._compile_priority_issues(
            score_result, ats_checks, keyword_analysis
        )

        # Build final result
        analysis_data = {
            "overallScore": score_result["overallScore"],
            "scoreBreakdown": score_result["scoreBreakdown"],
            "priorityIssues": priority_issues,
            "atsAnalysis": ats_checks,
            "missingKeywords": keyword_analysis.get("missing_keywords", []),
            "recommendations": recommendations,
            "analyzedAt": datetime.utcnow().isoformat(),
            "_meta": {
                "targetRole": keyword_analysis.get("target_role", "unknown"),
                "keywordMatchScore": keyword_analysis.get("keyword_match_score", 0),
                "matchedKeywords": keyword_analysis.get("matched_count", 0),
                "totalRoleKeywords": keyword_analysis.get("total_role_keywords", 0),
            },
        }

        logger.info(
            f"Analysis complete: overall={analysis_data['overallScore']}/100, "
            f"issues={len(priority_issues)}, recommendations={len(recommendations)}"
        )

        return analysis_data

    def analyze_overview(
        self,
        cv_text: str,
        parsed_data: Dict,
        filename: str = "",
    ) -> Dict:
        """
        Run job-agnostic CV overview analysis.
        Returns quality scores without keyword/job matching.
        """
        return self.overview_scorer.analyze(cv_text, parsed_data, filename)

    def analyze_ats(
        self,
        cv_text: str,
        parsed_data: Dict,
        job_description: str,
        job_requirements: str = "",
        job_skills: Optional[List] = None,
    ) -> Dict:
        """
        Run job-specific ATS keyword matching.
        Compares CV against a specific job description.
        """
        return self.ats_scorer.score(
            cv_text, parsed_data, job_description, job_requirements, job_skills
        )

    def _compile_priority_issues(
        self,
        score_result: Dict,
        ats_checks: List,
        keyword_analysis: Dict,
    ) -> list:
        """Extract the most important issues from analysis results."""
        issues: List[Dict] = []

        breakdown = score_result.get("scoreBreakdown", {})

        # Low score categories become priority issues
        score_thresholds = [
            ("contentQuality", "Content quality needs improvement",
             "Your CV content lacks quantifiable achievements and detailed descriptions",
             "+12% interview rate"),
            ("atsCompatibility", "ATS compatibility issues found",
             "Several formatting or structural issues may prevent ATS from parsing your CV correctly",
             "+15% pass rate"),
            ("keywordsMatch", "Missing important keywords",
             "Your CV is missing key industry terms that ATS systems look for",
             "+10% match rate"),
            ("formatStructure", "Format and structure can be improved",
             "CV structure doesn't follow standard conventions expected by recruiters and ATS",
             "+8% readability"),
            ("experienceClarity", "Experience section lacks clarity",
             "Your experience descriptions could be more specific and impactful",
             "+10% interview rate"),
        ]

        for key, title, description, impact in score_thresholds:
            score = breakdown.get(key, 100)
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

        # Add keyword gap as suggestion if significant
        match_score = keyword_analysis.get("keyword_match_score", 100)
        missing_count = len(keyword_analysis.get("missing_keywords", []))
        if match_score < 50 and missing_count > 5:
            issues.append({
                "severity": "warning",
                "title": f"Missing {missing_count} important keywords",
                "description": f"Your CV covers only {round(match_score)}% of expected keywords for your target role",
                "impact": "+15% interview rate",
            })

        # Sort: critical first, then warning, then suggestion
        severity_order = {"critical": 0, "warning": 1, "suggestion": 2}
        issues.sort(key=lambda x: severity_order.get(x["severity"], 3))

        return issues[:6]
