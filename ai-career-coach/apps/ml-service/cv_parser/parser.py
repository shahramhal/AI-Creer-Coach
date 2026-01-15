"""
Refined Production CV Parser - Fixes for common issues
- Deduplication of entries
- Better skill filtering
- Proper bullet point handling
- Special character cleaning
"""

import io
import re
from typing import Dict, List, Optional, Tuple
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
    """
    Production CV parser with enhanced filtering and deduplication
    """
    
    # Section headers
    SECTION_HEADERS = {
        'experience': [
            'work experience', 'professional experience', 'employment history',
            'employment', 'career history', 'work history', 'other work experience',
            'relevant experience', 'professional background'
        ],
        'education': [
            'education', 'academic background', 'academic qualifications',
            'qualifications', 'educational background'
        ],
        'skills': [
            'skills', 'technical skills', 'core competencies', 'competencies',
            'skills and interests', 'technologies', 'tools and technologies'
        ],
        'projects': [
            'projects', 'personal projects', 'notable projects', 'key projects'
        ]
    }
    
    # Core technical skills only
    SKILL_KEYWORDS = [
        # Programming Languages
        'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'kotlin',
        'swift', 'rust', 'ruby', 'php', 'scala',
        
        # Web Technologies
        'html', 'css', 'react', 'angular', 'vue', 'node.js', 'express',
        'django', 'flask', 'spring', 'asp.net', 'laravel', 'tailwind',
        'bootstrap', 'jquery', 'next.js', 'react native',
        
        # Databases
        'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'sqlite',
        'oracle', 'cassandra', 'dynamodb', 'firebase',
        
        # DevOps & Cloud
        'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'jenkins',
        'gitlab', 'github actions', 'terraform', 'ansible',
        
        # Tools & Methodologies
        'git', 'agile', 'scrum', 'jira', 'linux', 'unix', 'ci/cd',
        
        # Data Science & ML
        'machine learning', 'deep learning', 'tensorflow', 'pytorch',
        'pandas', 'numpy', 'scikit-learn', 'data analysis', 'statistics',
        
        # Other
        'restful api', 'rest api', 'graphql', 'microservices', 'unit testing',
        'api', 'rest', 'json', 'xml'
    ]
    
    def __init__(self):
        """Initialize parser with NLP models"""
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except OSError:
            import os
            os.system("python -m spacy download en_core_web_sm")
            self.nlp = spacy.load("en_core_web_sm")
    
    def parse(self, file_content: bytes, filename: str) -> Dict:
        """Main parsing function"""
        if filename.endswith('.pdf'):
            text = self._extract_text_from_pdf(file_content)
        elif filename.endswith('.docx'):
            text = self._extract_text_from_docx(file_content)
        else:
            raise ValueError(f"Unsupported file format: {filename}")
        
        # Parse the text
        parsed_data = self._parse_text(text)
        
        # Add metadata
        parsed_data['raw_text'] = text
        parsed_data['filename'] = filename
        parsed_data['parsed_at'] = datetime.utcnow().isoformat()
        
        return parsed_data
    
    def _extract_text_from_pdf(self, content: bytes) -> str:
        """Extract text from PDF with better character handling"""
        text = ""
        
        try:
            # Use pdfplumber for better text extraction
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
        except Exception:
            # Fallback to PyPDF2
            try:
                pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
            except Exception:
                raise ValueError("Failed to extract text from PDF")
        
        return self._clean_text(text)
    
    def _extract_text_from_docx(self, content: bytes) -> str:
        """Extract text from DOCX file"""
        doc = Document(io.BytesIO(content))
        text_parts = []
        
        for para in doc.paragraphs:
            if para.text.strip():
                text_parts.append(para.text)
        
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    if cell.text.strip():
                        text_parts.append(cell.text)
        
        return self._clean_text('\n'.join(text_parts))
    
    def _clean_text(self, text: str) -> str:
        """
        Clean text with special character removal
        
        Removes:
        - Unicode bullet points (\\uf0b7)
        - Special spaces (\\uf020)
        - Other PDF artifacts
        """
        # Remove common PDF bullet characters
        text = re.sub(r'[\uf0b7\u2022\u2023\u25e6\u2043\u2219]', '•', text)
        
        # Remove special space characters
        text = re.sub(r'\uf020', ' ', text)
        
        # Remove other problematic Unicode characters (keep common ones)
        text = re.sub(r'[\uf000-\uf8ff]', '', text)
        
        # Normalize whitespace
        lines = text.split('\n')
        cleaned_lines = []
        
        for line in lines:
            # Replace multiple spaces with single space
            line = re.sub(r' +', ' ', line)
            line = line.strip()
            if line:
                cleaned_lines.append(line)
        
        return '\n'.join(cleaned_lines)
    
    def _parse_text(self, text: str) -> Dict:
        """Main parsing orchestrator"""
        doc = self.nlp(text)
        
        # Parse all sections
        experience = self._extract_experience(text)
        education = self._extract_education(text)
        skills = self._extract_skills(doc, text)
        
        # Deduplicate entries
        experience = self._deduplicate_experience(experience)
        skills = self._clean_and_deduplicate_skills(skills)
        
        return {
            'contact_info': self._extract_contact_info(text),
            'skills': skills,
            'experience': experience,
            'education': education,
            'summary': self._extract_summary(text)
        }
    
    def _deduplicate_experience(self, experiences: List[Dict]) -> List[Dict]:
        """
        Remove duplicate job entries
        Two jobs are duplicates if they have same title, company, and dates
        """
        seen = set()
        unique_experiences = []
        
        for exp in experiences:
            # Create unique key from title, company, and dates
            key = (
                exp.get('title', '').lower(),
                exp.get('company', '').lower(),
                exp.get('dates', '').lower()
            )
            
            if key not in seen:
                seen.add(key)
                unique_experiences.append(exp)
        
        return unique_experiences
    
    def _clean_and_deduplicate_skills(self, skills: List[str]) -> List[str]:
        """
        Clean and filter skills list
        
        Removes:
        - Section headers
        - Locations
        - Dates
        - Institution names
        - Duplicates
        """
        cleaned_skills = set()
        
        # Patterns to exclude
        exclude_patterns = [
            r'^\d{4}$',  # Years
            r'\d{4}\s*[–\-]\s*\d{4}',  # Date ranges
            r'[A-Z][a-z]+,\s+[A-Z]',  # Locations like "London, UK"
            r'University|College|School',  # Institutions
            r'INTERESTS|SKILLS|TOOLS|LANGUAGES',  # Section headers
            r'^Developed:',  # Prefixes
            r'Programming,',  # Course names
        ]
        
        # Length limits
        MIN_LENGTH = 2
        MAX_LENGTH = 25
        
        for skill in skills:
            # Remove special characters
            skill = re.sub(r'[\uf020]', '', skill).strip()
            
            # Skip empty or too short/long
            if not skill or len(skill) < MIN_LENGTH or len(skill) > MAX_LENGTH:
                continue
            
            # Skip if matches exclude patterns
            if any(re.search(pattern, skill, re.IGNORECASE) for pattern in exclude_patterns):
                continue
            
            # Skip if all uppercase and longer than 5 chars (likely header)
            if len(skill) > 5 and skill.isupper():
                continue
            
            # Normalize casing for common terms
            skill_lower = skill.lower()
            
            # Keep acronyms uppercase
            if skill_lower in ['sql', 'html', 'css', 'php', 'api', 'rest', 'json', 'xml']:
                skill = skill_lower.upper()
            # Special casing for specific terms
            elif skill_lower == 'mysql':
                skill = 'MySQL'
            elif skill_lower == 'postgresql':
                skill = 'PostgreSQL'
            elif skill_lower == 'mongodb':
                skill = 'MongoDB'
            elif skill_lower == 'javascript':
                skill = 'JavaScript'
            elif skill_lower == 'typescript':
                skill = 'TypeScript'
            # Title case for others
            elif ' ' not in skill:  # Single word
                skill = skill.capitalize()
            
            cleaned_skills.add(skill)
        
        return sorted(list(cleaned_skills))
    
    def _find_section(self, text: str, section_type: str) -> List[Tuple[str, str]]:
        """Find all sections of a given type"""
        sections = []
        headers = self.SECTION_HEADERS.get(section_type, [])
        
        for header in headers:
            # Pattern: Header followed by content until next major section
            pattern = rf'({re.escape(header)})\s*(.*?)(?=\n(?:[A-Z][A-Z\s]+)\n|$)'
            matches = re.finditer(pattern, text, re.IGNORECASE | re.DOTALL)
            
            for match in matches:
                section_name = match.group(1)
                section_content = match.group(2).strip()
                
                if section_content:
                    sections.append((section_name, section_content))
        
        return sections
    
    def _extract_contact_info(self, text: str) -> Dict:
        """Extract contact information"""
        contact = {}
        
        # Email
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b'
        emails = re.findall(email_pattern, text)
        if emails:
            contact['email'] = emails[0]
        
        # Phone
        try:
            for region in ['GB', 'US', 'None']:
                for match in phonenumbers.PhoneNumberMatcher(text, region):
                    contact['phone'] = phonenumbers.format_number(
                        match.number,
                        phonenumbers.PhoneNumberFormat.INTERNATIONAL
                    )
                    break
                if 'phone' in contact:
                    break
        except Exception:
            phone_pattern = r'[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{3,4}[-\s\.]?[0-9]{3,4}'
            phones = re.findall(phone_pattern, text)
            if phones:
                contact['phone'] = phones[0]
        
        # Name (first suitable line)
        lines = text.split('\n')
        for line in lines[:10]:
            line = line.strip()
            if not line:
                continue
            
            words = line.split()
            if 2 <= len(words) <= 4 and len(line) < 60:
                if not re.search(r'[@|•]', line):
                    contact['name'] = line
                    break
        
        # Location (pattern: City, Country)
        location_pattern = r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*,\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)'
        locations = re.findall(location_pattern, text[:500])
        if locations:
            contact['location'] = f"{locations[0][0]}, {locations[0][1]}"
        
        return contact
    
    def _extract_skills(self, doc, text: str) -> List[str]:
        """
        Extract skills using keyword matching only
        (Most reliable for technical skills)
        """
        skills = set()
        text_lower = text.lower()
        
        # Only use keyword matching for reliability
        for skill in self.SKILL_KEYWORDS:
            if skill.lower() in text_lower:
                # Preserve casing for acronyms
                if skill.upper() in ['SQL', 'HTML', 'CSS', 'PHP', 'API', 'REST', 'JSON', 'XML']:
                    skills.add(skill.upper())
                else:
                    skills.add(skill.title())
        
        return list(skills)
    
    def _extract_experience(self, text: str) -> List[Dict]:
        """Extract all work experience"""
        all_experience = []
        exp_sections = self._find_section(text, 'experience')
        
        for section_name, section_content in exp_sections:
            jobs = self._parse_experience_section(section_content)
            all_experience.extend(jobs)
        
        return all_experience
    
    def _parse_experience_section(self, section_text: str) -> List[Dict]:
        """Parse jobs from experience section"""
        jobs = []
        entries = re.split(r'\n\s*\n', section_text)
        
        for entry in entries:
            if not entry.strip():
                continue
            
            job_data = self._parse_job_entry(entry)
            if job_data:
                jobs.append(job_data)
        
        return jobs
    
    def _parse_job_entry(self, entry: str) -> Optional[Dict]:
        """
        Parse single job entry with improved bullet point handling
        """
        lines = [l.strip() for l in entry.split('\n') if l.strip()]
        
        if len(lines) < 2:
            return None
        
        # Line 1: Job title
        title_line = lines[0]
        
        # Check for "at" pattern
        if ' at ' in title_line.lower():
            parts = re.split(r'\s+at\s+', title_line, maxsplit=1, flags=re.IGNORECASE)
            title = parts[0].strip()
            company = parts[1].strip() if len(parts) > 1 else 'Unknown'
        else:
            title = re.sub(r'\s*\([^)]*\)', '', title_line).strip()
            company = 'Unknown'
        
        # Line 2: Company/location/dates
        info_line = lines[1] if len(lines) > 1 else ''
        
        # Extract dates
        date_patterns = [
            r'([A-Za-z]+\s+\d{4})\s*[–\-]\s*([A-Za-z]+\s+\d{4}|Present|Current)',
            r'(\d{4})\s*[–\-]\s*(\d{4}|Present|Current)',
            r'(\d{1,2}/\d{4})\s*[–\-]\s*(\d{1,2}/\d{4}|Present)',
        ]
        
        dates = 'Unknown'
        for pattern in date_patterns:
            date_match = re.search(pattern, info_line, re.IGNORECASE)
            if date_match:
                dates = f"{date_match.group(1)} - {date_match.group(2)}"
                info_line = info_line[:date_match.start()].strip()
                break
        
        # Parse company and location
        location = 'Unknown'
        if company == 'Unknown':
            if '|' in info_line:
                parts = [p.strip() for p in info_line.split('|')]
                company = parts[0] if len(parts) > 0 else 'Unknown'
                location = parts[1] if len(parts) > 1 else 'Unknown'
            else:
                parts = [p.strip() for p in info_line.split(',')]
                company = parts[0] if len(parts) > 0 else 'Unknown'
                location = parts[1] if len(parts) > 1 else 'Unknown'
        
        # Extract responsibilities with better bullet handling
        responsibilities = []
        current_resp = ""
        
        for line in lines[2:]:
            # Check if line starts with bullet
            if line.startswith('•'):
                # Save previous responsibility if exists
                if current_resp:
                    responsibilities.append(current_resp.strip())
                
                # Start new responsibility
                current_resp = line[1:].strip()  # Remove bullet
            else:
                # Continuation of previous line
                if current_resp:
                    current_resp += " " + line
                else:
                    # Standalone line without bullet
                    if line and not re.search(r'\d{4}', line):
                        responsibilities.append(line)
        
        # Add last responsibility
        if current_resp:
            responsibilities.append(current_resp.strip())
        
        return {
            'title': title,
            'company': company,
            'location': location,
            'dates': dates,
            'responsibilities': responsibilities[:5]  # Top 5
        }
    
    def _extract_education(self, text: str) -> List[Dict]:
        """Extract education"""
        education = []
        edu_sections = self._find_section(text, 'education')
        
        for section_name, section_content in edu_sections:
            entries = self._parse_education_section(section_content)
            education.extend(entries)
        
        return education
    
    def _parse_education_section(self, section_text: str) -> List[Dict]:
        """Parse education entries"""
        entries = []
        lines = section_text.split('\n')
        
        degree_keywords = [
            'BSc', 'B.Sc', 'Bachelor', 'MSc', 'M.Sc', 'Master',
            'PhD', 'Ph.D', 'Doctorate', 'Diploma', 'Certificate',
            'Year One', 'Foundation'
        ]
        
        for i, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue
            
            found_degree = None
            for degree in degree_keywords:
                if degree.lower() in line.lower():
                    found_degree = degree
                    break
            
            if not found_degree:
                continue
            
            edu_data = self._parse_education_entry(line, lines[i+1:i+3] if i+1 < len(lines) else [])
            if edu_data:
                entries.append(edu_data)
        
        return entries
    
    def _parse_education_entry(self, main_line: str, next_lines: List[str]) -> Optional[Dict]:
        """Parse single education entry"""
        if '|' in main_line:
            parts = [p.strip() for p in main_line.split('|')]
            
            degree_info = parts[0]
            field_match = re.search(r'(?:in|of)\s+(.+)', degree_info, re.IGNORECASE)
            
            degree = re.split(r'\s+in\s+|\s+of\s+', degree_info, maxsplit=1, flags=re.IGNORECASE)[0]
            field = field_match.group(1).strip() if field_match else 'Not specified'
            
            institution = parts[1] if len(parts) > 1 else 'Unknown'
            location = parts[2] if len(parts) > 2 else 'Unknown'
            dates = parts[3] if len(parts) > 3 else 'Unknown'
        else:
            field_match = re.search(r'(?:in|of)\s+(.+?)(?:\s*\||$)', main_line, re.IGNORECASE)
            
            degree = re.split(r'\s+in\s+|\s+of\s+', main_line, maxsplit=1, flags=re.IGNORECASE)[0].strip()
            field = field_match.group(1).strip() if field_match else 'Not specified'
            
            institution = 'Unknown'
            location = 'Unknown'
            dates = 'Unknown'
            
            for next_line in next_lines:
                next_line = next_line.strip()
                if not next_line:
                    continue
                
                date_pattern = r'([A-Za-z]+\s+\d{4}|^\d{4})\s*[–\-]\s*([A-Za-z]+\s+\d{4}|Present|Expected|\d{4})'
                if re.search(date_pattern, next_line):
                    if '|' in next_line:
                        parts = next_line.split('|')
                        location = parts[0].strip()
                        dates = parts[1].strip()
                    else:
                        dates = next_line
                elif institution == 'Unknown':
                    institution = next_line
        
        return {
            'degree': degree,
            'field': field,
            'institution': institution,
            'location': location,
            'dates': dates
        }
    
    def _extract_summary(self, text: str) -> Optional[str]:
        """
        Extract professional summary
        Looks for explicit summary section, not project descriptions
        """
        summary_headers = ['professional summary', 'summary', 'profile', 'objective', 'about me']
        
        for header in summary_headers:
            pattern = rf'{header}\s*:?\s*(.{{50,400}}?)(?:\n\n|WORK|EDUCATION|SKILLS|PROJECTS|$)'
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if match:
                summary = match.group(1).strip()
                # Ensure it's not picking up projects - check first 100 chars
                summary_start = summary[:100].lower()
                # Exclude if it contains project indicators
                if not any(indicator in summary_start for indicator in ['project', 'built', 'implemented', 'developed', '•', 'o ']):
                    return summary
        
        # No explicit summary found
        return None