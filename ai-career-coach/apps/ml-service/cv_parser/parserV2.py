"""
Unified CV Parser - Combines PDF/DOCX extraction with LLM parsing
Production-ready for Django integration
"""

import io
from typing import Dict
from cv_parser.llm_parser import LLMCVParser, estimate_cost

# PDF/DOCX extraction libraries
import pypdf
import pdfplumber
from docx import Document


class CVParser:
    """
    Complete CV parser pipeline:
    1. Extract text from PDF/DOCX
    2. Parse with LLM (Claude Sonnet 4)
    3. Return structured data with confidence scores
    """
    
    def __init__(self, anthropic_api_key: str):
        """Initialize with Anthropic API key"""
        self.llm_parser = LLMCVParser(api_key=anthropic_api_key)
    
    def parse(self, file_content: bytes, filename: str) -> Dict:
        """
        Main entry point - parse CV file
        
        Args:
            file_content: Raw file bytes
            filename: Filename (determines type: .pdf or .docx)
            
        Returns:
            Structured CV data
        """
        # Step 1: Extract text
        if filename.endswith('.pdf'):
            text = self._extract_text_from_pdf(file_content)
        elif filename.endswith('.docx'):
            text = self._extract_text_from_docx(file_content)
        else:
            raise ValueError(f"Unsupported file format: {filename}")
        
        # Validate text extraction
        if len(text.strip()) < 50:
            raise ValueError(f"Insufficient text extracted ({len(text)} chars). File may be corrupted or scanned.")
        
        # Step 2: Parse with LLM
        result = self.llm_parser.parse(text, filename)
        
        # Step 3: Add raw text to metadata
        result['metadata']['raw_text'] = text
        
        return result
    
    def _extract_text_from_pdf(self, content: bytes) -> str:
        """Extract text from PDF using pdfplumber (best quality)"""
        text = ""
        
        try:
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
        except Exception as e:
            # Fallback to pypdf
            try:
                pdf_reader = pypdf.PdfReader(io.BytesIO(content))
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
            except Exception as e2:
                raise ValueError(f"Failed to extract PDF text: {e2}")
        
        return text.strip()
    
    def _extract_text_from_docx(self, content: bytes) -> str:
        """Extract text from DOCX"""
        doc = Document(io.BytesIO(content))
        parts = []
        
        # Extract paragraphs
        for para in doc.paragraphs:
            if para.text.strip():
                parts.append(para.text)
        
        # Extract tables
        for table in doc.tables:
            for row in table.rows:
                row_text = ' | '.join(cell.text.strip() for cell in row.cells if cell.text.strip())
                if row_text:
                    parts.append(row_text)
        
        return '\n'.join(parts).strip()


# DJANGO INTEGRATION EXAMPLE

def django_parse_cv_view(request):
    """
    Example Django view for CV parsing
    
    Usage in Django:
        from unified_cv_parser import django_parse_cv_view
        
        # In urls.py
        path('api/ml/parse-cv', django_parse_cv_view)
    """
    import json
    from django.http import JsonResponse
    from django.views.decorators.csrf import csrf_exempt
    import os
    
    @csrf_exempt
    def view(request):
        if request.method != 'POST':
            return JsonResponse({'error': 'POST required'}, status=405)
        
        # Get uploaded file
        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return JsonResponse({'error': 'No file uploaded'}, status=400)
        
        try:
            # Initialize parser
            api_key = os.environ.get('ANTHROPIC_API_KEY')
            parser = CVParser(anthropic_api_key=api_key)
            
            # Parse CV
            file_content = uploaded_file.read()
            filename = uploaded_file.name
            
            result = parser.parse(file_content, filename)
            
            return JsonResponse({
                'success': True,
                'data': result,
                'error': None
            })
            
        except Exception as e:
            return JsonResponse({
                'success': False,
                'data': None,
                'error': str(e)
            }, status=500)
    
    return view


# TESTING FUNCTION

def test_with_file(filepath: str):
    """Test parser with actual PDF/DOCX file"""
    
    print("UNIFIED CV PARSER TEST")
    
    
    import os
    
    # Check API key
    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        print("\n❌ ERROR: ANTHROPIC_API_KEY environment variable not set")
        print("   Get your API key at: https://console.anthropic.com/")
        print("   Then set it: export ANTHROPIC_API_KEY='your-key-here'")
        return
    
    # Read file
    print(f"\n📄 Reading file: {filepath}")
    with open(filepath, 'rb') as f:
        file_content = f.read()
    
    filename = filepath.split('/')[-1]
    
    # Initialize parser
    parser = CVParser(anthropic_api_key=api_key)
    
    # Parse
    print(f"\n🔄 Parsing CV with Claude Sonnet 4...")
    result = parser.parse(file_content, filename)
    
    # Display results
    print(f"\n SUCCESS!")
    print(f"\n📋 CONTACT INFO:")
    contact = result['contact_info']
    print(f"   Name:     {contact.get('name', 'N/A')}")
    print(f"   Email:    {contact.get('email', 'N/A')}")
    print(f"   Phone:    {contact.get('phone', 'N/A')}")
    print(f"   LinkedIn: {contact.get('linkedin', 'N/A')}")
    print(f"   Location: {contact.get('location', 'N/A')}")
    
    print(f"\n💼 EXPERIENCE: {len(result['experience'])} jobs")
    for i, exp in enumerate(result['experience'][:2], 1):
        print(f"   {i}. {exp['title']} at {exp['company']}")
        print(f"      {exp.get('dates', 'N/A')} | {exp.get('location', 'N/A')}")
    
    print(f"\n🎓 EDUCATION: {len(result['education'])} degrees")
    for i, edu in enumerate(result['education'], 1):
        print(f"   {i}. {edu.get('degree', 'N/A')} in {edu.get('field', 'N/A')}")
        print(f"      {edu.get('institution', 'N/A')} | {edu.get('dates', 'N/A')}")
    
    print(f"\n🛠️ SKILLS: {len(result['skills'])} skills")
    print(f"   {', '.join(result['skills'][:15])}")
    if len(result['skills']) > 15:
        print(f"   ... and {len(result['skills']) - 15} more")
    
    print(f"\n🚀 PROJECTS: {len(result['projects'])} projects")
    for i, proj in enumerate(result['projects'][:3], 1):
        print(f"   {i}. {proj['name']}")
        if proj.get('technologies'):
            print(f"      Tech: {', '.join(proj['technologies'][:5])}")
    
    print(f"\n📜 CERTIFICATIONS: {len(result['certifications'])} certs")
    for i, cert in enumerate(result['certifications'][:3], 1):
        print(f"   {i}. {cert['name']}")
        print(f"      {cert.get('issuer', 'N/A')} | {cert.get('date', 'N/A')}")
    
    print(f"\n🎯 CONFIDENCE SCORES:")
    scores = result['confidence']['scores']
    print(f"   Overall:        {scores['overall']:.2f} ({result['confidence']['quality']})")
    print(f"   Contact:        {scores['contact']:.2f}")
    print(f"   Experience:     {scores['experience']:.2f}")
    print(f"   Education:      {scores['education']:.2f}")
    print(f"   Skills:         {scores['skills']:.2f}")
    print(f"   Projects:       {scores['projects']:.2f}")
    print(f"   Certifications: {scores['certifications']:.2f}")
    
    # Cost estimate
    cost = estimate_cost(result['metadata']['raw_text'])
    print(f"\n💰 COST ESTIMATE:")
    print(f"   This CV:     ${cost['estimated_cost_usd']}")
    print(f"   Per 1000 CVs: ${cost['cost_per_1000_cvs']}")
    
    print(f"\n" + "=" * 70)
    
    return result


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        test_with_file(sys.argv[1])
    else:
        print("Usage: python unified_cv_parser.py <path/to/cv.pdf>")
        print("Example: python unified_cv_parser.py test_2.pdf")