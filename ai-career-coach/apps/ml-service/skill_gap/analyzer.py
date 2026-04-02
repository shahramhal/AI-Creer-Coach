"""
Skill Gap Analyzer

Analyzes CV skills against target role requirements to identify gaps,
prioritize learning, and estimate ROI for skill acquisition.
"""

import re
import logging
from typing import Dict, List, Optional, Set

from job_matcher.matcher import SKILL_CATEGORIES, ALL_SKILLS
from cv_analyzer.keyword_analyzer import ROLE_KEYWORDS, ROLE_ALIASES

logger = logging.getLogger(__name__)

# Estimated hours to reach competency for each skill
SKILL_LEARNING_ESTIMATES: Dict[str, int] = {
    # Programming languages
    "python": 120, "javascript": 120, "typescript": 80, "java": 150,
    "c++": 200, "c#": 150, "go": 100, "rust": 180, "ruby": 100,
    "php": 100, "swift": 120, "kotlin": 100, "scala": 150, "r": 80,
    "matlab": 60, "perl": 80, "shell": 40, "bash": 40, "powershell": 40,
    # Frontend
    "react": 80, "angular": 100, "vue": 60, "svelte": 40, "next.js": 60,
    "nextjs": 60, "nuxt": 50, "html": 30, "css": 50, "sass": 20,
    "tailwind": 20, "bootstrap": 20, "jquery": 20, "webpack": 30, "vite": 15,
    # Backend
    "node": 60, "nodejs": 60, "express": 40, "django": 80, "flask": 40,
    "fastapi": 30, "spring": 120, "spring boot": 100, ".net": 120,
    "asp.net": 100, "rails": 80, "laravel": 80, "gin": 40, "fiber": 30,
    # Database
    "sql": 60, "postgresql": 50, "mysql": 40, "mongodb": 40, "redis": 20,
    "elasticsearch": 50, "dynamodb": 30, "cassandra": 60, "sqlite": 15,
    "oracle": 80, "neo4j": 40, "graphql": 40,
    # Cloud & DevOps
    "aws": 120, "azure": 120, "gcp": 100, "docker": 40, "kubernetes": 80,
    "terraform": 60, "ansible": 40, "jenkins": 30, "ci/cd": 40,
    "github actions": 20, "gitlab ci": 20, "devops": 100, "linux": 80, "nginx": 20,
    # Data & ML
    "machine learning": 200, "deep learning": 250, "data science": 200,
    "ai": 150, "ml": 200, "nlp": 150, "computer vision": 180,
    "tensorflow": 100, "pytorch": 100, "pandas": 40, "numpy": 30,
    "scikit-learn": 60, "spark": 80, "hadoop": 80, "data analysis": 60,
    "data engineering": 120, "etl": 40, "power bi": 30, "tableau": 30,
    # Business
    "project management": 60, "agile": 20, "scrum": 15, "kanban": 10,
    "jira": 10, "confluence": 10, "stakeholder management": 40,
    "budgeting": 40, "forecasting": 40, "strategy": 60,
    "business analysis": 80, "requirements gathering": 30, "product management": 80,
    # Design
    "figma": 40, "sketch": 30, "adobe xd": 30, "photoshop": 60,
    "illustrator": 60, "ui/ux": 80, "ux design": 80, "ui design": 60,
    "wireframing": 20, "prototyping": 30, "user research": 40,
    # Marketing
    "seo": 40, "sem": 30, "google analytics": 20, "social media": 30,
    "content marketing": 40, "email marketing": 20, "copywriting": 40,
    "crm": 30, "salesforce": 80, "hubspot": 30,
    # Finance
    "financial analysis": 80, "accounting": 100, "bookkeeping": 40,
    "excel": 40, "financial modeling": 80, "auditing": 60, "tax": 60,
    "compliance": 40, "risk management": 60,
    # Soft skills
    "leadership": 100, "communication": 40, "teamwork": 20,
    "problem solving": 40, "critical thinking": 40, "time management": 20,
    "presentation": 30, "negotiation": 40, "mentoring": 30,
    # Security
    "cybersecurity": 120, "penetration testing": 100, "soc": 80,
    "siem": 60, "iso 27001": 40, "gdpr": 20, "encryption": 40,
    "firewall": 30, "vulnerability assessment": 60,
    # Other tech
    "git": 20, "github": 10, "rest api": 30, "microservices": 60,
    "api design": 40, "websockets": 20, "grpc": 30, "rabbitmq": 30,
    "kafka": 50, "testing": 40, "unit testing": 30, "tdd": 40, "bdd": 30,
}

# Salary impact percentage for acquiring each skill (approximate market value boost)
SKILL_SALARY_IMPACT: Dict[str, float] = {
    # High impact (>8%)
    "kubernetes": 12, "aws": 10, "machine learning": 15, "deep learning": 14,
    "gcp": 9, "azure": 9, "terraform": 10, "docker": 8, "data science": 13,
    "ai": 12, "rust": 10, "go": 9, "scala": 9, "pytorch": 11, "tensorflow": 10,
    "spark": 10, "kafka": 9, "microservices": 8, "cybersecurity": 11,
    # Medium impact (4-8%)
    "python": 7, "typescript": 6, "react": 6, "node": 5, "nodejs": 5,
    "java": 6, "c++": 7, "c#": 5, "postgresql": 5, "mongodb": 4,
    "redis": 5, "graphql": 5, "ci/cd": 6, "linux": 5, "elasticsearch": 6,
    "system design": 8, "api design": 5, "data engineering": 8,
    "spring boot": 6, "next.js": 5, "nextjs": 5, "angular": 5,
    "product management": 7, "agile": 4, "scrum": 3, "devops": 8,
    "nlp": 9, "computer vision": 9, "leadership": 6,
    # Lower impact (<4%)
    "javascript": 3, "html": 1, "css": 2, "sql": 3, "git": 2,
    "bash": 2, "excel": 2, "jira": 1, "figma": 3, "tailwind": 2,
    "sass": 1, "jquery": 1, "communication": 2, "teamwork": 1,
}


def _extract_skills(text: str) -> Set[str]:
    """Extract skills from text using same regex logic as JobMatcher."""
    if not text:
        return set()
    text_lower = text.lower()
    found = set()
    for skill in ALL_SKILLS:
        if len(skill) <= 3:
            if re.search(r'\b' + re.escape(skill) + r'\b', text_lower):
                found.add(skill)
        else:
            if skill in text_lower:
                found.add(skill)
    return found


def _get_skill_category(skill_name: str) -> str:
    """Map a skill to its category from SKILL_CATEGORIES."""
    skill_lower = skill_name.lower()
    for category, skills in SKILL_CATEGORIES.items():
        if skill_lower in skills:
            return category
    return "other"


def _detect_target_role(cv_text: str, parsed_data: Dict) -> str:
    """Auto-detect target role from CV content (reuses keyword_analyzer logic)."""
    experience = parsed_data.get("experience", [])
    latest_title = ""
    if experience:
        latest_title = experience[0].get("title", "").lower()

    for alias, role_key in ROLE_ALIASES.items():
        if alias in latest_title:
            return role_key

    skills = parsed_data.get("skills", [])
    skills_text = " ".join(skills).lower() if skills else cv_text.lower()

    best_role = "software_engineer"
    best_score = 0

    for role_key, role_keywords in ROLE_KEYWORDS.items():
        score = 0
        for keyword_entry in role_keywords:
            if keyword_entry["keyword"].lower() in skills_text:
                frequency = int(keyword_entry["frequency"].replace("%", ""))
                score += frequency
        if score > best_score:
            best_score = score
            best_role = role_key

    return best_role


class SkillGapAnalyzer:
    """Analyzes skill gaps between a user's CV and target role requirements."""

    def analyze(
        self,
        cv_text: str,
        parsed_data: Dict,
        target_role: Optional[str] = None,
        target_job_description: Optional[str] = None,
    ) -> Dict:
        """
        Analyze skill gaps and produce a prioritized learning path.

        Args:
            cv_text: Raw CV text
            parsed_data: Parsed CV data with skills, experience, etc.
            target_role: Optional target role (auto-detected if not provided)
            target_job_description: Optional job description for targeted analysis

        Returns:
            Comprehensive skill gap analysis with learning path
        """
        # 1. Extract current skills from CV text + parsed skills
        current_skills = _extract_skills(cv_text)
        parsed_skill_list = parsed_data.get("skills", [])
        for skill in parsed_skill_list:
            normalized_skill = skill.strip().lower()
            if normalized_skill in ALL_SKILLS:
                current_skills.add(normalized_skill)

        # 2. Categorize current skills
        categorized_current: Dict[str, List[str]] = {}
        for skill in current_skills:
            category = _get_skill_category(skill)
            categorized_current.setdefault(category, []).append(skill)

        # 3. Determine target role
        if target_role:
            normalized_role = ROLE_ALIASES.get(target_role.lower(), target_role.lower())
            if normalized_role not in ROLE_KEYWORDS:
                normalized_role = _detect_target_role(cv_text, parsed_data)
        else:
            normalized_role = _detect_target_role(cv_text, parsed_data)

        # 4. Build target skill set from role keywords + job description
        target_skills: Dict[str, int] = {}  # skill -> frequency

        role_keyword_list = ROLE_KEYWORDS.get(normalized_role, ROLE_KEYWORDS["software_engineer"])
        for keyword_entry in role_keyword_list:
            keyword_lower = keyword_entry["keyword"].lower()
            frequency = int(keyword_entry["frequency"].replace("%", ""))
            target_skills[keyword_lower] = frequency

        # Add skills from job description if provided
        if target_job_description:
            job_description_skills = _extract_skills(target_job_description)
            for skill in job_description_skills:
                if skill not in target_skills:
                    target_skills[skill] = 50  # default frequency for JD-extracted skills

        # 5. Compute missing skills with metadata
        missing_skills = []
        for skill_name, frequency in target_skills.items():
            # Check if user already has this skill (direct or alias match)
            if skill_name in current_skills:
                continue
            # Also check cv_text directly for longer skill names
            if len(skill_name) > 3 and skill_name in cv_text.lower():
                continue

            # Determine priority
            if frequency >= 70:
                priority = "high"
            elif frequency >= 45:
                priority = "medium"
            else:
                priority = "low"

            estimated_hours = SKILL_LEARNING_ESTIMATES.get(skill_name, 40)
            salary_impact = SKILL_SALARY_IMPACT.get(skill_name, 3)

            # ROI = salary_impact / (estimated_hours / 40) - value per week invested
            roi_score = round(salary_impact / max(estimated_hours / 40, 0.5), 2)

            category = _get_skill_category(skill_name)

            missing_skills.append({
                "name": skill_name,
                "category": category,
                "priority": priority,
                "frequency": f"{frequency}%",
                "estimated_hours": estimated_hours,
                "salary_impact": f"+{salary_impact}%",
                "roi_score": roi_score,
            })

        # Sort by ROI score descending
        missing_skills.sort(key=lambda skill: skill["roi_score"], reverse=True)

        # 6. Compute skill coverage
        total_target = len(target_skills)
        matched_count = total_target - len(missing_skills)
        skill_coverage = round((matched_count / total_target * 100) if total_target > 0 else 0, 1)

        # 7. Build phased learning path
        recommended_learning_path = self._build_learning_path(missing_skills)

        # 8. Compute category breakdown for charts
        category_breakdown = self._build_category_breakdown(
            categorized_current, target_skills, current_skills
        )

        total_estimated_hours = sum(
            skill["estimated_hours"] for skill in missing_skills
        )

        # Summary
        if skill_coverage >= 80:
            summary = f"Excellent match for {normalized_role.replace('_', ' ')}! You have {matched_count}/{total_target} target skills. Focus on the remaining {len(missing_skills)} skills to become a top candidate."
        elif skill_coverage >= 50:
            summary = f"Good foundation for {normalized_role.replace('_', ' ')}. You have {matched_count}/{total_target} target skills. Prioritize high-ROI skills to close the gap efficiently."
        else:
            summary = f"Significant skill gaps for {normalized_role.replace('_', ' ')}. You have {matched_count}/{total_target} target skills. Start with the foundation phase to build core competencies."

        return {
            "current_skills": sorted(list(current_skills)),
            "target_role": normalized_role,
            "skill_coverage": skill_coverage,
            "matched_count": matched_count,
            "total_target_skills": total_target,
            "missing_skills": missing_skills,
            "recommended_learning_path": recommended_learning_path,
            "category_breakdown": category_breakdown,
            "total_estimated_hours": total_estimated_hours,
            "summary": summary,
        }

    def _build_learning_path(self, missing_skills: List[Dict]) -> List[Dict]:
        """Group missing skills into phased learning path."""
        foundation_skills = []
        intermediate_skills = []
        advanced_skills = []

        for skill in missing_skills:
            phase_skill = {
                "name": skill["name"],
                "category": skill["category"],
                "estimated_hours": skill["estimated_hours"],
                "priority": skill["priority"],
                "roi_score": skill["roi_score"],
            }
            if skill["priority"] == "high":
                foundation_skills.append(phase_skill)
            elif skill["priority"] == "medium":
                intermediate_skills.append(phase_skill)
            else:
                advanced_skills.append(phase_skill)

        learning_path = []
        if foundation_skills:
            foundation_hours = sum(skill["estimated_hours"] for skill in foundation_skills)
            learning_path.append({
                "phase": "Foundation",
                "description": "Core skills required for the role - highest impact and most frequently requested by employers.",
                "total_hours": foundation_hours,
                "skills": foundation_skills,
            })
        if intermediate_skills:
            intermediate_hours = sum(skill["estimated_hours"] for skill in intermediate_skills)
            learning_path.append({
                "phase": "Intermediate",
                "description": "Important skills that strengthen your candidacy and broaden your capabilities.",
                "total_hours": intermediate_hours,
                "skills": intermediate_skills,
            })
        if advanced_skills:
            advanced_hours = sum(skill["estimated_hours"] for skill in advanced_skills)
            learning_path.append({
                "phase": "Advanced",
                "description": "Specialized skills that differentiate you from other candidates.",
                "total_hours": advanced_hours,
                "skills": advanced_skills,
            })

        return learning_path

    def _build_category_breakdown(
        self,
        categorized_current: Dict[str, List[str]],
        target_skills: Dict[str, int],
        current_skills: Set[str],
    ) -> List[Dict]:
        """Build per-category skill counts for chart visualization."""
        # Count target skills per category
        target_by_category: Dict[str, int] = {}
        for skill_name in target_skills:
            category = _get_skill_category(skill_name)
            target_by_category[category] = target_by_category.get(category, 0) + 1

        # Merge categories from both current and target
        all_categories = set(categorized_current.keys()) | set(target_by_category.keys())

        breakdown = []
        for category in sorted(all_categories):
            current_count = len(categorized_current.get(category, []))
            target_count = target_by_category.get(category, 0)
            # Only count current skills that are also in target for "matched"
            matched_in_category = sum(
                1 for skill in categorized_current.get(category, [])
                if skill in target_skills
            )
            breakdown.append({
                "category": category.replace("_", " ").title(),
                "current": current_count,
                "target": target_count,
                "matched": matched_in_category,
            })

        return breakdown
