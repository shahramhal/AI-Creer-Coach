"""
Integration tests for job_matcher/matcher.py - JobMatcher class.
Mocks SentenceTransformer to return deterministic numpy arrays.
"""

import numpy as np
import pytest
from unittest.mock import patch, MagicMock

SAMPLE_CV_TEXT = """
Senior Software Engineer with expertise in Python, FastAPI, Docker, Kubernetes,
AWS, PostgreSQL, Redis, TypeScript, React, Node.js, Git, CI/CD, REST API.
6 years of experience building scalable backend microservices at TechCorp.
"""

PYTHON_BACKEND_JOB = {
    "job_id": "job_001",
    "title": "Senior Software Engineer",
    "company": "TechStartup",
    "location": "London, UK",
    "description": "We need a Senior Software Engineer skilled in Python, FastAPI, Docker, "
                   "Kubernetes, and AWS to build microservices.",
    "requirements": ["Python", "Docker", "Kubernetes", "AWS", "PostgreSQL"],
    "salary_min": 70000,
    "salary_max": 90000,
    "source": "adzuna",
    "source_url": "https://adzuna.co.uk/job/001",
    "posted_date": "2024-01-15",
    "job_type": "full-time",
    "remote_type": "hybrid",
}

DATA_SCIENCE_JOB = {
    "job_id": "job_002",
    "title": "Data Scientist",
    "company": "AnalyticsCo",
    "location": "Manchester, UK",
    "description": "Looking for a Data Scientist with machine learning expertise, "
                   "Python, TensorFlow, PyTorch, and SQL skills.",
    "requirements": ["Python", "TensorFlow", "Machine Learning", "SQL"],
    "salary_min": 60000,
    "salary_max": 80000,
    "source": "reed",
    "source_url": "https://reed.co.uk/job/002",
    "posted_date": "2024-01-16",
    "job_type": "full-time",
    "remote_type": "remote",
}

UNRELATED_JOB = {
    "job_id": "job_003",
    "title": "Chef de Partie",
    "company": "RestaurantCo",
    "location": "Edinburgh, UK",
    "description": "Experienced chef needed for fine dining establishment. "
                   "Knowledge of French cuisine and pastry required.",
    "requirements": ["French cuisine", "Pastry"],
    "salary_min": 25000,
    "salary_max": 35000,
    "source": "reed",
    "source_url": "https://reed.co.uk/job/003",
    "posted_date": "2024-01-17",
    "job_type": "full-time",
    "remote_type": "on-site",
}

SAMPLE_JOBS = [PYTHON_BACKEND_JOB, DATA_SCIENCE_JOB, UNRELATED_JOB]


def make_deterministic_embedding(text: str, dim: int = 384) -> np.ndarray:
    """Generate a deterministic embedding vector based on text content."""
    seed = sum(ord(c) for c in text[:100])
    rng = np.random.RandomState(seed)
    vec = rng.randn(dim).astype(np.float32)
    return vec / np.linalg.norm(vec)


@pytest.fixture
def job_matcher_with_mock_model():
    """Create a JobMatcher with a deterministic mock SentenceTransformer."""
    with patch("job_matcher.matcher.SentenceTransformer") as MockST:
        mock_model = MagicMock()

        def mock_encode(texts, convert_to_tensor=False, convert_to_numpy=False,
                        batch_size=64, show_progress_bar=False):
            if isinstance(texts, list):
                embeddings = np.array([make_deterministic_embedding(t) for t in texts])
                if convert_to_tensor:
                    import torch
                    return torch.tensor(embeddings)
                return embeddings
            else:
                embedding = make_deterministic_embedding(texts)
                if convert_to_tensor:
                    import torch
                    return torch.tensor(embedding)
                return embedding

        mock_model.encode.side_effect = mock_encode
        MockST.return_value = mock_model

        from job_matcher.matcher import JobMatcher
        matcher = JobMatcher()
        matcher.model = mock_model
        return matcher


class TestLRUEmbeddingCache:
    def test_set_and_get_stores_and_retrieves_value(self):
        from job_matcher.matcher import LRUEmbeddingCache
        cache = LRUEmbeddingCache(max_size=10)
        embedding = np.array([0.1, 0.2, 0.3])
        cache.set("key_1", embedding)
        retrieved = cache.get("key_1")
        np.testing.assert_array_equal(retrieved, embedding)

    def test_get_returns_none_for_missing_key(self):
        from job_matcher.matcher import LRUEmbeddingCache
        cache = LRUEmbeddingCache(max_size=10)
        assert cache.get("nonexistent_key") is None

    def test_evicts_oldest_item_when_max_size_exceeded(self):
        from job_matcher.matcher import LRUEmbeddingCache
        cache = LRUEmbeddingCache(max_size=2)
        cache.set("key_a", np.array([1.0]))
        cache.set("key_b", np.array([2.0]))
        cache.set("key_c", np.array([3.0]))
        assert cache.get("key_a") is None
        assert cache.get("key_c") is not None

    def test_len_reflects_cache_size(self):
        from job_matcher.matcher import LRUEmbeddingCache
        cache = LRUEmbeddingCache(max_size=10)
        cache.set("k1", np.array([1.0]))
        cache.set("k2", np.array([2.0]))
        assert len(cache) == 2

    def test_clear_empties_cache(self):
        from job_matcher.matcher import LRUEmbeddingCache
        cache = LRUEmbeddingCache(max_size=10)
        cache.set("k1", np.array([1.0]))
        cache.clear()
        assert len(cache) == 0

    def test_contains_returns_true_for_existing_key(self):
        from job_matcher.matcher import LRUEmbeddingCache
        cache = LRUEmbeddingCache(max_size=10)
        cache.set("existing_key", np.array([1.0]))
        assert "existing_key" in cache

    def test_contains_returns_false_for_missing_key(self):
        from job_matcher.matcher import LRUEmbeddingCache
        cache = LRUEmbeddingCache()
        assert "missing_key" not in cache


class TestCalibrateScore:
    def test_raw_score_above_max_gives_100(self):
        from job_matcher.matcher import _calibrate_score
        assert _calibrate_score(0.9) == 100.0

    def test_raw_score_below_min_gives_0(self):
        from job_matcher.matcher import _calibrate_score
        assert _calibrate_score(0.0) == 0.0

    def test_midpoint_raw_score_gives_50(self):
        from job_matcher.matcher import _calibrate_score
        midpoint = (0.15 + 0.85) / 2
        score = _calibrate_score(midpoint)
        assert abs(score - 50.0) < 1.0


class TestGetMatchLabel:
    @pytest.mark.parametrize("score,expected_label", [
        (90.0, "Excellent"),
        (80.0, "Excellent"),
        (70.0, "Good"),
        (60.0, "Good"),
        (50.0, "Moderate"),
        (30.0, "Moderate"),
        (20.0, "Low"),
        (0.0, "Low"),
    ])
    def test_match_label_for_known_scores(self, score, expected_label):
        from job_matcher.matcher import _get_match_label
        assert _get_match_label(score) == expected_label


class TestJobMatcherMatchJobs:
    def test_returns_empty_list_for_empty_cv_text(self, job_matcher_with_mock_model):
        result = job_matcher_with_mock_model.match_jobs("", SAMPLE_JOBS)
        assert result == []

    def test_returns_empty_list_for_empty_jobs_list(self, job_matcher_with_mock_model):
        result = job_matcher_with_mock_model.match_jobs(SAMPLE_CV_TEXT, [])
        assert result == []

    def test_returns_list_of_dicts_for_valid_input(self, job_matcher_with_mock_model):
        result = job_matcher_with_mock_model.match_jobs(SAMPLE_CV_TEXT, SAMPLE_JOBS)
        assert isinstance(result, list)
        assert len(result) > 0
        for job in result:
            assert isinstance(job, dict)

    def test_each_result_has_required_keys(self, job_matcher_with_mock_model):
        result = job_matcher_with_mock_model.match_jobs(SAMPLE_CV_TEXT, SAMPLE_JOBS)
        required_keys = {
            "job_id", "title", "company", "location", "match_score",
            "match_label", "match_breakdown",
        }
        for job in result:
            assert required_keys.issubset(set(job.keys()))

    def test_match_scores_are_between_0_and_100(self, job_matcher_with_mock_model):
        result = job_matcher_with_mock_model.match_jobs(SAMPLE_CV_TEXT, SAMPLE_JOBS)
        for job in result:
            assert 0 <= job["match_score"] <= 100

    def test_match_breakdown_has_expected_fields(self, job_matcher_with_mock_model):
        result = job_matcher_with_mock_model.match_jobs(SAMPLE_CV_TEXT, [PYTHON_BACKEND_JOB])
        breakdown = result[0]["match_breakdown"]
        assert "skill_coverage" in breakdown
        assert "matched_skills" in breakdown
        assert "missing_skills" in breakdown
        assert "title_relevance" in breakdown
        assert "summary" in breakdown

    def test_top_k_limits_results_count(self, job_matcher_with_mock_model):
        many_jobs = [
            {**PYTHON_BACKEND_JOB, "job_id": f"job_{i}", "description": f"Python developer role {i}"}
            for i in range(10)
        ]
        result = job_matcher_with_mock_model.match_jobs(SAMPLE_CV_TEXT, many_jobs, top_k=3)
        assert len(result) <= 3

    def test_single_job_returns_single_result(self, job_matcher_with_mock_model):
        result = job_matcher_with_mock_model.match_jobs(SAMPLE_CV_TEXT, [PYTHON_BACKEND_JOB])
        assert len(result) == 1
        assert result[0]["job_id"] == "job_001"

    def test_match_label_values_are_valid(self, job_matcher_with_mock_model):
        result = job_matcher_with_mock_model.match_jobs(SAMPLE_CV_TEXT, SAMPLE_JOBS)
        valid_labels = {"Excellent", "Good", "Moderate", "Low"}
        for job in result:
            assert job["match_label"] in valid_labels


class TestJobMatcherFilters:
    def test_location_filter_removes_non_matching_jobs(self, job_matcher_with_mock_model):
        filters = {"location": "London"}
        result = job_matcher_with_mock_model.match_jobs(
            SAMPLE_CV_TEXT, SAMPLE_JOBS, filters=filters
        )
        for job in result:
            assert "london" in job.get("location", "").lower()

    def test_min_salary_filter_removes_low_salary_jobs(self, job_matcher_with_mock_model):
        filters = {"min_salary": 65000}
        result = job_matcher_with_mock_model.match_jobs(
            SAMPLE_CV_TEXT, SAMPLE_JOBS, filters=filters
        )
        for job in result:
            assert job.get("salary_min", 0) >= 65000

    def test_job_type_filter_removes_non_matching_job_types(self, job_matcher_with_mock_model):
        filters = {"job_type": "full-time"}
        result = job_matcher_with_mock_model.match_jobs(
            SAMPLE_CV_TEXT, SAMPLE_JOBS, filters=filters
        )
        for job in result:
            assert "full-time" in (job.get("job_type") or "").lower()

    def test_remote_type_filter_keeps_only_remote_jobs(self, job_matcher_with_mock_model):
        filters = {"remote_type": "remote"}
        result = job_matcher_with_mock_model.match_jobs(
            SAMPLE_CV_TEXT, SAMPLE_JOBS, filters=filters
        )
        for job in result:
            assert (job.get("remote_type") or "").lower() == "remote"


class TestJobMatcherCacheStats:
    def test_cache_stats_has_required_fields(self, job_matcher_with_mock_model):
        stats = job_matcher_with_mock_model.get_cache_stats()
        assert "cached_jobs" in stats
        assert "cache_hits" in stats
        assert "cache_misses" in stats
        assert "hit_rate" in stats

    def test_initial_cache_is_empty(self, job_matcher_with_mock_model):
        job_matcher_with_mock_model.clear_cache()
        stats = job_matcher_with_mock_model.get_cache_stats()
        assert stats["cached_jobs"] == 0

    def test_clear_cache_resets_hit_and_miss_counters(self, job_matcher_with_mock_model):
        job_matcher_with_mock_model.match_jobs(SAMPLE_CV_TEXT, SAMPLE_JOBS)
        job_matcher_with_mock_model.clear_cache()
        stats = job_matcher_with_mock_model.get_cache_stats()
        assert stats["cache_hits"] == 0
        assert stats["cache_misses"] == 0


class TestJobMatcherExtractKeywords:
    def test_extracts_python_from_cv_text(self, job_matcher_with_mock_model):
        text = "Expert Python developer with Django and FastAPI experience."
        skills = job_matcher_with_mock_model._extract_keywords(text)
        assert "python" in skills

    def test_extracts_multi_word_skill(self, job_matcher_with_mock_model):
        text = "Experienced in machine learning and deep learning techniques."
        skills = job_matcher_with_mock_model._extract_keywords(text)
        assert "machine learning" in skills

    def test_does_not_match_partial_word(self, job_matcher_with_mock_model):
        text = "Knowledge of guardrails for AI safety"
        skills = job_matcher_with_mock_model._extract_keywords(text)
        assert "rails" not in skills

    def test_returns_empty_set_for_empty_text(self, job_matcher_with_mock_model):
        skills = job_matcher_with_mock_model._extract_keywords("")
        assert skills == set()
