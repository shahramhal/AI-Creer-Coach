"""
Test configuration for ml-service pytest suite.

Adds the ml-service root to sys.path so imports like
`from skill_gap.analyzer import SkillGapAnalyzer` resolve correctly
without needing an installed package.

xgboost is mocked at the sys.modules level before any test collection
so that salary_prediction/__init__.py -> predictor.py can be imported
without xgboost being installed.
"""

import sys
import os
from unittest.mock import MagicMock

ML_SERVICE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ML_SERVICE_ROOT not in sys.path:
    sys.path.insert(0, ML_SERVICE_ROOT)

_xgboost_mock = MagicMock()
_xgboost_mock.XGBRegressor = MagicMock
sys.modules.setdefault("xgboost", _xgboost_mock)

_anthropic_mock = MagicMock()
_anthropic_mock.Anthropic = MagicMock
sys.modules.setdefault("anthropic", _anthropic_mock)

_keybert_mock = MagicMock()
_keybert_mock.KeyBERT = MagicMock
sys.modules.setdefault("keybert", _keybert_mock)

import pytest


@pytest.fixture(scope="session")
def sample_cv_text():
    """Realistic CV text string used across multiple test modules."""
    return """
John Smith
john.smith@example.com | +44 7700 900123 | London, UK
linkedin.com/in/johnsmith

Professional Summary
Senior Software Engineer with 6 years of experience building scalable
backend systems using Python, FastAPI, Docker, and AWS.

Work Experience
Senior Software Engineer at TechCorp (January 2021 - Present)
- Developed microservices architecture reducing API latency by 40%
- Led a team of 5 engineers delivering 3 major product features
- Deployed to AWS using Docker and Kubernetes
- Implemented CI/CD pipelines saving 2 hours per deployment cycle

Software Engineer at StartupCo (June 2019 - December 2020)
- Built REST APIs serving 100,000+ daily active users
- Optimized database queries improving performance by 60%
- Integrated third-party payment processing handling $2M+ monthly

Skills
Python, TypeScript, React, Node.js, FastAPI, PostgreSQL, Redis,
Docker, Kubernetes, AWS, Git, SQL, Linux, REST API, CI/CD

Education
BSc Computer Science, University of Manchester (2015-2019) - First Class Honours

Certifications
AWS Solutions Architect - Associate (2022)
"""


@pytest.fixture(scope="session")
def sample_parsed_data():
    """Realistic parsed CV data dict for use across test modules."""
    return {
        "contact_info": {
            "name": "John Smith",
            "email": "john.smith@example.com",
            "phone": "+44 7700 900123",
            "location": "London, UK",
            "linkedin": "linkedin.com/in/johnsmith",
        },
        "summary": "Senior Software Engineer with 6 years of experience building scalable "
                   "backend systems using Python, FastAPI, Docker, and AWS.",
        "experience": [
            {
                "title": "Senior Software Engineer",
                "company": "TechCorp",
                "location": "London, UK",
                "startDate": "2021-01",
                "endDate": "Present",
                "responsibilities": [
                    "Developed microservices architecture reducing API latency by 40%",
                    "Led a team of 5 engineers delivering 3 major product features",
                    "Deployed to AWS using Docker and Kubernetes",
                    "Implemented CI/CD pipelines saving 2 hours per deployment cycle",
                ],
                "achievements": [],
            },
            {
                "title": "Software Engineer",
                "company": "StartupCo",
                "location": "London, UK",
                "startDate": "2019-06",
                "endDate": "2020-12",
                "responsibilities": [
                    "Built REST APIs serving 100,000+ daily active users",
                    "Optimized database queries improving performance by 60%",
                    "Integrated third-party payment processing handling $2M+ monthly",
                ],
                "achievements": [],
            },
        ],
        "education": [
            {
                "degree": "BSc",
                "field": "Computer Science",
                "institution": "University of Manchester",
                "location": "Manchester, UK",
                "dates": "2015-2019",
                "grade": "First Class Honours",
            }
        ],
        "skills": [
            "Python", "TypeScript", "React", "Node.js", "FastAPI",
            "PostgreSQL", "Redis", "Docker", "Kubernetes", "AWS",
            "Git", "SQL", "Linux", "REST API", "CI/CD",
        ],
        "projects": [],
        "certifications": [
            {
                "name": "AWS Solutions Architect - Associate",
                "issuer": "Amazon Web Services",
                "date": "2022",
            }
        ],
    }


@pytest.fixture(scope="session")
def sample_job_data():
    """List of sample job dicts for job matching tests."""
    return [
        {
            "job_id": "job_backend_001",
            "title": "Senior Software Engineer",
            "company": "TechStartup Ltd",
            "location": "London, UK",
            "description": (
                "We are looking for a Senior Software Engineer to build scalable "
                "Python microservices. You will work with FastAPI, Docker, Kubernetes, "
                "and AWS. Experience with PostgreSQL and Redis is essential."
            ),
            "requirements": ["Python", "FastAPI", "Docker", "Kubernetes", "AWS", "PostgreSQL"],
            "salary_min": 70000,
            "salary_max": 90000,
            "source": "adzuna",
            "source_url": "https://adzuna.co.uk/job/backend_001",
            "posted_date": "2024-01-15",
            "job_type": "full-time",
            "remote_type": "hybrid",
        },
        {
            "job_id": "job_frontend_002",
            "title": "Frontend Developer",
            "company": "WebAgency Co",
            "location": "Manchester, UK",
            "description": (
                "Frontend Developer needed for React and TypeScript projects. "
                "Experience with CSS, HTML, Next.js, and responsive design required."
            ),
            "requirements": ["React", "TypeScript", "JavaScript", "CSS", "HTML", "Next.js"],
            "salary_min": 55000,
            "salary_max": 70000,
            "source": "reed",
            "source_url": "https://reed.co.uk/job/frontend_002",
            "posted_date": "2024-01-16",
            "job_type": "full-time",
            "remote_type": "remote",
        },
        {
            "job_id": "job_data_003",
            "title": "Data Scientist",
            "company": "Analytics Platform",
            "location": "Edinburgh, UK",
            "description": (
                "Data Scientist with Python, TensorFlow, and machine learning expertise. "
                "Experience with Pandas, NumPy, and SQL required."
            ),
            "requirements": ["Python", "TensorFlow", "Machine Learning", "Pandas", "SQL"],
            "salary_min": 65000,
            "salary_max": 85000,
            "source": "adzuna",
            "source_url": "https://adzuna.co.uk/job/data_003",
            "posted_date": "2024-01-17",
            "job_type": "full-time",
            "remote_type": "on-site",
        },
    ]
