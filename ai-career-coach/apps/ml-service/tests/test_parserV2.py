"""
Tests for cv_parser/parserV2.py - CVParser class
"""
import io
import pytest
from unittest.mock import MagicMock, patch


def make_pdf_bytes(text: str = "John Doe\nSoftware Engineer\nPython, JavaScript\nExperience at Acme Corp 2020-2024") -> bytes:
    """Create minimal valid PDF bytes using pdfplumber/pypdf mocking - returns raw bytes."""
    return b"%PDF-1.4 fake content " + text.encode()


def make_docx_bytes() -> bytes:
    """Create minimal DOCX bytes (just needs to be parseable by python-docx mock)."""
    return b"PK fake docx content"


class TestCVParserInit:
    def test_initializes_with_api_key(self):
        with patch('cv_parser.parserV2.LLMCVParser') as mock_llm:
            from cv_parser.parserV2 import CVParser
            parser = CVParser(anthropic_api_key='test-key')
            mock_llm.assert_called_once_with(api_key='test-key')

    def test_stores_llm_parser_instance(self):
        mock_instance = MagicMock()
        with patch('cv_parser.parserV2.LLMCVParser', return_value=mock_instance):
            from cv_parser.parserV2 import CVParser
            parser = CVParser(anthropic_api_key='test-key')
            assert parser.llm_parser is mock_instance


class TestCVParserParse:
    def _make_parser(self):
        mock_llm_instance = MagicMock()
        mock_llm_instance.parse.return_value = {
            'contact_info': {'name': 'Jane Doe'},
            'experience': [],
            'education': [],
            'skills': ['Python'],
            'metadata': {},
            'confidence': {'scores': {'overall': 0.9}, 'quality': 'high'},
        }
        with patch('cv_parser.parserV2.LLMCVParser', return_value=mock_llm_instance):
            from cv_parser.parserV2 import CVParser
            parser = CVParser(anthropic_api_key='key')
        parser.llm_parser = mock_llm_instance
        return parser, mock_llm_instance

    def test_raises_for_unsupported_file_format(self):
        parser, _ = self._make_parser()
        with pytest.raises(ValueError, match='Unsupported file format'):
            parser.parse(b'some bytes', 'resume.txt')

    def test_raises_when_extracted_text_is_too_short(self):
        parser, _ = self._make_parser()
        with patch.object(parser, '_extract_text_from_pdf', return_value='short'):
            with pytest.raises(ValueError, match='Insufficient text extracted'):
                parser.parse(b'pdf bytes', 'resume.pdf')

    def test_calls_llm_parser_with_extracted_text(self):
        parser, mock_llm = self._make_parser()
        long_text = 'A' * 200
        with patch.object(parser, '_extract_text_from_pdf', return_value=long_text):
            mock_llm.parse.return_value = {
                'contact_info': {}, 'experience': [], 'education': [],
                'skills': [], 'metadata': {}, 'confidence': {}
            }
            parser.parse(b'pdf bytes', 'resume.pdf')
        mock_llm.parse.assert_called_once_with(long_text, 'resume.pdf')

    def test_adds_raw_text_to_metadata(self):
        parser, mock_llm = self._make_parser()
        long_text = 'B' * 200
        with patch.object(parser, '_extract_text_from_pdf', return_value=long_text):
            mock_llm.parse.return_value = {
                'contact_info': {}, 'experience': [], 'education': [],
                'skills': [], 'metadata': {}, 'confidence': {}
            }
            result = parser.parse(b'pdf bytes', 'resume.pdf')
        assert result['metadata']['raw_text'] == long_text

    def test_routes_pdf_to_pdf_extractor(self):
        parser, mock_llm = self._make_parser()
        with patch.object(parser, '_extract_text_from_pdf', return_value='X' * 100) as mock_pdf, \
             patch.object(parser, '_extract_text_from_docx') as mock_docx:
            mock_llm.parse.return_value = {
                'contact_info': {}, 'experience': [], 'education': [],
                'skills': [], 'metadata': {}, 'confidence': {}
            }
            parser.parse(b'pdf bytes', 'resume.pdf')
        mock_pdf.assert_called_once()
        mock_docx.assert_not_called()

    def test_routes_docx_to_docx_extractor(self):
        parser, mock_llm = self._make_parser()
        with patch.object(parser, '_extract_text_from_docx', return_value='Y' * 100) as mock_docx, \
             patch.object(parser, '_extract_text_from_pdf') as mock_pdf:
            mock_llm.parse.return_value = {
                'contact_info': {}, 'experience': [], 'education': [],
                'skills': [], 'metadata': {}, 'confidence': {}
            }
            parser.parse(b'docx bytes', 'resume.docx')
        mock_docx.assert_called_once()
        mock_pdf.assert_not_called()


class TestExtractTextFromPDF:
    def _make_parser(self):
        with patch('cv_parser.parserV2.LLMCVParser'):
            from cv_parser.parserV2 import CVParser
            return CVParser(anthropic_api_key='key')

    def test_extracts_text_via_pdfplumber(self):
        parser = self._make_parser()
        mock_page = MagicMock()
        mock_page.extract_text.return_value = 'Page one text'
        mock_pdf = MagicMock()
        mock_pdf.pages = [mock_page]
        mock_pdf.__enter__ = MagicMock(return_value=mock_pdf)
        mock_pdf.__exit__ = MagicMock(return_value=False)

        with patch('cv_parser.parserV2.pdfplumber') as mock_plumber:
            mock_plumber.open.return_value = mock_pdf
            result = parser._extract_text_from_pdf(b'fake pdf')

        assert 'Page one text' in result

    def test_falls_back_to_pypdf_on_pdfplumber_failure(self):
        parser = self._make_parser()
        mock_page = MagicMock()
        mock_page.extract_text.return_value = 'Fallback text'
        mock_reader = MagicMock()
        mock_reader.pages = [mock_page]

        with patch('cv_parser.parserV2.pdfplumber') as mock_plumber, \
             patch('cv_parser.parserV2.pypdf.PdfReader', return_value=mock_reader):
            mock_plumber.open.side_effect = Exception('pdfplumber error')
            result = parser._extract_text_from_pdf(b'fake pdf')

        assert 'Fallback text' in result

    def test_raises_when_both_extractors_fail(self):
        parser = self._make_parser()

        with patch('cv_parser.parserV2.pdfplumber') as mock_plumber, \
             patch('cv_parser.parserV2.pypdf.PdfReader', side_effect=Exception('pypdf fail')):
            mock_plumber.open.side_effect = Exception('pdfplumber fail')
            with pytest.raises(ValueError, match='Failed to extract PDF text'):
                parser._extract_text_from_pdf(b'bad pdf')

    def test_skips_none_pages_from_pdfplumber(self):
        parser = self._make_parser()
        page_with_text = MagicMock()
        page_with_text.extract_text.return_value = 'Real text'
        page_without_text = MagicMock()
        page_without_text.extract_text.return_value = None
        mock_pdf = MagicMock()
        mock_pdf.pages = [page_without_text, page_with_text]
        mock_pdf.__enter__ = MagicMock(return_value=mock_pdf)
        mock_pdf.__exit__ = MagicMock(return_value=False)

        with patch('cv_parser.parserV2.pdfplumber') as mock_plumber:
            mock_plumber.open.return_value = mock_pdf
            result = parser._extract_text_from_pdf(b'pdf')

        assert 'Real text' in result


class TestExtractTextFromDOCX:
    def _make_parser(self):
        with patch('cv_parser.parserV2.LLMCVParser'):
            from cv_parser.parserV2 import CVParser
            return CVParser(anthropic_api_key='key')

    def test_extracts_paragraphs(self):
        parser = self._make_parser()
        para1 = MagicMock()
        para1.text = 'First paragraph'
        para2 = MagicMock()
        para2.text = 'Second paragraph'
        mock_doc = MagicMock()
        mock_doc.paragraphs = [para1, para2]
        mock_doc.tables = []

        with patch('cv_parser.parserV2.Document', return_value=mock_doc):
            result = parser._extract_text_from_docx(b'docx bytes')

        assert 'First paragraph' in result
        assert 'Second paragraph' in result

    def test_skips_empty_paragraphs(self):
        parser = self._make_parser()
        empty_para = MagicMock()
        empty_para.text = '   '
        real_para = MagicMock()
        real_para.text = 'Content'
        mock_doc = MagicMock()
        mock_doc.paragraphs = [empty_para, real_para]
        mock_doc.tables = []

        with patch('cv_parser.parserV2.Document', return_value=mock_doc):
            result = parser._extract_text_from_docx(b'docx bytes')

        assert 'Content' in result
        assert '   ' not in result

    def test_extracts_table_cell_text(self):
        parser = self._make_parser()
        cell1 = MagicMock()
        cell1.text = 'Skill'
        cell2 = MagicMock()
        cell2.text = 'Python'
        row = MagicMock()
        row.cells = [cell1, cell2]
        table = MagicMock()
        table.rows = [row]
        mock_doc = MagicMock()
        mock_doc.paragraphs = []
        mock_doc.tables = [table]

        with patch('cv_parser.parserV2.Document', return_value=mock_doc):
            result = parser._extract_text_from_docx(b'docx bytes')

        assert 'Skill' in result
        assert 'Python' in result

    def test_returns_empty_string_for_empty_document(self):
        parser = self._make_parser()
        mock_doc = MagicMock()
        mock_doc.paragraphs = []
        mock_doc.tables = []

        with patch('cv_parser.parserV2.Document', return_value=mock_doc):
            result = parser._extract_text_from_docx(b'docx bytes')

        assert result == ''
