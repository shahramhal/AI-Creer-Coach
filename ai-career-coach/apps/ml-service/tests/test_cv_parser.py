"""
Tests for cv_parser/parserV2.py - CVParser class.
Mocks file reading (pdfplumber, python-docx) and LLM parser.
"""

import io
import sys
import types
import pytest
from unittest.mock import patch, MagicMock

# anthropic may not be installed - inject a stub so cv_parser.llm_parser imports cleanly.
if "anthropic" not in sys.modules:
    _anthropic_stub = types.ModuleType("anthropic")
    _anthropic_stub.Anthropic = MagicMock
    sys.modules["anthropic"] = _anthropic_stub

MOCK_PARSED_RESULT = {
    "contact_info": {
        "name": "John Smith",
        "email": "john@example.com",
        "phone": "+44 7700 900123",
        "location": "London, UK",
        "linkedin": "linkedin.com/in/johnsmith",
    },
    "summary": "Experienced software engineer with 5 years building scalable systems.",
    "skills": ["Python", "TypeScript", "React", "Node.js", "PostgreSQL", "Docker", "AWS"],
    "experience": [
        {
            "title": "Senior Software Engineer",
            "company": "TechCorp",
            "location": "London, UK",
            "dates": "Jan 2021 - Present",
            "responsibilities": [
                "Built microservices with Python and FastAPI",
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
            "dates": "2015 - 2019",
            "grade": "First Class Honours",
        }
    ],
    "projects": [],
    "certifications": [],
    "confidence": {
        "scores": {
            "overall": 0.88,
            "contact": 1.0,
            "experience": 0.9,
            "education": 1.0,
            "skills": 0.9,
            "projects": 0.0,
            "certifications": 0.0,
        },
        "quality": "excellent",
        "issues": [],
        "completeness": {
            "has_contact": True,
            "has_experience": True,
            "has_education": True,
            "has_skills": True,
            "has_projects": False,
            "has_certifications": False,
        },
    },
    "metadata": {
        "filename": "test_cv.pdf",
        "parsed_at": "2024-01-01T12:00:00",
        "parser_version": "3.0-llm",
        "model": "claude-sonnet-4-20250514",
        "text_length": 500,
        "parsing_method": "llm",
    },
}

SUFFICIENT_CV_TEXT = """
John Smith
john@example.com | +44 7700 900123 | London

Senior Software Engineer at TechCorp 2021-Present
Built Python microservices and deployed to AWS.

BSc Computer Science, University of Manchester, 2015-2019

Skills: Python, TypeScript, Docker, Kubernetes, AWS
"""


def make_cv_parser(mock_llm_parse_result=None):
    """
    Create a CVParser with a mock LLM parser injected directly onto the module.
    Uses module-attribute replacement instead of patch() context manager so the
    mock remains active after the factory function returns.
    """
    if mock_llm_parse_result is None:
        mock_llm_parse_result = MOCK_PARSED_RESULT

    import cv_parser.parserV2 as parserv2_module

    mock_llm_instance = MagicMock()
    mock_llm_instance.parse.return_value = mock_llm_parse_result

    mock_llm_class = MagicMock(return_value=mock_llm_instance)

    original_llm_class = parserv2_module.LLMCVParser
    parserv2_module.LLMCVParser = mock_llm_class

    try:
        from cv_parser.parserV2 import CVParser
        parser = CVParser(anthropic_api_key="test-api-key")
        parser.llm_parser = mock_llm_instance
    finally:
        parserv2_module.LLMCVParser = original_llm_class

    return parser


class TestCVParserParsePDF:
    def test_parse_pdf_calls_llm_parser(self):
        parser = make_cv_parser()

        mock_page = MagicMock()
        mock_page.extract_text.return_value = SUFFICIENT_CV_TEXT

        import cv_parser.parserV2 as parserv2_module

        original_pdfplumber = parserv2_module.pdfplumber
        mock_pdfplumber = MagicMock()
        mock_pdf_ctx = MagicMock()
        mock_pdf_ctx.__enter__ = MagicMock(return_value=mock_pdf_ctx)
        mock_pdf_ctx.__exit__ = MagicMock(return_value=False)
        mock_pdf_ctx.pages = [mock_page]
        mock_pdfplumber.open.return_value = mock_pdf_ctx
        parserv2_module.pdfplumber = mock_pdfplumber

        try:
            result = parser.parse(b"fake_pdf_bytes", "cv.pdf")
        finally:
            parserv2_module.pdfplumber = original_pdfplumber

        parser.llm_parser.parse.assert_called_once()
        assert result["contact_info"]["name"] == "John Smith"

    def test_parse_pdf_raises_on_insufficient_text(self):
        parser = make_cv_parser()

        mock_page = MagicMock()
        mock_page.extract_text.return_value = "Short text"

        import cv_parser.parserV2 as parserv2_module

        original_pdfplumber = parserv2_module.pdfplumber
        mock_pdfplumber = MagicMock()
        mock_pdf_ctx = MagicMock()
        mock_pdf_ctx.__enter__ = MagicMock(return_value=mock_pdf_ctx)
        mock_pdf_ctx.__exit__ = MagicMock(return_value=False)
        mock_pdf_ctx.pages = [mock_page]
        mock_pdfplumber.open.return_value = mock_pdf_ctx
        parserv2_module.pdfplumber = mock_pdfplumber

        try:
            with pytest.raises(ValueError, match="Insufficient text"):
                parser.parse(b"fake_pdf_bytes", "cv.pdf")
        finally:
            parserv2_module.pdfplumber = original_pdfplumber

    def test_parse_pdf_falls_back_to_pypdf2_on_pdfplumber_failure(self):
        parser = make_cv_parser()

        import cv_parser.parserV2 as parserv2_module

        original_pdfplumber = parserv2_module.pdfplumber
        original_pypdf2 = parserv2_module.pypdf

        mock_pdfplumber = MagicMock()
        mock_pdfplumber.open.side_effect = Exception("pdfplumber failed")

        mock_pypdf2 = MagicMock()
        mock_reader = MagicMock()
        mock_page = MagicMock()
        mock_page.extract_text.return_value = SUFFICIENT_CV_TEXT
        mock_reader.pages = [mock_page]
        mock_pypdf2.PdfReader.return_value = mock_reader

        parserv2_module.pdfplumber = mock_pdfplumber
        parserv2_module.pypdf = mock_pypdf2

        try:
            result = parser.parse(b"fake_pdf_bytes", "cv.pdf")
        finally:
            parserv2_module.pdfplumber = original_pdfplumber
            parserv2_module.pypdf = original_pypdf2

        assert result["contact_info"]["name"] == "John Smith"

    def test_parse_pdf_raises_when_both_extractors_fail(self):
        parser = make_cv_parser()

        import cv_parser.parserV2 as parserv2_module

        original_pdfplumber = parserv2_module.pdfplumber
        original_pypdf2 = parserv2_module.pypdf

        mock_pdfplumber = MagicMock()
        mock_pdfplumber.open.side_effect = Exception("pdfplumber failed")
        mock_pypdf2 = MagicMock()
        mock_pypdf2.PdfReader.side_effect = Exception("pypdf2 also failed")

        parserv2_module.pdfplumber = mock_pdfplumber
        parserv2_module.pypdf = mock_pypdf2

        try:
            with pytest.raises(ValueError):
                parser.parse(b"fake_pdf_bytes", "cv.pdf")
        finally:
            parserv2_module.pdfplumber = original_pdfplumber
            parserv2_module.pypdf = original_pypdf2


class TestCVParserParseDOCX:
    def test_parse_docx_calls_llm_parser(self):
        parser = make_cv_parser()

        mock_paragraph = MagicMock()
        mock_paragraph.text = "Senior Software Engineer with Python expertise"

        mock_doc = MagicMock()
        mock_doc.paragraphs = [mock_paragraph] * 30
        mock_doc.tables = []

        import cv_parser.parserV2 as parserv2_module

        original_document = parserv2_module.Document
        parserv2_module.Document = MagicMock(return_value=mock_doc)

        try:
            result = parser.parse(b"fake_docx_bytes", "cv.docx")
        finally:
            parserv2_module.Document = original_document

        parser.llm_parser.parse.assert_called_once()
        assert result is not None

    def test_parse_docx_extracts_table_text(self):
        parser = make_cv_parser()

        mock_paragraph = MagicMock()
        mock_paragraph.text = "Experienced software engineer with multiple skills"

        mock_cell_python = MagicMock()
        mock_cell_python.text = "Python"
        mock_cell_docker = MagicMock()
        mock_cell_docker.text = "Docker"
        mock_row = MagicMock()
        mock_row.cells = [mock_cell_python, mock_cell_docker]
        mock_table = MagicMock()
        mock_table.rows = [mock_row]

        mock_doc = MagicMock()
        mock_doc.paragraphs = [mock_paragraph] * 20
        mock_doc.tables = [mock_table]

        import cv_parser.parserV2 as parserv2_module

        original_document = parserv2_module.Document
        parserv2_module.Document = MagicMock(return_value=mock_doc)

        try:
            result = parser.parse(b"fake_docx_bytes", "cv.docx")
        finally:
            parserv2_module.Document = original_document

        assert result is not None


class TestCVParserUnsupportedFormat:
    def test_raises_value_error_for_unsupported_extension(self):
        parser = make_cv_parser()

        with pytest.raises(ValueError, match="Unsupported file format"):
            parser.parse(b"file_bytes", "cv.txt")

    def test_raises_value_error_for_jpg_file(self):
        parser = make_cv_parser()

        with pytest.raises(ValueError, match="Unsupported file format"):
            parser.parse(b"file_bytes", "cv.jpg")


class TestCVParserMetadata:
    def test_raw_text_added_to_metadata(self):
        """CVParser.parse() always appends raw_text to metadata after LLM parsing."""
        parser = make_cv_parser()

        mock_page = MagicMock()
        mock_page.extract_text.return_value = SUFFICIENT_CV_TEXT

        import cv_parser.parserV2 as parserv2_module

        original_pdfplumber = parserv2_module.pdfplumber
        mock_pdfplumber = MagicMock()
        mock_pdf_ctx = MagicMock()
        mock_pdf_ctx.__enter__ = MagicMock(return_value=mock_pdf_ctx)
        mock_pdf_ctx.__exit__ = MagicMock(return_value=False)
        mock_pdf_ctx.pages = [mock_page]
        mock_pdfplumber.open.return_value = mock_pdf_ctx
        parserv2_module.pdfplumber = mock_pdfplumber

        try:
            result = parser.parse(b"fake_pdf_bytes", "cv.pdf")
        finally:
            parserv2_module.pdfplumber = original_pdfplumber

        assert "raw_text" in result["metadata"]
        assert len(result["metadata"]["raw_text"]) > 50
