"""
Integration tests for cv_analyzer/analyzer.py - CVAnalyzer orchestrator.
Mocks all sub-module calls to test orchestration logic.
"""

import pytest
from unittest.mock import MagicMock, patch
from cv_analyzer.analyzer import CVAnalyzer

SAMPLE_CV_TEXT = """
John Smith | john@example.com | London
Senior Software Engineer

Experience:
Senior Engineer at TechCorp (2021-Present)
- Built microservices reducing latency by 40%

Skills: Python, Docker, Kubernetes, AWS, PostgreSQL
"""

SAMPLE_PARSED_DATA = {
    "contact_info": {"email": "john@example.com", "phone": "+44 7700 900123"},
    "experience": [
        {
            "title": "Senior Software Engineer",
            "company": "TechCorp",
            "startDate": "2021-01",
            "endDate": "Present",
            "responsibilities": ["Built microservices reducing latency by 40%"],
            "achievements": [],
        }
    ],
    "skills": ["Python", "Docker", "Kubernetes", "AWS", "PostgreSQL"],
    "education": [{"degree": "BSc Computer Science"}],
    "summary": "Experienced backend engineer",
}

MOCK_KEYWORD_ANALYSIS = {
    "target_role": "software_engineer",
    "cv_keywords": [("python", 0.9), ("docker", 0.8)],
    "missing_keywords": [
        {"keyword": "TypeScript", "jobFrequency": "76%", "section": "Skills", "impact": "+9%"}
    ],
    "keyword_match_score": 65.0,
    "matched_count": 13,
    "total_role_keywords": 20,
}

MOCK_ATS_CHECKS = [
    {"status": "pass", "title": "Email present", "description": "Valid email"},
    {"status": "warning", "title": "No LinkedIn", "description": "Add LinkedIn"},
]

MOCK_SCORE_RESULT = {
    "overallScore": 72,
    "scoreBreakdown": {
        "contentQuality": 75,
        "atsCompatibility": 70,
        "keywordsMatch": 65,
        "formatStructure": 78,
        "experienceClarity": 72,
    },
}

MOCK_RECOMMENDATIONS = [
    {
        "priority": 1,
        "title": "Add quantifiable achievements",
        "description": "Use metrics to demonstrate impact",
        "impact": "High Impact",
        "timeEstimate": "~15 min",
        "impactRate": "+12% interview rate",
    }
]

MOCK_ATS_SCORE_RESULT = {
    "atsScore": 68,
    "breakdown": {
        "keywordMatch": 70,
        "semanticSimilarity": 65,
        "skillsCoverage": 60,
    },
    "keywordsMatched": [{"keyword": "python", "foundIn": "Skills"}],
    "keywordsMissing": [{"keyword": "terraform", "importance": "medium", "suggestion": "add it"}],
    "matchDetails": {"totalJobKeywords": 10, "matchedCount": 7, "semanticScore": 0.65},
    "suggestions": ["Add terraform to your skills"],
}

MOCK_OVERVIEW_RESULT = {
    "overallScore": 70,
    "scoreBreakdown": {
        "contentQuality": 72,
        "formatStructure": 68,
        "experienceClarity": 70,
        "atsReadability": 65,
    },
    "atsChecks": MOCK_ATS_CHECKS,
    "priorityIssues": [],
    "recommendations": MOCK_RECOMMENDATIONS,
    "metadata": {"wordCount": 250, "sectionCount": 4},
    "analyzedAt": "2024-01-01T12:00:00",
}


@pytest.fixture
def cv_analyzer():
    return CVAnalyzer()


class TestCVAnalyzerAnalyze:
    def test_calls_keyword_analyzer_once(self, cv_analyzer):
        cv_analyzer.keyword_analyzer.analyze_keyword_gaps = MagicMock(
            return_value=MOCK_KEYWORD_ANALYSIS
        )
        cv_analyzer.ats_checker.check_all = MagicMock(return_value=MOCK_ATS_CHECKS)
        cv_analyzer.score_calculator.calculate_all = MagicMock(return_value=MOCK_SCORE_RESULT)
        cv_analyzer.recommendation_engine.generate = MagicMock(return_value=MOCK_RECOMMENDATIONS)

        cv_analyzer.analyze(SAMPLE_CV_TEXT, SAMPLE_PARSED_DATA, "cv.pdf", "software_engineer")

        cv_analyzer.keyword_analyzer.analyze_keyword_gaps.assert_called_once()

    def test_calls_ats_checker_once(self, cv_analyzer):
        cv_analyzer.keyword_analyzer.analyze_keyword_gaps = MagicMock(
            return_value=MOCK_KEYWORD_ANALYSIS
        )
        cv_analyzer.ats_checker.check_all = MagicMock(return_value=MOCK_ATS_CHECKS)
        cv_analyzer.score_calculator.calculate_all = MagicMock(return_value=MOCK_SCORE_RESULT)
        cv_analyzer.recommendation_engine.generate = MagicMock(return_value=MOCK_RECOMMENDATIONS)

        cv_analyzer.analyze(SAMPLE_CV_TEXT, SAMPLE_PARSED_DATA, "cv.pdf")

        cv_analyzer.ats_checker.check_all.assert_called_once()

    def test_calls_score_calculator_once(self, cv_analyzer):
        cv_analyzer.keyword_analyzer.analyze_keyword_gaps = MagicMock(
            return_value=MOCK_KEYWORD_ANALYSIS
        )
        cv_analyzer.ats_checker.check_all = MagicMock(return_value=MOCK_ATS_CHECKS)
        cv_analyzer.score_calculator.calculate_all = MagicMock(return_value=MOCK_SCORE_RESULT)
        cv_analyzer.recommendation_engine.generate = MagicMock(return_value=MOCK_RECOMMENDATIONS)

        cv_analyzer.analyze(SAMPLE_CV_TEXT, SAMPLE_PARSED_DATA)

        cv_analyzer.score_calculator.calculate_all.assert_called_once()

    def test_calls_recommendation_engine_once(self, cv_analyzer):
        cv_analyzer.keyword_analyzer.analyze_keyword_gaps = MagicMock(
            return_value=MOCK_KEYWORD_ANALYSIS
        )
        cv_analyzer.ats_checker.check_all = MagicMock(return_value=MOCK_ATS_CHECKS)
        cv_analyzer.score_calculator.calculate_all = MagicMock(return_value=MOCK_SCORE_RESULT)
        cv_analyzer.recommendation_engine.generate = MagicMock(return_value=MOCK_RECOMMENDATIONS)

        cv_analyzer.analyze(SAMPLE_CV_TEXT, SAMPLE_PARSED_DATA)

        cv_analyzer.recommendation_engine.generate.assert_called_once()

    def test_returns_dict_with_required_keys(self, cv_analyzer):
        cv_analyzer.keyword_analyzer.analyze_keyword_gaps = MagicMock(
            return_value=MOCK_KEYWORD_ANALYSIS
        )
        cv_analyzer.ats_checker.check_all = MagicMock(return_value=MOCK_ATS_CHECKS)
        cv_analyzer.score_calculator.calculate_all = MagicMock(return_value=MOCK_SCORE_RESULT)
        cv_analyzer.recommendation_engine.generate = MagicMock(return_value=MOCK_RECOMMENDATIONS)

        result = cv_analyzer.analyze(SAMPLE_CV_TEXT, SAMPLE_PARSED_DATA, "cv.pdf")

        required_keys = {
            "overallScore", "scoreBreakdown", "priorityIssues",
            "atsAnalysis", "missingKeywords", "recommendations",
            "analyzedAt", "_meta",
        }
        assert required_keys.issubset(set(result.keys()))

    def test_overall_score_from_score_result_is_used(self, cv_analyzer):
        cv_analyzer.keyword_analyzer.analyze_keyword_gaps = MagicMock(
            return_value=MOCK_KEYWORD_ANALYSIS
        )
        cv_analyzer.ats_checker.check_all = MagicMock(return_value=MOCK_ATS_CHECKS)
        cv_analyzer.score_calculator.calculate_all = MagicMock(return_value=MOCK_SCORE_RESULT)
        cv_analyzer.recommendation_engine.generate = MagicMock(return_value=MOCK_RECOMMENDATIONS)

        result = cv_analyzer.analyze(SAMPLE_CV_TEXT, SAMPLE_PARSED_DATA)

        assert result["overallScore"] == MOCK_SCORE_RESULT["overallScore"]

    def test_meta_contains_target_role_and_keyword_stats(self, cv_analyzer):
        cv_analyzer.keyword_analyzer.analyze_keyword_gaps = MagicMock(
            return_value=MOCK_KEYWORD_ANALYSIS
        )
        cv_analyzer.ats_checker.check_all = MagicMock(return_value=MOCK_ATS_CHECKS)
        cv_analyzer.score_calculator.calculate_all = MagicMock(return_value=MOCK_SCORE_RESULT)
        cv_analyzer.recommendation_engine.generate = MagicMock(return_value=MOCK_RECOMMENDATIONS)

        result = cv_analyzer.analyze(SAMPLE_CV_TEXT, SAMPLE_PARSED_DATA)

        meta = result["_meta"]
        assert "targetRole" in meta
        assert "keywordMatchScore" in meta
        assert "matchedKeywords" in meta
        assert "totalRoleKeywords" in meta


class TestCVAnalyzerAnalyzeOverview:
    def test_delegates_to_overview_scorer(self, cv_analyzer):
        cv_analyzer.overview_scorer.analyze = MagicMock(return_value=MOCK_OVERVIEW_RESULT)

        result = cv_analyzer.analyze_overview(SAMPLE_CV_TEXT, SAMPLE_PARSED_DATA, "cv.pdf")

        cv_analyzer.overview_scorer.analyze.assert_called_once_with(
            SAMPLE_CV_TEXT, SAMPLE_PARSED_DATA, "cv.pdf"
        )
        assert result == MOCK_OVERVIEW_RESULT

    def test_passes_filename_to_overview_scorer(self, cv_analyzer):
        cv_analyzer.overview_scorer.analyze = MagicMock(return_value=MOCK_OVERVIEW_RESULT)

        cv_analyzer.analyze_overview(SAMPLE_CV_TEXT, SAMPLE_PARSED_DATA, "my_resume.pdf")

        call_args = cv_analyzer.overview_scorer.analyze.call_args
        assert call_args[0][2] == "my_resume.pdf" or call_args[1].get("filename") == "my_resume.pdf"


class TestCVAnalyzerAnalyzeATS:
    def test_delegates_to_ats_scorer(self, cv_analyzer):
        cv_analyzer.ats_scorer.score = MagicMock(return_value=MOCK_ATS_SCORE_RESULT)

        result = cv_analyzer.analyze_ats(
            cv_text=SAMPLE_CV_TEXT,
            parsed_data=SAMPLE_PARSED_DATA,
            job_description="Python developer needed for backend APIs",
            job_requirements="Docker, Kubernetes",
            job_skills=["Python", "Docker"],
        )

        cv_analyzer.ats_scorer.score.assert_called_once()
        assert result == MOCK_ATS_SCORE_RESULT

    def test_passes_job_skills_to_ats_scorer(self, cv_analyzer):
        cv_analyzer.ats_scorer.score = MagicMock(return_value=MOCK_ATS_SCORE_RESULT)
        job_skills = ["Python", "Docker", "Kubernetes"]

        cv_analyzer.analyze_ats(
            cv_text=SAMPLE_CV_TEXT,
            parsed_data=SAMPLE_PARSED_DATA,
            job_description="Backend developer role",
            job_skills=job_skills,
        )

        call_kwargs = cv_analyzer.ats_scorer.score.call_args
        passed_skills = (
            call_kwargs[1].get("job_skills") or
            (call_kwargs[0][4] if len(call_kwargs[0]) > 4 else None)
        )
        assert passed_skills == job_skills


class TestCompilePriorityIssues:
    def test_critical_issues_sorted_before_warnings(self, cv_analyzer):
        score_result_with_low_scores = {
            "overallScore": 35,
            "scoreBreakdown": {
                "contentQuality": 25,
                "atsCompatibility": 30,
                "keywordsMatch": 15,
                "formatStructure": 40,
                "experienceClarity": 20,
            },
        }
        ats_checks_with_failures = [
            {"status": "fail", "title": "Missing email", "description": "No email"},
        ]
        keyword_analysis_with_low_score = {
            "keyword_match_score": 20.0,
            "missing_keywords": [{"keyword": "Python"}] * 8,
        }

        issues = cv_analyzer._compile_priority_issues(
            score_result_with_low_scores,
            ats_checks_with_failures,
            keyword_analysis_with_low_score,
        )

        severity_order = {"critical": 0, "warning": 1, "suggestion": 2}
        severities = [severity_order.get(i["severity"], 3) for i in issues]
        assert severities == sorted(severities)

    def test_max_6_priority_issues_returned(self, cv_analyzer):
        score_result_with_all_low = {
            "overallScore": 10,
            "scoreBreakdown": {
                "contentQuality": 10,
                "atsCompatibility": 10,
                "keywordsMatch": 10,
                "formatStructure": 10,
                "experienceClarity": 10,
            },
        }
        many_fail_checks = [
            {"status": "fail", "title": f"Fail {i}", "description": "desc"}
            for i in range(10)
        ]
        keyword_analysis = {"keyword_match_score": 5.0, "missing_keywords": [{}] * 10}

        issues = cv_analyzer._compile_priority_issues(
            score_result_with_all_low, many_fail_checks, keyword_analysis
        )
        assert len(issues) <= 6

    def test_each_issue_has_severity_title_description_impact(self, cv_analyzer):
        score_result = {
            "overallScore": 20,
            "scoreBreakdown": {
                "contentQuality": 20,
                "atsCompatibility": 15,
                "keywordsMatch": 10,
                "formatStructure": 25,
                "experienceClarity": 15,
            },
        }
        ats_checks = [{"status": "fail", "title": "No email", "description": "Missing"}]
        keyword_analysis = {"keyword_match_score": 20.0, "missing_keywords": []}

        issues = cv_analyzer._compile_priority_issues(score_result, ats_checks, keyword_analysis)
        for issue in issues:
            assert "severity" in issue
            assert "title" in issue
            assert "description" in issue
            assert "impact" in issue
