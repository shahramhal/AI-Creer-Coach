"""
Tests for skill_relevance/analyzer.py - compute_skill_relevance and _fallback_relevance.
"""

import pytest
from unittest.mock import MagicMock, patch

from skill_relevance.analyzer import compute_skill_relevance, _fallback_relevance


FRONTEND_SKILLS = ["React", "TypeScript", "JavaScript", "CSS", "HTML", "Tailwind", "Git", "Figma"]
BACKEND_SKILLS = ["Python", "FastAPI", "PostgreSQL", "Redis", "Docker", "Kubernetes", "AWS"]
DATA_SCIENCE_SKILLS = ["Python", "Machine Learning", "TensorFlow", "Pandas", "NumPy", "SQL"]


class TestComputeSkillRelevanceWithNoModel:
    def test_returns_empty_skill_scores_for_empty_skills_list(self):
        result = compute_skill_relevance("Frontend Developer", [], model=None)
        assert result["skill_scores"] == []
        assert result["overall_relevance"] == 0.0

    def test_returns_correct_job_title(self):
        result = compute_skill_relevance("Frontend Developer", FRONTEND_SKILLS, model=None)
        assert result["job_title"] == "Frontend Developer"

    def test_uses_keyword_fallback_method_when_no_model(self):
        result = compute_skill_relevance("Frontend Developer", FRONTEND_SKILLS, model=None)
        assert result["method"] == "keyword_fallback"

    def test_each_skill_score_entry_has_skill_and_relevance(self):
        result = compute_skill_relevance("Frontend Developer", FRONTEND_SKILLS, model=None)
        for entry in result["skill_scores"]:
            assert "skill" in entry
            assert "relevance" in entry

    def test_relevance_values_are_between_0_and_1(self):
        result = compute_skill_relevance("Software Engineer", BACKEND_SKILLS, model=None)
        for entry in result["skill_scores"]:
            assert 0.0 <= entry["relevance"] <= 1.0

    def test_skill_count_matches_input_skills_count(self):
        result = compute_skill_relevance("Data Scientist", DATA_SCIENCE_SKILLS, model=None)
        assert len(result["skill_scores"]) == len(DATA_SCIENCE_SKILLS)

    def test_overall_relevance_is_mean_of_skill_scores(self):
        result = compute_skill_relevance("Data Scientist", DATA_SCIENCE_SKILLS, model=None)
        scores = [entry["relevance"] for entry in result["skill_scores"]]
        expected_mean = sum(scores) / len(scores)
        assert abs(result["overall_relevance"] - expected_mean) < 0.001

    def test_overall_relevance_is_between_0_and_1(self):
        result = compute_skill_relevance("Software Engineer", BACKEND_SKILLS, model=None)
        assert 0.0 <= result["overall_relevance"] <= 1.0


class TestComputeSkillRelevanceWithSemanticModel:
    def test_uses_semantic_method_when_model_provided(self):
        import torch

        mock_model = MagicMock()
        job_title_embedding = torch.tensor([0.1, 0.2, 0.3])
        skill_embeddings = torch.tensor([[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]])

        mock_model.encode.side_effect = [job_title_embedding, skill_embeddings]

        raw_scores = torch.tensor([[0.8], [0.4]])

        with patch("sentence_transformers.util") as mock_util:
            mock_util.cos_sim.return_value = raw_scores

            result = compute_skill_relevance(
                "Frontend Developer", ["React", "Python"], model=mock_model
            )

        assert result["method"] == "semantic"

    def test_returns_correct_skill_count_with_semantic_model(self):
        import torch

        mock_model = MagicMock()
        job_title_embedding = torch.tensor([0.1, 0.2, 0.3])
        skill_embeddings = torch.tensor([[0.1, 0.2, 0.3]] * 3)

        mock_model.encode.side_effect = [job_title_embedding, skill_embeddings]

        raw_scores = torch.tensor([[0.5], [0.3], [0.7]])

        with patch("sentence_transformers.util") as mock_util:
            mock_util.cos_sim.return_value = raw_scores

            result = compute_skill_relevance(
                "Frontend Developer", ["React", "Python", "CSS"], model=mock_model
            )

        assert len(result["skill_scores"]) == 3

    def test_falls_back_to_keyword_method_on_model_error(self):
        mock_model_that_fails = MagicMock()
        mock_model_that_fails.encode.side_effect = RuntimeError("model encoding failed")

        result = compute_skill_relevance(
            "Software Engineer", ["Python", "Docker"], model=mock_model_that_fails
        )

        assert result["method"] == "keyword_fallback"


class TestFallbackRelevance:
    def test_returns_dict_with_required_keys(self):
        result = _fallback_relevance("Frontend Developer", FRONTEND_SKILLS)
        assert "job_title" in result
        assert "skill_scores" in result
        assert "overall_relevance" in result
        assert "method" in result

    def test_method_is_keyword_fallback(self):
        result = _fallback_relevance("Software Engineer", BACKEND_SKILLS)
        assert result["method"] == "keyword_fallback"

    def test_react_highly_relevant_to_frontend_developer(self):
        result = _fallback_relevance("Frontend Developer", ["React", "TypeScript", "CSS"])
        skill_map = {s["skill"]: s["relevance"] for s in result["skill_scores"]}
        assert skill_map.get("React", 0) > 0.0

    def test_python_skill_gets_nonzero_relevance_for_software_engineer(self):
        result = _fallback_relevance("Software Engineer", ["Python"])
        skill_map = {s["skill"]: s["relevance"] for s in result["skill_scores"]}
        assert skill_map.get("Python", 0) > 0.0

    def test_unknown_skill_gets_low_fallback_relevance(self):
        result = _fallback_relevance("Software Engineer", ["CobolLegacyXYZ"])
        skill_map = {s["skill"]: s["relevance"] for s in result["skill_scores"]}
        assert skill_map.get("CobolLegacyXYZ", 0) <= 0.1

    def test_empty_skills_returns_zero_overall_relevance(self):
        result = _fallback_relevance("Software Engineer", [])
        assert result["overall_relevance"] == 0.0
        assert result["skill_scores"] == []

    def test_relevance_scores_are_between_0_and_1(self):
        result = _fallback_relevance("Data Scientist", DATA_SCIENCE_SKILLS)
        for entry in result["skill_scores"]:
            assert 0.0 <= entry["relevance"] <= 1.0

    def test_unknown_job_title_still_returns_valid_structure(self):
        result = _fallback_relevance("Astrocartographer", ["Python", "SQL"])
        assert isinstance(result["skill_scores"], list)
        assert isinstance(result["overall_relevance"], float)

    def test_skill_scores_preserve_original_skill_names(self):
        skills = ["React", "TypeScript", "CSS"]
        result = _fallback_relevance("Frontend Developer", skills)
        returned_skills = [s["skill"] for s in result["skill_scores"]]
        assert returned_skills == skills
