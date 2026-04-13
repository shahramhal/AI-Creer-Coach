"""
Tests for cv_analyzer/cv_overview_scorer.py - CVOverviewScorer class.
"""

import pytest
from cv_analyzer.cv_overview_scorer import CVOverviewScorer, OVERVIEW_WEIGHTS

RICH_CV_TEXT = """
John Smith | john@example.com | +44 7700 900123 | London, UK
linkedin.com/in/johnsmith

Professional Summary
Experienced backend engineer with 6 years building scalable Python APIs.

Work Experience
Senior Software Engineer at TechCorp (2021 - Present)
- Developed microservices reducing latency by 40%
- Led a team of 5 engineers delivering 3 major features
- Deployed infrastructure to AWS using Docker and Kubernetes

Software Engineer at StartupCo (2019 - 2021)
- Built REST APIs serving 100,000+ daily users
- Optimized database queries improving performance by 60%

Skills
Python, TypeScript, React, Node.js, PostgreSQL, Redis, Docker, Kubernetes, AWS, Git

Education
BSc Computer Science, University of Manchester (2015-2019)
"""

MINIMAL_CV_TEXT = "John Smith"

RICH_PARSED_DATA = {
    "contact_info": {
        "email": "john@example.com",
        "phone": "+44 7700 900123",
        "location": "London, UK",
        "linkedin": "linkedin.com/in/johnsmith",
    },
    "summary": "Experienced backend engineer with 6 years building scalable Python APIs.",
    "experience": [
        {
            "title": "Senior Software Engineer",
            "company": "TechCorp",
            "startDate": "2021-01",
            "endDate": "Present",
            "responsibilities": [
                "Developed microservices reducing latency by 40%",
                "Led a team of 5 engineers delivering 3 major features",
                "Deployed infrastructure to AWS using Docker and Kubernetes",
            ],
            "achievements": [],
        },
        {
            "title": "Software Engineer",
            "company": "StartupCo",
            "startDate": "2019-01",
            "endDate": "2021-01",
            "responsibilities": [
                "Built REST APIs serving 100,000+ daily users",
                "Optimized database queries improving performance by 60%",
            ],
            "achievements": [],
        },
    ],
    "education": [{"degree": "BSc Computer Science", "institution": "University of Manchester"}],
    "skills": ["Python", "TypeScript", "React", "Node.js", "PostgreSQL",
               "Redis", "Docker", "Kubernetes", "AWS", "Git"],
}

MINIMAL_PARSED_DATA = {
    "contact_info": {},
    "summary": "",
    "experience": [],
    "education": [],
    "skills": [],
}


@pytest.fixture
def overview_scorer():
    return CVOverviewScorer()


class TestCVOverviewScorerWeights:
    def test_overview_weights_sum_to_1(self):
        total = sum(OVERVIEW_WEIGHTS.values())
        assert abs(total - 1.0) < 1e-6

    def test_overview_weights_has_four_categories(self):
        assert len(OVERVIEW_WEIGHTS) == 4
        expected_keys = {"contentQuality", "formatStructure", "experienceClarity", "atsReadability"}
        assert set(OVERVIEW_WEIGHTS.keys()) == expected_keys


class TestCVOverviewScorerAnalyze:
    def test_returns_dict_with_required_keys(self, overview_scorer):
        result = overview_scorer.analyze(RICH_CV_TEXT, RICH_PARSED_DATA, "cv.pdf")
        required_keys = {
            "overallScore", "scoreBreakdown", "atsChecks",
            "priorityIssues", "recommendations", "metadata", "analyzedAt",
        }
        assert required_keys.issubset(set(result.keys()))

    def test_overall_score_is_within_0_to_100(self, overview_scorer):
        result = overview_scorer.analyze(RICH_CV_TEXT, RICH_PARSED_DATA, "cv.pdf")
        assert 0 <= result["overallScore"] <= 100

    def test_score_breakdown_has_four_categories(self, overview_scorer):
        result = overview_scorer.analyze(RICH_CV_TEXT, RICH_PARSED_DATA, "cv.pdf")
        breakdown = result["scoreBreakdown"]
        assert "contentQuality" in breakdown
        assert "formatStructure" in breakdown
        assert "experienceClarity" in breakdown
        assert "atsReadability" in breakdown

    def test_all_breakdown_scores_within_0_to_100(self, overview_scorer):
        result = overview_scorer.analyze(RICH_CV_TEXT, RICH_PARSED_DATA, "cv.pdf")
        for score in result["scoreBreakdown"].values():
            assert 0 <= score <= 100

    def test_ats_checks_is_a_non_empty_list(self, overview_scorer):
        result = overview_scorer.analyze(RICH_CV_TEXT, RICH_PARSED_DATA, "cv.pdf")
        assert isinstance(result["atsChecks"], list)
        assert len(result["atsChecks"]) > 0

    def test_priority_issues_is_a_list(self, overview_scorer):
        result = overview_scorer.analyze(MINIMAL_CV_TEXT, MINIMAL_PARSED_DATA, "")
        assert isinstance(result["priorityIssues"], list)

    def test_recommendations_is_a_list(self, overview_scorer):
        result = overview_scorer.analyze(RICH_CV_TEXT, RICH_PARSED_DATA, "cv.pdf")
        assert isinstance(result["recommendations"], list)

    def test_metadata_contains_word_count_and_section_count(self, overview_scorer):
        result = overview_scorer.analyze(RICH_CV_TEXT, RICH_PARSED_DATA, "cv.pdf")
        metadata = result["metadata"]
        assert "wordCount" in metadata
        assert "sectionCount" in metadata

    def test_metadata_word_count_is_positive_for_non_empty_cv(self, overview_scorer):
        result = overview_scorer.analyze(RICH_CV_TEXT, RICH_PARSED_DATA, "cv.pdf")
        assert result["metadata"]["wordCount"] > 0

    def test_metadata_section_count_reflects_parsed_data(self, overview_scorer):
        result = overview_scorer.analyze(RICH_CV_TEXT, RICH_PARSED_DATA, "cv.pdf")
        assert result["metadata"]["sectionCount"] >= 3

    def test_minimal_cv_has_lower_score_than_rich_cv(self, overview_scorer):
        rich_result = overview_scorer.analyze(RICH_CV_TEXT, RICH_PARSED_DATA, "cv.pdf")
        minimal_result = overview_scorer.analyze(MINIMAL_CV_TEXT, MINIMAL_PARSED_DATA, "")
        assert rich_result["overallScore"] > minimal_result["overallScore"]

    def test_analyzed_at_is_iso_format_string(self, overview_scorer):
        result = overview_scorer.analyze(RICH_CV_TEXT, RICH_PARSED_DATA, "cv.pdf")
        from datetime import datetime
        datetime.fromisoformat(result["analyzedAt"])

    def test_rich_cv_produces_fewer_priority_issues_than_minimal(self, overview_scorer):
        rich_result = overview_scorer.analyze(RICH_CV_TEXT, RICH_PARSED_DATA, "cv.pdf")
        minimal_result = overview_scorer.analyze(MINIMAL_CV_TEXT, MINIMAL_PARSED_DATA, "")
        assert len(rich_result["priorityIssues"]) <= len(minimal_result["priorityIssues"])


class TestCompilePriorityIssues:
    def test_critical_issues_appear_before_warnings(self, overview_scorer):
        score_breakdown_with_low_scores = {
            "contentQuality": 30,
            "formatStructure": 60,
            "experienceClarity": 25,
            "atsReadability": 65,
        }
        ats_checks = [
            {"status": "fail", "title": "No email", "description": "Missing email"},
        ]
        issues = overview_scorer._compile_priority_issues(score_breakdown_with_low_scores, ats_checks)
        if len(issues) >= 2:
            severity_order = {"critical": 0, "warning": 1, "suggestion": 2}
            severities = [severity_order[i["severity"]] for i in issues]
            assert severities == sorted(severities)

    def test_issues_list_max_6_entries(self, overview_scorer):
        low_scores = {
            "contentQuality": 10,
            "formatStructure": 10,
            "experienceClarity": 10,
            "atsReadability": 10,
        }
        many_fail_checks = [
            {"status": "fail", "title": f"Fail {i}", "description": "desc"}
            for i in range(10)
        ]
        issues = overview_scorer._compile_priority_issues(low_scores, many_fail_checks)
        assert len(issues) <= 6

    def test_no_issues_for_perfect_scores_and_no_failures(self, overview_scorer):
        perfect_scores = {
            "contentQuality": 95,
            "formatStructure": 90,
            "experienceClarity": 88,
            "atsReadability": 92,
        }
        all_pass_checks = [{"status": "pass", "title": "ok", "description": "all good"}]
        issues = overview_scorer._compile_priority_issues(perfect_scores, all_pass_checks)
        assert len(issues) == 0
