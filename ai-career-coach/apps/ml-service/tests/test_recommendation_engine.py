"""
Tests for cv_analyzer/recommendation_engine.py - RecommendationEngine class.
"""

import pytest
from cv_analyzer.recommendation_engine import RecommendationEngine

RICH_PARSED_DATA = {
    "contact_info": {
        "email": "john@example.com",
        "phone": "+44 7700 900123",
        "location": "London",
        "linkedin": "linkedin.com/in/john",
    },
    "summary": "Experienced software engineer with 6 years building distributed systems.",
    "experience": [
        {
            "title": "Senior Software Engineer",
            "company": "TechCorp",
            "responsibilities": [
                "Developed microservices reducing API latency by 40%",
                "Led team of 5 engineers",
                "Implemented CI/CD pipelines saving 2 hours per deployment",
            ],
            "achievements": ["Reduced costs by $50,000 annually"],
        }
    ],
    "skills": ["Python", "TypeScript", "React", "Node.js", "PostgreSQL",
               "Redis", "Docker", "Kubernetes", "AWS", "Git", "SQL", "Linux"],
    "education": [{"degree": "BSc Computer Science"}],
}

MINIMAL_PARSED_DATA = {
    "contact_info": {},
    "summary": "",
    "experience": [],
    "skills": [],
    "education": [],
}

SPARSE_PARSED_DATA = {
    "contact_info": {},
    "summary": "I build software",
    "experience": [
        {
            "title": "Developer",
            "company": "Company",
            "responsibilities": ["wrote code", "attended meetings"],
            "achievements": [],
        }
    ],
    "skills": ["Python", "SQL"],
    "education": [],
}

SCORES_GOOD = {
    "overallScore": 78,
    "scoreBreakdown": {
        "contentQuality": 80,
        "atsCompatibility": 75,
        "keywordsMatch": 70,
        "formatStructure": 82,
        "experienceClarity": 77,
    },
}

SCORES_POOR = {
    "overallScore": 25,
    "scoreBreakdown": {
        "contentQuality": 20,
        "atsCompatibility": 18,
        "keywordsMatch": 10,
        "formatStructure": 30,
        "experienceClarity": 15,
    },
}

GOOD_ATS_CHECKS = [
    {"status": "pass", "title": "Email present", "description": "ok"},
    {"status": "pass", "title": "Skills present", "description": "ok"},
]

FAILING_ATS_CHECKS = [
    {"status": "fail", "title": "Missing email", "description": "No email found"},
    {"status": "fail", "title": "No skills", "description": "Skills section empty"},
    {"status": "warning", "title": "Short CV", "description": "Too few words"},
]

KEYWORD_ANALYSIS_WITH_GAPS = {
    "missing_keywords": [
        {"keyword": "Kubernetes", "jobFrequency": "82%", "section": "Skills", "impact": "+12%"},
        {"keyword": "Terraform", "jobFrequency": "72%", "section": "Experience", "impact": "+10%"},
        {"keyword": "AWS", "jobFrequency": "65%", "section": "Experience", "impact": "+8%"},
        {"keyword": "Docker", "jobFrequency": "45%", "section": "Skills", "impact": "+5%"},
    ],
    "keyword_match_score": 40.0,
}

KEYWORD_ANALYSIS_NO_GAPS = {
    "missing_keywords": [],
    "keyword_match_score": 100.0,
}


@pytest.fixture
def recommendation_engine():
    return RecommendationEngine()


class TestGenerateRecommendations:
    def test_returns_list(self, recommendation_engine):
        result = recommendation_engine.generate(
            SCORES_GOOD, GOOD_ATS_CHECKS, KEYWORD_ANALYSIS_NO_GAPS, RICH_PARSED_DATA
        )
        assert isinstance(result, list)

    def test_each_recommendation_has_required_keys(self, recommendation_engine):
        result = recommendation_engine.generate(
            SCORES_POOR, FAILING_ATS_CHECKS, KEYWORD_ANALYSIS_WITH_GAPS, SPARSE_PARSED_DATA
        )
        for rec in result:
            assert "priority" in rec
            assert "title" in rec
            assert "description" in rec
            assert "impact" in rec
            assert "timeEstimate" in rec
            assert "impactRate" in rec

    def test_priorities_are_sequential_starting_from_1(self, recommendation_engine):
        result = recommendation_engine.generate(
            SCORES_POOR, FAILING_ATS_CHECKS, KEYWORD_ANALYSIS_WITH_GAPS, SPARSE_PARSED_DATA
        )
        if result:
            priorities = [r["priority"] for r in result]
            assert priorities == list(range(1, len(priorities) + 1))

    def test_impact_values_are_valid(self, recommendation_engine):
        result = recommendation_engine.generate(
            SCORES_POOR, FAILING_ATS_CHECKS, KEYWORD_ANALYSIS_WITH_GAPS, SPARSE_PARSED_DATA
        )
        valid_impacts = {"High Impact", "Medium Impact", "Low Impact"}
        for rec in result:
            assert rec["impact"] in valid_impacts

    def test_max_8_recommendations_returned(self, recommendation_engine):
        result = recommendation_engine.generate(
            SCORES_POOR, FAILING_ATS_CHECKS, KEYWORD_ANALYSIS_WITH_GAPS, MINIMAL_PARSED_DATA
        )
        assert len(result) <= 8

    def test_good_cv_produces_fewer_recommendations_than_poor_cv(self, recommendation_engine):
        rich_result = recommendation_engine.generate(
            SCORES_GOOD, GOOD_ATS_CHECKS, KEYWORD_ANALYSIS_NO_GAPS, RICH_PARSED_DATA
        )
        poor_result = recommendation_engine.generate(
            SCORES_POOR, FAILING_ATS_CHECKS, KEYWORD_ANALYSIS_WITH_GAPS, MINIMAL_PARSED_DATA
        )
        assert len(rich_result) <= len(poor_result)


class TestCheckQuantifiableAchievements:
    def test_recommends_metrics_when_achievements_are_generic(self, recommendation_engine):
        parsed_without_metrics = {
            "experience": [
                {
                    "responsibilities": [
                        "Worked on backend systems",
                        "Helped team members",
                        "Wrote documentation",
                    ],
                    "achievements": [],
                }
            ]
        }
        recs = recommendation_engine._check_quantifiable_achievements(parsed_without_metrics, SCORES_GOOD)
        assert len(recs) > 0
        assert any("quantifiable" in r["title"].lower() or "achievement" in r["title"].lower() for r in recs)

    def test_no_recommendation_when_metrics_present(self, recommendation_engine):
        parsed_with_metrics = {
            "experience": [
                {
                    "responsibilities": [
                        "Improved performance by 40%",
                        "Reduced costs by $50,000",
                        "Grew user base to 100,000+",
                        "Saved 2 hours per deployment cycle",
                    ],
                    "achievements": [],
                }
            ]
        }
        recs = recommendation_engine._check_quantifiable_achievements(parsed_with_metrics, SCORES_GOOD)
        assert len(recs) == 0


class TestCheckProfessionalSummary:
    def test_recommends_summary_when_missing(self, recommendation_engine):
        recs = recommendation_engine._check_professional_summary(MINIMAL_PARSED_DATA, SCORES_POOR)
        assert any("summary" in r["title"].lower() for r in recs)

    def test_recommends_expansion_when_summary_too_short(self, recommendation_engine):
        parsed_with_brief_summary = {**MINIMAL_PARSED_DATA, "summary": "I am a developer"}
        recs = recommendation_engine._check_professional_summary(parsed_with_brief_summary, SCORES_POOR)
        assert len(recs) > 0

    def test_no_recommendation_for_adequate_summary(self, recommendation_engine):
        parsed_with_good_summary = {
            **MINIMAL_PARSED_DATA,
            "summary": "Experienced software engineer with 6 years building scalable backend systems "
                       "using Python, Docker, and AWS. Proven track record of delivering projects on time.",
        }
        recs = recommendation_engine._check_professional_summary(parsed_with_good_summary, SCORES_GOOD)
        assert len(recs) == 0


class TestCheckMissingKeywords:
    def test_generates_recommendations_for_high_frequency_keywords(self, recommendation_engine):
        recs = recommendation_engine._check_missing_keywords(KEYWORD_ANALYSIS_WITH_GAPS)
        assert len(recs) > 0

    def test_no_recommendations_when_no_gaps(self, recommendation_engine):
        recs = recommendation_engine._check_missing_keywords(KEYWORD_ANALYSIS_NO_GAPS)
        assert len(recs) == 0

    def test_max_3_keyword_recommendations(self, recommendation_engine):
        recs = recommendation_engine._check_missing_keywords(KEYWORD_ANALYSIS_WITH_GAPS)
        assert len(recs) <= 3

    def test_keyword_mentioned_in_recommendation_title(self, recommendation_engine):
        recs = recommendation_engine._check_missing_keywords(KEYWORD_ANALYSIS_WITH_GAPS)
        titles = [r["title"].lower() for r in recs]
        assert any("kubernetes" in t for t in titles)


class TestCheckContactInfo:
    def test_recommends_completing_contact_when_all_missing(self, recommendation_engine):
        recs = recommendation_engine._check_contact_info(MINIMAL_PARSED_DATA, [])
        assert len(recs) > 0

    def test_high_impact_when_email_missing(self, recommendation_engine):
        recs = recommendation_engine._check_contact_info(MINIMAL_PARSED_DATA, [])
        assert any(r["impact"] == "High Impact" for r in recs)

    def test_no_recommendation_when_contact_complete(self, recommendation_engine):
        recs = recommendation_engine._check_contact_info(RICH_PARSED_DATA, [])
        assert len(recs) == 0


class TestCheckSkillsSection:
    def test_recommends_expanding_when_too_few_skills(self, recommendation_engine):
        parsed_with_few_skills = {**MINIMAL_PARSED_DATA, "skills": ["Python"]}
        recs = recommendation_engine._check_skills_section(parsed_with_few_skills, SCORES_POOR)
        assert len(recs) > 0

    def test_no_recommendation_when_skills_adequate(self, recommendation_engine):
        parsed_with_many_skills = {
            **MINIMAL_PARSED_DATA,
            "skills": ["Python", "JS", "TS", "React", "Node", "Docker", "AWS", "SQL", "Git"],
        }
        recs = recommendation_engine._check_skills_section(parsed_with_many_skills, SCORES_GOOD)
        assert len(recs) == 0


class TestCheckATSIssues:
    def test_generates_recommendations_from_fail_checks(self, recommendation_engine):
        recs = recommendation_engine._check_ats_issues(FAILING_ATS_CHECKS)
        assert len(recs) > 0

    def test_max_2_ats_issue_recommendations(self, recommendation_engine):
        recs = recommendation_engine._check_ats_issues(FAILING_ATS_CHECKS)
        assert len(recs) <= 2

    def test_no_recommendations_when_all_checks_pass(self, recommendation_engine):
        recs = recommendation_engine._check_ats_issues(GOOD_ATS_CHECKS)
        assert len(recs) == 0
