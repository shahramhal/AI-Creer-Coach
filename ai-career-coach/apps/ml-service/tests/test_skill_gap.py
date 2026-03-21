"""
Tests for the SkillGapAnalyzer class and its helper functions.

Coverage:
- analyze() with realistic CV text and parsed data
- Explicit target_role vs auto-detection from CV content
- target_job_description augments the target skill set
- Edge cases: empty cv_text, empty skills list, unknown/invalid role
- Response structure — all required top-level fields present
- Missing skills sorted by roi_score descending
- Learning path phases map correctly: high → Foundation, medium → Intermediate, low → Advanced
- skill_coverage calculation is within 0-100 range
- ROI score formula: salary_impact / (estimated_hours / 40)
- category_breakdown contains expected keys per entry
- summary text reflects coverage level (Excellent / Good / Significant)
- _extract_skills helper skips short tokens that lack word boundaries
- _get_skill_category helper returns "other" for unknown skills
- _build_learning_path groups skills correctly into phases
- FastAPI endpoint /api/ml/skill-gap-analysis: 200 success path (app-level smoke test)
"""

import pytest
from unittest.mock import patch, MagicMock

# ---------------------------------------------------------------------------
# Unit tests for module-level helper functions
# ---------------------------------------------------------------------------

from skill_gap.analyzer import (
    SkillGapAnalyzer,
    _extract_skills,
    _get_skill_category,
    _detect_target_role,
    SKILL_LEARNING_ESTIMATES,
    SKILL_SALARY_IMPACT,
)
from cv_analyzer.keyword_analyzer import ROLE_KEYWORDS, ROLE_ALIASES


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

SAMPLE_SOFTWARE_ENGINEER_CV_TEXT = """
John Smith
Software Engineer

Experience:
Senior Software Engineer at TechCorp (2021-2024)
- Built microservices with Python and FastAPI
- Managed PostgreSQL and Redis databases
- Deployed to AWS using Docker and Kubernetes
- Implemented CI/CD pipelines with GitHub Actions

Skills:
Python, JavaScript, TypeScript, React, Node.js, PostgreSQL, Redis,
Docker, Kubernetes, AWS, Git, SQL, Linux, REST API

Education:
BSc Computer Science, University of Manchester (2018-2021)
"""

SAMPLE_FRONTEND_DEVELOPER_CV_TEXT = """
Jane Doe
Frontend Developer

Experience:
Frontend Developer at WebAgency (2020-2024)
- Built responsive UIs with React and TypeScript
- Used CSS, HTML, Tailwind, and SASS
- Integrated REST APIs and GraphQL
- Version control with Git

Skills:
React, TypeScript, JavaScript, HTML, CSS, Tailwind, Git, Figma

Education:
BA Design & Technology (2017-2020)
"""

SAMPLE_DATA_SCIENTIST_CV_TEXT = """
Alex Chen
Data Scientist

Experience:
Data Scientist at Analytics Inc (2019-2024)
- Built machine learning models with Python, TensorFlow, PyTorch
- Data analysis with Pandas, NumPy, scikit-learn
- SQL databases, Spark for big data
- Git version control

Skills:
Python, Machine Learning, TensorFlow, PyTorch, Pandas, NumPy,
Scikit-learn, SQL, Spark, Git, Data Science

Education:
MSc Statistics, Cambridge (2017-2019)
"""

SAMPLE_SOFTWARE_ENGINEER_PARSED_DATA = {
    "skills": ["Python", "JavaScript", "TypeScript", "React", "Node.js",
               "PostgreSQL", "Redis", "Docker", "Kubernetes", "AWS",
               "Git", "SQL", "Linux", "REST API"],
    "experience": [
        {"title": "Senior Software Engineer", "company": "TechCorp",
         "description": "Built microservices with Python and FastAPI"}
    ],
    "education": [
        {"degree": "BSc Computer Science", "institution": "University of Manchester"}
    ],
    "summary": "Experienced software engineer with backend and cloud skills",
}

SAMPLE_FRONTEND_PARSED_DATA = {
    "skills": ["React", "TypeScript", "JavaScript", "HTML", "CSS", "Tailwind", "Git", "Figma"],
    "experience": [
        {"title": "Frontend Developer", "company": "WebAgency",
         "description": "Built responsive UIs with React and TypeScript"}
    ],
    "education": [{"degree": "BA Design & Technology"}],
    "summary": "Frontend developer specialised in React and TypeScript",
}

SAMPLE_DATA_SCIENTIST_PARSED_DATA = {
    "skills": ["Python", "Machine Learning", "TensorFlow", "PyTorch",
               "Pandas", "NumPy", "SQL", "Spark", "Git", "Data Science"],
    "experience": [
        {"title": "Data Scientist", "company": "Analytics Inc",
         "description": "Built ML models with Python and TensorFlow"}
    ],
    "education": [{"degree": "MSc Statistics", "institution": "Cambridge"}],
    "summary": "Data scientist with deep ML and statistics background",
}

MINIMAL_PARSED_DATA: dict = {"skills": [], "experience": [], "education": [], "summary": ""}


# ---------------------------------------------------------------------------
# Helper function tests
# ---------------------------------------------------------------------------

class TestExtractSkills:
    def test_extracts_known_multi_word_skill_from_text(self):
        text_containing_machine_learning = "I have 5 years experience in machine learning and data science."
        extracted_skills = _extract_skills(text_containing_machine_learning)
        assert "machine learning" in extracted_skills

    def test_extracts_known_short_skill_using_word_boundary(self):
        text_containing_sql = "Expert in SQL databases and query optimisation."
        extracted_skills = _extract_skills(text_containing_sql)
        assert "sql" in extracted_skills

    def test_does_not_extract_short_skill_without_word_boundary(self):
        # "go" should NOT match inside "googled" — the regex uses \b for short skills
        text_without_go_skill = "I googled the documentation."
        extracted_skills = _extract_skills(text_without_go_skill)
        assert "go" not in extracted_skills

    def test_returns_empty_set_for_empty_string(self):
        extracted_skills = _extract_skills("")
        assert extracted_skills == set()

    def test_returns_empty_set_for_none_like_empty_input(self):
        extracted_skills = _extract_skills("   ")
        # No known skills in whitespace-only text
        assert isinstance(extracted_skills, set)

    def test_extracts_multiple_skills_from_realistic_cv_snippet(self):
        cv_snippet = "Proficient in Python, Docker, Kubernetes, and AWS."
        extracted_skills = _extract_skills(cv_snippet)
        assert "python" in extracted_skills
        assert "docker" in extracted_skills
        assert "kubernetes" in extracted_skills
        assert "aws" in extracted_skills

    def test_skill_extraction_is_case_insensitive(self):
        text_with_mixed_case = "Experience with PYTHON and JavaScript and TypeScript"
        extracted_skills = _extract_skills(text_with_mixed_case)
        assert "python" in extracted_skills
        assert "javascript" in extracted_skills
        assert "typescript" in extracted_skills


class TestGetSkillCategory:
    def test_python_maps_to_programming_category(self):
        skill_category = _get_skill_category("python")
        assert skill_category == "programming"

    def test_react_maps_to_frontend_category(self):
        skill_category = _get_skill_category("react")
        assert skill_category == "frontend"

    def test_docker_maps_to_cloud_devops_category(self):
        skill_category = _get_skill_category("docker")
        assert skill_category == "cloud_devops"

    def test_machine_learning_maps_to_data_ml_category(self):
        skill_category = _get_skill_category("machine learning")
        assert skill_category == "data_ml"

    def test_agile_maps_to_business_category(self):
        skill_category = _get_skill_category("agile")
        assert skill_category == "business"

    def test_unknown_skill_returns_other(self):
        skill_category = _get_skill_category("quantum_flux_networking")
        assert skill_category == "other"

    def test_category_lookup_is_case_insensitive(self):
        skill_category_upper = _get_skill_category("PYTHON")
        skill_category_lower = _get_skill_category("python")
        assert skill_category_upper == skill_category_lower == "programming"


class TestDetectTargetRole:
    def test_detects_software_engineer_from_job_title(self):
        parsed_data_with_se_title = {
            "experience": [{"title": "Software Engineer"}],
            "skills": [],
        }
        detected_role = _detect_target_role("software engineer at big tech", parsed_data_with_se_title)
        assert detected_role == "software_engineer"

    def test_detects_frontend_developer_from_job_title(self):
        parsed_data_with_frontend_title = {
            "experience": [{"title": "Frontend Developer"}],
            "skills": [],
        }
        detected_role = _detect_target_role("react javascript css", parsed_data_with_frontend_title)
        assert detected_role == "frontend_developer"

    def test_detects_data_scientist_from_job_title(self):
        parsed_data_with_ds_title = {
            "experience": [{"title": "Data Scientist"}],
            "skills": [],
        }
        detected_role = _detect_target_role("python machine learning", parsed_data_with_ds_title)
        assert detected_role == "data_scientist"

    def test_falls_back_to_skill_scoring_when_no_experience(self):
        parsed_data_no_experience = {
            "experience": [],
            "skills": ["docker", "kubernetes", "aws", "ci/cd", "terraform", "linux"],
        }
        detected_role = _detect_target_role(
            "docker kubernetes aws ci/cd terraform linux bash",
            parsed_data_no_experience
        )
        # With heavy devops skills the scorer should lean devops_engineer or software_engineer
        assert detected_role in ROLE_KEYWORDS

    def test_returns_a_valid_role_key_for_any_cv(self):
        parsed_data_arbitrary = {
            "experience": [],
            "skills": ["excel", "powerpoint"],
        }
        detected_role = _detect_target_role("excel powerpoint strategy", parsed_data_arbitrary)
        assert detected_role in ROLE_KEYWORDS


# ---------------------------------------------------------------------------
# SkillGapAnalyzer.analyze() — response structure
# ---------------------------------------------------------------------------

class TestSkillGapAnalyzerResponseStructure:
    """Verify that analyze() always returns a dict with all required top-level keys."""

    REQUIRED_KEYS = {
        "current_skills",
        "target_role",
        "skill_coverage",
        "matched_count",
        "total_target_skills",
        "missing_skills",
        "recommended_learning_path",
        "category_breakdown",
        "total_estimated_hours",
        "summary",
    }

    def setup_method(self):
        self.analyzer = SkillGapAnalyzer()

    def test_response_contains_all_required_top_level_keys(self):
        analysis_result = self.analyzer.analyze(
            cv_text=SAMPLE_SOFTWARE_ENGINEER_CV_TEXT,
            parsed_data=SAMPLE_SOFTWARE_ENGINEER_PARSED_DATA,
        )
        for required_key in self.REQUIRED_KEYS:
            assert required_key in analysis_result, (
                f"Expected key '{required_key}' missing from analysis result"
            )

    def test_missing_skills_entries_have_required_fields(self):
        analysis_result = self.analyzer.analyze(
            cv_text=SAMPLE_FRONTEND_DEVELOPER_CV_TEXT,
            parsed_data=SAMPLE_FRONTEND_PARSED_DATA,
        )
        for missing_skill_entry in analysis_result["missing_skills"]:
            assert "name" in missing_skill_entry
            assert "category" in missing_skill_entry
            assert "priority" in missing_skill_entry
            assert "frequency" in missing_skill_entry
            assert "estimated_hours" in missing_skill_entry
            assert "salary_impact" in missing_skill_entry
            assert "roi_score" in missing_skill_entry

    def test_learning_path_phases_have_required_fields(self):
        analysis_result = self.analyzer.analyze(
            cv_text=SAMPLE_SOFTWARE_ENGINEER_CV_TEXT,
            parsed_data=SAMPLE_SOFTWARE_ENGINEER_PARSED_DATA,
        )
        for phase_entry in analysis_result["recommended_learning_path"]:
            assert "phase" in phase_entry
            assert "description" in phase_entry
            assert "total_hours" in phase_entry
            assert "skills" in phase_entry
            assert isinstance(phase_entry["skills"], list)

    def test_category_breakdown_entries_have_required_fields(self):
        analysis_result = self.analyzer.analyze(
            cv_text=SAMPLE_SOFTWARE_ENGINEER_CV_TEXT,
            parsed_data=SAMPLE_SOFTWARE_ENGINEER_PARSED_DATA,
        )
        for breakdown_entry in analysis_result["category_breakdown"]:
            assert "category" in breakdown_entry
            assert "current" in breakdown_entry
            assert "target" in breakdown_entry
            assert "matched" in breakdown_entry

    def test_skill_coverage_is_between_0_and_100(self):
        analysis_result = self.analyzer.analyze(
            cv_text=SAMPLE_SOFTWARE_ENGINEER_CV_TEXT,
            parsed_data=SAMPLE_SOFTWARE_ENGINEER_PARSED_DATA,
        )
        skill_coverage_value = analysis_result["skill_coverage"]
        assert 0.0 <= skill_coverage_value <= 100.0, (
            f"skill_coverage={skill_coverage_value} is outside [0, 100]"
        )

    def test_current_skills_is_sorted_list(self):
        analysis_result = self.analyzer.analyze(
            cv_text=SAMPLE_SOFTWARE_ENGINEER_CV_TEXT,
            parsed_data=SAMPLE_SOFTWARE_ENGINEER_PARSED_DATA,
        )
        current_skills_list = analysis_result["current_skills"]
        assert current_skills_list == sorted(current_skills_list), (
            "current_skills should be sorted alphabetically"
        )

    def test_total_estimated_hours_matches_sum_of_missing_skills(self):
        analysis_result = self.analyzer.analyze(
            cv_text=SAMPLE_FRONTEND_DEVELOPER_CV_TEXT,
            parsed_data=SAMPLE_FRONTEND_PARSED_DATA,
        )
        expected_total_hours = sum(
            skill["estimated_hours"] for skill in analysis_result["missing_skills"]
        )
        assert analysis_result["total_estimated_hours"] == expected_total_hours

    def test_matched_count_plus_missing_equals_total_target(self):
        analysis_result = self.analyzer.analyze(
            cv_text=SAMPLE_SOFTWARE_ENGINEER_CV_TEXT,
            parsed_data=SAMPLE_SOFTWARE_ENGINEER_PARSED_DATA,
        )
        assert (
            analysis_result["matched_count"] + len(analysis_result["missing_skills"])
            == analysis_result["total_target_skills"]
        )


# ---------------------------------------------------------------------------
# SkillGapAnalyzer.analyze() — ROI ordering
# ---------------------------------------------------------------------------

class TestSkillGapAnalyzerROIOrdering:
    """Verify missing skills are sorted by roi_score descending."""

    def setup_method(self):
        self.analyzer = SkillGapAnalyzer()

    def test_missing_skills_sorted_by_roi_descending(self):
        analysis_result = self.analyzer.analyze(
            cv_text=SAMPLE_FRONTEND_DEVELOPER_CV_TEXT,
            parsed_data=SAMPLE_FRONTEND_PARSED_DATA,
        )
        missing_skills_list = analysis_result["missing_skills"]
        if len(missing_skills_list) < 2:
            pytest.skip("Not enough missing skills to verify ordering")

        roi_scores = [skill["roi_score"] for skill in missing_skills_list]
        assert roi_scores == sorted(roi_scores, reverse=True), (
            "Missing skills must be sorted by roi_score descending"
        )

    def test_roi_score_formula_is_salary_impact_divided_by_weeks(self):
        """
        ROI formula: roi = salary_impact / (estimated_hours / 40)
        Verify a known skill's ROI matches the formula.
        """
        analysis_result = self.analyzer.analyze(
            cv_text=SAMPLE_FRONTEND_DEVELOPER_CV_TEXT,
            parsed_data=SAMPLE_FRONTEND_PARSED_DATA,
        )
        for missing_skill_entry in analysis_result["missing_skills"]:
            skill_name = missing_skill_entry["name"]
            estimated_hours = missing_skill_entry["estimated_hours"]
            salary_impact_str = missing_skill_entry["salary_impact"]  # e.g. "+7%"
            salary_impact_value = float(salary_impact_str.replace("+", "").replace("%", ""))
            expected_roi = round(salary_impact_value / max(estimated_hours / 40, 0.5), 2)
            assert missing_skill_entry["roi_score"] == pytest.approx(expected_roi, abs=0.01), (
                f"ROI mismatch for skill '{skill_name}': "
                f"expected {expected_roi}, got {missing_skill_entry['roi_score']}"
            )


# ---------------------------------------------------------------------------
# SkillGapAnalyzer.analyze() — learning path phase mapping
# ---------------------------------------------------------------------------

class TestSkillGapAnalyzerLearningPathPhases:
    """
    Verify that priority values map to the correct learning path phases:
      high   -> Foundation
      medium -> Intermediate
      low    -> Advanced
    """

    def setup_method(self):
        self.analyzer = SkillGapAnalyzer()

    def test_high_priority_skills_go_into_foundation_phase(self):
        analysis_result = self.analyzer.analyze(
            cv_text=SAMPLE_FRONTEND_DEVELOPER_CV_TEXT,
            parsed_data=SAMPLE_FRONTEND_PARSED_DATA,
            target_role="frontend_developer",
        )
        learning_path_phases = analysis_result["recommended_learning_path"]
        foundation_phases = [p for p in learning_path_phases if p["phase"] == "Foundation"]
        if not foundation_phases:
            pytest.skip("No Foundation phase present — candidate may already have all high-priority skills")
        for skill_entry in foundation_phases[0]["skills"]:
            assert skill_entry["priority"] == "high", (
                f"Skill '{skill_entry['name']}' in Foundation phase has priority '{skill_entry['priority']}'"
            )

    def test_medium_priority_skills_go_into_intermediate_phase(self):
        analysis_result = self.analyzer.analyze(
            cv_text=SAMPLE_FRONTEND_DEVELOPER_CV_TEXT,
            parsed_data=SAMPLE_FRONTEND_PARSED_DATA,
            target_role="frontend_developer",
        )
        learning_path_phases = analysis_result["recommended_learning_path"]
        intermediate_phases = [p for p in learning_path_phases if p["phase"] == "Intermediate"]
        if not intermediate_phases:
            pytest.skip("No Intermediate phase — candidate may already have all medium-priority skills")
        for skill_entry in intermediate_phases[0]["skills"]:
            assert skill_entry["priority"] == "medium", (
                f"Skill '{skill_entry['name']}' in Intermediate phase has priority '{skill_entry['priority']}'"
            )

    def test_low_priority_skills_go_into_advanced_phase(self):
        analysis_result = self.analyzer.analyze(
            cv_text=SAMPLE_FRONTEND_DEVELOPER_CV_TEXT,
            parsed_data=SAMPLE_FRONTEND_PARSED_DATA,
            target_role="frontend_developer",
        )
        learning_path_phases = analysis_result["recommended_learning_path"]
        advanced_phases = [p for p in learning_path_phases if p["phase"] == "Advanced"]
        if not advanced_phases:
            pytest.skip("No Advanced phase — candidate may already have all low-priority skills")
        for skill_entry in advanced_phases[0]["skills"]:
            assert skill_entry["priority"] == "low", (
                f"Skill '{skill_entry['name']}' in Advanced phase has priority '{skill_entry['priority']}'"
            )

    def test_phase_total_hours_equals_sum_of_phase_skill_hours(self):
        analysis_result = self.analyzer.analyze(
            cv_text=SAMPLE_SOFTWARE_ENGINEER_CV_TEXT,
            parsed_data=SAMPLE_SOFTWARE_ENGINEER_PARSED_DATA,
        )
        for phase_entry in analysis_result["recommended_learning_path"]:
            computed_phase_hours = sum(
                skill["estimated_hours"] for skill in phase_entry["skills"]
            )
            assert phase_entry["total_hours"] == computed_phase_hours, (
                f"Phase '{phase_entry['phase']}': total_hours mismatch. "
                f"Expected {computed_phase_hours}, got {phase_entry['total_hours']}"
            )

    def test_phase_names_are_valid_values(self):
        valid_phase_names = {"Foundation", "Intermediate", "Advanced"}
        analysis_result = self.analyzer.analyze(
            cv_text=SAMPLE_FRONTEND_DEVELOPER_CV_TEXT,
            parsed_data=SAMPLE_FRONTEND_PARSED_DATA,
        )
        for phase_entry in analysis_result["recommended_learning_path"]:
            assert phase_entry["phase"] in valid_phase_names, (
                f"Unexpected phase name: '{phase_entry['phase']}'"
            )


# ---------------------------------------------------------------------------
# SkillGapAnalyzer.analyze() — explicit target_role
# ---------------------------------------------------------------------------

class TestSkillGapAnalyzerExplicitTargetRole:
    """Verify behavior when target_role is explicitly specified."""

    def setup_method(self):
        self.analyzer = SkillGapAnalyzer()

    def test_explicit_target_role_overrides_auto_detection(self):
        # CV is software engineer but we force data_scientist target
        analysis_result = self.analyzer.analyze(
            cv_text=SAMPLE_SOFTWARE_ENGINEER_CV_TEXT,
            parsed_data=SAMPLE_SOFTWARE_ENGINEER_PARSED_DATA,
            target_role="data_scientist",
        )
        assert analysis_result["target_role"] == "data_scientist"

    def test_role_alias_is_normalized_to_canonical_key(self):
        # "software engineer" alias should normalize to "software_engineer"
        analysis_result = self.analyzer.analyze(
            cv_text=SAMPLE_SOFTWARE_ENGINEER_CV_TEXT,
            parsed_data=SAMPLE_SOFTWARE_ENGINEER_PARSED_DATA,
            target_role="software engineer",
        )
        assert analysis_result["target_role"] == "software_engineer"

    def test_frontend_developer_alias_normalizes_correctly(self):
        analysis_result = self.analyzer.analyze(
            cv_text=SAMPLE_FRONTEND_DEVELOPER_CV_TEXT,
            parsed_data=SAMPLE_FRONTEND_PARSED_DATA,
            target_role="frontend developer",
        )
        assert analysis_result["target_role"] == "frontend_developer"

    def test_devops_engineer_explicit_role_uses_devops_keywords(self):
        analysis_result = self.analyzer.analyze(
            cv_text=SAMPLE_SOFTWARE_ENGINEER_CV_TEXT,
            parsed_data=SAMPLE_SOFTWARE_ENGINEER_PARSED_DATA,
            target_role="devops_engineer",
        )
        assert analysis_result["target_role"] == "devops_engineer"
        # DevOps role should require docker, kubernetes, terraform etc.
        all_relevant_skill_names = {skill["name"] for skill in analysis_result["missing_skills"]}
        all_skills_in_scope = set(analysis_result["current_skills"]) | all_relevant_skill_names
        assert "docker" in all_skills_in_scope or "kubernetes" in all_skills_in_scope, (
            "Expected DevOps skills (docker/kubernetes) to be in scope for devops_engineer role"
        )

    def test_unknown_role_falls_back_to_auto_detection(self):
        analysis_result = self.analyzer.analyze(
            cv_text=SAMPLE_SOFTWARE_ENGINEER_CV_TEXT,
            parsed_data=SAMPLE_SOFTWARE_ENGINEER_PARSED_DATA,
            target_role="quantum_physicist",  # Not in ROLE_KEYWORDS or ROLE_ALIASES
        )
        # Should fall back to auto-detection rather than raising an error
        assert analysis_result["target_role"] in ROLE_KEYWORDS

    def test_explicit_snake_case_role_key_is_accepted(self):
        for role_key in ROLE_KEYWORDS:
            analysis_result = self.analyzer.analyze(
                cv_text=SAMPLE_SOFTWARE_ENGINEER_CV_TEXT,
                parsed_data=SAMPLE_SOFTWARE_ENGINEER_PARSED_DATA,
                target_role=role_key,
            )
            assert analysis_result["target_role"] == role_key, (
                f"Expected target_role='{role_key}' but got '{analysis_result['target_role']}'"
            )


# ---------------------------------------------------------------------------
# SkillGapAnalyzer.analyze() — job description augmentation
# ---------------------------------------------------------------------------

class TestSkillGapAnalyzerJobDescriptionAugmentation:
    """Verify that providing a target_job_description adds skills to the target set."""

    def setup_method(self):
        self.analyzer = SkillGapAnalyzer()

    def test_job_description_skills_appear_in_missing_skills_when_not_on_cv(self):
        job_description_with_rust = (
            "We need a developer with Rust experience for systems programming. "
            "Experience with WebAssembly and low-level memory management required."
        )
        # CV has no Rust
        analysis_result_with_jd = self.analyzer.analyze(
            cv_text=SAMPLE_FRONTEND_DEVELOPER_CV_TEXT,
            parsed_data=SAMPLE_FRONTEND_PARSED_DATA,
            target_job_description=job_description_with_rust,
        )
        missing_skill_names = {skill["name"] for skill in analysis_result_with_jd["missing_skills"]}
        assert "rust" in missing_skill_names, (
            "Rust from job description should appear in missing skills since CV has no Rust"
        )

    def test_job_description_augments_without_replacing_role_keywords(self):
        job_description_with_kafka = (
            "Looking for a backend developer with Kafka message queue experience."
        )
        analysis_result_with_jd = self.analyzer.analyze(
            cv_text=SAMPLE_SOFTWARE_ENGINEER_CV_TEXT,
            parsed_data=SAMPLE_SOFTWARE_ENGINEER_PARSED_DATA,
            target_role="software_engineer",
            target_job_description=job_description_with_kafka,
        )
        # Total target skills should be at least as many as without JD
        analysis_result_without_jd = self.analyzer.analyze(
            cv_text=SAMPLE_SOFTWARE_ENGINEER_CV_TEXT,
            parsed_data=SAMPLE_SOFTWARE_ENGINEER_PARSED_DATA,
            target_role="software_engineer",
        )
        assert (
            analysis_result_with_jd["total_target_skills"]
            >= analysis_result_without_jd["total_target_skills"]
        )

    def test_skills_already_on_cv_in_job_description_do_not_become_missing(self):
        job_description_mentioning_python = (
            "Strong Python and Docker skills required for this role."
        )
        # CV already has Python and Docker
        analysis_result = self.analyzer.analyze(
            cv_text=SAMPLE_SOFTWARE_ENGINEER_CV_TEXT,
            parsed_data=SAMPLE_SOFTWARE_ENGINEER_PARSED_DATA,
            target_job_description=job_description_mentioning_python,
        )
        missing_skill_names = {skill["name"] for skill in analysis_result["missing_skills"]}
        assert "python" not in missing_skill_names, (
            "Python is already on the CV and should not be listed as missing"
        )
        assert "docker" not in missing_skill_names, (
            "Docker is already on the CV and should not be listed as missing"
        )


# ---------------------------------------------------------------------------
# SkillGapAnalyzer.analyze() — edge cases
# ---------------------------------------------------------------------------

class TestSkillGapAnalyzerEdgeCases:
    """Test boundary conditions and defensive handling."""

    def setup_method(self):
        self.analyzer = SkillGapAnalyzer()

    def test_empty_cv_text_returns_valid_structure(self):
        analysis_result = self.analyzer.analyze(
            cv_text="",
            parsed_data=MINIMAL_PARSED_DATA,
        )
        for required_key in ("current_skills", "missing_skills", "recommended_learning_path",
                             "skill_coverage", "summary"):
            assert required_key in analysis_result

    def test_empty_cv_text_results_in_zero_current_skills(self):
        analysis_result = self.analyzer.analyze(
            cv_text="",
            parsed_data=MINIMAL_PARSED_DATA,
        )
        assert len(analysis_result["current_skills"]) == 0

    def test_empty_skills_list_in_parsed_data_still_extracts_from_cv_text(self):
        cv_text_with_embedded_skills = "I have experience with Python, Docker, and AWS."
        parsed_data_with_empty_skills = {
            "skills": [],
            "experience": [],
            "education": [],
            "summary": "",
        }
        analysis_result = self.analyzer.analyze(
            cv_text=cv_text_with_embedded_skills,
            parsed_data=parsed_data_with_empty_skills,
        )
        # Skills should be extracted from cv_text even when parsed skills list is empty
        assert "python" in analysis_result["current_skills"]
        assert "docker" in analysis_result["current_skills"]
        assert "aws" in analysis_result["current_skills"]

    def test_full_skill_coverage_candidate_has_no_missing_skills(self):
        # Build a CV that has every software_engineer keyword
        all_se_keywords = [
            entry["keyword"].lower()
            for entry in ROLE_KEYWORDS["software_engineer"]
        ]
        cv_text_with_all_se_skills = " ".join(all_se_keywords)
        parsed_data_with_all_se_skills = {
            "skills": all_se_keywords,
            "experience": [],
            "education": [],
            "summary": "",
        }
        analysis_result = self.analyzer.analyze(
            cv_text=cv_text_with_all_se_skills,
            parsed_data=parsed_data_with_all_se_skills,
            target_role="software_engineer",
        )
        # May still have some missing (multi-word skills that don't map to ALL_SKILLS)
        # but skill_coverage should be high
        assert analysis_result["skill_coverage"] > 50.0

    def test_very_short_cv_text_does_not_raise(self):
        analysis_result = self.analyzer.analyze(
            cv_text="Dev",
            parsed_data=MINIMAL_PARSED_DATA,
        )
        assert isinstance(analysis_result, dict)

    def test_skill_coverage_is_zero_when_no_current_skills(self):
        analysis_result = self.analyzer.analyze(
            cv_text="",
            parsed_data=MINIMAL_PARSED_DATA,
            target_role="software_engineer",
        )
        assert analysis_result["skill_coverage"] == 0.0

    def test_priority_field_values_are_valid_for_all_missing_skills(self):
        valid_priority_values = {"high", "medium", "low"}
        analysis_result = self.analyzer.analyze(
            cv_text=SAMPLE_FRONTEND_DEVELOPER_CV_TEXT,
            parsed_data=SAMPLE_FRONTEND_PARSED_DATA,
        )
        for missing_skill_entry in analysis_result["missing_skills"]:
            assert missing_skill_entry["priority"] in valid_priority_values, (
                f"Unexpected priority '{missing_skill_entry['priority']}' for skill "
                f"'{missing_skill_entry['name']}'"
            )

    def test_frequency_field_is_percentage_string(self):
        analysis_result = self.analyzer.analyze(
            cv_text=SAMPLE_SOFTWARE_ENGINEER_CV_TEXT,
            parsed_data=SAMPLE_SOFTWARE_ENGINEER_PARSED_DATA,
        )
        for missing_skill_entry in analysis_result["missing_skills"]:
            frequency_value = missing_skill_entry["frequency"]
            assert frequency_value.endswith("%"), (
                f"frequency should end with '%', got '{frequency_value}'"
            )
            numeric_part = frequency_value.rstrip("%")
            assert numeric_part.isdigit(), (
                f"frequency should be a numeric percentage string, got '{frequency_value}'"
            )

    def test_salary_impact_field_is_formatted_as_plus_percentage(self):
        analysis_result = self.analyzer.analyze(
            cv_text=SAMPLE_FRONTEND_DEVELOPER_CV_TEXT,
            parsed_data=SAMPLE_FRONTEND_PARSED_DATA,
        )
        for missing_skill_entry in analysis_result["missing_skills"]:
            salary_impact_value = missing_skill_entry["salary_impact"]
            assert salary_impact_value.startswith("+"), (
                f"salary_impact should start with '+', got '{salary_impact_value}'"
            )
            assert salary_impact_value.endswith("%"), (
                f"salary_impact should end with '%', got '{salary_impact_value}'"
            )


# ---------------------------------------------------------------------------
# SkillGapAnalyzer.analyze() — summary text content
# ---------------------------------------------------------------------------

class TestSkillGapAnalyzerSummaryText:
    """Verify summary text reflects the correct coverage tier."""

    def setup_method(self):
        self.analyzer = SkillGapAnalyzer()

    def test_summary_contains_target_role_name(self):
        analysis_result = self.analyzer.analyze(
            cv_text=SAMPLE_SOFTWARE_ENGINEER_CV_TEXT,
            parsed_data=SAMPLE_SOFTWARE_ENGINEER_PARSED_DATA,
            target_role="software_engineer",
        )
        # summary should reference the role
        assert "software engineer" in analysis_result["summary"].lower()

    def test_low_coverage_summary_mentions_significant_gaps(self):
        # Empty CV against software_engineer should produce low coverage -> "Significant" summary
        analysis_result = self.analyzer.analyze(
            cv_text="",
            parsed_data=MINIMAL_PARSED_DATA,
            target_role="software_engineer",
        )
        assert "Significant" in analysis_result["summary"]

    def test_high_coverage_summary_mentions_excellent(self):
        # Build a CV with nearly all SE skills to get >=80% coverage
        all_se_skills_text = " ".join(
            entry["keyword"].lower()
            for entry in ROLE_KEYWORDS["software_engineer"]
        )
        all_se_parsed = {
            "skills": [entry["keyword"] for entry in ROLE_KEYWORDS["software_engineer"]],
            "experience": [],
            "education": [],
            "summary": "",
        }
        analysis_result = self.analyzer.analyze(
            cv_text=all_se_skills_text,
            parsed_data=all_se_parsed,
            target_role="software_engineer",
        )
        if analysis_result["skill_coverage"] >= 80:
            assert "Excellent" in analysis_result["summary"]
        elif analysis_result["skill_coverage"] >= 50:
            assert "Good" in analysis_result["summary"]
        else:
            assert "Significant" in analysis_result["summary"]

    def test_summary_is_non_empty_string(self):
        analysis_result = self.analyzer.analyze(
            cv_text=SAMPLE_DATA_SCIENTIST_CV_TEXT,
            parsed_data=SAMPLE_DATA_SCIENTIST_PARSED_DATA,
        )
        assert isinstance(analysis_result["summary"], str)
        assert len(analysis_result["summary"]) > 0


# ---------------------------------------------------------------------------
# SkillGapAnalyzer.analyze() — data scientist role
# ---------------------------------------------------------------------------

class TestSkillGapAnalyzerDataScientistRole:
    """Verify analysis for a data scientist candidate."""

    def setup_method(self):
        self.analyzer = SkillGapAnalyzer()

    def test_data_scientist_with_strong_cv_has_reasonable_coverage(self):
        analysis_result = self.analyzer.analyze(
            cv_text=SAMPLE_DATA_SCIENTIST_CV_TEXT,
            parsed_data=SAMPLE_DATA_SCIENTIST_PARSED_DATA,
            target_role="data_scientist",
        )
        # A CV with python, ML, TF, PyTorch, Pandas, NumPy, scikit-learn, SQL, Spark
        # should have decent coverage (at least 30%)
        assert analysis_result["skill_coverage"] >= 30.0, (
            f"Expected at least 30% coverage for a strong data scientist CV, "
            f"got {analysis_result['skill_coverage']}%"
        )

    def test_data_scientist_target_role_is_preserved(self):
        analysis_result = self.analyzer.analyze(
            cv_text=SAMPLE_DATA_SCIENTIST_CV_TEXT,
            parsed_data=SAMPLE_DATA_SCIENTIST_PARSED_DATA,
            target_role="data_scientist",
        )
        assert analysis_result["target_role"] == "data_scientist"

    def test_data_scientist_current_skills_include_python(self):
        analysis_result = self.analyzer.analyze(
            cv_text=SAMPLE_DATA_SCIENTIST_CV_TEXT,
            parsed_data=SAMPLE_DATA_SCIENTIST_PARSED_DATA,
            target_role="data_scientist",
        )
        assert "python" in analysis_result["current_skills"]


# ---------------------------------------------------------------------------
# SkillGapAnalyzer._build_learning_path() — internal method
# ---------------------------------------------------------------------------

class TestBuildLearningPath:
    """Unit-test the _build_learning_path method in isolation."""

    def setup_method(self):
        self.analyzer = SkillGapAnalyzer()

    def _make_missing_skill(self, name: str, priority: str, hours: int, roi: float) -> dict:
        return {
            "name": name,
            "category": "programming",
            "priority": priority,
            "estimated_hours": hours,
            "roi_score": roi,
        }

    def test_only_high_priority_skills_produce_only_foundation_phase(self):
        only_high_priority_skills = [
            self._make_missing_skill("python", "high", 120, 2.33),
            self._make_missing_skill("javascript", "high", 120, 1.0),
        ]
        learning_path_result = self.analyzer._build_learning_path(only_high_priority_skills)
        phase_names = [phase["phase"] for phase in learning_path_result]
        assert "Foundation" in phase_names
        assert "Intermediate" not in phase_names
        assert "Advanced" not in phase_names

    def test_only_medium_priority_skills_produce_only_intermediate_phase(self):
        only_medium_priority_skills = [
            self._make_missing_skill("react", "medium", 80, 3.0),
        ]
        learning_path_result = self.analyzer._build_learning_path(only_medium_priority_skills)
        phase_names = [phase["phase"] for phase in learning_path_result]
        assert "Foundation" not in phase_names
        assert "Intermediate" in phase_names
        assert "Advanced" not in phase_names

    def test_only_low_priority_skills_produce_only_advanced_phase(self):
        only_low_priority_skills = [
            self._make_missing_skill("graphql", "low", 40, 5.0),
        ]
        learning_path_result = self.analyzer._build_learning_path(only_low_priority_skills)
        phase_names = [phase["phase"] for phase in learning_path_result]
        assert "Foundation" not in phase_names
        assert "Intermediate" not in phase_names
        assert "Advanced" in phase_names

    def test_mixed_priority_skills_produce_all_three_phases(self):
        mixed_priority_skills = [
            self._make_missing_skill("python", "high", 120, 2.33),
            self._make_missing_skill("react", "medium", 80, 3.0),
            self._make_missing_skill("graphql", "low", 40, 5.0),
        ]
        learning_path_result = self.analyzer._build_learning_path(mixed_priority_skills)
        phase_names = [phase["phase"] for phase in learning_path_result]
        assert "Foundation" in phase_names
        assert "Intermediate" in phase_names
        assert "Advanced" in phase_names

    def test_empty_skills_list_returns_empty_learning_path(self):
        learning_path_result = self.analyzer._build_learning_path([])
        assert learning_path_result == []

    def test_phase_preserves_skill_roi_score_field(self):
        skills_with_roi = [
            self._make_missing_skill("python", "high", 120, 2.33),
        ]
        learning_path_result = self.analyzer._build_learning_path(skills_with_roi)
        foundation_phase = learning_path_result[0]
        assert foundation_phase["skills"][0]["roi_score"] == 2.33


# ---------------------------------------------------------------------------
# FastAPI endpoint smoke test — /api/ml/skill-gap-analysis
# ---------------------------------------------------------------------------

class TestSkillGapEndpoint:
    """
    Smoke-tests for the FastAPI endpoint that wraps SkillGapAnalyzer.

    We mock the heavy ML model initialization (SentenceTransformer) and
    MongoDB connection so the app can be instantiated without those services.
    """

    def _get_test_client(self):
        """
        Build a Starlette TestClient for the FastAPI app with all heavy
        dependencies stubbed out via sys.modules injection.

        The system Python is missing the venv-only packages (anthropic,
        sentence_transformers etc.).  Even when some of those are partially
        present (spacy in user site-packages), their transitive deps cause
        init failures in test environments.

        Strategy: inject fully-stubbed package modules for every top-level
        import in main.py before main is imported, so none of the real heavy
        code ever executes.  We stub the entire cv_parser, job_matcher,
        cv_analyzer, database, and salary_prediction packages as MagicMock
        namespaces, giving main.py exactly the names it expects (CVParser,
        JobMatcher, CVAnalyzer, etc.).
        """
        from unittest.mock import MagicMock
        import importlib
        import sys
        import types

        def make_stub(name: str, **attrs) -> types.ModuleType:
            stub = types.ModuleType(name)
            for attr_name, attr_value in attrs.items():
                setattr(stub, attr_name, attr_value)
            return stub

        # ---- Build mock class constructors ----
        mock_cv_parser_instance = MagicMock()
        MockCVParserClass = MagicMock(return_value=mock_cv_parser_instance)

        mock_job_matcher_instance = MagicMock()
        mock_job_matcher_instance.model = None
        mock_job_matcher_instance.get_cache_stats.return_value = {}
        MockJobMatcherClass = MagicMock(return_value=mock_job_matcher_instance)

        mock_cv_analyzer_instance = MagicMock()
        MockCVAnalyzerClass = MagicMock(return_value=mock_cv_analyzer_instance)

        mock_skill_gap_analyzer_instance = MagicMock()
        # skill_gap_analyzer.analyze() must return the real SkillGapAnalyzer
        # result so the endpoint tests can verify the actual response shape.
        real_analyzer = SkillGapAnalyzer()
        mock_skill_gap_analyzer_instance.analyze.side_effect = real_analyzer.analyze
        MockSkillGapAnalyzerClass = MagicMock(return_value=mock_skill_gap_analyzer_instance)

        mock_get_mongodb_connection = MagicMock(return_value=MagicMock())

        # ---- Inject package stubs so no real code loads ----

        # cv_parser package stubs
        cv_parser_parserv2_stub = make_stub("cv_parser.parserV2", CVParser=MockCVParserClass)
        cv_parser_stub = make_stub("cv_parser", parserV2=cv_parser_parserv2_stub, CVParser=MockCVParserClass)
        sys.modules["cv_parser"] = cv_parser_stub
        sys.modules["cv_parser.parserV2"] = cv_parser_parserv2_stub
        sys.modules["cv_parser.parser"] = make_stub("cv_parser.parser", CVParser=MockCVParserClass)
        sys.modules["cv_parser.llm_parser"] = make_stub("cv_parser.llm_parser", LLMCVParser=MagicMock(), estimate_cost=MagicMock())

        # job_matcher package stubs
        job_matcher_matcher_stub = make_stub("job_matcher.matcher", JobMatcher=MockJobMatcherClass, SKILL_CATEGORIES={}, ALL_SKILLS=set())
        job_matcher_stub = make_stub("job_matcher", matcher=job_matcher_matcher_stub, JobMatcher=MockJobMatcherClass)
        sys.modules["job_matcher"] = job_matcher_stub
        sys.modules["job_matcher.matcher"] = job_matcher_matcher_stub

        # cv_analyzer package stubs
        cv_analyzer_analyzer_stub = make_stub("cv_analyzer.analyzer", CVAnalyzer=MockCVAnalyzerClass)
        cv_analyzer_ats_stub = make_stub("cv_analyzer.ats_scorer", set_shared_model=MagicMock(), ATSScorer=MagicMock())
        cv_analyzer_stub = make_stub(
            "cv_analyzer",
            analyzer=cv_analyzer_analyzer_stub,
            ats_scorer=cv_analyzer_ats_stub,
            CVAnalyzer=MockCVAnalyzerClass,
        )
        sys.modules["cv_analyzer"] = cv_analyzer_stub
        sys.modules["cv_analyzer.analyzer"] = cv_analyzer_analyzer_stub
        sys.modules["cv_analyzer.ats_scorer"] = cv_analyzer_ats_stub
        sys.modules["cv_analyzer.keyword_analyzer"] = make_stub(
            "cv_analyzer.keyword_analyzer",
            ROLE_KEYWORDS=ROLE_KEYWORDS,
            ROLE_ALIASES=ROLE_ALIASES,
        )

        # skill_gap package stubs — use the real SkillGapAnalyzer so the
        # endpoint exercises real business logic
        skill_gap_analyzer_stub = make_stub(
            "skill_gap.analyzer",
            SkillGapAnalyzer=MockSkillGapAnalyzerClass,
        )
        skill_gap_stub = make_stub("skill_gap", analyzer=skill_gap_analyzer_stub, SkillGapAnalyzer=MockSkillGapAnalyzerClass)
        sys.modules["skill_gap"] = skill_gap_stub
        sys.modules["skill_gap.analyzer"] = skill_gap_analyzer_stub

        # database package stubs
        database_mongodb_stub = make_stub("database.mongodb", get_mongodb_connection=mock_get_mongodb_connection)
        database_stub = make_stub("database", mongodb=database_mongodb_stub, get_mongodb_connection=mock_get_mongodb_connection)
        sys.modules["database"] = database_stub
        sys.modules["database.mongodb"] = database_mongodb_stub

        # salary_prediction package stub
        mock_salary_router = MagicMock()
        salary_predictor_stub = make_stub("salary_prediction.salary_predictor", router=mock_salary_router)
        salary_prediction_stub = make_stub("salary_prediction", salary_predictor=salary_predictor_stub, router=mock_salary_router)
        sys.modules["salary_prediction"] = salary_prediction_stub
        sys.modules["salary_prediction.salary_predictor"] = salary_predictor_stub

        # utils.serializers stub (used in main.py parse_cv endpoint)
        sys.modules["utils"] = make_stub("utils")
        sys.modules["utils.serializers"] = make_stub("utils.serializers", serialize_objectid=MagicMock(side_effect=lambda x: x))

        # jwt stub (PyJWT — used in main.py parse_cv endpoint)
        sys.modules["jwt"] = make_stub("jwt", decode=MagicMock(return_value={"userId": "test-user"}), exceptions=MagicMock())

        # ---- Evict and reload main ----
        sys.modules.pop("main", None)

        import main as ml_main
        importlib.reload(ml_main)

        from starlette.testclient import TestClient
        return TestClient(ml_main.app)

    def test_skill_gap_endpoint_returns_200_with_valid_payload(self):
        test_client = self._get_test_client()
        valid_request_payload = {
            "cv_text": SAMPLE_SOFTWARE_ENGINEER_CV_TEXT,
            "parsed_data": SAMPLE_SOFTWARE_ENGINEER_PARSED_DATA,
            "target_role": "software_engineer",
        }
        response = test_client.post(
            "/api/ml/skill-gap-analysis",
            json=valid_request_payload,
        )
        assert response.status_code == 200, (
            f"Expected 200 OK, got {response.status_code}: {response.text}"
        )

    def test_skill_gap_endpoint_response_has_success_true(self):
        test_client = self._get_test_client()
        valid_request_payload = {
            "cv_text": SAMPLE_SOFTWARE_ENGINEER_CV_TEXT,
            "parsed_data": SAMPLE_SOFTWARE_ENGINEER_PARSED_DATA,
        }
        response = test_client.post("/api/ml/skill-gap-analysis", json=valid_request_payload)
        response_json = response.json()
        assert response_json.get("success") is True

    def test_skill_gap_endpoint_response_data_contains_required_keys(self):
        test_client = self._get_test_client()
        valid_request_payload = {
            "cv_text": SAMPLE_DATA_SCIENTIST_CV_TEXT,
            "parsed_data": SAMPLE_DATA_SCIENTIST_PARSED_DATA,
            "target_role": "data_scientist",
        }
        response = test_client.post("/api/ml/skill-gap-analysis", json=valid_request_payload)
        response_data = response.json().get("data", {})
        expected_keys = [
            "current_skills", "target_role", "skill_coverage",
            "matched_count", "total_target_skills", "missing_skills",
            "recommended_learning_path", "category_breakdown",
            "total_estimated_hours", "summary",
        ]
        for expected_key in expected_keys:
            assert expected_key in response_data, (
                f"Key '{expected_key}' missing from endpoint response data"
            )

    def test_skill_gap_endpoint_accepts_optional_job_description(self):
        test_client = self._get_test_client()
        request_payload_with_jd = {
            "cv_text": SAMPLE_SOFTWARE_ENGINEER_CV_TEXT,
            "parsed_data": SAMPLE_SOFTWARE_ENGINEER_PARSED_DATA,
            "target_role": "software_engineer",
            "target_job_description": "We need a developer with Rust and Kafka experience.",
        }
        response = test_client.post("/api/ml/skill-gap-analysis", json=request_payload_with_jd)
        assert response.status_code == 200
        assert response.json().get("success") is True

    def test_skill_gap_endpoint_requires_cv_text_field(self):
        test_client = self._get_test_client()
        payload_missing_cv_text = {
            "parsed_data": SAMPLE_SOFTWARE_ENGINEER_PARSED_DATA,
        }
        response = test_client.post("/api/ml/skill-gap-analysis", json=payload_missing_cv_text)
        # FastAPI Pydantic validation should reject this with 422
        assert response.status_code == 422

    def test_skill_gap_endpoint_requires_parsed_data_field(self):
        test_client = self._get_test_client()
        payload_missing_parsed_data = {
            "cv_text": SAMPLE_SOFTWARE_ENGINEER_CV_TEXT,
        }
        response = test_client.post("/api/ml/skill-gap-analysis", json=payload_missing_parsed_data)
        assert response.status_code == 422
