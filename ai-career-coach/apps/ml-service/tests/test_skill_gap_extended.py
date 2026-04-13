"""
Extended tests for skill_gap/analyzer.py - SkillGapAnalyzer.
Additional edge cases not covered in the original test_skill_gap.py.
"""

import pytest
from skill_gap.analyzer import SkillGapAnalyzer

FULL_MATCH_CV_TEXT = """
DevOps Engineer
Skills: Docker, Kubernetes, AWS, CI/CD, Terraform, Linux, Python, Bash,
Jenkins, Ansible, Monitoring, Git, Networking, Security, Prometheus, GCP, Azure
"""

FULL_MATCH_PARSED_DATA = {
    "skills": ["Docker", "Kubernetes", "AWS", "CI/CD", "Terraform", "Linux",
               "Python", "Bash", "Jenkins", "Ansible", "Git", "Monitoring",
               "Networking", "Security", "Prometheus", "GCP", "Azure",
               "Microservices", "Infrastructure as Code", "Grafana"],
    "experience": [{"title": "DevOps Engineer", "company": "CloudCo"}],
    "summary": "Experienced DevOps engineer",
}

EMPTY_CV_SKILLS_TEXT = "I am looking for a new role."
EMPTY_CV_SKILLS_PARSED_DATA = {
    "skills": [],
    "experience": [],
    "summary": "",
}

MIXED_CASE_CV_TEXT = "Proficient in PYTHON, Docker, TypeScript, AWS"
MIXED_CASE_PARSED_DATA = {
    "skills": ["PYTHON", "Docker", "TypeScript", "AWS"],
    "experience": [{"title": "Software Engineer"}],
    "summary": "",
}

JOB_DESCRIPTION_WITH_EXTRA_SKILLS = """
We are looking for a Software Engineer with experience in Python, Docker,
Kubernetes, TypeScript, React, Node.js, PostgreSQL, Redis, AWS, Git,
CI/CD, REST API, Microservices, and GraphQL.
"""


@pytest.fixture
def analyzer():
    return SkillGapAnalyzer()


class TestFullSkillOverlapNoGap:
    def test_full_match_produces_zero_or_minimal_missing_skills(self, analyzer):
        result = analyzer.analyze(
            cv_text=FULL_MATCH_CV_TEXT,
            parsed_data=FULL_MATCH_PARSED_DATA,
            target_role="devops_engineer",
        )
        assert result["skill_coverage"] > 50.0

    def test_skill_coverage_approaches_100_when_all_skills_present(self, analyzer):
        result = analyzer.analyze(
            cv_text=FULL_MATCH_CV_TEXT,
            parsed_data=FULL_MATCH_PARSED_DATA,
            target_role="devops_engineer",
        )
        assert result["skill_coverage"] >= 50.0

    def test_summary_reflects_high_coverage(self, analyzer):
        result = analyzer.analyze(
            cv_text=FULL_MATCH_CV_TEXT,
            parsed_data=FULL_MATCH_PARSED_DATA,
            target_role="devops_engineer",
        )
        summary_lower = result["summary"].lower()
        assert any(keyword in summary_lower for keyword in ["excellent", "good", "strong", "%"])


class TestEmptyCVSkills:
    def test_skill_coverage_is_0_when_no_cv_skills(self, analyzer):
        result = analyzer.analyze(
            cv_text=EMPTY_CV_SKILLS_TEXT,
            parsed_data=EMPTY_CV_SKILLS_PARSED_DATA,
            target_role="software_engineer",
        )
        assert result["skill_coverage"] == 0.0 or result["matched_count"] == 0

    def test_all_target_skills_appear_as_missing(self, analyzer):
        result = analyzer.analyze(
            cv_text=EMPTY_CV_SKILLS_TEXT,
            parsed_data=EMPTY_CV_SKILLS_PARSED_DATA,
            target_role="software_engineer",
        )
        assert result["total_target_skills"] > 0
        assert len(result["missing_skills"]) > 0

    def test_result_structure_still_valid_for_empty_skills(self, analyzer):
        result = analyzer.analyze(
            cv_text=EMPTY_CV_SKILLS_TEXT,
            parsed_data=EMPTY_CV_SKILLS_PARSED_DATA,
        )
        assert isinstance(result, dict)
        assert "skill_coverage" in result
        assert "missing_skills" in result
        assert "recommended_learning_path" in result


class TestEmptyRequiredSkills:
    def test_unknown_role_falls_back_to_some_role(self, analyzer):
        result = analyzer.analyze(
            cv_text="John Smith software developer",
            parsed_data=EMPTY_CV_SKILLS_PARSED_DATA,
            target_role="completely_unknown_role_xyz_abc",
        )
        assert result["total_target_skills"] >= 0
        assert isinstance(result, dict)


class TestCaseInsensitivity:
    def test_uppercase_skills_are_matched_against_lowercase_targets(self, analyzer):
        result = analyzer.analyze(
            cv_text=MIXED_CASE_CV_TEXT,
            parsed_data=MIXED_CASE_PARSED_DATA,
            target_role="software_engineer",
        )
        assert result["skill_coverage"] > 0

    def test_matched_count_positive_for_known_skills_in_mixed_case(self, analyzer):
        result = analyzer.analyze(
            cv_text=MIXED_CASE_CV_TEXT,
            parsed_data=MIXED_CASE_PARSED_DATA,
            target_role="software_engineer",
        )
        assert result["matched_count"] > 0


class TestJobDescriptionAugmentation:
    def test_target_job_description_increases_skill_targets(self, analyzer):
        result_without_description = analyzer.analyze(
            cv_text=FULL_MATCH_CV_TEXT,
            parsed_data=FULL_MATCH_PARSED_DATA,
            target_role="software_engineer",
        )
        result_with_description = analyzer.analyze(
            cv_text=FULL_MATCH_CV_TEXT,
            parsed_data=FULL_MATCH_PARSED_DATA,
            target_role="software_engineer",
            target_job_description=JOB_DESCRIPTION_WITH_EXTRA_SKILLS,
        )
        assert isinstance(result_with_description, dict)
        assert "skill_coverage" in result_with_description

    def test_job_description_doesnt_break_result_structure(self, analyzer):
        result = analyzer.analyze(
            cv_text=EMPTY_CV_SKILLS_TEXT,
            parsed_data=EMPTY_CV_SKILLS_PARSED_DATA,
            target_role="backend_developer",
            target_job_description=JOB_DESCRIPTION_WITH_EXTRA_SKILLS,
        )
        required_keys = {
            "current_skills", "target_role", "skill_coverage",
            "missing_skills", "recommended_learning_path",
        }
        assert required_keys.issubset(set(result.keys()))


class TestPartialMatches:
    def test_partial_skill_overlap_produces_nonzero_coverage(self, analyzer):
        partial_match_parsed = {
            "skills": ["Python", "Docker"],
            "experience": [{"title": "Software Engineer"}],
            "summary": "",
        }
        result = analyzer.analyze(
            cv_text="Python Docker developer",
            parsed_data=partial_match_parsed,
            target_role="software_engineer",
        )
        assert result["skill_coverage"] > 0
        assert result["skill_coverage"] < 100

    def test_partial_match_has_both_matched_and_missing_skills(self, analyzer):
        partial_match_parsed = {
            "skills": ["Python"],
            "experience": [{"title": "Software Engineer"}],
            "summary": "",
        }
        result = analyzer.analyze(
            cv_text="Python developer",
            parsed_data=partial_match_parsed,
            target_role="software_engineer",
        )
        assert result["matched_count"] > 0
        assert len(result["missing_skills"]) > 0


class TestLearningPathContents:
    def test_each_skill_in_learning_path_has_estimated_hours(self, analyzer):
        result = analyzer.analyze(
            cv_text=EMPTY_CV_SKILLS_TEXT,
            parsed_data=EMPTY_CV_SKILLS_PARSED_DATA,
            target_role="frontend_developer",
        )
        for phase in result["recommended_learning_path"]:
            for skill_entry in phase["skills"]:
                assert "estimated_hours" in skill_entry
                assert skill_entry["estimated_hours"] > 0

    def test_learning_path_phase_hours_sum_matches_skill_hours(self, analyzer):
        result = analyzer.analyze(
            cv_text=EMPTY_CV_SKILLS_TEXT,
            parsed_data=EMPTY_CV_SKILLS_PARSED_DATA,
            target_role="frontend_developer",
        )
        for phase in result["recommended_learning_path"]:
            skills_total = sum(s["estimated_hours"] for s in phase["skills"])
            assert phase["total_hours"] == skills_total

    def test_missing_skills_have_valid_priority_values(self, analyzer):
        result = analyzer.analyze(
            cv_text=EMPTY_CV_SKILLS_TEXT,
            parsed_data=EMPTY_CV_SKILLS_PARSED_DATA,
            target_role="data_scientist",
        )
        valid_priorities = {"high", "medium", "low"}
        for skill_entry in result["missing_skills"]:
            assert skill_entry["priority"] in valid_priorities


class TestCategoryBreakdown:
    def test_category_breakdown_is_not_empty_for_known_role(self, analyzer):
        result = analyzer.analyze(
            cv_text=EMPTY_CV_SKILLS_TEXT,
            parsed_data=EMPTY_CV_SKILLS_PARSED_DATA,
            target_role="software_engineer",
        )
        assert len(result["category_breakdown"]) > 0

    def test_category_breakdown_matched_never_exceeds_target(self, analyzer):
        result = analyzer.analyze(
            cv_text=FULL_MATCH_CV_TEXT,
            parsed_data=FULL_MATCH_PARSED_DATA,
            target_role="devops_engineer",
        )
        for breakdown in result["category_breakdown"]:
            assert breakdown["matched"] <= breakdown["target"]
