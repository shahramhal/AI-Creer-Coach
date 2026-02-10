"""
Recommendation Engine — Generates prioritized CV improvement recommendations.
Based on analysis scores, ATS checks, and keyword gaps.
"""

import logging
from typing import Dict, List

logger = logging.getLogger(__name__)


class RecommendationEngine:
    """Generates prioritized recommendations from analysis results."""

    def generate(
        self,
        scores: Dict,
        ats_checks: List[Dict],
        keyword_analysis: Dict,
        parsed_data: Dict,
    ) -> List[Dict]:
        """
        Generate prioritized recommendations.

        Returns list of:
            {
                "priority": int,
                "title": str,
                "description": str,
                "impact": "High Impact" | "Medium Impact" | "Low Impact",
                "timeEstimate": str,
                "impactRate": str,
            }
        """
        candidates = []

        # Check each potential issue and add recommendations
        candidates.extend(self._check_quantifiable_achievements(parsed_data, scores))
        candidates.extend(self._check_professional_summary(parsed_data, scores))
        candidates.extend(self._check_missing_keywords(keyword_analysis))
        candidates.extend(self._check_action_verbs(parsed_data, scores))
        candidates.extend(self._check_contact_info(parsed_data, ats_checks))
        candidates.extend(self._check_skills_section(parsed_data, scores))
        candidates.extend(self._check_experience_depth(parsed_data))
        candidates.extend(self._check_cv_length(parsed_data))
        candidates.extend(self._check_ats_issues(ats_checks))

        # Sort by impact weight (higher = more impactful)
        candidates.sort(key=lambda x: x.get("_weight", 0), reverse=True)

        # Assign priorities and clean up
        recommendations = []
        for i, candidate in enumerate(candidates[:8]):
            rec = {
                "priority": i + 1,
                "title": candidate["title"],
                "description": candidate["description"],
                "impact": candidate["impact"],
                "timeEstimate": candidate["timeEstimate"],
                "impactRate": candidate["impactRate"],
            }
            recommendations.append(rec)

        return recommendations

    def _check_quantifiable_achievements(self, parsed_data: Dict, scores: Dict) -> List[Dict]:
        """Check for missing quantifiable achievements."""
        recs = []
        experience = parsed_data.get("experience", [])
        if not experience:
            return recs

        import re
        quantity_pattern = re.compile(r"\d+%|\$[\d,]+|\d+\+|\d+x", re.IGNORECASE)

        total_bullets = 0
        quantified = 0
        for exp in experience:
            bullets = exp.get("responsibilities", []) + exp.get("achievements", [])
            for bullet in bullets:
                total_bullets += 1
                if quantity_pattern.search(bullet):
                    quantified += 1

        if total_bullets > 0 and quantified / total_bullets < 0.3:
            recs.append({
                "title": "Add quantifiable achievements to Experience section",
                "description": "Replace generic descriptions with specific metrics. Example: \"Improved page load time by 40%\" or \"Reduced customer churn by 15%\"",
                "impact": "High Impact",
                "timeEstimate": "~15 min to implement",
                "impactRate": "+12% interview rate",
                "_weight": 95,
            })

        return recs

    def _check_professional_summary(self, parsed_data: Dict, scores: Dict) -> List[Dict]:
        """Check for missing or weak professional summary."""
        recs = []
        summary = parsed_data.get("summary", "")

        if not summary:
            recs.append({
                "title": "Add a professional summary",
                "description": "Write a concise 2-3 sentence summary highlighting your key strengths, years of experience, and career focus. This is the first thing recruiters read.",
                "impact": "High Impact",
                "timeEstimate": "~10 min to implement",
                "impactRate": "+8% engagement",
                "_weight": 90,
            })
        elif len(summary.split()) < 20:
            recs.append({
                "title": "Expand your professional summary",
                "description": "Your summary is too brief. Add 2-3 sentences covering your expertise, key achievements, and career objectives.",
                "impact": "Medium Impact",
                "timeEstimate": "~5 min to implement",
                "impactRate": "+5% engagement",
                "_weight": 60,
            })

        return recs

    def _check_missing_keywords(self, keyword_analysis: Dict) -> List[Dict]:
        """Generate recommendations for top missing keywords."""
        recs = []
        missing = keyword_analysis.get("missing_keywords", [])

        # Top 3 missing keywords as individual recommendations
        for kw in missing[:3]:
            freq = int(kw["jobFrequency"].replace("%", ""))
            if freq >= 60:
                impact = "High Impact"
                weight = 85
            elif freq >= 40:
                impact = "Medium Impact"
                weight = 65
            else:
                impact = "Low Impact"
                weight = 40

            recs.append({
                "title": f"Add \"{kw['keyword']}\" to {kw['section']} section",
                "description": f"This keyword appears in {kw['jobFrequency']} of job postings for your target role. Adding it to your {kw['section']} section will improve ATS matching.",
                "impact": impact,
                "timeEstimate": "~5 min to implement",
                "impactRate": kw["impact"],
                "_weight": weight,
            })

        return recs

    def _check_action_verbs(self, parsed_data: Dict, scores: Dict) -> List[Dict]:
        """Check for weak action verb usage."""
        recs = []
        experience = parsed_data.get("experience", [])

        from cv_analyzer.ats_checker import ACTION_VERBS

        total_bullets = 0
        action_count = 0
        for exp in experience:
            bullets = exp.get("responsibilities", []) + exp.get("achievements", [])
            for bullet in bullets:
                total_bullets += 1
                if bullet.strip():
                    first_word = bullet.strip().split()[0].lower()
                    if first_word in ACTION_VERBS:
                        action_count += 1

        if total_bullets > 0 and action_count / total_bullets < 0.5:
            recs.append({
                "title": "Strengthen bullet point language with action verbs",
                "description": "Start each bullet with a strong action verb like 'Developed', 'Implemented', 'Architected', 'Led'. This makes your contributions clearer.",
                "impact": "Medium Impact",
                "timeEstimate": "~10 min to implement",
                "impactRate": "+6% interview rate",
                "_weight": 70,
            })

        return recs

    def _check_contact_info(self, parsed_data: Dict, ats_checks: List[Dict]) -> List[Dict]:
        """Check for missing contact information."""
        recs = []
        contact = parsed_data.get("contact_info", parsed_data.get("personal", {}))

        missing_fields = []
        if not contact.get("email"):
            missing_fields.append("email")
        if not contact.get("phone"):
            missing_fields.append("phone")
        if not contact.get("location"):
            missing_fields.append("location")
        if not contact.get("linkedin"):
            missing_fields.append("LinkedIn URL")

        if missing_fields:
            recs.append({
                "title": "Complete your contact information",
                "description": f"Missing: {', '.join(missing_fields)}. Complete contact info ensures recruiters can reach you and ATS can parse your details correctly.",
                "impact": "High Impact" if "email" in missing_fields else "Medium Impact",
                "timeEstimate": "~2 min to implement",
                "impactRate": "+10% response rate" if "email" in missing_fields else "+5% response rate",
                "_weight": 80 if "email" in missing_fields else 55,
            })

        return recs

    def _check_skills_section(self, parsed_data: Dict, scores: Dict) -> List[Dict]:
        """Check skills section completeness."""
        recs = []
        skills = parsed_data.get("skills", [])

        if len(skills) < 5:
            recs.append({
                "title": "Expand your skills section",
                "description": f"Only {len(skills)} skills listed. Add at least 8-10 relevant technical skills. ATS systems heavily rely on skills matching.",
                "impact": "High Impact",
                "timeEstimate": "~5 min to implement",
                "impactRate": "+10% match rate",
                "_weight": 75,
            })
        elif len(skills) < 8:
            recs.append({
                "title": "Add more technical skills",
                "description": f"You have {len(skills)} skills. Adding 3-5 more relevant skills will improve your ATS matching score.",
                "impact": "Medium Impact",
                "timeEstimate": "~3 min to implement",
                "impactRate": "+5% match rate",
                "_weight": 50,
            })

        return recs

    def _check_experience_depth(self, parsed_data: Dict) -> List[Dict]:
        """Check if experience entries have enough detail."""
        recs = []
        experience = parsed_data.get("experience", [])

        shallow_entries = 0
        for exp in experience:
            bullets = len(exp.get("responsibilities", [])) + len(exp.get("achievements", []))
            if bullets < 3:
                shallow_entries += 1

        if shallow_entries > 0 and experience:
            recs.append({
                "title": "Add more detail to experience entries",
                "description": f"{shallow_entries} of {len(experience)} positions have fewer than 3 bullet points. Aim for 3-5 bullets per role describing your key contributions.",
                "impact": "Medium Impact",
                "timeEstimate": "~15 min to implement",
                "impactRate": "+8% interview rate",
                "_weight": 65,
            })

        return recs

    def _check_cv_length(self, parsed_data: Dict) -> List[Dict]:
        """Check if CV sections suggest appropriate length."""
        recs = []
        experience = parsed_data.get("experience", [])

        total_bullets = 0
        for exp in experience:
            total_bullets += len(exp.get("responsibilities", [])) + len(exp.get("achievements", []))

        if total_bullets > 30:
            recs.append({
                "title": "Consider condensing your CV",
                "description": "Your CV has a large number of bullet points. Focus on the most impactful achievements and keep to 1-2 pages for optimal readability.",
                "impact": "Low Impact",
                "timeEstimate": "~20 min to implement",
                "impactRate": "+3% read rate",
                "_weight": 30,
            })

        return recs

    def _check_ats_issues(self, ats_checks: List[Dict]) -> List[Dict]:
        """Generate recommendations from ATS check failures."""
        recs = []
        fail_checks = [c for c in ats_checks if c.get("status") == "fail"]

        for check in fail_checks[:2]:
            recs.append({
                "title": f"Fix: {check['title']}",
                "description": check["description"],
                "impact": "High Impact",
                "timeEstimate": "~5 min to implement",
                "impactRate": "+8% pass rate",
                "_weight": 85,
            })

        return recs
