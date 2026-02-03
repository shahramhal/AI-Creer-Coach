"""
 CV Parser 
Handles multiple CV formats, generic skills extraction, and flexible parsing
"""

import io
import re
from typing import Dict, List, Optional, Set
from datetime import datetime
from collections import Counter

# PDF parsing
import PyPDF2
import pdfplumber

# DOCX parsing
from docx import Document

# NLP
import spacy

# Text utilities
from email_validator import validate_email, EmailNotValidError
import phonenumbers


class CVParser:
    """
    Multi-format CV parser with intelligent extraction
    Works with both tech and non-tech CVs
    """
    
    # Common section headers (case-insensitive matching)
    SECTION_PATTERNS = {
        'experience': r'(?:work|professional|employment|career)\s*(?:experience|history|background)',
        'education': r'education(?:al)?(?:\s+(?:background|qualifications?))?',
        'skills': r'(?:skills|competencies|core\s+competencies|technical\s+skills)',
        'summary': r'(?:professional\s+)?(?:summary|profile|objective|career\s+focus)',
    }
    
    # Common soft skills and domain terms (complement NER extraction)
    COMMON_SKILLS = {
        # Technical
        'python', 'java', 'javascript', 'typescript', 'sql', 'react', 'node.js',
        'aws', 'docker', 'kubernetes', 'git', 'mongodb', 'postgresql',
        
        # Business/Management
        'project management', 'team leadership', 'strategic planning',
        'business development', 'client relations', 'budget management',
        'performance management', 'operations management',
        
        # Communication
        'communication', 'presentation', 'negotiation', 'collaboration',
        'interpersonal skills', 'customer service', 'public speaking',
        
        # Analytical
        'data analysis', 'problem solving', 'research', 'critical thinking',
        'analytical', 'troubleshooting',
        
        # Tools
        'microsoft office', 'excel', 'powerpoint', 'word', 'outlook',
        'salesforce', 'jira', 'confluence',
    }
    
    def __init__(self):
        """Initialize parser with NLP model"""
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except OSError:
            print("Downloading spaCy model...")
            import os
            os.system("python -m spacy download en_core_web_sm")
            self.nlp = spacy.load("en_core_web_sm")
    
    def parse(self, file_content: bytes, filename: str) -> Dict:
        """
        Main parsing function
        
        Args:
            file_content: Raw file bytes
            filename: Name of file (used to determine type)
            
        Returns:
            Dictionary with parsed CV data
        """
        # Extract text based on file type
        if filename.endswith('.pdf'):
            text = self._extract_text_from_pdf(file_content)
        elif filename.endswith('.docx'):
            text = self._extract_text_from_docx(file_content)
        else:
            raise ValueError(f"Unsupported file format: {filename}")
        
        # Parse the text
        parsed_data = self._parse_text(text)
        
        # Add metadata
        parsed_data.update({
            'raw_text': text,
            'filename': filename,
            'parsed_at': datetime.utcnow().isoformat()
        })
        
        return parsed_data
    

    # TEXT EXTRACTION

    
    def _extract_text_from_pdf(self, content: bytes) -> str:
        """Extract text from PDF, try multiple methods"""
        text = ""
        
        # Primary: pdfplumber (best for formatted text)
        try:
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
        except Exception as e:
            print(f"pdfplumber failed: {e}")
            
            # Fallback: PyPDF2
            try:
                pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
            except Exception as e2:
                raise ValueError(f"Failed to extract PDF text: {e2}")
        
        return self._clean_text(text)
    
    def _extract_text_from_docx(self, content: bytes) -> str:
        """Extract text from DOCX including tables"""
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
        
        return self._clean_text('\n'.join(parts))
    
    def _clean_text(self, text: str) -> str:
        """
        Clean and normalize text
        - Remove PDF artifacts
        - Normalize whitespace
        - Standardize bullet points
        """
        # Normalize bullets to standard •
        text = re.sub(r'[\uf0b7\u2022\u2023\u25e6\u2043\u2219\uf020]', '•', text)
        
        # Remove problematic Unicode (private use area)
        text = re.sub(r'[\uf000-\uf8ff]', '', text)
        
        # Normalize whitespace
        lines = []
        for line in text.split('\n'):
            line = re.sub(r'\s+', ' ', line).strip()
            if line:
                lines.append(line)
        
        return '\n'.join(lines)
    

    # MAIN PARSING ORCHESTRATOR

    
    def _parse_text(self, text: str) -> Dict:
        """Parse CV text into structured data"""
        
        # Run spaCy NLP
        doc = self.nlp(text)
        
        # Extract all sections
        contact_info = self._extract_contact_info(text, doc)
        summary = self._extract_summary(text)
        skills = self._extract_skills(text, doc)
        experience = self._extract_experience(text)
        education = self._extract_education(text)
        
        return {
            'contact_info': contact_info,
            'summary': summary,
            'skills': skills,
            'experience': experience,
            'education': education,
        }
    

    # CONTACT INFO EXTRACTION

    
    def _extract_contact_info(self, text: str, doc) -> Dict:
        """
        Extract contact information using multiple methods
        - Email: regex patterns
        - Phone: phonenumbers library
        - LinkedIn: URL patterns
        - Name: spaCy NER
        """
        contact = {
            'email': None,
            'phone': None,
            'linkedin': None,
            'name': None
        }
        
        # Extract email
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        email_matches = re.findall(email_pattern, text)
        
        for email in email_matches:
            try:
                # Validate email
                validate_email(email)
                contact['email'] = email
                break
            except EmailNotValidError:
                continue
        
        # Extract phone (look in first 1000 chars for better coverage)
        # Try UK region specifically first
        try:
            for match in phonenumbers.PhoneNumberMatcher(text[:1000], "GB"):
                contact['phone'] = phonenumbers.format_number(
                    match.number, 
                    phonenumbers.PhoneNumberFormat.INTERNATIONAL
                )
                break
        except Exception:
            pass
        
        # If not found, try generic region
        if not contact['phone']:
            try:
                for match in phonenumbers.PhoneNumberMatcher(text[:1000], None):
                    contact['phone'] = phonenumbers.format_number(
                        match.number, 
                        phonenumbers.PhoneNumberFormat.INTERNATIONAL
                    )
                    break
            except Exception:
                pass
        
        # Improved fallback regex for UK numbers
        if not contact['phone']:
            # UK mobile: 07XXX XXXXXX or +447XXX XXXXXX
            uk_mobile = r'\b(?:\+44\s?7|\(?07)\d{3}\s?\d{6}\b'
            # UK landline: 020 XXXX XXXX or +4420 XXXX XXXX  
            uk_landline = r'\b(?:\+44\s?[1-9]|\(?0[1-9])\d{1,4}\s?\d{6,7}\b'
            # Generic international
            generic = r'[\+]?\d{1,4}[\s\-\.]?\(?\d{1,4}\)?[\s\-\.]?\d{1,4}[\s\-\.]?\d{1,9}'
            
            for pattern in [uk_mobile, uk_landline, generic]:
                phone_match = re.search(pattern, text[:1000])
                if phone_match:
                    # Clean up the match
                    phone = phone_match.group().replace(' ', '').replace('(', '').replace(')', '')
                    contact['phone'] = phone
                    break
        
        # Extract LinkedIn
        linkedin_pattern = r'linkedin\.com/in/[\w-]+'
        linkedin_match = re.search(linkedin_pattern, text.lower())
        if linkedin_match:
            contact['linkedin'] = linkedin_match.group()
        
        # Extract name (look for PERSON entities in first 300 chars)
        first_section = text[:300]
        doc_first = self.nlp(first_section)
        
        for ent in doc_first.ents:
            if ent.label_ == 'PERSON' and len(ent.text.split()) >= 2:
                contact['name'] = ent.text
                break
        
        # Fallback - try to extract name from first line
        if not contact['name']:
            first_line = text.split('\n')[0].strip()
            # Check if first line looks like a name (2-4 words, mostly letters)
            words = first_line.split()
            if 2 <= len(words) <= 4:
                # Check if it's mostly alphabetic (allow some punctuation)
                clean_words = [w.replace(',', '').replace('.', '') for w in words]
                if all(len(w) > 1 and w.isalpha() for w in clean_words):
                    contact['name'] = first_line
        
        return contact
    

    # SUMMARY EXTRACTION

    
    def _extract_summary(self, text: str) -> Optional[str]:
        """Extract professional summary section"""
        
        # Look for summary section
        pattern = self.SECTION_PATTERNS['summary']
        match = re.search(
            rf'({pattern})\s*:?\s*(.{{50,800}}?)(?=\n\s*(?:{"|".join(self.SECTION_PATTERNS.values())})|$)',
            text,
            re.IGNORECASE | re.DOTALL
        )
        
        if match:
            summary = match.group(2).strip()
            # Clean up
            summary = re.sub(r'\s+', ' ', summary)
            return summary[:500]  # Max 500 chars
        
        return None
    

    # SKILLS EXTRACTION

    
    def _extract_skills(self, text: str, doc) -> List[str]:
        """
        Extract skills using multiple methods:
        1. Skills section extraction (PRIMARY)
        2. Common skill keywords matching
        """
        skills = set()
        
        # Method 1: Extract from skills section (PRIMARY SOURCE)
        skills_sections = self._find_section(text, 'skills')
        if skills_sections:
            for section_text in skills_sections:
                section_skills = self._extract_skills_from_section(section_text)
                skills.update(section_skills)
        
        # Method 2: Match common skill keywords from COMMON_SKILLS
        text_lower = text.lower()
        for skill in self.COMMON_SKILLS:
            if skill in text_lower:
                skills.add(skill.title())
        
        # 🔥 REMOVED: NER extraction (adds too much noise: locations, companies)
        # 🔥 REMOVED: noun_phrases extraction (adds garbage from entire document)
        
        # Clean and deduplicate
        skills = self._clean_skills(skills)
        
        return sorted(list(skills))[:20]  # Top 20 skills
    
    def _extract_skills_from_section(self, section_text: str) -> Set[str]:
        """Extract skills from dedicated skills section"""
        skills = set()
        
        # Remove section header
        section_text = re.sub(
            r'^.*?(?:skills|competencies).*?:?\s*',
            '',
            section_text,
            flags=re.IGNORECASE
        ).strip()
        
        # Split by common delimiters
        # Skills might be: comma-separated, bullet-pointed, or line-by-line
        items = re.split(r'[•\n,;|]', section_text)
        
        for item in items:
            item = item.strip()
            
            # Clean up
            item = re.sub(r'^\W+|\W+$', '', item)
            
            # Valid skill criteria:
            # - Length between 2-40 chars
            # - Not all numbers
            # - Not a full sentence
            if 2 <= len(item) <= 40 and not item.isdigit() and '.' not in item[-2:]:
                skills.add(item)
        
        return skills
    
    def _extract_noun_phrases(self, doc) -> Set[str]:
        """Extract noun phrases that might be skills"""
        skills = set()
        
        for chunk in doc.noun_chunks:
            # Only keep short phrases (likely skill names)
            if 1 <= len(chunk.text.split()) <= 3:
                # Must start with capital or be all lowercase
                if chunk.text[0].isupper() or chunk.text.islower():
                    skills.add(chunk.text)
        
        return skills
    
    def _clean_skills(self, skills: Set[str]) -> Set[str]:
        """Clean and deduplicate skills - AGGRESSIVE FILTERING"""
        cleaned = set()
        
        # 🔥 Comprehensive noise filtering
        noise_keywords = {
            # Action verbs
            'achieved', 'achieving', 'performed', 'implemented', 'designed',
            'built', 'developed', 'created', 'managed', 'led', 'established',
            'leveraged', 'collaborated', 'engineered', 'programmed',
            # Metrics/descriptors
            'customers', 'users', 'efficiency', 'stability', 'conflicts',
            'updates', 'fixes', 'protection', 'specifications', 'cities',
            'process', 'conditions', 'summary', 'administration', 'logic',
            'menu', 'design', 'part', 'interests', 'achievements',
            'coursework', 'delivered', 'system', 'platform', 'backend',
            'frontend', 'tests', 'teams', 'developers', 'members',
            'production', 'grade', 'apps', 'daily', 'concurrent',
            'tasks', 'service', 'delivery', 'running', 'keeping',
            # Job roles/titles
            'developer', 'engineer', 'manager', 'waiter', 'remote',
            # Soft skills (too generic)
            'communication', 'collaboration', 'leadership', 'teamwork',
            'problem-solving', 'time management', 'multitasking',
            # Education terms
            'education', 'university', 'college', 'degree', 'bsc', 'msc',
            'coursework', 'programming', 'basic',
            # Locations
            'kingdom', 'united', 'london', 'essex', 'tashkent', 'uzbekistan',
            # Generic words
            'review', 'coding', 'reading', 'football', 'travel', 'cultures',
            'interests', 'languages', 'fluent', 'english', 'russian', 'uzbek'
        }
        
        # Blocked exact matches (full strings)
        blocked_exact = {
            'and interests', 'tech languages', 'key skills', 'skills developed',
            'relevant coursework', 'computer science', 'backend developer',
            'education bsc', 'balanced tasks', 'code review', 'coding',
            'basic programming', 'communication', 'collaboration',
            # V3: Additional blocks
            'aspera restaurant', 'other work experience', 'work experience',
            'sql querying', 'data entry', 'data management',
            # Languages (not tech skills)
            'english', 'russian', 'uzbek', 'tajik', 'turkish'
        }
        
        for skill in skills:
            # Remove extra whitespace
            skill = re.sub(r'\s+', ' ', skill).strip()
            
            # Skip if too short or too long
            if len(skill) < 2 or len(skill) > 30:
                continue
            
            # Skip if starts with numbers
            if re.match(r'^\d+', skill):
                continue
            
            # Skip if ends with bullet or 'o' artifact
            if skill.endswith(('•', ' o', 'o')):
                continue
            
            # Skip if contains pipe (malformed extraction)
            if '|' in skill:
                continue
            
            skill_lower = skill.lower()
            
            # Skip exact blocked matches
            if skill_lower in blocked_exact:
                continue
            
            # Skip if contains ANY noise keyword
            if any(keyword in skill_lower for keyword in noise_keywords):
                continue
            
            # Skip generic words
            if skill_lower in {'and', 'the', 'with', 'for', 'from', 'that', 'this',
                               'city', 'state', 'name', 'phone', 'email'}:
                continue
            
            # Skip if more than 3 words (likely a phrase, not a skill)
            if len(skill.split()) > 3:
                continue
            
            # Only keep if it looks like a tech term
            # Tech terms typically: start with capital, contain specific chars, or all caps
            if skill[0].isupper() or skill.isupper() or any(c in skill for c in ['.', '+', '#']):
                cleaned.add(skill)
        
        # 🔥 V3: Deduplicate case-insensitive (SQL vs Sql)
        final_skills = {}
        for skill in cleaned:
            skill_lower = skill.lower()
            # Keep the version with better casing (prefer all caps for acronyms)
            if skill_lower not in final_skills:
                final_skills[skill_lower] = skill
            else:
                # Prefer all uppercase (SQL over Sql)
                if skill.isupper():
                    final_skills[skill_lower] = skill
        
        return set(final_skills.values())
    

    # EXPERIENCE EXTRACTION

    
    def _extract_experience(self, text: str) -> List[Dict]:
        """
        Extract work experience with flexible format support
        Handles multiple date/company formats
        """
        experience_sections = self._find_section(text, 'experience')
        
        if not experience_sections:
            return []
        
        all_jobs = []
        
        for section_text in experience_sections:
            jobs = self._parse_experience_section(section_text)
            all_jobs.extend(jobs)
        
        # Deduplicate
        return self._deduplicate_experience(all_jobs)
    
    def _parse_experience_section(self, section_text: str) -> List[Dict]:
        """Parse jobs from experience section"""
        jobs = []
        
        # Split into potential job entries
        # Jobs are typically separated by blank lines or date patterns
        entries = self._split_into_entries(section_text)
        
        for entry in entries:
            job = self._parse_job_entry(entry)
            if job:
                jobs.append(job)
        
        return jobs
    
    def _split_into_entries(self, text: str) -> List[str]:
        """
        Split section into individual job entries
        Uses date patterns as separators
        """
        lines = text.split('\n')
        entries = []
        current_entry = []
        
        # Date pattern indicators (start of new job)
        date_indicators = [
            r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}',
            r'\b\d{4}\s*[-–]\s*(?:\d{4}|Present|Current)',
            r'\b\d{1,2}/\d{4}',
        ]
        
        for line in lines:
            # Check if line contains date (new entry)
            is_date_line = any(re.search(pattern, line, re.IGNORECASE) for pattern in date_indicators)
            
            if is_date_line and current_entry:
                # Save previous entry
                entries.append('\n'.join(current_entry))
                current_entry = [line]
            else:
                current_entry.append(line)
        
        # Add last entry
        if current_entry:
            entries.append('\n'.join(current_entry))
        
        return entries
    
    def _parse_job_entry(self, entry: str) -> Optional[Dict]:
        """
        Parse a single job entry with flexible format
        
        Supports formats:
        - Title at Company | Location | Dates
        - Title\nCompany | Location | Dates
        - Dates\nCompany Title
        - And many more variations
        """
        lines = [l.strip() for l in entry.split('\n') if l.strip()]
        
        if len(lines) < 2:
            return None
        
        # Initialize job data
        job = {
            'title': 'Unknown',
            'company': 'Unknown',
            'location': 'Unknown',
            'dates': 'Unknown',
            'responsibilities': []
        }
        
        # Find dates (can be anywhere in first 3 lines)
        date_patterns = [
            r'([A-Za-z]+\s+\d{4})\s*[-–to]+\s*([A-Za-z]+\s+\d{4}|Present|Current)',
            r'(\d{4})\s*[-–]+\s*(\d{4}|Present|Current)',
            r'(\d{1,2}/\d{4})\s*[-–]+\s*(\d{1,2}/\d{4}|Present)',
        ]
        
        date_line_idx = None
        for i, line in enumerate(lines[:3]):
            for pattern in date_patterns:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    job['dates'] = f"{match.group(1)} - {match.group(2)}"
                    date_line_idx = i
                    # Remove dates from line
                    lines[i] = line[:match.start()].strip() + ' ' + line[match.end():].strip()
                    lines[i] = lines[i].strip()
                    break
            if date_line_idx is not None:
                break
        
        # Parse title and company from remaining text
        # Common patterns:
        # 1. "Title at Company"
        # 2. "Company Name City, State Title"
        # 3. "Title\nCompany Name"
        
        for i, line in enumerate(lines[:3]):
            if not line:
                continue
            
            # Pattern 1: "Title at Company"
            if ' at ' in line.lower():
                parts = re.split(r'\s+at\s+', line, maxsplit=1, flags=re.IGNORECASE)
                job['title'] = parts[0].strip()
                if len(parts) > 1:
                    job['company'] = parts[1].strip()
                break
            
            # Pattern 2: Line with City, State (likely contains company)
            elif re.search(r',\s*\w+\s+[A-Z]{2}', line):  # "City, State"
                # Extract company before location
                parts = re.split(r'\s+City\s*,', line, maxsplit=1, flags=re.IGNORECASE)
                if parts:
                    job['company'] = parts[0].strip()
                # Title might be at end
                title_match = re.search(r',\s*[A-Z]{2}\s+(.+)$', line)
                if title_match:
                    job['title'] = title_match.group(1).strip()
                break
            
            # Pattern 3: First line = title, second line = company
            elif i == 0 and job['title'] == 'Unknown':
                job['title'] = line
            elif i == 1 and job['company'] == 'Unknown':
                job['company'] = line
        
        # Extract responsibilities (lines after title/company/dates)
        resp_start_idx = 2 if date_line_idx != 0 else 1
        
        for line in lines[resp_start_idx:]:
            if not line or len(line) < 10:
                continue
            
            # Remove bullet if present
            line = re.sub(r'^[•\-\*]\s*', '', line)
            
            # Skip lines that look like dates or company names
            if re.search(r'\d{4}|Company\s+Name', line, re.IGNORECASE):
                continue
            
            job['responsibilities'].append(line)
        
        # Limit responsibilities
        job['responsibilities'] = job['responsibilities'][:5]
        
        # Validate: must have at least title OR company
        if job['title'] == 'Unknown' and job['company'] == 'Unknown':
            return None
        
        return job
    
    def _deduplicate_experience(self, jobs: List[Dict]) -> List[Dict]:
        """Remove duplicate job entries"""
        seen = set()
        unique_jobs = []
        
        for job in jobs:
            # Create signature
            sig = (
                job['title'].lower(),
                job['company'].lower(),
                job['dates']
            )
            
            if sig not in seen:
                seen.add(sig)
                unique_jobs.append(job)
        
        return unique_jobs
    

    # EDUCATION EXTRACTION

    
    def _extract_education(self, text: str) -> List[Dict]:
        """Extract education entries"""
        education_sections = self._find_section(text, 'education')
        
        if not education_sections:
            return []
        
        all_education = []
        
        for section_text in education_sections:
            entries = self._parse_education_section(section_text)
            all_education.extend(entries)
        
        return all_education
    
    def _parse_education_section(self, section_text: str) -> List[Dict]:
        """Parse education entries"""
        entries = []
        lines = section_text.split('\n')
        
        # Degree indicators
        degree_patterns = [
            r'\b(?:Bachelor|Master|PhD|Ph\.?D|BSc|B\.?Sc|MSc|M\.?Sc|BA|MA|BFA|MFA)\b',
            r'\b(?:Associate|Diploma|Certificate)\b',
        ]
        
        current_entry = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Check if line contains degree
            has_degree = any(re.search(pattern, line, re.IGNORECASE) for pattern in degree_patterns)
            
            if has_degree:
                # Save previous entry
                if current_entry:
                    entries.append(current_entry)
                
                # Start new entry
                current_entry = self._parse_education_entry(line)
            elif current_entry:
                # Add info to current entry (institution, dates, etc.)
                self._update_education_entry(current_entry, line)
        
        # Add last entry
        if current_entry:
            entries.append(current_entry)
        
        return entries
    
    def _parse_education_entry(self, line: str) -> Dict:
        """Parse single education entry"""
        entry = {
            'degree': 'Unknown',
            'field': 'Unknown',
            'institution': 'Unknown',
            'dates': 'Unknown'
        }
        
        # Extract degree and field
        # Pattern: "BSc in Computer Science"
        match = re.search(
            r'(Bachelor|Master|PhD|BSc|MSc|BA|MA|BFA|MFA|Associate|Diploma)\s+(?:of|in)\s+(.+)',
            line,
            re.IGNORECASE
        )
        
        if match:
            entry['degree'] = match.group(1)
            entry['field'] = match.group(2).strip()
        else:
            # Just degree mentioned
            for pattern in [r'\b(Bachelor|Master|PhD|BSc|MSc|BA|MA)\b']:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    entry['degree'] = match.group(1)
                    break
        
        # Extract dates
        date_match = re.search(r'\b(\d{4})\b', line)
        if date_match:
            entry['dates'] = date_match.group(1)
        
        # Extract institution (if on same line)
        # Often comes after "|" or "from"
        if '|' in line:
            parts = line.split('|')
            if len(parts) > 1:
                entry['institution'] = parts[1].strip()
        
        return entry
    
    def _update_education_entry(self, entry: Dict, line: str):
        """Add additional info to education entry"""
        
        # Check for institution
        if entry['institution'] == 'Unknown':
            # Look for "University", "College", "Institute"
            if re.search(r'\b(?:University|College|Institute|School)\b', line, re.IGNORECASE):
                entry['institution'] = line
        
        # Check for dates
        if entry['dates'] == 'Unknown':
            date_match = re.search(r'\b(\d{4})\b', line)
            if date_match:
                entry['dates'] = date_match.group(1)
    

    # SECTION DETECTION

    
    def _find_section(self, text: str, section_type: str) -> List[str]:
        """
        Find and extract sections by type
        Returns list of section contents (may be multiple)
        """
        pattern = self.SECTION_PATTERNS.get(section_type)
        if not pattern:
            return []
        
        sections = []
        
        # Find all section headers
        # A section ends when another section starts or at end of text
        all_section_patterns = '|'.join(self.SECTION_PATTERNS.values())
        
        # Find section start
        for match in re.finditer(rf'({pattern})\s*:?', text, re.IGNORECASE):
            section_start = match.end()
            
            # Find next section (or end of text)
            next_section = re.search(
                rf'\n\s*({all_section_patterns})\s*:?',
                text[section_start:],
                re.IGNORECASE
            )
            
            if next_section:
                section_end = section_start + next_section.start()
            else:
                section_end = len(text)
            
            section_content = text[section_start:section_end].strip()
            sections.append(section_content)
        
        return sections



# TESTING FUNCTION


def test_parser_on_files(pdf_paths: List[str]):
    """Test parser on multiple PDFs"""
    parser = CVParser()
    
    print("=" * 60)
    print("TESTING ENHANCED CV PARSER")
    print("=" * 60)
    
    for pdf_path in pdf_paths:
        print(f"\nTesting: {pdf_path}")
        print("-" * 60)
        
        try:
            with open(pdf_path, 'rb') as f:
                content = f.read()
            
            result = parser.parse(content, pdf_path)
            
            # Display results
            print(f"✅ Parsed successfully")
            print(f"   Email:       {result['contact_info'].get('email', 'N/A')}")
            print(f"   Phone:       {result['contact_info'].get('phone', 'N/A')}")
            print(f"   Name:        {result['contact_info'].get('name', 'N/A')}")
            print(f"   Skills:      {len(result['skills'])} found")
            if result['skills']:
                print(f"                {', '.join(result['skills'][:5])}")
            print(f"   Experience:  {len(result['experience'])} jobs")
            if result['experience']:
                job = result['experience'][0]
                print(f"                {job['title']} at {job['company']}")
            print(f"   Education:   {len(result['education'])} entries")
            
        except Exception as e:
            print(f"❌ Error: {e}")


if __name__ == "__main__":
    # Test with uploaded files
    import sys
    
    if len(sys.argv) > 1:
        test_parser_on_files(sys.argv[1:])
    else:
        print("Usage: python enhanced_parser.py <pdf_file1> <pdf_file2> ...")