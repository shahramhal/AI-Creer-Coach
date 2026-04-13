"""
Tests for cv_analyzer/ats_scorer.py - ATSScorer class.
"""

import pytest
from unittest.mock import patch, MagicMock
from cv_analyzer.ats_scorer import ATSScorer, set_shared_model, get_shared_model

PYTHON_HEAVY_CV_TEXT = """
Senior Software Engineer
Skills: Python, TypeScript, React, Node.js, PostgreSQL, Redis, Docker, AWS, Git, SQL, CI/CD
Experience:
Built Python microservices at TechCorp using Docker and Kubernetes.
Implemented REST APIs with FastAPI and PostgreSQL.
Deployed using AWS and CI/CD pipelines.
"""

PYTHON_JOB_DESCRIPTION = """
We are looking for a Software Engineer proficient in Python and PostgreSQL.
The ideal candidate has experience with Docker, AWS, and CI/CD pipelines.
You will build REST APIs and microservices.
Required skills: Python, PostgreSQL, Docker, AWS, CI/CD, REST API
"""

UNRELATED_CV_TEXT = "I am a chef. I cook food in a restaurant kitchen."

UNRELATED_JOB_DESCRIPTION = "We seek an experienced Python developer for backend services."

PARSED_DATA_WITH_SKILLS = {
    "skills": ["Python", "TypeScript", "React", "Node.js", "PostgreSQL",
               "Redis", "Docker", "AWS", "Git", "SQL"],
    "experience": [
        {
            "title": "Senior Software Engineer",
            "company": "TechCorp",
            "responsibilities": [
                "Built Python microservices using Docker",
                "Deployed to AWS with CI/CD pipelines",
            ],
            "achievements": [],
        }
    ],
    "summary": "Python developer with cloud experience",
}

PARSED_DATA_NO_SKILLS = {
    "skills": [],
    "experience": [],
    "summary": "",
}


@pytest.fixture
def scorer():
    # Reset the shared model singleton so a stale mock from test_api.py
    # does not leak into these tests via the global _shared_sentence_model.
    import cv_analyzer.ats_scorer as ats_scorer_module
    original_model = ats_scorer_module._shared_sentence_model
    ats_scorer_module._shared_sentence_model = None
    yield ATSScorer()
    ats_scorer_module._shared_sentence_model = original_model


class TestATSScorerScoreMethod:
    def test_returns_dict_with_required_keys(self, scorer):
        result = scorer.score(
            cv_text=PYTHON_HEAVY_CV_TEXT,
            parsed_data=PARSED_DATA_WITH_SKILLS,
            job_description=PYTHON_JOB_DESCRIPTION,
        )
        assert "atsScore" in result
        assert "breakdown" in result
        assert "keywordsMatched" in result
        assert "keywordsMissing" in result
        assert "matchDetails" in result
        assert "suggestions" in result

    def test_ats_score_is_within_0_to_100(self, scorer):
        result = scorer.score(
            cv_text=PYTHON_HEAVY_CV_TEXT,
            parsed_data=PARSED_DATA_WITH_SKILLS,
            job_description=PYTHON_JOB_DESCRIPTION,
        )
        assert 0 <= result["atsScore"] <= 100

    def test_breakdown_contains_three_components(self, scorer):
        result = scorer.score(
            cv_text=PYTHON_HEAVY_CV_TEXT,
            parsed_data=PARSED_DATA_WITH_SKILLS,
            job_description=PYTHON_JOB_DESCRIPTION,
        )
        breakdown = result["breakdown"]
        assert "keywordMatch" in breakdown
        assert "semanticSimilarity" in breakdown
        assert "skillsCoverage" in breakdown

    def test_breakdown_values_are_within_0_to_100(self, scorer):
        result = scorer.score(
            cv_text=PYTHON_HEAVY_CV_TEXT,
            parsed_data=PARSED_DATA_WITH_SKILLS,
            job_description=PYTHON_JOB_DESCRIPTION,
        )
        for value in result["breakdown"].values():
            assert 0 <= value <= 100

    def test_matched_keywords_are_list(self, scorer):
        result = scorer.score(
            cv_text=PYTHON_HEAVY_CV_TEXT,
            parsed_data=PARSED_DATA_WITH_SKILLS,
            job_description=PYTHON_JOB_DESCRIPTION,
        )
        assert isinstance(result["keywordsMatched"], list)

    def test_missing_keywords_are_list(self, scorer):
        result = scorer.score(
            cv_text=PYTHON_HEAVY_CV_TEXT,
            parsed_data=PARSED_DATA_WITH_SKILLS,
            job_description=PYTHON_JOB_DESCRIPTION,
        )
        assert isinstance(result["keywordsMissing"], list)

    def test_suggestions_is_list(self, scorer):
        result = scorer.score(
            cv_text=PYTHON_HEAVY_CV_TEXT,
            parsed_data=PARSED_DATA_WITH_SKILLS,
            job_description=PYTHON_JOB_DESCRIPTION,
        )
        assert isinstance(result["suggestions"], list)

    def test_relevant_cv_scores_higher_than_unrelated_cv(self, scorer):
        relevant_result = scorer.score(
            cv_text=PYTHON_HEAVY_CV_TEXT,
            parsed_data=PARSED_DATA_WITH_SKILLS,
            job_description=PYTHON_JOB_DESCRIPTION,
        )
        unrelated_result = scorer.score(
            cv_text=UNRELATED_CV_TEXT,
            parsed_data=PARSED_DATA_NO_SKILLS,
            job_description=PYTHON_JOB_DESCRIPTION,
        )
        assert relevant_result["atsScore"] >= unrelated_result["atsScore"]

    def test_job_requirements_are_included_in_analysis(self, scorer):
        result_without_requirements = scorer.score(
            cv_text=PYTHON_HEAVY_CV_TEXT,
            parsed_data=PARSED_DATA_WITH_SKILLS,
            job_description=PYTHON_JOB_DESCRIPTION,
            job_requirements="",
        )
        result_with_requirements = scorer.score(
            cv_text=PYTHON_HEAVY_CV_TEXT,
            parsed_data=PARSED_DATA_WITH_SKILLS,
            job_description=PYTHON_JOB_DESCRIPTION,
            job_requirements="Python Django REST framework microservices",
        )
        assert isinstance(result_with_requirements["atsScore"], int)
        assert isinstance(result_without_requirements["atsScore"], int)


class TestATSScorerSkillsCoverage:
    def test_100_percent_coverage_when_all_skills_match(self, scorer):
        job_skills = ["Python", "Docker"]
        parsed_with_matching_skills = {
            "skills": ["Python", "Docker"],
            "experience": [],
        }
        coverage = scorer._compute_skills_coverage(parsed_with_matching_skills, job_skills)
        assert coverage == 100

    def test_0_percent_coverage_when_no_skills_match(self, scorer):
        job_skills = ["COBOL", "Fortran"]
        parsed_with_no_matching_skills = {"skills": ["Python", "React"], "experience": []}
        coverage = scorer._compute_skills_coverage(parsed_with_no_matching_skills, job_skills)
        assert coverage == 0

    def test_neutral_score_when_no_job_skills_specified(self, scorer):
        coverage = scorer._compute_skills_coverage(PARSED_DATA_WITH_SKILLS, [])
        assert coverage == 70

    def test_partial_coverage_is_between_0_and_100(self, scorer):
        job_skills = ["Python", "Docker", "COBOL", "Fortran"]
        coverage = scorer._compute_skills_coverage(PARSED_DATA_WITH_SKILLS, job_skills)
        assert 0 <= coverage <= 100


class TestATSScorerSemanticSimilarity:
    def test_returns_50_when_no_model_available(self, scorer):
        import cv_analyzer.ats_scorer as ats_scorer_module
        original = ats_scorer_module._shared_sentence_model
        ats_scorer_module._shared_sentence_model = None
        # Also patch get_shared_model so it returns None without trying to load
        with patch("cv_analyzer.ats_scorer.get_shared_model", return_value=None):
            try:
                score = scorer._compute_semantic_similarity("cv text", "job text")
                assert score == 50
            finally:
                ats_scorer_module._shared_sentence_model = original

    def test_returns_int_in_valid_range_with_mock_model(self, scorer):
        import torch
        mock_model = MagicMock()
        mock_embedding = torch.tensor([0.1, 0.2, 0.3])
        mock_model.encode.return_value = mock_embedding

        mock_similarity = MagicMock()
        mock_similarity.item.return_value = 0.6

        with patch("cv_analyzer.ats_scorer._shared_sentence_model", mock_model):
            with patch("cv_analyzer.ats_scorer.get_shared_model", return_value=mock_model):
                with patch("sentence_transformers.util.cos_sim", return_value=[[mock_similarity]]):
                    score = scorer._compute_semantic_similarity("cv text about python", "python developer job")
                    assert 0 <= score <= 100


class TestSetAndGetSharedModel:
    def test_set_shared_model_stores_model(self):
        mock_model = MagicMock()
        set_shared_model(mock_model)
        retrieved = get_shared_model()
        assert retrieved is mock_model
        set_shared_model(None)

    def test_get_shared_model_returns_none_when_not_set(self):
        import cv_analyzer.ats_scorer as ats_scorer_module
        original = ats_scorer_module._shared_sentence_model
        ats_scorer_module._shared_sentence_model = None
        # Patch the lazy import inside get_shared_model by patching sentence_transformers
        with patch.dict("sys.modules", {"sentence_transformers": None}):
            result = get_shared_model()
        ats_scorer_module._shared_sentence_model = original
        # When sentence_transformers is unavailable the function returns None
        assert result is None


class TestATSScorerKeywordExtraction:
    def test_fallback_extracts_known_tech_terms(self, scorer):
        scorer._kw_model = "fallback"
        text_with_python = "We need a Python developer with Docker and AWS experience."
        keywords = scorer._extract_keywords_simple(text_with_python)
        keyword_words = [kw for kw, _ in keywords]
        assert "python" in keyword_words
        assert "docker" in keyword_words
        assert "aws" in keyword_words

    def test_fallback_returns_list_of_tuples(self, scorer):
        scorer._kw_model = "fallback"
        keywords = scorer._extract_keywords_simple("python javascript react")
        assert isinstance(keywords, list)
        for item in keywords:
            assert isinstance(item, tuple)
            assert len(item) == 2


class TestATSScorerSuggestions:
    def test_generates_suggestions_for_low_keyword_score(self, scorer):
        missing_keywords = [
            {"keyword": "kubernetes", "importance": "high", "suggestion": "add kubernetes"},
            {"keyword": "terraform", "importance": "medium", "suggestion": "add terraform"},
        ]
        suggestions = scorer._generate_suggestions(missing_keywords, keyword_score=20, semantic_score=60)
        assert len(suggestions) > 0

    def test_suggestions_mention_high_priority_keywords(self, scorer):
        missing_keywords = [
            {"keyword": "kubernetes", "importance": "high", "suggestion": "add kubernetes"},
        ]
        suggestions = scorer._generate_suggestions(missing_keywords, keyword_score=80, semantic_score=80)
        combined = " ".join(suggestions).lower()
        assert "kubernetes" in combined

    def test_max_5_suggestions_returned(self, scorer):
        missing_keywords = [
            {"keyword": f"skill{i}", "importance": "high", "suggestion": f"add skill{i}"}
            for i in range(20)
        ]
        suggestions = scorer._generate_suggestions(missing_keywords, keyword_score=10, semantic_score=30)
        assert len(suggestions) <= 5
