"""
ATS Checker — Rule-based ATS compatibility analysis.
Checks CV against common Applicant Tracking System requirements.
No external API calls.
"""

import re
import logging
from typing import Dict, List

logger = logging.getLogger(__name__)

# Common action verbs for CV bullet points
ACTION_VERBS = {
    "achieved", "administered", "analyzed", "applied", "architected", "automated",
    "built", "collaborated", "configured", "coordinated", "created", "decreased",
    "delivered", "deployed", "designed", "developed", "directed", "documented",
    "drove", "eliminated", "enabled", "engineered", "enhanced", "established",
    "evaluated", "executed", "expanded", "facilitated", "founded", "generated",
    "grew", "headed", "identified", "implemented", "improved", "increased",
    "influenced", "initiated", "integrated", "introduced", "launched", "led",
    "maintained", "managed", "mentored", "migrated", "modernized", "monitored",
    "negotiated", "operated", "optimized", "orchestrated", "organized", "overhauled",
    "oversaw", "performed", "pioneered", "planned", "presented", "produced",
    "programmed", "proposed", "provided", "published", "rebuilt", "reduced",
    "refactored", "refined", "reorganized", "replaced", "researched", "resolved",
    "restructured", "revamped", "reviewed", "scaled", "simplified", "spearheaded",
    "standardized", "streamlined", "strengthened", "supervised", "supported",
    "tested", "trained", "transformed", "troubleshot", "upgraded", "utilized",
}

# Standard section headers recognized by ATS
STANDARD_HEADERS = {
    "contact", "summary", "objective", "professional summary", "profile",
    "experience", "work experience", "professional experience", "employment",
    "education", "academic", "qualifications",
    "skills", "technical skills", "core competencies", "proficiencies",
    "certifications", "certificates", "licenses",
    "projects", "personal projects", "key projects",
    "languages", "publications", "awards", "honors", "volunteer",
}


class ATSChecker:
    """
    Checks CV for ATS compatibility issues.
    Returns a list of pass/warning/fail checks with descriptions.
    """

    def check_all(self, cv_text: str, parsed_data: Dict, filename: str = "") -> List[Dict]:
        """
        Run all ATS checks and return results.

        Returns list of:
            {"status": "pass"|"warning"|"fail", "title": str, "description": str}
        """
        checks = []

        checks.append(self._check_file_format(filename))
        checks.append(self._check_page_length(cv_text))
        checks.append(self._check_contact_email(parsed_data))
        checks.append(self._check_contact_phone(parsed_data))
        checks.append(self._check_contact_location(parsed_data))
        checks.append(self._check_contact_linkedin(parsed_data))
        checks.append(self._check_section_headers(cv_text))
        checks.append(self._check_experience_present(parsed_data))
        checks.append(self._check_education_present(parsed_data))
        checks.append(self._check_skills_present(parsed_data))
        checks.append(self._check_summary_present(parsed_data))
        checks.append(self._check_date_consistency(parsed_data))
        checks.append(self._check_action_verbs(parsed_data))
        checks.append(self._check_quantifiable_achievements(parsed_data))
        checks.append(self._check_bullet_point_length(parsed_data))
        checks.append(self._check_special_characters(cv_text))
        checks.append(self._check_email_professional(parsed_data))
        checks.append(self._check_experience_completeness(parsed_data))
        checks.append(self._check_chronological_order(parsed_data))
        checks.append(self._check_complex_formatting(cv_text))

        return [c for c in checks if c is not None]

    def _check_file_format(self, filename: str) -> Dict:
        if not filename:
            return {"status": "warning", "title": "File format unknown", "description": "Could not determine file format"}
        lower = filename.lower()
        if lower.endswith(".pdf"):
            return {"status": "pass", "title": "File format is ATS-friendly", "description": "PDF with selectable text detected"}
        elif lower.endswith(".docx"):
            return {"status": "pass", "title": "File format is ATS-compatible", "description": "DOCX format is widely supported by ATS systems"}
        elif lower.endswith(".doc"):
            return {"status": "warning", "title": "Legacy file format", "description": "Older .doc format may not parse well. Use .pdf or .docx"}
        else:
            return {"status": "fail", "title": "Unsupported file format", "description": f"Format '{filename.split('.')[-1]}' may not be parseable by ATS systems"}

    def _check_page_length(self, cv_text: str) -> Dict:
        word_count = len(cv_text.split())
        if 300 <= word_count <= 1200:
            return {"status": "pass", "title": "CV length is appropriate", "description": f"~{word_count} words detected (1-2 page equivalent)"}
        elif word_count < 300:
            return {"status": "warning", "title": "CV may be too short", "description": f"Only ~{word_count} words detected. Consider adding more detail to experience and skills"}
        else:
            return {"status": "warning", "title": "CV may be too long", "description": f"~{word_count} words detected. Consider condensing to 1-2 pages for better ATS parsing"}

    def _check_contact_email(self, parsed_data: Dict) -> Dict:
        contact = parsed_data.get("contact_info", parsed_data.get("personal", {}))
        email = contact.get("email", "")
        if email and re.match(r"[^@]+@[^@]+\.[^@]+", email):
            return {"status": "pass", "title": "Email address present", "description": "Valid email format detected"}
        elif email:
            return {"status": "warning", "title": "Email format may be invalid", "description": "Email may be parsed incorrectly by ATS systems"}
        else:
            return {"status": "fail", "title": "Missing email address", "description": "Contact email is critical for ATS — recruiters need a way to reach you"}

    def _check_contact_phone(self, parsed_data: Dict) -> Dict:
        contact = parsed_data.get("contact_info", parsed_data.get("personal", {}))
        phone = contact.get("phone", "")
        if phone and len(re.sub(r"[^\d]", "", phone)) >= 7:
            return {"status": "pass", "title": "Phone number present", "description": "Valid phone number detected"}
        elif phone:
            return {"status": "warning", "title": "Phone number may be invalid", "description": "Phone format may cause ATS parsing issues"}
        else:
            return {"status": "warning", "title": "Missing phone number", "description": "Adding a phone number increases recruiter response rates"}

    def _check_contact_location(self, parsed_data: Dict) -> Dict:
        contact = parsed_data.get("contact_info", parsed_data.get("personal", {}))
        location = contact.get("location", "")
        if location and len(location) > 2:
            return {"status": "pass", "title": "Location present", "description": "Location helps with geographic matching"}
        else:
            return {"status": "warning", "title": "Missing location", "description": "Many ATS filter by location — add city and country"}

    def _check_contact_linkedin(self, parsed_data: Dict) -> Dict:
        contact = parsed_data.get("contact_info", parsed_data.get("personal", {}))
        linkedin = contact.get("linkedin", "")
        if linkedin and ("linkedin" in linkedin.lower() or "linked" in linkedin.lower()):
            return {"status": "pass", "title": "LinkedIn profile linked", "description": "LinkedIn URL helps recruiters verify your profile"}
        else:
            return {"status": "warning", "title": "No LinkedIn URL", "description": "Adding LinkedIn increases profile views by recruiters"}

    def _check_section_headers(self, cv_text: str) -> Dict:
        text_lower = cv_text.lower()
        found_sections = 0
        for header in STANDARD_HEADERS:
            if header in text_lower:
                found_sections += 1
        if found_sections >= 4:
            return {"status": "pass", "title": "Standard section headers detected", "description": f"{found_sections} recognizable section headers found"}
        elif found_sections >= 2:
            return {"status": "warning", "title": "Some non-standard section headers", "description": "Use standard headers (Experience, Education, Skills) for better ATS parsing"}
        else:
            return {"status": "fail", "title": "Non-standard section structure", "description": "ATS may not parse sections correctly. Use standard headers like Experience, Education, Skills"}

    def _check_experience_present(self, parsed_data: Dict) -> Dict:
        experience = parsed_data.get("experience", [])
        if len(experience) >= 2:
            return {"status": "pass", "title": "Work experience section complete", "description": f"{len(experience)} positions documented"}
        elif len(experience) == 1:
            return {"status": "pass", "title": "Work experience present", "description": "1 position documented"}
        else:
            return {"status": "fail", "title": "No work experience found", "description": "Experience section is critical — most ATS require it for scoring"}

    def _check_education_present(self, parsed_data: Dict) -> Dict:
        education = parsed_data.get("education", [])
        if education:
            return {"status": "pass", "title": "Education section present", "description": f"{len(education)} education entries found"}
        else:
            return {"status": "warning", "title": "No education section found", "description": "Many roles require education — add degrees or certifications"}

    def _check_skills_present(self, parsed_data: Dict) -> Dict:
        skills = parsed_data.get("skills", [])
        if len(skills) >= 8:
            return {"status": "pass", "title": "Skills section is comprehensive", "description": f"{len(skills)} skills listed"}
        elif len(skills) >= 3:
            return {"status": "warning", "title": "Skills section could be expanded", "description": f"Only {len(skills)} skills listed. Add more relevant technical skills"}
        else:
            return {"status": "fail", "title": "Insufficient skills listed", "description": "ATS heavily relies on skills matching — list at least 8-10 relevant skills"}

    def _check_summary_present(self, parsed_data: Dict) -> Dict:
        summary = parsed_data.get("summary", "")
        if summary and len(summary) >= 50:
            return {"status": "pass", "title": "Professional summary present", "description": "Summary provides quick context for ATS and recruiters"}
        elif summary:
            return {"status": "warning", "title": "Summary is too brief", "description": "Expand your professional summary to 2-3 sentences for better impact"}
        else:
            return {"status": "warning", "title": "No professional summary", "description": "A concise summary improves ATS scoring and recruiter engagement"}

    def _check_date_consistency(self, parsed_data: Dict) -> Dict:
        experience = parsed_data.get("experience", [])
        has_dates = 0
        missing_dates = 0
        for exp in experience:
            start = exp.get("startDate") or exp.get("dates", "")
            if start:
                has_dates += 1
            else:
                missing_dates += 1

        if missing_dates == 0 and has_dates > 0:
            return {"status": "pass", "title": "Date formatting is consistent", "description": "All positions have date ranges"}
        elif missing_dates > 0:
            return {"status": "warning", "title": "Some positions missing dates", "description": f"{missing_dates} positions lack date information. ATS needs dates for timeline verification"}
        else:
            return {"status": "warning", "title": "No dates detected", "description": "Add start/end dates to all positions for ATS compatibility"}

    def _check_action_verbs(self, parsed_data: Dict) -> Dict:
        experience = parsed_data.get("experience", [])
        total_bullets = 0
        action_verb_bullets = 0

        for exp in experience:
            responsibilities = exp.get("responsibilities", [])
            achievements = exp.get("achievements", [])
            bullets = responsibilities + achievements
            for bullet in bullets:
                total_bullets += 1
                first_word = bullet.strip().split()[0].lower().rstrip("ed").rstrip("ing") if bullet.strip() else ""
                if bullet.strip():
                    actual_first = bullet.strip().split()[0].lower()
                    if actual_first in ACTION_VERBS:
                        action_verb_bullets += 1

        if total_bullets == 0:
            return {"status": "warning", "title": "No bullet points detected", "description": "Use bullet points starting with action verbs for better ATS scoring"}

        ratio = action_verb_bullets / total_bullets
        if ratio >= 0.7:
            return {"status": "pass", "title": "Strong action verb usage", "description": f"{action_verb_bullets}/{total_bullets} bullets start with action verbs"}
        elif ratio >= 0.4:
            return {"status": "warning", "title": "Improve action verb usage", "description": f"Only {action_verb_bullets}/{total_bullets} bullets use action verbs. Start each bullet with a strong verb"}
        else:
            return {"status": "warning", "title": "Weak action verbs", "description": "Start bullet points with action verbs like 'Developed', 'Implemented', 'Led' for better impact"}

    def _check_quantifiable_achievements(self, parsed_data: Dict) -> Dict:
        experience = parsed_data.get("experience", [])
        total_bullets = 0
        quantified_bullets = 0
        quantity_pattern = re.compile(r"\d+%|\$[\d,]+|\d+\+|\d+x|reduced by|increased by|improved by|saved|grew|generated")

        for exp in experience:
            bullets = exp.get("responsibilities", []) + exp.get("achievements", [])
            for bullet in bullets:
                total_bullets += 1
                if quantity_pattern.search(bullet.lower()):
                    quantified_bullets += 1

        if total_bullets == 0:
            return {"status": "warning", "title": "No achievements detected", "description": "Add quantifiable achievements to stand out"}

        ratio = quantified_bullets / total_bullets
        if ratio >= 0.3:
            return {"status": "pass", "title": "Good use of quantifiable achievements", "description": f"{quantified_bullets}/{total_bullets} bullets include metrics"}
        elif ratio > 0:
            return {"status": "warning", "title": "Add more quantifiable achievements", "description": f"Only {quantified_bullets}/{total_bullets} bullets have metrics. Include numbers, percentages, and dollar amounts"}
        else:
            return {"status": "warning", "title": "No quantifiable achievements found", "description": "Add metrics like '40% improvement' or '$2M revenue' to demonstrate impact"}

    def _check_bullet_point_length(self, parsed_data: Dict) -> Dict:
        experience = parsed_data.get("experience", [])
        too_short = 0
        too_long = 0
        good = 0

        for exp in experience:
            bullets = exp.get("responsibilities", []) + exp.get("achievements", [])
            for bullet in bullets:
                word_count = len(bullet.split())
                if word_count < 6:
                    too_short += 1
                elif word_count > 35:
                    too_long += 1
                else:
                    good += 1

        total = too_short + too_long + good
        if total == 0:
            return None

        if too_long == 0 and too_short <= 1:
            return {"status": "pass", "title": "Bullet point length is appropriate", "description": "Most bullets are between 10-30 words (ideal)"}
        elif too_long > 0:
            return {"status": "warning", "title": "Some bullet points are too long", "description": f"{too_long} bullets exceed 35 words. Keep them concise for readability"}
        else:
            return {"status": "warning", "title": "Some bullet points are too brief", "description": f"{too_short} bullets are under 6 words. Add more detail about your contributions"}

    def _check_special_characters(self, cv_text: str) -> Dict:
        problematic = re.findall(r"[^\x00-\x7F\u00C0-\u024F\u2018-\u201D\u2013\u2014\u2022\u00B7]", cv_text)
        unique_problematic = set(problematic)
        if len(unique_problematic) <= 2:
            return {"status": "pass", "title": "Character encoding is clean", "description": "No problematic special characters detected"}
        else:
            return {"status": "warning", "title": "Special characters detected", "description": f"{len(unique_problematic)} unusual characters found that may cause ATS parsing errors"}

    def _check_email_professional(self, parsed_data: Dict) -> Dict:
        contact = parsed_data.get("contact_info", parsed_data.get("personal", {}))
        email = contact.get("email", "").lower()
        if not email:
            return None

        unprofessional_patterns = ["69", "420", "xxx", "baby", "sexy", "hot", "cool"]
        for pattern in unprofessional_patterns:
            if pattern in email.split("@")[0]:
                return {"status": "warning", "title": "Email address may appear unprofessional", "description": "Consider using a professional email format (firstname.lastname@domain)"}

        return {"status": "pass", "title": "Professional email address", "description": "Email appears professional and appropriate"}

    def _check_experience_completeness(self, parsed_data: Dict) -> Dict:
        experience = parsed_data.get("experience", [])
        if not experience:
            return None

        incomplete = 0
        for exp in experience:
            missing_fields = 0
            if not exp.get("title"):
                missing_fields += 1
            if not exp.get("company"):
                missing_fields += 1
            if not (exp.get("responsibilities") or exp.get("achievements")):
                missing_fields += 1
            if missing_fields > 0:
                incomplete += 1

        if incomplete == 0:
            return {"status": "pass", "title": "Experience entries are complete", "description": "All positions have title, company, and responsibilities"}
        else:
            return {"status": "warning", "title": "Incomplete experience entries", "description": f"{incomplete} positions are missing title, company, or responsibilities"}

    def _check_chronological_order(self, parsed_data: Dict) -> Dict:
        experience = parsed_data.get("experience", [])
        if len(experience) < 2:
            return None

        # Check if dates suggest reverse chronological order
        has_present = False
        for i, exp in enumerate(experience):
            end_date = exp.get("endDate", "").lower()
            if i == 0 and ("present" in end_date or "current" in end_date or not end_date):
                has_present = True

        if has_present:
            return {"status": "pass", "title": "Reverse chronological order", "description": "Most recent position listed first (preferred by ATS)"}
        else:
            return {"status": "warning", "title": "Check position ordering", "description": "List most recent position first for standard reverse chronological format"}

    def _check_complex_formatting(self, cv_text: str) -> Dict:
        # Detect potential table formatting (multiple tabs, pipe characters)
        table_indicators = cv_text.count("|") + cv_text.count("\t\t")
        if table_indicators > 10:
            return {"status": "warning", "title": "Complex formatting detected", "description": "Tables and columns may cause parsing issues with some ATS systems"}
        else:
            return {"status": "pass", "title": "Simple formatting detected", "description": "Document structure appears ATS-compatible"}
