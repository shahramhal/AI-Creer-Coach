"""
Tests for cv_analyzer/ats_checker.py - ATSChecker class.
"""

import pytest
from cv_analyzer.ats_checker import ATSChecker

FULL_CV_TEXT = """
John Smith
Contact: john.smith@example.com | +44 7700 900123 | London, UK
LinkedIn: linkedin.com/in/johnsmith

Professional Summary
Experienced software engineer with 5+ years building scalable backend systems.

Work Experience
Senior Software Engineer at TechCorp (2021 - Present)
- Developed microservices architecture reducing latency by 40%
- Led team of 5 engineers across 3 product lines
- Deployed to AWS using Docker and Kubernetes

Software Engineer at StartupCo (2019 - 2021)
- Built REST APIs serving 100,000+ daily users
- Implemented CI/CD pipelines with GitHub Actions

Skills
Python, TypeScript, React, Node.js, PostgreSQL, Redis, Docker, Kubernetes, AWS, Git

Education
BSc Computer Science, University of Manchester (2015-2019)

Certifications
AWS Solutions Architect
"""

MINIMAL_CV_TEXT = "John Smith"

PARSED_DATA_FULL = {
    "contact_info": {
        "email": "john.smith@example.com",
        "phone": "+44 7700 900123",
        "location": "London, UK",
        "linkedin": "linkedin.com/in/johnsmith",
    },
    "summary": "Experienced software engineer with 5+ years building scalable backend systems.",
    "experience": [
        {
            "title": "Senior Software Engineer",
            "company": "TechCorp",
            "startDate": "2021-01",
            "endDate": "Present",
            "responsibilities": [
                "Developed microservices architecture reducing latency by 40%",
                "Led team of 5 engineers across 3 product lines",
                "Deployed to AWS using Docker and Kubernetes",
            ],
            "achievements": [],
        },
        {
            "title": "Software Engineer",
            "company": "StartupCo",
            "startDate": "2019-06",
            "endDate": "2021-01",
            "responsibilities": [
                "Built REST APIs serving 100,000+ daily users",
                "Implemented CI/CD pipelines with GitHub Actions",
            ],
            "achievements": [],
        },
    ],
    "education": [{"degree": "BSc Computer Science", "institution": "University of Manchester"}],
    "skills": ["Python", "TypeScript", "React", "Node.js", "PostgreSQL", "Redis",
               "Docker", "Kubernetes", "AWS", "Git"],
}

PARSED_DATA_MINIMAL = {
    "contact_info": {},
    "summary": "",
    "experience": [],
    "education": [],
    "skills": [],
}


@pytest.fixture
def ats_checker():
    return ATSChecker()


class TestCheckAll:
    def test_returns_list_of_dicts(self, ats_checker):
        results = ats_checker.check_all(FULL_CV_TEXT, PARSED_DATA_FULL, "cv.pdf")
        assert isinstance(results, list)
        assert len(results) > 0

    def test_each_check_has_required_keys(self, ats_checker):
        results = ats_checker.check_all(FULL_CV_TEXT, PARSED_DATA_FULL, "cv.pdf")
        for check in results:
            assert "status" in check
            assert "title" in check
            assert "description" in check

    def test_status_values_are_valid(self, ats_checker):
        results = ats_checker.check_all(FULL_CV_TEXT, PARSED_DATA_FULL, "cv.pdf")
        valid_statuses = {"pass", "warning", "fail"}
        for check in results:
            assert check["status"] in valid_statuses

    def test_minimal_cv_produces_failures(self, ats_checker):
        results = ats_checker.check_all(MINIMAL_CV_TEXT, PARSED_DATA_MINIMAL, "")
        statuses = {c["status"] for c in results}
        assert "fail" in statuses or "warning" in statuses

    def test_full_cv_produces_mostly_passes(self, ats_checker):
        results = ats_checker.check_all(FULL_CV_TEXT, PARSED_DATA_FULL, "cv.pdf")
        pass_count = sum(1 for c in results if c["status"] == "pass")
        total = len(results)
        assert pass_count / total >= 0.5


class TestCheckFileFormat:
    def test_pdf_file_passes(self, ats_checker):
        result = ats_checker._check_file_format("resume.pdf")
        assert result["status"] == "pass"

    def test_docx_file_passes(self, ats_checker):
        result = ats_checker._check_file_format("resume.docx")
        assert result["status"] == "pass"

    def test_doc_file_warns(self, ats_checker):
        result = ats_checker._check_file_format("resume.doc")
        assert result["status"] == "warning"

    def test_txt_file_fails(self, ats_checker):
        result = ats_checker._check_file_format("resume.txt")
        assert result["status"] == "fail"

    def test_unknown_format_warns(self, ats_checker):
        result = ats_checker._check_file_format("")
        assert result["status"] == "warning"


class TestCheckPageLength:
    def test_appropriate_length_passes(self, ats_checker):
        text_with_300_plus_words = " ".join(["word"] * 400)
        result = ats_checker._check_page_length(text_with_300_plus_words)
        assert result["status"] == "pass"

    def test_too_short_cv_warns(self, ats_checker):
        text_too_short = "John Smith Software Engineer"
        result = ats_checker._check_page_length(text_too_short)
        assert result["status"] == "warning"

    def test_too_long_cv_warns(self, ats_checker):
        text_too_long = " ".join(["word"] * 1500)
        result = ats_checker._check_page_length(text_too_long)
        assert result["status"] == "warning"


class TestCheckContactEmail:
    def test_valid_email_passes(self, ats_checker):
        parsed = {"contact_info": {"email": "user@example.com"}}
        result = ats_checker._check_contact_email(parsed)
        assert result["status"] == "pass"

    def test_missing_email_fails(self, ats_checker):
        parsed = {"contact_info": {}}
        result = ats_checker._check_contact_email(parsed)
        assert result["status"] == "fail"

    def test_supports_personal_key_alias(self, ats_checker):
        parsed = {"personal": {"email": "user@example.com"}}
        result = ats_checker._check_contact_email(parsed)
        assert result["status"] == "pass"


class TestCheckContactPhone:
    def test_valid_phone_passes(self, ats_checker):
        parsed = {"contact_info": {"phone": "+44 7700 900123"}}
        result = ats_checker._check_contact_phone(parsed)
        assert result["status"] == "pass"

    def test_missing_phone_warns(self, ats_checker):
        parsed = {"contact_info": {}}
        result = ats_checker._check_contact_phone(parsed)
        assert result["status"] == "warning"

    def test_short_phone_warns(self, ats_checker):
        parsed = {"contact_info": {"phone": "123"}}
        result = ats_checker._check_contact_phone(parsed)
        assert result["status"] == "warning"


class TestCheckSectionHeaders:
    def test_cv_with_many_headers_passes(self, ats_checker):
        text = "experience education skills summary certifications projects contact"
        result = ats_checker._check_section_headers(text)
        assert result["status"] == "pass"

    def test_cv_with_few_headers_warns_or_fails(self, ats_checker):
        text = "John Smith is a developer"
        result = ats_checker._check_section_headers(text)
        assert result["status"] in ("warning", "fail")


class TestCheckSkillsPresent:
    def test_many_skills_passes(self, ats_checker):
        parsed = {"skills": ["Python", "JS", "TS", "React", "Node", "Docker", "AWS", "SQL", "Git"]}
        result = ats_checker._check_skills_present(parsed)
        assert result["status"] == "pass"

    def test_few_skills_warns(self, ats_checker):
        parsed = {"skills": ["Python", "SQL"]}
        result = ats_checker._check_skills_present(parsed)
        assert result["status"] in ("warning", "fail")

    def test_no_skills_fails(self, ats_checker):
        parsed = {"skills": []}
        result = ats_checker._check_skills_present(parsed)
        assert result["status"] == "fail"


class TestCheckActionVerbs:
    def test_bullets_with_action_verbs_pass(self, ats_checker):
        parsed = {
            "experience": [
                {
                    "responsibilities": [
                        "Developed a REST API serving 50,000 daily users",
                        "Implemented CI/CD pipelines reducing deploy time by 30%",
                        "Led team of 4 engineers",
                        "Built automated test suite covering 85% of codebase",
                    ],
                    "achievements": [],
                }
            ]
        }
        result = ats_checker._check_action_verbs(parsed)
        assert result["status"] == "pass"

    def test_no_bullets_warns(self, ats_checker):
        parsed = {"experience": [{"responsibilities": [], "achievements": []}]}
        result = ats_checker._check_action_verbs(parsed)
        assert result["status"] == "warning"


class TestCheckQuantifiableAchievements:
    def test_bullets_with_metrics_pass(self, ats_checker):
        parsed = {
            "experience": [
                {
                    "responsibilities": [
                        "Improved performance by 40%",
                        "Reduced costs by $50,000",
                        "Grew user base to 10,000+",
                        "Built system serving 5000 users",
                    ],
                    "achievements": [],
                }
            ]
        }
        result = ats_checker._check_quantifiable_achievements(parsed)
        assert result["status"] == "pass"

    def test_no_metrics_warns(self, ats_checker):
        parsed = {
            "experience": [
                {
                    "responsibilities": [
                        "Worked on backend systems",
                        "Collaborated with team members",
                    ],
                    "achievements": [],
                }
            ]
        }
        result = ats_checker._check_quantifiable_achievements(parsed)
        assert result["status"] == "warning"


class TestCheckEmailProfessional:
    def test_professional_email_passes(self, ats_checker):
        parsed = {"contact_info": {"email": "john.smith@gmail.com"}}
        result = ats_checker._check_email_professional(parsed)
        assert result["status"] == "pass"

    def test_returns_none_when_no_email(self, ats_checker):
        parsed = {"contact_info": {}}
        result = ats_checker._check_email_professional(parsed)
        assert result is None

    def test_unprofessional_email_warns(self, ats_checker):
        parsed = {"contact_info": {"email": "coolboy69@gmail.com"}}
        result = ats_checker._check_email_professional(parsed)
        assert result["status"] == "warning"


class TestCheckChronologicalOrder:
    def test_reverse_chronological_passes(self, ats_checker):
        parsed = {
            "experience": [
                {"title": "Senior Dev", "endDate": "Present"},
                {"title": "Junior Dev", "endDate": "2021-01"},
            ]
        }
        result = ats_checker._check_chronological_order(parsed)
        assert result["status"] == "pass"

    def test_single_job_returns_none(self, ats_checker):
        parsed = {"experience": [{"title": "Dev", "endDate": "Present"}]}
        result = ats_checker._check_chronological_order(parsed)
        assert result is None
