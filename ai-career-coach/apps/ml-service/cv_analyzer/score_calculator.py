"""
Score Calculator - Computes CV quality scores across 5 categories.
Uses rule-based analysis with weighted scoring.

DEPRECATION NOTICE: This module's 5-category scoring (including keywordsMatch)
is being superseded by:
  - cv_overview_scorer.py - job-agnostic 4-category CV quality scores
  - ats_scorer.py - job-specific ATS keyword matching
This module is retained for backward compatibility with the legacy analyze() method.
"""

import re
import logging
from typing import Dict, List

logger = logging.getLogger(__name__)

# Action verbs for experience scoring
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

QUANTITY_PATTERN = re.compile(
    r"\d+%|\$[\d,]+|\d+\+|\d+x|reduced by|increased by|improved by|saved|grew|generated|\d+ users|\d+ clients|\d+ team|\d+ projects",
    re.IGNORECASE,
)

STANDARD_HEADERS = {
    "contact", "summary", "objective", "professional summary", "profile",
    "experience", "work experience", "professional experience", "employment",
    "education", "academic", "qualifications",
    "skills", "technical skills", "core competencies",
    "certifications", "projects",
}


class ScoreCalculator:
    """Calculates CV quality scores across 5 categories (0-100 each)."""

    def calculate_all(
        self,
        cv_text: str,
        parsed_data: Dict,
        ats_checks: List[Dict],
        keyword_analysis: Dict,
    ) -> Dict:
        """
        Calculate all scores and the overall weighted score.

        Returns:
            {
                "overallScore": int,
                "scoreBreakdown": {
                    "contentQuality": int,
                    "atsCompatibility": int,
                    "keywordsMatch": int,
                    "formatStructure": int,
                    "experienceClarity": int,
                }
            }
        """
        content_quality = self._score_content_quality(parsed_data)
        ats_compatibility = self._score_ats_compatibility(ats_checks)
        keywords_match = self._score_keywords_match(keyword_analysis)
        format_structure = self._score_format_structure(cv_text, parsed_data)
        experience_clarity = self._score_experience_clarity(parsed_data)

        # Weighted overall score
        overall = round(
            content_quality * 0.25
            + ats_compatibility * 0.20
            + keywords_match * 0.20
            + format_structure * 0.15
            + experience_clarity * 0.20
        )

        return {
            "overallScore": min(overall, 100),
            "scoreBreakdown": {
                "contentQuality": content_quality,
                "atsCompatibility": ats_compatibility,
                "keywordsMatch": keywords_match,
                "formatStructure": format_structure,
                "experienceClarity": experience_clarity,
            },
        }

    def _score_content_quality(self, parsed_data: Dict) -> int:
        """Score content quality: summary, experience depth, achievements, skills."""
        score = 0

        # Summary present (+15)
        summary = parsed_data.get("summary", "")
        if summary and len(summary) >= 50:
            score += 15
        elif summary:
            score += 8

        # Summary length appropriate 50-200 words (+10)
        if summary:
            word_count = len(summary.split())
            if 30 <= word_count <= 200:
                score += 10
            elif word_count > 0:
                score += 5

        # Experience entries have 3+ bullet points each (+20)
        experience = parsed_data.get("experience", [])
        if experience:
            well_detailed = 0
            for exp in experience:
                bullets = len(exp.get("responsibilities", [])) + len(exp.get("achievements", []))
                if bullets >= 3:
                    well_detailed += 1
            ratio = well_detailed / len(experience) if experience else 0
            score += round(20 * ratio)

        # Quantifiable achievements (+25)
        total_bullets = 0
        quantified_bullets = 0
        for exp in experience:
            bullets = exp.get("responsibilities", []) + exp.get("achievements", [])
            for bullet in bullets:
                total_bullets += 1
                if QUANTITY_PATTERN.search(bullet):
                    quantified_bullets += 1
        if total_bullets > 0:
            quant_ratio = quantified_bullets / total_bullets
            if quant_ratio >= 0.4:
                score += 25
            elif quant_ratio >= 0.2:
                score += 18
            elif quant_ratio > 0:
                score += 10

        # Action verbs at bullet starts (+15)
        action_verb_count = 0
        for exp in experience:
            bullets = exp.get("responsibilities", []) + exp.get("achievements", [])
            for bullet in bullets:
                if bullet.strip():
                    first_word = bullet.strip().split()[0].lower()
                    if first_word in ACTION_VERBS:
                        action_verb_count += 1
        if total_bullets > 0:
            verb_ratio = action_verb_count / total_bullets
            if verb_ratio >= 0.7:
                score += 15
            elif verb_ratio >= 0.4:
                score += 10
            elif verb_ratio > 0:
                score += 5

        # Skills section has 8+ skills (+15)
        skills = parsed_data.get("skills", [])
        if len(skills) >= 12:
            score += 15
        elif len(skills) >= 8:
            score += 12
        elif len(skills) >= 5:
            score += 8
        elif len(skills) > 0:
            score += 4

        return min(score, 100)

    def _score_ats_compatibility(self, ats_checks: List[Dict]) -> int:
        """Derive ATS score from check results."""
        if not ats_checks:
            return 50

        total_points = 0
        max_points = 0

        for check in ats_checks:
            max_points += 5
            status = check.get("status", "warning")
            if status == "pass":
                total_points += 5
            elif status == "warning":
                total_points += 2
            # fail = 0 points

        if max_points == 0:
            return 50

        return round(total_points / max_points * 100)

    def _score_keywords_match(self, keyword_analysis: Dict) -> int:
        """Score based on keyword gap analysis."""
        match_score = keyword_analysis.get("keyword_match_score", 0)
        return round(min(match_score, 100))

    def _score_format_structure(self, cv_text: str, parsed_data: Dict) -> int:
        """Score format and structure."""
        score = 0
        text_lower = cv_text.lower()

        # Standard section headers present (+20)
        found_headers = sum(1 for h in STANDARD_HEADERS if h in text_lower)
        if found_headers >= 5:
            score += 20
        elif found_headers >= 3:
            score += 14
        elif found_headers >= 1:
            score += 7

        # Consistent date formatting (+15)
        experience = parsed_data.get("experience", [])
        has_dates = sum(1 for exp in experience if exp.get("startDate") or exp.get("dates"))
        if experience and has_dates == len(experience):
            score += 15
        elif experience and has_dates > 0:
            score += 8

        # Appropriate page length (+15)
        word_count = len(cv_text.split())
        if 400 <= word_count <= 1200:
            score += 15
        elif 200 <= word_count <= 1800:
            score += 8
        else:
            score += 3

        # Balanced section lengths (+10)
        has_exp = len(parsed_data.get("experience", [])) > 0
        has_edu = len(parsed_data.get("education", [])) > 0
        has_skills = len(parsed_data.get("skills", [])) > 0
        sections_present = sum([has_exp, has_edu, has_skills])
        if sections_present >= 3:
            score += 10
        elif sections_present >= 2:
            score += 6

        # Reverse chronological order (+10)
        if experience and len(experience) >= 2:
            first_end = (experience[0].get("endDate") or "").lower()
            if "present" in first_end or "current" in first_end or not first_end:
                score += 10
            else:
                score += 5
        elif experience:
            score += 10

        # Clean contact section (+15)
        contact = parsed_data.get("contact_info", parsed_data.get("personal", {}))
        contact_fields = sum(1 for v in contact.values() if v)
        if contact_fields >= 4:
            score += 15
        elif contact_fields >= 3:
            score += 10
        elif contact_fields >= 1:
            score += 5

        return min(score, 100)

    def _score_experience_clarity(self, parsed_data: Dict) -> int:
        """Score experience section clarity and detail."""
        experience = parsed_data.get("experience", [])
        if not experience:
            return 15

        score = 0

        # Each experience has title + company + dates (+20)
        complete = 0
        for exp in experience:
            has_title = bool(exp.get("title"))
            has_company = bool(exp.get("company"))
            has_dates = bool(exp.get("startDate") or exp.get("dates"))
            if has_title and has_company and has_dates:
                complete += 1
        completeness_ratio = complete / len(experience)
        score += round(20 * completeness_ratio)

        # Action verbs in 80%+ bullets (+20)
        total_bullets = 0
        action_verb_count = 0
        all_bullets = []
        for exp in experience:
            bullets = exp.get("responsibilities", []) + exp.get("achievements", [])
            all_bullets.extend(bullets)
            for bullet in bullets:
                total_bullets += 1
                if bullet.strip():
                    first_word = bullet.strip().split()[0].lower()
                    if first_word in ACTION_VERBS:
                        action_verb_count += 1

        if total_bullets > 0:
            verb_ratio = action_verb_count / total_bullets
            if verb_ratio >= 0.8:
                score += 20
            elif verb_ratio >= 0.5:
                score += 14
            elif verb_ratio > 0:
                score += 7

        # Quantifiable metrics in 30%+ bullets (+25)
        quantified = 0
        for bullet in all_bullets:
            if QUANTITY_PATTERN.search(bullet):
                quantified += 1
        if total_bullets > 0:
            quant_ratio = quantified / total_bullets
            if quant_ratio >= 0.3:
                score += 25
            elif quant_ratio >= 0.15:
                score += 16
            elif quant_ratio > 0:
                score += 8

        # Specific responsibilities - average bullet length suggests detail (+20)
        if all_bullets:
            avg_words = sum(len(b.split()) for b in all_bullets) / len(all_bullets)
            if 10 <= avg_words <= 30:
                score += 20
            elif 6 <= avg_words <= 40:
                score += 12
            else:
                score += 5

        # Multiple bullets per position (+15)
        if experience:
            avg_bullets = total_bullets / len(experience)
            if avg_bullets >= 4:
                score += 15
            elif avg_bullets >= 2:
                score += 10
            elif avg_bullets >= 1:
                score += 5

        return min(score, 100)
