# apps/job-api-service/src/utils/helpers.py
"""
Shared helpers for job normalization.
Used by both Adzuna and Reed API clients.
"""

import re
from datetime import datetime

#  Job type inference 

_JOB_TYPE_PATTERNS = [
    (r'\b(full[\s-]?time)\b', 'Full-time'),
    (r'\b(part[\s-]?time)\b', 'Part-time'),
    (r'\b(contract|contractor|freelance)\b', 'Contract'),
    (r'\b(temporary|temp)\b', 'Temporary'),
    (r'\b(internship|intern|placement year|work experience)\b', 'Internship'),
    (r'\b(apprenticeship|apprentice)\b', 'Apprenticeship'),
    (r'\b(permanent)\b', 'Permanent'),
]


def infer_job_type(title: str, description: str) -> str:
    """Infer job type from title and description using keyword matching."""
    combined_text = f"{title} {description}".lower()
    for pattern, job_type_label in _JOB_TYPE_PATTERNS:
        if re.search(pattern, combined_text):
            return job_type_label
    return "Not specified"


def extract_requirements(description: str) -> list:
    """Extract bullet-point requirements from a job description."""
    if not description:
        return []
    patterns = [
        r'(?:requirements?|qualifications?|what you.{0,10}need|must have)[:\s]*\n((?:[-\u2022*]\s*.+\n?)+)',
        r'(?:skills?|experience)[:\s]*\n((?:[-\u2022*]\s*.+\n?)+)',
    ]
    for pattern in patterns:
        match = re.search(pattern, description, re.I | re.MULTILINE)
        if match:
            lines = re.findall(r'[-\u2022*]\s*(.+)', match.group(1))
            return [line.strip() for line in lines[:15] if line.strip()]
    return []


_JOB_TYPE_NORMALIZE_MAP = {
    'full time': 'Full-time',
    'full-time': 'Full-time',
    'part time': 'Part-time',
    'part-time': 'Part-time',
    'contract': 'Contract',
    'contractor': 'Contract',
    'freelance': 'Contract',
    'temporary': 'Temporary',
    'temp': 'Temporary',
    'internship': 'Internship',
    'apprenticeship': 'Apprenticeship',
}


def normalize_job_type(raw: str, title: str = '', description: str = '') -> str:
    """
    Normalize a raw job type string to a canonical frontend-compatible value.
    "Permanent" has no time-type info, so we try to infer it from the text;
    if that fails we fall back to "Full-time" (permanent roles are almost always full-time).
    """
    key = raw.lower().strip()
    if key in _JOB_TYPE_NORMALIZE_MAP:
        return _JOB_TYPE_NORMALIZE_MAP[key]
    if key == 'permanent':
        inferred = infer_job_type(title, description)
        return inferred if inferred != 'Not specified' else 'Full-time'
    return raw.strip() or 'Not specified'


#  Remote type detection 

def detect_remote_type(title: str, description: str) -> str:
    """Detect remote/hybrid/on-site from text."""
    text = f"{title} {description}".lower()
    if re.search(r'\b(fully remote|100% remote|remote only|work from home|remote position)\b', text):
        return "Remote"
    if re.search(r'\b(hybrid|flexible working|mix of remote)\b', text):
        return "Hybrid"
    if re.search(r'\b(on[\s-]?site|office[\s-]?based|in[\s-]?office)\b', text):
        return "On-site"
    return "Not specified"


#  Experience level detection 

_JUNIOR_TITLE_PATTERN = re.compile(
    r'\b(junior|jr\.?|entry[\s-]?level|graduate|grad|trainee|apprentice|intern)\b', re.I
)
_MID_TITLE_PATTERN = re.compile(
    r'\b(mid[\s-]?level|intermediate|middle[\s-]?level)\b', re.I
)
_SENIOR_TITLE_PATTERN = re.compile(
    r'\b(senior|sr\.?|lead|principal|staff)\b', re.I
)
_DIRECTOR_TITLE_PATTERN = re.compile(
    r'\b(director|head of|vp |vice president|chief|c-level|cto|cio)\b', re.I
)

# Description-specific patterns: more cautious to avoid false positives.
# "junior" in description can appear in "mentoring junior engineers", so we
# require it to appear in a role-context: "junior role", "junior position",
# "junior developer", "junior–mid", or standalone at line/sentence start.
_JUNIOR_DESC_PATTERN = re.compile(
    r'(?:^|[.\n])\s*junior\b'                   # start of line/sentence
    r'|junior[\s-](?:to[\s-])?(?:mid|level|role|position|developer|engineer|analyst)'
    r'|\bentry[\s-]?level\b'
    r'|\bgraduate\s+(?:role|position|program|scheme)\b'
    r'|\btrainee\b',
    re.I,
)
_MID_DESC_PATTERN = re.compile(
    r'\b(?:mid[\s-]?level|intermediate|middle[\s-]?level)\b', re.I
)
_SENIOR_DESC_PATTERN = re.compile(
    r'\bsenior[\s-](?:level|role|position|developer|engineer|analyst)'
    r'|\bsenior\s+(?:or|/)\s+(?:lead|principal|staff)\b'
    r'|\b(?:experienced|seasoned)\s+(?:developer|engineer|professional)\b',
    re.I,
)

# Years-of-experience patterns.
# _YEARS_PATTERN requires a trailing experience-context word to avoid matching
# incidental mentions like "founded 5 years ago" or "team average 3 years".
# Matches: "3+ years experience", "5 years of working", "2 yrs professional"
_YEARS_PATTERN = re.compile(
    r'(\d{1,2})\s*\+?\s*(?:years?|yrs?)\s*'
    r'(?:of\s+)?(?:experience|exp\.?|professional|relevant|proven|working|hands[\s-]?on)',
    re.I,
)

# Captures both ends of a range (e.g. "3-5 years") for averaging.
_YEARS_RANGE_PATTERN = re.compile(
    r'(\d{1,2})\s*[-–]\s*(\d{1,2})\s*(?:years?|yrs?)',
    re.I,
)


def _infer_level_from_years(text: str) -> str:
    """Infer experience level from years-of-experience mentioned in text."""
    years_values = []

    # Capture ranges (e.g. "3-5 years") and average min/max for better accuracy
    for match in _YEARS_RANGE_PATTERN.finditer(text):
        low, high = int(match.group(1)), int(match.group(2))
        years_values.append((low + high) / 2)

    # Capture single values that have explicit experience context
    for match in _YEARS_PATTERN.finditer(text):
        years_values.append(int(match.group(1)))

    if not years_values:
        return "Not specified"

    max_years = max(years_values)
    if max_years <= 2:
        return "Junior"
    if max_years <= 4:
        return "Mid-level"
    return "Senior"


def detect_experience_level(title: str, description: str) -> str:
    """Detect experience level from title first, then fall back to description analysis."""
    # Priority 1: explicit level keywords in the title (most reliable)
    title_lower = title.lower()
    if _JUNIOR_TITLE_PATTERN.search(title_lower):
        return "Junior"
    if _MID_TITLE_PATTERN.search(title_lower):
        return "Mid-level"
    if _SENIOR_TITLE_PATTERN.search(title_lower):
        return "Senior"
    if _DIRECTOR_TITLE_PATTERN.search(title_lower):
        return "Director+"

    desc_lower = description.lower() if description else ""
    if not desc_lower:
        return "Not specified"

    # Priority 2: years-of-experience in description (most objective signal)
    years_level = _infer_level_from_years(desc_lower)
    if years_level != "Not specified":
        return years_level

    # Priority 3: explicit level keywords in description (cautious patterns)
    if _DIRECTOR_TITLE_PATTERN.search(desc_lower):
        if re.search(r'\b(manager|architect|head|director|chief|vp)\b', title_lower):
            return "Director+"
    if _SENIOR_DESC_PATTERN.search(desc_lower):
        return "Senior"
    if _MID_DESC_PATTERN.search(desc_lower):
        return "Mid-level"
    if _JUNIOR_DESC_PATTERN.search(desc_lower):
        return "Junior"

    return "Not specified"


#  Date normalization 

def normalize_date_to_iso(date_string: str) -> str:
    """
    Normalize various date formats to ISO 8601 (YYYY-MM-DDTHH:MM:SSZ).
    Handles:
      - ISO 8601: "2025-01-15T14:30:00Z"
      - UK format:  "15/01/2025"
      - US format:  "01/15/2025" (less common from these APIs)
      - Date only:  "2025-01-15"
    Returns the original string if parsing fails.
    """
    if not date_string:
        return date_string

    # Already ISO 8601
    if 'T' in date_string:
        return date_string

    # Try dd/mm/yyyy (Reed UK format)
    for fmt in ('%d/%m/%Y', '%Y-%m-%d', '%m/%d/%Y'):
        try:
            parsed = datetime.strptime(date_string.strip(), fmt)
            return parsed.strftime('%Y-%m-%dT%H:%M:%SZ')
        except ValueError:
            continue

    return date_string
