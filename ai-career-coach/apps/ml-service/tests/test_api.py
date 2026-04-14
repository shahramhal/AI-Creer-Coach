"""
API endpoint tests for main.py FastAPI application.
All external dependencies are mocked before importing the app.
"""

import io
import json
import pytest
from unittest.mock import patch, MagicMock


def build_test_client():
    """
    Create a TestClient with all heavy dependencies mocked.
    Must be called inside a test to have patches active.
    """
    from fastapi.testclient import TestClient
    import main as main_module

    return TestClient(main_module.app)


SAMPLE_CV_TEXT = """
John Smith | john@example.com | +44 7700 900123 | London, UK
Senior Software Engineer with 5 years experience building Python backend systems.
Skills: Python, TypeScript, React, Node.js, PostgreSQL, Docker, Kubernetes, AWS, Git
"""

SAMPLE_PARSED_DATA = {
    "contact_info": {
        "name": "John Smith",
        "email": "john@example.com",
        "phone": "+44 7700 900123",
        "location": "London, UK",
    },
    "summary": "Senior Software Engineer with 5 years experience.",
    "experience": [
        {
            "title": "Senior Software Engineer",
            "company": "TechCorp",
            "startDate": "2021-01",
            "endDate": "Present",
            "responsibilities": ["Built Python microservices", "Deployed to AWS"],
            "achievements": [],
        }
    ],
    "skills": ["Python", "TypeScript", "React", "Node.js", "PostgreSQL",
               "Docker", "Kubernetes", "AWS", "Git"],
    "education": [{"degree": "BSc Computer Science"}],
}

SAMPLE_ANALYZE_RESULT = {
    "overallScore": 72,
    "scoreBreakdown": {
        "contentQuality": 75,
        "atsCompatibility": 70,
        "keywordsMatch": 65,
        "formatStructure": 78,
        "experienceClarity": 72,
    },
    "priorityIssues": [],
    "atsAnalysis": [],
    "missingKeywords": [],
    "recommendations": [],
    "analyzedAt": "2024-01-01T12:00:00",
    "_meta": {
        "targetRole": "software_engineer",
        "keywordMatchScore": 65.0,
        "matchedKeywords": 13,
        "totalRoleKeywords": 20,
    },
}

SAMPLE_OVERVIEW_RESULT = {
    "overallScore": 70,
    "scoreBreakdown": {
        "contentQuality": 72,
        "formatStructure": 68,
        "experienceClarity": 70,
        "atsReadability": 65,
    },
    "atsChecks": [],
    "priorityIssues": [],
    "recommendations": [],
    "metadata": {"wordCount": 150, "sectionCount": 4},
    "analyzedAt": "2024-01-01T12:00:00",
}

SAMPLE_ATS_RESULT = {
    "atsScore": 68,
    "breakdown": {
        "keywordMatch": 70,
        "semanticSimilarity": 65,
        "skillsCoverage": 60,
    },
    "keywordsMatched": [{"keyword": "python", "foundIn": "Skills"}],
    "keywordsMissing": [],
    "matchDetails": {"totalJobKeywords": 10, "matchedCount": 7, "semanticScore": 0.65},
    "suggestions": [],
}

SAMPLE_SKILL_GAP_RESULT = {
    "skill_coverage": 65.0,
    "missing_skills": [
        {
            "skill": "Terraform",
            "category": "cloud_devops",
            "priority": "high",
            "estimated_hours": 60,
            "roi_score": 8.0,
            "salary_impact": 10,
            "reason": "High demand in DevOps roles",
        }
    ],
    "present_skills": ["Python", "Docker", "Kubernetes"],
    "target_role": "devops_engineer",
    "learning_path": [],
    "category_breakdown": {},
    "summary": "Good coverage - 65% of skills matched",
    "total_required": 10,
    "total_present": 6,
}

SAMPLE_SKILL_RELEVANCE_RESULT = {
    "job_title": "Frontend Developer",
    "skill_scores": [
        {"skill": "React", "relevance": 0.85},
        {"skill": "TypeScript", "relevance": 0.80},
    ],
    "overall_relevance": 0.825,
    "method": "keyword_fallback",
}

SAMPLE_MATCH_RESULT = [
    {
        "job_id": "job_001",
        "title": "Senior Software Engineer",
        "company": "TechStartup",
        "location": "London",
        "description": "Python backend role",
        "salary_min": 70000,
        "salary_max": 90000,
        "source": "adzuna",
        "source_url": "https://adzuna.co.uk/job/001",
        "posted_date": "2024-01-15",
        "job_type": "full-time",
        "remote_type": "hybrid",
        "match_score": 82.5,
        "match_label": "Excellent",
        "match_breakdown": {
            "skill_coverage": 75.0,
            "matched_skills": ["python", "docker"],
            "missing_skills": ["terraform"],
            "title_relevance": 88.0,
            "summary": "Strong skill match",
        },
    }
]

SAMPLE_PARSE_RESULT = {
    **SAMPLE_PARSED_DATA,
    "confidence": {
        "scores": {"overall": 0.85},
        "quality": "excellent",
        "issues": [],
        "completeness": {"has_contact": True, "has_experience": True},
    },
    "metadata": {
        "filename": "test_cv.pdf",
        "parsed_at": "2024-01-01T12:00:00",
        "parser_version": "3.0-llm",
        "model": "claude-sonnet-4-20250514",
        "text_length": 500,
        "parsing_method": "llm",
        "raw_text": SAMPLE_CV_TEXT,
    },
}


@pytest.fixture(scope="module")
def mocked_app_patches():
    """Start all module-level patches and return them active for the test module."""
    patches = [
        patch("database.mongodb.MongoClient"),
        patch("job_matcher.matcher.SentenceTransformer"),
        patch("cv_analyzer.ats_scorer.SentenceTransformer", create=True),
    ]
    started = [p.start() for p in patches]

    mock_st = started[1]
    mock_model = MagicMock()

    import numpy as np
    import torch

    def mock_encode(texts, convert_to_tensor=False, convert_to_numpy=False,
                    batch_size=64, show_progress_bar=False):
        if isinstance(texts, list):
            embeddings = np.random.randn(len(texts), 384).astype(np.float32)
            if convert_to_tensor:
                return torch.tensor(embeddings)
            return embeddings
        else:
            embedding = np.random.randn(384).astype(np.float32)
            if convert_to_tensor:
                return torch.tensor(embedding)
            return embedding

    mock_model.encode.side_effect = mock_encode
    mock_st.return_value = mock_model

    yield started

    for p in patches:
        p.stop()


@pytest.fixture(scope="module")
def client(mocked_app_patches):
    return build_test_client()


class TestRootEndpoint:
    def test_get_root_returns_200(self, client):
        response = client.get("/")
        assert response.status_code == 200

    def test_get_root_returns_status_field(self, client):
        response = client.get("/")
        body = response.json()
        assert "status" in body

    def test_get_root_mentions_ml_service(self, client):
        response = client.get("/")
        body = response.json()
        assert "ML Service" in body["status"] or "ml" in body["status"].lower()


class TestHealthEndpoint:
    def test_get_health_returns_200(self, client):
        response = client.get("/health")
        assert response.status_code == 200

    def test_get_health_returns_healthy_status(self, client):
        response = client.get("/health")
        body = response.json()
        assert body["status"] == "healthy"

    def test_get_health_includes_service_name(self, client):
        response = client.get("/health")
        body = response.json()
        assert "service" in body
        assert body["service"] == "ml-service"

    def test_get_health_includes_cache_stats(self, client):
        response = client.get("/health")
        body = response.json()
        assert "cache_stats" in body


class TestAnalyzeCVEndpoint:
    def test_valid_payload_returns_200(self, client):
        with patch("routers.cv.cv_analyzer") as mock_cv_analyzer:
            mock_cv_analyzer.analyze.return_value = SAMPLE_ANALYZE_RESULT

            payload = {
                "cv_text": SAMPLE_CV_TEXT,
                "parsed_data": SAMPLE_PARSED_DATA,
                "filename": "cv.pdf",
                "target_role": "software_engineer",
            }
            response = client.post("/api/ml/analyze-cv", json=payload)

        assert response.status_code == 200

    def test_valid_payload_returns_success_true(self, client):
        with patch("routers.cv.cv_analyzer") as mock_cv_analyzer:
            mock_cv_analyzer.analyze.return_value = SAMPLE_ANALYZE_RESULT

            payload = {
                "cv_text": SAMPLE_CV_TEXT,
                "parsed_data": SAMPLE_PARSED_DATA,
                "filename": "cv.pdf",
            }
            response = client.post("/api/ml/analyze-cv", json=payload)

        body = response.json()
        assert body["success"] is True

    def test_missing_cv_text_returns_422(self, client):
        payload = {"parsed_data": SAMPLE_PARSED_DATA}
        response = client.post("/api/ml/analyze-cv", json=payload)
        assert response.status_code == 422

    def test_missing_parsed_data_returns_422(self, client):
        payload = {"cv_text": SAMPLE_CV_TEXT}
        response = client.post("/api/ml/analyze-cv", json=payload)
        assert response.status_code == 422

    def test_analysis_error_returns_200_with_success_false(self, client):
        with patch("routers.cv.cv_analyzer") as mock_cv_analyzer:
            mock_cv_analyzer.analyze.side_effect = RuntimeError("Analysis error")

            payload = {
                "cv_text": SAMPLE_CV_TEXT,
                "parsed_data": SAMPLE_PARSED_DATA,
            }
            response = client.post("/api/ml/analyze-cv", json=payload)

        assert response.status_code == 200
        body = response.json()
        assert body["success"] is False
        assert body["error"] is not None


class TestCVOverviewEndpoint:
    def test_valid_payload_returns_200(self, client):
        with patch("routers.cv.cv_analyzer") as mock_cv_analyzer:
            mock_cv_analyzer.analyze_overview.return_value = SAMPLE_OVERVIEW_RESULT

            payload = {
                "cv_text": SAMPLE_CV_TEXT,
                "parsed_data": SAMPLE_PARSED_DATA,
                "filename": "cv.pdf",
            }
            response = client.post("/api/ml/cv-overview", json=payload)

        assert response.status_code == 200

    def test_valid_payload_returns_success_true(self, client):
        with patch("routers.cv.cv_analyzer") as mock_cv_analyzer:
            mock_cv_analyzer.analyze_overview.return_value = SAMPLE_OVERVIEW_RESULT

            payload = {
                "cv_text": SAMPLE_CV_TEXT,
                "parsed_data": SAMPLE_PARSED_DATA,
            }
            response = client.post("/api/ml/cv-overview", json=payload)

        body = response.json()
        assert body["success"] is True

    def test_missing_required_field_returns_422(self, client):
        payload = {"cv_text": SAMPLE_CV_TEXT}
        response = client.post("/api/ml/cv-overview", json=payload)
        assert response.status_code == 422


class TestATSScoreEndpoint:
    def test_valid_payload_returns_200(self, client):
        with patch("routers.cv.cv_analyzer") as mock_cv_analyzer:
            mock_cv_analyzer.analyze_ats.return_value = SAMPLE_ATS_RESULT

            payload = {
                "cv_text": SAMPLE_CV_TEXT,
                "parsed_data": SAMPLE_PARSED_DATA,
                "job_description": "Senior Python developer needed for backend microservices",
                "job_requirements": "Docker, Kubernetes, AWS",
                "job_skills": ["Python", "Docker", "Kubernetes"],
            }
            response = client.post("/api/ml/ats-score", json=payload)

        assert response.status_code == 200

    def test_without_job_skills_returns_200(self, client):
        with patch("routers.cv.cv_analyzer") as mock_cv_analyzer:
            mock_cv_analyzer.analyze_ats.return_value = SAMPLE_ATS_RESULT

            payload = {
                "cv_text": SAMPLE_CV_TEXT,
                "parsed_data": SAMPLE_PARSED_DATA,
                "job_description": "Python developer needed",
            }
            response = client.post("/api/ml/ats-score", json=payload)

        assert response.status_code == 200

    def test_missing_job_description_returns_422(self, client):
        payload = {
            "cv_text": SAMPLE_CV_TEXT,
            "parsed_data": SAMPLE_PARSED_DATA,
        }
        response = client.post("/api/ml/ats-score", json=payload)
        assert response.status_code == 422


class TestMatchJobsEndpoint:
    def test_valid_jobs_array_returns_200(self, client):
        with patch("routers.matching.job_matcher") as mock_job_matcher:
            mock_job_matcher.match_jobs.return_value = SAMPLE_MATCH_RESULT

            payload = {
                "cv_text": SAMPLE_CV_TEXT,
                "jobs": [
                    {
                        "job_id": "job_001",
                        "title": "Senior Software Engineer",
                        "company": "TechCorp",
                        "description": "Python backend role",
                    }
                ],
                "top_k": 10,
            }
            response = client.post("/api/ml/match-jobs", json=payload)

        assert response.status_code == 200

    def test_empty_jobs_array_returns_200_with_empty_results(self, client):
        with patch("routers.matching.job_matcher") as mock_job_matcher:
            mock_job_matcher.match_jobs.return_value = []

            payload = {
                "cv_text": SAMPLE_CV_TEXT,
                "jobs": [],
            }
            response = client.post("/api/ml/match-jobs", json=payload)

        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        assert body["matched_jobs"] == []

    def test_response_shape_matches_job_match_response_model(self, client):
        with patch("routers.matching.job_matcher") as mock_job_matcher:
            mock_job_matcher.match_jobs.return_value = SAMPLE_MATCH_RESULT

            payload = {
                "cv_text": SAMPLE_CV_TEXT,
                "jobs": [{"job_id": "j1", "title": "Dev", "description": "role"}],
            }
            response = client.post("/api/ml/match-jobs", json=payload)

        body = response.json()
        assert "success" in body
        assert "matched_jobs" in body
        assert "total_analyzed" in body

    def test_missing_cv_text_returns_422(self, client):
        payload = {"jobs": [{"job_id": "j1", "title": "Dev", "description": "role"}]}
        response = client.post("/api/ml/match-jobs", json=payload)
        assert response.status_code == 422

    def test_missing_jobs_array_returns_422(self, client):
        payload = {"cv_text": SAMPLE_CV_TEXT}
        response = client.post("/api/ml/match-jobs", json=payload)
        assert response.status_code == 422


class TestSkillGapAnalysisEndpoint:
    def test_valid_payload_returns_200(self, client):
        with patch("routers.skills.skill_gap_analyzer") as mock_analyzer:
            mock_analyzer.analyze.return_value = SAMPLE_SKILL_GAP_RESULT

            payload = {
                "cv_text": SAMPLE_CV_TEXT,
                "parsed_data": SAMPLE_PARSED_DATA,
                "target_role": "devops_engineer",
                "target_job_description": "DevOps engineer needed for cloud infrastructure",
            }
            response = client.post("/api/ml/skill-gap-analysis", json=payload)

        assert response.status_code == 200

    def test_response_has_success_and_data_keys(self, client):
        with patch("routers.skills.skill_gap_analyzer") as mock_analyzer:
            mock_analyzer.analyze.return_value = SAMPLE_SKILL_GAP_RESULT

            payload = {
                "cv_text": SAMPLE_CV_TEXT,
                "parsed_data": SAMPLE_PARSED_DATA,
            }
            response = client.post("/api/ml/skill-gap-analysis", json=payload)

        body = response.json()
        assert "success" in body
        assert "data" in body

    def test_full_skill_overlap_returns_high_coverage(self, client):
        full_coverage_result = {
            **SAMPLE_SKILL_GAP_RESULT,
            "skill_coverage": 100.0,
            "missing_skills": [],
        }
        with patch("routers.skills.skill_gap_analyzer") as mock_analyzer:
            mock_analyzer.analyze.return_value = full_coverage_result

            payload = {
                "cv_text": SAMPLE_CV_TEXT,
                "parsed_data": SAMPLE_PARSED_DATA,
            }
            response = client.post("/api/ml/skill-gap-analysis", json=payload)

        body = response.json()
        assert body["data"]["skill_coverage"] == 100.0

    def test_missing_cv_text_returns_422(self, client):
        payload = {"parsed_data": SAMPLE_PARSED_DATA}
        response = client.post("/api/ml/skill-gap-analysis", json=payload)
        assert response.status_code == 422


class TestSkillRelevanceEndpoint:
    def test_valid_skills_and_title_returns_200(self, client):
        with patch("routers.skills.compute_skill_relevance", return_value=SAMPLE_SKILL_RELEVANCE_RESULT):
            payload = {
                "job_title": "Frontend Developer",
                "skills": ["React", "TypeScript", "CSS"],
            }
            response = client.post("/api/ml/skill-relevance", json=payload)

        assert response.status_code == 200

    def test_response_has_success_and_data_keys(self, client):
        with patch("routers.skills.compute_skill_relevance", return_value=SAMPLE_SKILL_RELEVANCE_RESULT):
            payload = {
                "job_title": "Frontend Developer",
                "skills": ["React", "TypeScript"],
            }
            response = client.post("/api/ml/skill-relevance", json=payload)

        body = response.json()
        assert "success" in body
        assert "data" in body

    def test_missing_job_title_returns_422(self, client):
        payload = {"skills": ["React", "TypeScript"]}
        response = client.post("/api/ml/skill-relevance", json=payload)
        assert response.status_code == 422

    def test_missing_skills_returns_422(self, client):
        payload = {"job_title": "Frontend Developer"}
        response = client.post("/api/ml/skill-relevance", json=payload)
        assert response.status_code == 422


class TestParseCVEndpoint:
    def test_pdf_file_upload_returns_200(self, client):
        with patch("routers.cv.cv_parser") as mock_cv_parser, \
             patch("routers.cv.get_mongodb_connection") as mock_mongo:
            mock_cv_parser.parse.return_value = SAMPLE_PARSE_RESULT
            mock_mongo_instance = MagicMock()
            mock_mongo_instance.connect.return_value = False
            mock_mongo.return_value = mock_mongo_instance

            fake_pdf_content = b"%PDF-1.4 mock pdf content for testing"
            response = client.post(
                "/api/ml/parse-cv",
                files={"file": ("test_cv.pdf", io.BytesIO(fake_pdf_content), "application/pdf")},
            )

        assert response.status_code == 200

    def test_pdf_upload_returns_success_true_with_mocked_parser(self, client):
        with patch("routers.cv.cv_parser") as mock_cv_parser, \
             patch("routers.cv.get_mongodb_connection") as mock_mongo:
            mock_cv_parser.parse.return_value = SAMPLE_PARSE_RESULT
            mock_mongo_instance = MagicMock()
            mock_mongo_instance.connect.return_value = False
            mock_mongo.return_value = mock_mongo_instance

            fake_pdf_content = b"%PDF-1.4 mock pdf content for testing"
            response = client.post(
                "/api/ml/parse-cv",
                files={"file": ("test_cv.pdf", io.BytesIO(fake_pdf_content), "application/pdf")},
            )

        body = response.json()
        assert body["success"] is True

    def test_unsupported_file_type_returns_error(self, client):
        # HTTPException is caught by the bare except and returns success=False with 200.
        fake_txt_content = b"plain text cv content"
        response = client.post(
            "/api/ml/parse-cv",
            files={"file": ("cv.txt", io.BytesIO(fake_txt_content), "text/plain")},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["success"] is False

    def test_docx_file_upload_returns_200(self, client):
        with patch("routers.cv.cv_parser") as mock_cv_parser, \
             patch("routers.cv.get_mongodb_connection") as mock_mongo:
            mock_cv_parser.parse.return_value = SAMPLE_PARSE_RESULT
            mock_mongo_instance = MagicMock()
            mock_mongo_instance.connect.return_value = False
            mock_mongo.return_value = mock_mongo_instance

            fake_docx_content = b"PK\x03\x04 mock docx content"
            response = client.post(
                "/api/ml/parse-cv",
                files={"file": ("cv.docx", io.BytesIO(fake_docx_content), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
            )

        assert response.status_code == 200

    def test_parse_with_bearer_token_extracts_user_id(self, client):
        import jwt
        token_payload = {"userId": "user_123", "email": "john@example.com"}
        fake_token = jwt.encode(token_payload, "test-secret-key-that-is-at-least-32-bytes-long", algorithm="HS256")

        with patch("routers.cv.cv_parser") as mock_cv_parser, \
             patch("routers.cv.get_mongodb_connection") as mock_mongo:
            mock_cv_parser.parse.return_value = SAMPLE_PARSE_RESULT
            mock_mongo_instance = MagicMock()
            mock_mongo_instance.connect.return_value = False
            mock_mongo.return_value = mock_mongo_instance

            fake_pdf = b"%PDF-1.4 mock pdf"
            response = client.post(
                "/api/ml/parse-cv",
                files={"file": ("cv.pdf", io.BytesIO(fake_pdf), "application/pdf")},
                headers={"Authorization": f"Bearer {fake_token}"},
            )

        assert response.status_code == 200

    def test_missing_file_returns_422(self, client):
        response = client.post("/api/ml/parse-cv")
        assert response.status_code == 422
