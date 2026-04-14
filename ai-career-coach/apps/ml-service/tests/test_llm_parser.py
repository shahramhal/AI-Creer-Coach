"""
Tests for cv_parser/llm_parser.py - LLMCVParser and estimate_cost.
Mocks the anthropic.Anthropic client.
"""

import json
import sys
import types
import pytest
from unittest.mock import patch, MagicMock

# anthropic may not be installed in the test environment - inject a stub so
# the module can be imported without the real package present.
if "anthropic" not in sys.modules:
    anthropic_stub = types.ModuleType("anthropic")
    anthropic_stub.Anthropic = MagicMock
    sys.modules["anthropic"] = anthropic_stub

VALID_CV_TEXT = """
John Smith
john@example.com | +44 7700 900123 | London, UK | linkedin.com/in/johnsmith

Professional Summary
Experienced software engineer with 5 years building scalable Python backend systems.

Work Experience
Senior Software Engineer at TechCorp
London, UK | January 2021 - Present
- Developed microservices architecture reducing API latency by 40%
- Led team of 5 engineers delivering 3 major product features
- Deployed to AWS using Docker and Kubernetes

Education
BSc Computer Science | University of Manchester | 2015-2019 | First Class Honours

Skills
Python, TypeScript, React, Node.js, PostgreSQL, Redis, Docker, Kubernetes, AWS, Git
"""

VALID_LLM_RESPONSE_JSON = {
    "contact_info": {
        "name": "John Smith",
        "email": "john@example.com",
        "phone": "+44 7700 900123",
        "linkedin": "linkedin.com/in/johnsmith",
        "location": "London, UK",
    },
    "summary": "Experienced software engineer with 5 years building scalable Python backend systems.",
    "skills": ["Python", "TypeScript", "React", "Node.js", "PostgreSQL", "Redis",
               "Docker", "Kubernetes", "AWS", "Git"],
    "experience": [
        {
            "title": "Senior Software Engineer",
            "company": "TechCorp",
            "location": "London, UK",
            "dates": "January 2021 - Present",
            "responsibilities": [
                "Developed microservices architecture reducing API latency by 40%",
                "Led team of 5 engineers delivering 3 major product features",
                "Deployed to AWS using Docker and Kubernetes",
            ],
        }
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
    "projects": [],
    "certifications": [],
}


def make_mock_anthropic_response(json_content: dict):
    """Build a mock Anthropic API response object."""
    mock_content_block = MagicMock()
    mock_content_block.text = json.dumps(json_content)
    mock_response = MagicMock()
    mock_response.content = [mock_content_block]
    return mock_response


@pytest.fixture
def llm_parser():
    from cv_parser import llm_parser as llm_parser_module
    mock_client = MagicMock()
    original_anthropic = llm_parser_module.Anthropic
    llm_parser_module.Anthropic = MagicMock(return_value=mock_client)
    try:
        from cv_parser.llm_parser import LLMCVParser
        parser = LLMCVParser(api_key="test-api-key")
        parser.client = mock_client
        yield parser
    finally:
        llm_parser_module.Anthropic = original_anthropic


class TestLLMCVParserParse:
    def test_returns_dict_with_contact_info(self, llm_parser):
        mock_response = make_mock_anthropic_response(VALID_LLM_RESPONSE_JSON)
        llm_parser.client.messages.create.return_value = mock_response

        result = llm_parser.parse(VALID_CV_TEXT, "cv.pdf")

        assert "contact_info" in result
        assert result["contact_info"]["name"] == "John Smith"

    def test_returns_dict_with_skills_list(self, llm_parser):
        mock_response = make_mock_anthropic_response(VALID_LLM_RESPONSE_JSON)
        llm_parser.client.messages.create.return_value = mock_response

        result = llm_parser.parse(VALID_CV_TEXT, "cv.pdf")

        assert "skills" in result
        assert isinstance(result["skills"], list)
        assert "Python" in result["skills"]

    def test_returns_dict_with_experience_list(self, llm_parser):
        mock_response = make_mock_anthropic_response(VALID_LLM_RESPONSE_JSON)
        llm_parser.client.messages.create.return_value = mock_response

        result = llm_parser.parse(VALID_CV_TEXT, "cv.pdf")

        assert "experience" in result
        assert isinstance(result["experience"], list)
        assert result["experience"][0]["company"] == "TechCorp"

    def test_returns_dict_with_education_list(self, llm_parser):
        mock_response = make_mock_anthropic_response(VALID_LLM_RESPONSE_JSON)
        llm_parser.client.messages.create.return_value = mock_response

        result = llm_parser.parse(VALID_CV_TEXT, "cv.pdf")

        assert "education" in result
        assert isinstance(result["education"], list)

    def test_adds_confidence_scores_to_result(self, llm_parser):
        mock_response = make_mock_anthropic_response(VALID_LLM_RESPONSE_JSON)
        llm_parser.client.messages.create.return_value = mock_response

        result = llm_parser.parse(VALID_CV_TEXT, "cv.pdf")

        assert "confidence" in result
        assert "scores" in result["confidence"]
        assert "quality" in result["confidence"]

    def test_adds_metadata_to_result(self, llm_parser):
        mock_response = make_mock_anthropic_response(VALID_LLM_RESPONSE_JSON)
        llm_parser.client.messages.create.return_value = mock_response

        result = llm_parser.parse(VALID_CV_TEXT, "cv.pdf")

        assert "metadata" in result
        assert result["metadata"]["filename"] == "cv.pdf"
        assert result["metadata"]["parsing_method"] == "llm"

    def test_strips_markdown_code_blocks_from_response(self, llm_parser):
        json_string = json.dumps(VALID_LLM_RESPONSE_JSON)
        wrapped_in_markdown = f"```json\n{json_string}\n```"

        mock_content_block = MagicMock()
        mock_content_block.text = wrapped_in_markdown
        mock_response = MagicMock()
        mock_response.content = [mock_content_block]
        llm_parser.client.messages.create.return_value = mock_response

        result = llm_parser.parse(VALID_CV_TEXT, "cv.pdf")

        assert result["contact_info"]["name"] == "John Smith"

    def test_raises_value_error_on_api_failure(self, llm_parser):
        llm_parser.client.messages.create.side_effect = Exception("API connection error")

        with pytest.raises(ValueError, match="LLM parsing failed"):
            llm_parser.parse(VALID_CV_TEXT, "cv.pdf")

    def test_raises_value_error_on_invalid_json_response(self, llm_parser):
        mock_content_block = MagicMock()
        mock_content_block.text = "This is not JSON at all"
        mock_response = MagicMock()
        mock_response.content = [mock_content_block]
        llm_parser.client.messages.create.return_value = mock_response

        with pytest.raises(ValueError, match="LLM parsing failed"):
            llm_parser.parse(VALID_CV_TEXT, "cv.pdf")

    def test_overall_confidence_score_is_between_0_and_1(self, llm_parser):
        mock_response = make_mock_anthropic_response(VALID_LLM_RESPONSE_JSON)
        llm_parser.client.messages.create.return_value = mock_response

        result = llm_parser.parse(VALID_CV_TEXT, "cv.pdf")

        overall_score = result["confidence"]["scores"]["overall"]
        assert 0.0 <= overall_score <= 1.0

    def test_quality_level_is_valid_string(self, llm_parser):
        mock_response = make_mock_anthropic_response(VALID_LLM_RESPONSE_JSON)
        llm_parser.client.messages.create.return_value = mock_response

        result = llm_parser.parse(VALID_CV_TEXT, "cv.pdf")

        valid_quality_levels = {"excellent", "good", "fair", "poor"}
        assert result["confidence"]["quality"] in valid_quality_levels


class TestLLMCVParserConfidenceCalculation:
    def test_all_contact_fields_give_contact_score_1(self, llm_parser):
        parsed_data_with_full_contact = {
            "contact_info": {
                "name": "John Smith",
                "email": "john@example.com",
                "phone": "+44 7700 900123",
                "location": "London",
                "linkedin": "linkedin.com/in/john",
            },
            "experience": [],
            "education": [],
            "skills": [],
            "projects": [],
            "certifications": [],
        }
        confidence = llm_parser._calculate_confidence(parsed_data_with_full_contact)
        assert confidence["scores"]["contact"] == 1.0

    def test_missing_all_contact_fields_gives_contact_score_0(self, llm_parser):
        parsed_data_no_contact = {
            "contact_info": {},
            "experience": [],
            "education": [],
            "skills": [],
            "projects": [],
            "certifications": [],
        }
        confidence = llm_parser._calculate_confidence(parsed_data_no_contact)
        assert confidence["scores"]["contact"] == 0.0

    def test_15_plus_skills_gives_max_skills_score(self, llm_parser):
        parsed_data_with_many_skills = {
            "contact_info": {},
            "experience": [],
            "education": [],
            "skills": ["skill_" + str(i) for i in range(15)],
            "projects": [],
            "certifications": [],
        }
        confidence = llm_parser._calculate_confidence(parsed_data_with_many_skills)
        assert confidence["scores"]["skills"] == 1.0

    def test_zero_skills_gives_skills_score_0(self, llm_parser):
        parsed_data_no_skills = {
            "contact_info": {},
            "experience": [],
            "education": [],
            "skills": [],
            "projects": [],
            "certifications": [],
        }
        confidence = llm_parser._calculate_confidence(parsed_data_no_skills)
        assert confidence["scores"]["skills"] == 0.0

    def test_completeness_flags_reflect_data_presence(self, llm_parser):
        parsed_data_partial = {
            "contact_info": {"email": "test@test.com"},
            "experience": [{"title": "Dev"}],
            "education": [],
            "skills": ["Python"],
            "projects": [],
            "certifications": [],
        }
        confidence = llm_parser._calculate_confidence(parsed_data_partial)
        completeness = confidence["completeness"]
        assert completeness["has_contact"] is True
        assert completeness["has_experience"] is True
        assert completeness["has_education"] is False
        assert completeness["has_skills"] is True


class TestEstimateCost:
    @pytest.fixture(autouse=True)
    def _import_estimate_cost(self):
        from cv_parser.llm_parser import estimate_cost
        self.estimate_cost = estimate_cost

    def test_returns_dict_with_required_keys(self):
        result = self.estimate_cost(VALID_CV_TEXT)
        assert "input_tokens" in result
        assert "output_tokens" in result
        assert "estimated_cost_usd" in result
        assert "cost_per_1000_cvs" in result

    def test_cost_is_positive(self):
        result = self.estimate_cost(VALID_CV_TEXT)
        assert result["estimated_cost_usd"] > 0

    def test_longer_cv_costs_more_than_shorter_cv(self):
        short_cv = "John Smith developer"
        long_cv = VALID_CV_TEXT * 5
        short_cost = self.estimate_cost(short_cv)
        long_cost = self.estimate_cost(long_cv)
        assert long_cost["estimated_cost_usd"] > short_cost["estimated_cost_usd"]

    def test_input_tokens_proportional_to_text_length(self):
        short_cv = "a" * 400
        long_cv = "a" * 4000
        short_result = self.estimate_cost(short_cv)
        long_result = self.estimate_cost(long_cv)
        assert long_result["input_tokens"] > short_result["input_tokens"]


class TestLLMCVParserInitialization:
    def test_raises_if_no_api_key(self):
        from cv_parser import llm_parser as llm_parser_module
        original = llm_parser_module.Anthropic
        llm_parser_module.Anthropic = MagicMock()
        try:
            with patch.dict("os.environ", {}, clear=True):
                with pytest.raises(ValueError, match="ANTHROPIC_API_KEY not set"):
                    from cv_parser.llm_parser import LLMCVParser
                    LLMCVParser(api_key=None)
        finally:
            llm_parser_module.Anthropic = original

    def test_uses_api_key_from_constructor(self):
        from cv_parser import llm_parser as llm_parser_module
        mock_anthropic_class = MagicMock()
        original = llm_parser_module.Anthropic
        llm_parser_module.Anthropic = mock_anthropic_class
        try:
            from cv_parser.llm_parser import LLMCVParser
            LLMCVParser(api_key="explicit-key")
            mock_anthropic_class.assert_called_once_with(api_key="explicit-key")
        finally:
            llm_parser_module.Anthropic = original
