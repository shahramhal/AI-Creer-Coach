"""
Tests for cv_analyzer/score_calculator.py - ScoreCalculator class.
"""

import pytest
from cv_analyzer.score_calculator import ScoreCalculator

RICH_PARSED_DATA = {
    "summary": "Experienced software engineer with 5 years building scalable systems at top companies.",
    "experience": [
        {
            "title": "Senior Software Engineer",
            "company": "TechCorp",
            "startDate": "2021-01",
            "endDate": "Present",
            "responsibilities": [
                "Developed microservices reducing API latency by 40%",
                "Led team of 5 engineers delivering 3 major product features",
                "Implemented CI/CD pipelines saving 2 hours of deployment time",
                "Built automated test suite increasing coverage by 35%",
            ],
            "achievements": [
                "Reduced infrastructure costs by $50,000 annually",
            ],
        },
        {
            "title": "Software Engineer",
            "company": "StartupCo",
            "startDate": "2019-01",
            "endDate": "2021-01",
            "responsibilities": [
                "Built REST API serving 100,000+ daily active users",
                "Optimized database queries improving performance by 60%",
                "Integrated third-party payment processing handling $2M+ monthly",
            ],
            "achievements": [],
        },
    ],
    "education": [{"degree": "BSc Computer Science", "institution": "University of Manchester"}],
    "skills": ["Python", "TypeScript", "React", "Node.js", "PostgreSQL",
               "Redis", "Docker", "Kubernetes", "AWS", "Git", "SQL", "Linux"],
    "contact_info": {
        "email": "john@example.com",
        "phone": "+44 7700 900123",
        "location": "London",
        "linkedin": "linkedin.com/in/john",
    },
}

MINIMAL_PARSED_DATA = {
    "summary": "",
    "experience": [],
    "education": [],
    "skills": [],
    "contact_info": {},
}

RICH_ATS_CHECKS = [
    {"status": "pass", "title": "File format is ATS-friendly", "description": "PDF detected"},
    {"status": "pass", "title": "Email address present", "description": "Valid email"},
    {"status": "pass", "title": "Skills section is comprehensive", "description": "12 skills"},
    {"status": "pass", "title": "Work experience present", "description": "2 jobs"},
    {"status": "warning", "title": "No LinkedIn URL", "description": "Add LinkedIn"},
]

POOR_ATS_CHECKS = [
    {"status": "fail", "title": "Missing email address", "description": "No email found"},
    {"status": "fail", "title": "Insufficient skills listed", "description": "No skills"},
    {"status": "fail", "title": "No work experience found", "description": "No experience"},
    {"status": "warning", "title": "CV may be too short", "description": "Too few words"},
]

GOOD_KEYWORD_ANALYSIS = {
    "keyword_match_score": 75.0,
    "missing_keywords": [],
    "matched_count": 15,
    "total_role_keywords": 20,
}

POOR_KEYWORD_ANALYSIS = {
    "keyword_match_score": 10.0,
    "missing_keywords": [{"keyword": "Python", "jobFrequency": "92%"}],
    "matched_count": 2,
    "total_role_keywords": 20,
}

FULL_CV_TEXT = """
experience education skills summary certifications projects
John Smith | john@example.com | London
Work Experience
Senior Software Engineer at TechCorp 2021-Present
Developed microservices reducing latency by 40%
Led team of 5 engineers
Education
BSc Computer Science University of Manchester 2015-2019
Skills
Python TypeScript React Node.js PostgreSQL Redis Docker Kubernetes AWS Git SQL Linux
"""

MINIMAL_CV_TEXT = "John Smith"


@pytest.fixture
def calculator():
    return ScoreCalculator()


class TestCalculateAll:
    def test_returns_dict_with_required_keys(self, calculator):
        result = calculator.calculate_all(
            FULL_CV_TEXT, RICH_PARSED_DATA, RICH_ATS_CHECKS, GOOD_KEYWORD_ANALYSIS
        )
        assert "overallScore" in result
        assert "scoreBreakdown" in result

    def test_overall_score_is_within_0_to_100(self, calculator):
        result = calculator.calculate_all(
            FULL_CV_TEXT, RICH_PARSED_DATA, RICH_ATS_CHECKS, GOOD_KEYWORD_ANALYSIS
        )
        assert 0 <= result["overallScore"] <= 100

    def test_score_breakdown_contains_5_categories(self, calculator):
        result = calculator.calculate_all(
            FULL_CV_TEXT, RICH_PARSED_DATA, RICH_ATS_CHECKS, GOOD_KEYWORD_ANALYSIS
        )
        breakdown = result["scoreBreakdown"]
        assert "contentQuality" in breakdown
        assert "atsCompatibility" in breakdown
        assert "keywordsMatch" in breakdown
        assert "formatStructure" in breakdown
        assert "experienceClarity" in breakdown

    def test_all_breakdown_scores_within_0_to_100(self, calculator):
        result = calculator.calculate_all(
            FULL_CV_TEXT, RICH_PARSED_DATA, RICH_ATS_CHECKS, GOOD_KEYWORD_ANALYSIS
        )
        for score in result["scoreBreakdown"].values():
            assert 0 <= score <= 100

    def test_rich_cv_scores_higher_than_minimal_cv(self, calculator):
        rich_result = calculator.calculate_all(
            FULL_CV_TEXT, RICH_PARSED_DATA, RICH_ATS_CHECKS, GOOD_KEYWORD_ANALYSIS
        )
        minimal_result = calculator.calculate_all(
            MINIMAL_CV_TEXT, MINIMAL_PARSED_DATA, POOR_ATS_CHECKS, POOR_KEYWORD_ANALYSIS
        )
        assert rich_result["overallScore"] > minimal_result["overallScore"]


class TestScoreContentQuality:
    def test_returns_int_between_0_and_100(self, calculator):
        score = calculator._score_content_quality(RICH_PARSED_DATA)
        assert 0 <= score <= 100

    def test_rich_cv_scores_higher_than_minimal(self, calculator):
        rich_score = calculator._score_content_quality(RICH_PARSED_DATA)
        minimal_score = calculator._score_content_quality(MINIMAL_PARSED_DATA)
        assert rich_score > minimal_score

    def test_cv_with_12_skills_scores_higher_than_zero_skills(self, calculator):
        twelve_skills_data = {**MINIMAL_PARSED_DATA, "skills": ["s" + str(i) for i in range(12)]}
        zero_skills_score = calculator._score_content_quality(MINIMAL_PARSED_DATA)
        twelve_skills_score = calculator._score_content_quality(twelve_skills_data)
        assert twelve_skills_score > zero_skills_score

    def test_cv_with_quantified_achievements_scores_higher(self, calculator):
        cv_with_metrics = {
            **MINIMAL_PARSED_DATA,
            "experience": [
                {
                    "responsibilities": [
                        "Reduced API latency by 40%",
                        "Grew user base to 50,000+ users",
                        "Saved $30,000 in infrastructure costs",
                    ],
                    "achievements": [],
                }
            ],
        }
        cv_without_metrics = {
            **MINIMAL_PARSED_DATA,
            "experience": [
                {
                    "responsibilities": [
                        "Worked on backend systems",
                        "Helped team members with tasks",
                        "Attended meetings",
                    ],
                    "achievements": [],
                }
            ],
        }
        score_with_metrics = calculator._score_content_quality(cv_with_metrics)
        score_without_metrics = calculator._score_content_quality(cv_without_metrics)
        assert score_with_metrics > score_without_metrics


class TestScoreATSCompatibility:
    def test_all_pass_checks_give_100_percent(self, calculator):
        all_pass_checks = [{"status": "pass"} for _ in range(5)]
        score = calculator._score_ats_compatibility(all_pass_checks)
        assert score == 100

    def test_all_fail_checks_give_0_percent(self, calculator):
        all_fail_checks = [{"status": "fail"} for _ in range(5)]
        score = calculator._score_ats_compatibility(all_fail_checks)
        assert score == 0

    def test_empty_checks_return_neutral_50(self, calculator):
        score = calculator._score_ats_compatibility([])
        assert score == 50

    def test_mixed_checks_give_intermediate_score(self, calculator):
        mixed_checks = [
            {"status": "pass"},
            {"status": "fail"},
        ]
        score = calculator._score_ats_compatibility(mixed_checks)
        assert 0 < score < 100


class TestScoreKeywordsMatch:
    def test_high_match_score_reflected_in_output(self, calculator):
        score = calculator._score_keywords_match({"keyword_match_score": 90.0})
        assert score == 90

    def test_zero_match_score_reflected_in_output(self, calculator):
        score = calculator._score_keywords_match({"keyword_match_score": 0.0})
        assert score == 0

    def test_score_clamped_to_100(self, calculator):
        score = calculator._score_keywords_match({"keyword_match_score": 110.0})
        assert score == 100


class TestScoreFormatStructure:
    def test_returns_int_between_0_and_100(self, calculator):
        score = calculator._score_format_structure(FULL_CV_TEXT, RICH_PARSED_DATA)
        assert 0 <= score <= 100

    def test_cv_with_many_sections_scores_higher(self, calculator):
        rich_score = calculator._score_format_structure(FULL_CV_TEXT, RICH_PARSED_DATA)
        minimal_score = calculator._score_format_structure(MINIMAL_CV_TEXT, MINIMAL_PARSED_DATA)
        assert rich_score > minimal_score


class TestScoreExperienceClarity:
    def test_returns_15_for_no_experience(self, calculator):
        score = calculator._score_experience_clarity(MINIMAL_PARSED_DATA)
        assert score == 15

    def test_rich_experience_scores_higher_than_no_experience(self, calculator):
        rich_score = calculator._score_experience_clarity(RICH_PARSED_DATA)
        assert rich_score > 15

    def test_returns_int_between_0_and_100(self, calculator):
        score = calculator._score_experience_clarity(RICH_PARSED_DATA)
        assert 0 <= score <= 100
