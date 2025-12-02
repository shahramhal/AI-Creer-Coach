"""
CV Parser - Extract structured data from resume files
Uses spaCy for NER and custom regex patterns
"""

import io
import re
from typing import Dict, List, Optional
from datetime import datetime

# PDF parsing
import PyPDF2
import pdfplumber

# DOCX parsing
from docx import Document

# NLP
import spacy

# Text utilities
from email_validator import validate_email
import phonenumbers


class CVParser:
    """Main CV parser class"""
    
    def __init__(self):
        """Initialize parser with NLP models"""
        # Load spaCy model for NER
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except OSError:
            # Download model if not found
            import os
            os.system("python -m spacy download en_core_web_sm")
            self.nlp = spacy.load("en_core_web_sm")
    
    def parse(self, file_content: bytes, filename: str) -> Dict:
        """
        Main parsing function - routes to appropriate parser
        
        Args:
            file_content: Raw file bytes
            filename: Original filename
            
        Returns:
            Dictionary with parsed CV data
        """
        # Extract text based on file type
        if filename.endswith('.pdf'):
            text = self._extract_text_from_pdf(file_content)
        elif filename.endswith('.docx'):
            text = self._extract_text_from_docx(file_content)
        else:
            raise ValueError("Unsupported file format")
        
        # Parse extracted text
        parsed_data = self._parse_text(text)
        
        # Add metadata
        parsed_data['raw_text'] = text
        parsed_data['filename'] = filename
        parsed_data['parsed_at'] = datetime.utcnow().isoformat()
        
        return parsed_data
    
    def _extract_text_from_pdf(self, content: bytes) -> str:
        """Extract text from PDF file"""
        text = ""
        
        try:
            # Method 1: Try pdfplumber first (better for complex layouts)
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
        except Exception:
            # Method 2: Fallback to PyPDF2
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
        
        return self._clean_text(text)
    
    def _extract_text_from_docx(self, content: bytes) -> str:
        """Extract text from DOCX file"""
        doc = Document(io.BytesIO(content))
        
        # Extract text from paragraphs
        text = "\n".join([para.text for para in doc.paragraphs])
        
        # Extract text from tables
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    text += "\n" + cell.text
        
        return self._clean_text(text)
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize extracted text"""
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove special characters (keep letters, numbers, basic punctuation)
        text = re.sub(r'[^\w\s@.+\-,()]', '', text)
        
        return text.strip()
    
    def _parse_text(self, text: str) -> Dict:
        """
        Parse text and extract structured information
        
        Returns structured data: contact, skills, experience, education
        """
        # Process text with spaCy
        doc = self.nlp(text)
        
        return {
            'contact_info': self._extract_contact_info(text),
            'skills': self._extract_skills(doc),
            'experience': self._extract_experience(text),
            'education': self._extract_education(text),
            'summary': self._extract_summary(text)
        }
    
    def _extract_contact_info(self, text: str) -> Dict:
        """Extract contact information (email, phone, name)"""
        contact = {}
        
        # Extract email
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, text)
        if emails:
            contact['email'] = emails[0]
        
        # Extract phone number
        try:
            # Find phone numbers (supports international formats)
            for match in phonenumbers.PhoneNumberMatcher(text, "US"):
                contact['phone'] = phonenumbers.format_number(
                    match.number,
                    phonenumbers.PhoneNumberFormat.E164
                )
                break
        except Exception:
            pass
        
        # Extract name (usually first line or before email)
        lines = text.split('\n')
        if lines:
            # Assume name is in first 3 lines
            for line in lines[:3]:
                if len(line.split()) >= 2 and len(line) < 50:
                    contact['name'] = line.strip()
                    break
        
        return contact
    
    def _extract_skills(self, doc) -> List[str]:
        """Extract skills using NER and keyword matching"""
        skills = set()
        
        # Common technical skills (expand this list)
        skill_keywords = [
            'python', 'javascript', 'java', 'react', 'node.js', 'sql',
            'aws', 'docker', 'kubernetes', 'git', 'agile', 'scrum',
            'machine learning', 'data analysis', 'project management'
        ]
        
        text_lower = doc.text.lower()
        
        # Extract skills using keyword matching
        for skill in skill_keywords:
            if skill in text_lower:
                skills.add(skill.title())
        
        return list(skills)
    
    def _extract_experience(self, text: str) -> List[Dict]:
        """Extract work experience"""
        # This is a simplified version - you'll enhance this
        experience = []
        
        # Find experience section
        exp_pattern = r'experience|employment|work history'
        if re.search(exp_pattern, text, re.IGNORECASE):
            # Extract dates (year ranges like 2020-2023)
            date_pattern = r'(\d{4})\s*[-–]\s*(\d{4}|present)'
            dates = re.findall(date_pattern, text, re.IGNORECASE)
            
            for start, end in dates:
                experience.append({
                    'start_date': start,
                    'end_date': end if end.lower() != 'present' else 'Present',
                    'company': 'TBD',  # Will enhance this
                    'position': 'TBD'
                })
        
        return experience
    
    def _extract_education(self, text: str) -> List[Dict]:
        """Extract education information"""
        education = []
        
        # Common degree keywords
        degrees = ['bachelor', 'master', 'phd', 'diploma', 'b.sc', 'm.sc']
        
        for degree in degrees:
            if degree in text.lower():
                education.append({
                    'degree': degree.title(),
                    'field': 'TBD',  # Will enhance this
                    'institution': 'TBD'
                })
        
        return education
    
    def _extract_summary(self, text: str) -> Optional[str]:
        """Extract professional summary"""
        # Find summary section (usually at the beginning)
        summary_pattern = r'(summary|profile|objective|about)[\s:]+(.{50,300})'
        match = re.search(summary_pattern, text, re.IGNORECASE | re.DOTALL)
        
        if match:
            return match.group(2).strip()
        
        # If no explicit summary, return first 200 chars
        return text[:200] + "..." if len(text) > 200 else text 