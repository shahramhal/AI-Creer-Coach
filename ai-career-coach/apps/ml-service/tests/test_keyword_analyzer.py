"""
Tests for cv_analyzer/keyword_analyzer.py - KeywordAnalyzer class.
"""

import pytest
from cv_analyzer.keyword_analyzer import KeywordAnalyzer, ROLE_KEYWORDS, ROLE_ALIASES

PYTHON_BACKEND_CV_TEXT = """
Senior Software Engineer with expertise in Python, Django, FastAPI, PostgreSQL,
Redis, Docker, Kubernetes, AWS, CI/CD, Git, REST API, Microservices, Linux.
"""

FRONTEND_CV_TEXT = """
Frontend Developer skilled in React, TypeScript, JavaScript, CSS, HTML,
Tailwind, Next.js, Git, Figma, Redux, SASS, Responsive Design.
"""

DATA_SCIENCE_CV_TEXT = """
Data Scientist with Python, Machine Learning, TensorFlow, PyTorch,
Pandas, NumPy, Scikit-learn, SQL, Spark, Statistics, Data Science.
"""

EMPTY_CV_TEXT = ""

PARSED_DATA_BACKEND = {
    "skills": ["Python", "Django", "FastAPI", "PostgreSQL", "Redis",
               "Docker", "Kubernetes", "AWS", "Git", "REST API"],
    "experience": [{"title": "Senior Software Engineer", "company": "TechCorp"}],
    "summary": "Backend engineer",
}

PARSED_DATA_FRONTEND = {
    "skills": ["React", "TypeScript", "JavaScript", "CSS", "HTML", "Tailwind", "Git"],
    "experience": [{"title": "Frontend Developer", "company": "WebCo"}],
    "summary": "Frontend developer",
}

PARSED_DATA_DATA_SCIENCE = {
    "skills": ["Python", "Machine Learning", "TensorFlow", "Pandas", "NumPy", "SQL"],
    "experience": [{"title": "Data Scientist", "company": "AnalyticsCo"}],
    "summary": "Data scientist",
}

MINIMAL_PARSED_DATA = {
    "skills": [],
    "experience": [],
    "summary": "",
}


@pytest.fixture
def keyword_analyzer():
    return KeywordAnalyzer()


class TestRoleKeywordsStructure:
    def test_role_keywords_contains_expected_roles(self):
        expected_roles = {
            "software_engineer", "frontend_developer", "backend_developer",
            "data_scientist", "devops_engineer", "product_manager", "full_stack_developer",
        }
        assert expected_roles.issubset(set(ROLE_KEYWORDS.keys()))

    def test_each_role_has_keyword_entries(self):
        for role, keywords in ROLE_KEYWORDS.items():
            assert len(keywords) > 0, f"Role {role} has no keywords"

    def test_keyword_entries_have_required_fields(self):
        for role, keywords in ROLE_KEYWORDS.items():
            for entry in keywords:
                assert "keyword" in entry, f"Missing 'keyword' in {role}"
                assert "frequency" in entry, f"Missing 'frequency' in {role}"
                assert "section" in entry, f"Missing 'section' in {role}"

    def test_frequency_values_are_parseable_percentages(self):
        for role, keywords in ROLE_KEYWORDS.items():
            for entry in keywords:
                freq = entry["frequency"].replace("%", "")
                assert freq.isdigit(), f"Non-numeric frequency in {role}: {entry['frequency']}"


class TestRoleAliases:
    def test_software_engineer_alias_maps_correctly(self):
        assert ROLE_ALIASES.get("software engineer") == "software_engineer"

    def test_frontend_developer_alias_maps_correctly(self):
        assert ROLE_ALIASES.get("frontend developer") == "frontend_developer"

    def test_data_scientist_alias_maps_correctly(self):
        assert ROLE_ALIASES.get("data scientist") == "data_scientist"

    def test_swe_abbreviation_maps_to_software_engineer(self):
        assert ROLE_ALIASES.get("swe") == "software_engineer"


class TestDetectTargetRole:
    def test_detects_software_engineer_from_title(self, keyword_analyzer):
        parsed = {
            "skills": ["Python", "React"],
            "experience": [{"title": "Software Engineer", "company": "TechCo"}],
        }
        role = keyword_analyzer.detect_target_role("cv text", parsed)
        assert role == "software_engineer"

    def test_detects_frontend_developer_from_title(self, keyword_analyzer):
        parsed = {
            "skills": ["React", "CSS"],
            "experience": [{"title": "Frontend Developer", "company": "WebCo"}],
        }
        role = keyword_analyzer.detect_target_role("cv text", parsed)
        assert role == "frontend_developer"

    def test_detects_data_scientist_from_title(self, keyword_analyzer):
        parsed = {
            "skills": ["Python", "Machine Learning"],
            "experience": [{"title": "Data Scientist", "company": "AnalyticsCo"}],
        }
        role = keyword_analyzer.detect_target_role("cv text", parsed)
        assert role == "data_scientist"

    def test_falls_back_to_skills_when_title_unrecognized(self, keyword_analyzer):
        parsed = {
            "skills": ["Python", "Machine Learning", "TensorFlow", "PyTorch",
                       "Pandas", "NumPy", "Scikit-learn", "SQL", "Data Science"],
            "experience": [{"title": "Researcher", "company": "University"}],
        }
        role = keyword_analyzer.detect_target_role(DATA_SCIENCE_CV_TEXT, parsed)
        assert isinstance(role, str)
        assert role in ROLE_KEYWORDS

    def test_returns_valid_role_key_for_empty_skills(self, keyword_analyzer):
        role = keyword_analyzer.detect_target_role(EMPTY_CV_TEXT, MINIMAL_PARSED_DATA)
        assert role in ROLE_KEYWORDS


class TestAnalyzeKeywordGaps:
    def test_returns_dict_with_required_keys(self, keyword_analyzer):
        result = keyword_analyzer.analyze_keyword_gaps(
            PYTHON_BACKEND_CV_TEXT, PARSED_DATA_BACKEND
        )
        assert "target_role" in result
        assert "cv_keywords" in result
        assert "missing_keywords" in result
        assert "keyword_match_score" in result
        assert "matched_count" in result
        assert "total_role_keywords" in result

    def test_keyword_match_score_is_between_0_and_100(self, keyword_analyzer):
        result = keyword_analyzer.analyze_keyword_gaps(
            PYTHON_BACKEND_CV_TEXT, PARSED_DATA_BACKEND
        )
        assert 0 <= result["keyword_match_score"] <= 100

    def test_well_matched_cv_has_high_score(self, keyword_analyzer):
        result = keyword_analyzer.analyze_keyword_gaps(
            PYTHON_BACKEND_CV_TEXT, PARSED_DATA_BACKEND
        )
        assert result["keyword_match_score"] >= 30

    def test_target_role_accepted_as_explicit_input(self, keyword_analyzer):
        result = keyword_analyzer.analyze_keyword_gaps(
            FRONTEND_CV_TEXT, PARSED_DATA_FRONTEND, target_role="frontend_developer"
        )
        assert result["target_role"] == "frontend_developer"

    def test_missing_keywords_are_sorted_by_frequency_desc(self, keyword_analyzer):
        result = keyword_analyzer.analyze_keyword_gaps(
            EMPTY_CV_TEXT, MINIMAL_PARSED_DATA, target_role="software_engineer"
        )
        missing = result["missing_keywords"]
        if len(missing) >= 2:
            freqs = [int(m["jobFrequency"].replace("%", "")) for m in missing]
            assert freqs == sorted(freqs, reverse=True)

    def test_missing_keywords_have_required_fields(self, keyword_analyzer):
        result = keyword_analyzer.analyze_keyword_gaps(
            EMPTY_CV_TEXT, MINIMAL_PARSED_DATA, target_role="software_engineer"
        )
        for kw in result["missing_keywords"]:
            assert "keyword" in kw
            assert "jobFrequency" in kw
            assert "section" in kw
            assert "impact" in kw

    def test_unknown_target_role_falls_back_to_detected_role(self, keyword_analyzer):
        result = keyword_analyzer.analyze_keyword_gaps(
            PYTHON_BACKEND_CV_TEXT, PARSED_DATA_BACKEND, target_role="nonexistent_role_xyz"
        )
        assert result["target_role"] in ROLE_KEYWORDS

    def test_cv_keywords_list_max_15_entries(self, keyword_analyzer):
        result = keyword_analyzer.analyze_keyword_gaps(
            PYTHON_BACKEND_CV_TEXT, PARSED_DATA_BACKEND
        )
        assert len(result["cv_keywords"]) <= 15

    def test_missing_keywords_list_max_15_entries(self, keyword_analyzer):
        result = keyword_analyzer.analyze_keyword_gaps(
            EMPTY_CV_TEXT, MINIMAL_PARSED_DATA
        )
        assert len(result["missing_keywords"]) <= 15


class TestEstimateImpact:
    @pytest.mark.parametrize("frequency,expected_prefix", [
        (85, "+"),
        (65, "+"),
        (45, "+"),
        (20, "+"),
    ])
    def test_impact_always_has_positive_prefix(self, keyword_analyzer, frequency, expected_prefix):
        impact = keyword_analyzer._estimate_impact(frequency)
        assert impact.startswith(expected_prefix)

    def test_high_frequency_has_higher_impact_than_low(self, keyword_analyzer):
        high_impact = keyword_analyzer._estimate_impact(85)
        low_impact = keyword_analyzer._estimate_impact(20)
        high_value = int(high_impact.replace("+", "").replace("%", ""))
        low_value = int(low_impact.replace("+", "").replace("%", ""))
        assert high_value > low_value


class TestExtractCVKeywords:
    def test_fallback_returns_list_of_tuples(self, keyword_analyzer):
        keyword_analyzer._kw_model = "fallback"
        keywords = keyword_analyzer.extract_cv_keywords(PYTHON_BACKEND_CV_TEXT)
        assert isinstance(keywords, list)
        for item in keywords:
            assert isinstance(item, tuple)

    def test_fallback_finds_known_skills(self, keyword_analyzer):
        keyword_analyzer._kw_model = "fallback"
        keywords = keyword_analyzer.extract_cv_keywords(PYTHON_BACKEND_CV_TEXT)
        found_keywords = {kw.lower() for kw, _ in keywords}
        assert "python" in found_keywords or "docker" in found_keywords
