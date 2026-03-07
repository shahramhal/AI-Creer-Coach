# apps/job-api-service/src/utils/helpers.py
"""
Shared helpers for job normalization.
Used by both Adzuna and Reed API clients.
"""

import re
from datetime import datetime

# ── Job type inference ───────────────────────────────────────────────────────

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


# ── Remote type detection ────────────────────────────────────────────────────

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


# ── Experience level detection ───────────────────────────────────────────────

def detect_experience_level(title: str, description: str) -> str:
    """Detect experience level from title."""
    title_lower = title.lower()
    if re.search(r'\b(junior|jr\.?|entry[\s-]?level|graduate|grad)\b', title_lower):
        return "Junior"
    if re.search(r'\b(mid[\s-]?level|intermediate)\b', title_lower):
        return "Mid-level"
    if re.search(r'\b(senior|sr\.?|lead|principal|staff)\b', title_lower):
        return "Senior"
    if re.search(r'\b(director|head of|vp |vice president|chief|c-level|cto|cio)\b', title_lower):
        return "Director+"
    return "Not specified"


# ── Date normalization ───────────────────────────────────────────────────────

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
