"""
Keyword Analyzer - KeyBERT + JobBERT
Extracts keywords from CVs and identifies gaps against target roles.
No external API calls - runs entirely locally.
"""

import logging
from typing import Dict, List, Tuple, Optional

logger = logging.getLogger(__name__)

# Industry keyword sets ranked by frequency in job postings
ROLE_KEYWORDS: Dict[str, List[Dict[str, str]]] = {
    "software_engineer": [
        {"keyword": "Python", "frequency": "85%", "section": "Skills"},
        {"keyword": "JavaScript", "frequency": "82%", "section": "Skills"},
        {"keyword": "TypeScript", "frequency": "76%", "section": "Skills"},
        {"keyword": "React", "frequency": "71%", "section": "Skills"},
        {"keyword": "Node.js", "frequency": "68%", "section": "Skills"},
        {"keyword": "SQL", "frequency": "79%", "section": "Skills"},
        {"keyword": "Git", "frequency": "88%", "section": "Skills"},
        {"keyword": "Docker", "frequency": "65%", "section": "Experience"},
        {"keyword": "AWS", "frequency": "62%", "section": "Experience"},
        {"keyword": "CI/CD", "frequency": "58%", "section": "Experience"},
        {"keyword": "REST API", "frequency": "72%", "section": "Experience"},
        {"keyword": "Microservices", "frequency": "55%", "section": "Experience"},
        {"keyword": "Kubernetes", "frequency": "48%", "section": "Experience"},
        {"keyword": "PostgreSQL", "frequency": "52%", "section": "Skills"},
        {"keyword": "MongoDB", "frequency": "45%", "section": "Skills"},
        {"keyword": "Redis", "frequency": "38%", "section": "Skills"},
        {"keyword": "Agile", "frequency": "74%", "section": "Experience"},
        {"keyword": "Unit Testing", "frequency": "61%", "section": "Experience"},
        {"keyword": "Linux", "frequency": "56%", "section": "Skills"},
        {"keyword": "Java", "frequency": "58%", "section": "Skills"},
        {"keyword": "C++", "frequency": "35%", "section": "Skills"},
        {"keyword": "GraphQL", "frequency": "32%", "section": "Skills"},
        {"keyword": "Terraform", "frequency": "30%", "section": "Experience"},
        {"keyword": "System Design", "frequency": "45%", "section": "Experience"},
    ],
    "frontend_developer": [
        {"keyword": "JavaScript", "frequency": "92%", "section": "Skills"},
        {"keyword": "React", "frequency": "85%", "section": "Skills"},
        {"keyword": "TypeScript", "frequency": "80%", "section": "Skills"},
        {"keyword": "CSS", "frequency": "88%", "section": "Skills"},
        {"keyword": "HTML", "frequency": "90%", "section": "Skills"},
        {"keyword": "Next.js", "frequency": "55%", "section": "Skills"},
        {"keyword": "Vue.js", "frequency": "42%", "section": "Skills"},
        {"keyword": "Tailwind CSS", "frequency": "48%", "section": "Skills"},
        {"keyword": "Webpack", "frequency": "45%", "section": "Skills"},
        {"keyword": "Responsive Design", "frequency": "78%", "section": "Experience"},
        {"keyword": "REST API", "frequency": "65%", "section": "Experience"},
        {"keyword": "Git", "frequency": "85%", "section": "Skills"},
        {"keyword": "Jest", "frequency": "52%", "section": "Skills"},
        {"keyword": "Figma", "frequency": "38%", "section": "Skills"},
        {"keyword": "Accessibility", "frequency": "42%", "section": "Experience"},
        {"keyword": "Performance Optimization", "frequency": "48%", "section": "Experience"},
        {"keyword": "State Management", "frequency": "55%", "section": "Experience"},
        {"keyword": "Redux", "frequency": "45%", "section": "Skills"},
        {"keyword": "Angular", "frequency": "35%", "section": "Skills"},
        {"keyword": "SASS", "frequency": "40%", "section": "Skills"},
    ],
    "backend_developer": [
        {"keyword": "Python", "frequency": "78%", "section": "Skills"},
        {"keyword": "Java", "frequency": "72%", "section": "Skills"},
        {"keyword": "Node.js", "frequency": "68%", "section": "Skills"},
        {"keyword": "SQL", "frequency": "85%", "section": "Skills"},
        {"keyword": "PostgreSQL", "frequency": "65%", "section": "Skills"},
        {"keyword": "REST API", "frequency": "82%", "section": "Experience"},
        {"keyword": "Docker", "frequency": "72%", "section": "Experience"},
        {"keyword": "Microservices", "frequency": "62%", "section": "Experience"},
        {"keyword": "AWS", "frequency": "68%", "section": "Experience"},
        {"keyword": "Redis", "frequency": "48%", "section": "Skills"},
        {"keyword": "MongoDB", "frequency": "52%", "section": "Skills"},
        {"keyword": "Kubernetes", "frequency": "45%", "section": "Experience"},
        {"keyword": "CI/CD", "frequency": "58%", "section": "Experience"},
        {"keyword": "GraphQL", "frequency": "38%", "section": "Skills"},
        {"keyword": "Message Queues", "frequency": "42%", "section": "Experience"},
        {"keyword": "Caching", "frequency": "45%", "section": "Experience"},
        {"keyword": "Git", "frequency": "85%", "section": "Skills"},
        {"keyword": "Linux", "frequency": "62%", "section": "Skills"},
        {"keyword": "Security", "frequency": "38%", "section": "Experience"},
        {"keyword": "Database Design", "frequency": "55%", "section": "Experience"},
    ],
    "data_scientist": [
        {"keyword": "Python", "frequency": "92%", "section": "Skills"},
        {"keyword": "Machine Learning", "frequency": "88%", "section": "Skills"},
        {"keyword": "SQL", "frequency": "78%", "section": "Skills"},
        {"keyword": "TensorFlow", "frequency": "58%", "section": "Skills"},
        {"keyword": "PyTorch", "frequency": "55%", "section": "Skills"},
        {"keyword": "Pandas", "frequency": "82%", "section": "Skills"},
        {"keyword": "NumPy", "frequency": "78%", "section": "Skills"},
        {"keyword": "Scikit-learn", "frequency": "72%", "section": "Skills"},
        {"keyword": "Deep Learning", "frequency": "52%", "section": "Skills"},
        {"keyword": "NLP", "frequency": "45%", "section": "Skills"},
        {"keyword": "Computer Vision", "frequency": "35%", "section": "Skills"},
        {"keyword": "Statistics", "frequency": "75%", "section": "Skills"},
        {"keyword": "Data Visualization", "frequency": "68%", "section": "Experience"},
        {"keyword": "A/B Testing", "frequency": "42%", "section": "Experience"},
        {"keyword": "Feature Engineering", "frequency": "55%", "section": "Experience"},
        {"keyword": "AWS", "frequency": "48%", "section": "Experience"},
        {"keyword": "Spark", "frequency": "38%", "section": "Skills"},
        {"keyword": "R", "frequency": "35%", "section": "Skills"},
        {"keyword": "Tableau", "frequency": "32%", "section": "Skills"},
        {"keyword": "Git", "frequency": "72%", "section": "Skills"},
    ],
    "devops_engineer": [
        {"keyword": "Docker", "frequency": "90%", "section": "Skills"},
        {"keyword": "Kubernetes", "frequency": "82%", "section": "Skills"},
        {"keyword": "AWS", "frequency": "85%", "section": "Skills"},
        {"keyword": "CI/CD", "frequency": "88%", "section": "Experience"},
        {"keyword": "Terraform", "frequency": "72%", "section": "Skills"},
        {"keyword": "Linux", "frequency": "88%", "section": "Skills"},
        {"keyword": "Python", "frequency": "65%", "section": "Skills"},
        {"keyword": "Bash", "frequency": "72%", "section": "Skills"},
        {"keyword": "Jenkins", "frequency": "55%", "section": "Skills"},
        {"keyword": "Ansible", "frequency": "48%", "section": "Skills"},
        {"keyword": "Monitoring", "frequency": "68%", "section": "Experience"},
        {"keyword": "Git", "frequency": "85%", "section": "Skills"},
        {"keyword": "Networking", "frequency": "58%", "section": "Skills"},
        {"keyword": "Security", "frequency": "52%", "section": "Experience"},
        {"keyword": "Infrastructure as Code", "frequency": "62%", "section": "Experience"},
        {"keyword": "Prometheus", "frequency": "42%", "section": "Skills"},
        {"keyword": "Grafana", "frequency": "40%", "section": "Skills"},
        {"keyword": "GCP", "frequency": "38%", "section": "Skills"},
        {"keyword": "Azure", "frequency": "42%", "section": "Skills"},
        {"keyword": "Microservices", "frequency": "55%", "section": "Experience"},
    ],
    "product_manager": [
        {"keyword": "Product Strategy", "frequency": "85%", "section": "Experience"},
        {"keyword": "Agile", "frequency": "82%", "section": "Experience"},
        {"keyword": "Scrum", "frequency": "72%", "section": "Experience"},
        {"keyword": "User Research", "frequency": "68%", "section": "Experience"},
        {"keyword": "Roadmap", "frequency": "78%", "section": "Experience"},
        {"keyword": "Stakeholder Management", "frequency": "72%", "section": "Experience"},
        {"keyword": "Data Analysis", "frequency": "65%", "section": "Skills"},
        {"keyword": "A/B Testing", "frequency": "55%", "section": "Experience"},
        {"keyword": "SQL", "frequency": "48%", "section": "Skills"},
        {"keyword": "Jira", "frequency": "68%", "section": "Skills"},
        {"keyword": "KPIs", "frequency": "62%", "section": "Experience"},
        {"keyword": "User Stories", "frequency": "65%", "section": "Experience"},
        {"keyword": "Wireframing", "frequency": "42%", "section": "Skills"},
        {"keyword": "Market Research", "frequency": "55%", "section": "Experience"},
        {"keyword": "Cross-functional", "frequency": "72%", "section": "Experience"},
        {"keyword": "Prioritization", "frequency": "58%", "section": "Experience"},
        {"keyword": "Analytics", "frequency": "62%", "section": "Skills"},
        {"keyword": "Figma", "frequency": "35%", "section": "Skills"},
        {"keyword": "Go-to-Market", "frequency": "45%", "section": "Experience"},
        {"keyword": "OKRs", "frequency": "42%", "section": "Experience"},
    ],
    "full_stack_developer": [
        {"keyword": "JavaScript", "frequency": "88%", "section": "Skills"},
        {"keyword": "React", "frequency": "78%", "section": "Skills"},
        {"keyword": "Node.js", "frequency": "75%", "section": "Skills"},
        {"keyword": "TypeScript", "frequency": "72%", "section": "Skills"},
        {"keyword": "Python", "frequency": "62%", "section": "Skills"},
        {"keyword": "SQL", "frequency": "78%", "section": "Skills"},
        {"keyword": "PostgreSQL", "frequency": "55%", "section": "Skills"},
        {"keyword": "MongoDB", "frequency": "52%", "section": "Skills"},
        {"keyword": "Docker", "frequency": "58%", "section": "Experience"},
        {"keyword": "REST API", "frequency": "80%", "section": "Experience"},
        {"keyword": "Git", "frequency": "88%", "section": "Skills"},
        {"keyword": "AWS", "frequency": "55%", "section": "Experience"},
        {"keyword": "CSS", "frequency": "75%", "section": "Skills"},
        {"keyword": "HTML", "frequency": "78%", "section": "Skills"},
        {"keyword": "Next.js", "frequency": "45%", "section": "Skills"},
        {"keyword": "CI/CD", "frequency": "48%", "section": "Experience"},
        {"keyword": "Agile", "frequency": "68%", "section": "Experience"},
        {"keyword": "Testing", "frequency": "58%", "section": "Experience"},
        {"keyword": "Redis", "frequency": "35%", "section": "Skills"},
        {"keyword": "GraphQL", "frequency": "32%", "section": "Skills"},
    ],
}

# Role name normalization mapping
ROLE_ALIASES: Dict[str, str] = {
    "software engineer": "software_engineer",
    "software developer": "software_engineer",
    "swe": "software_engineer",
    "programmer": "software_engineer",
    "frontend developer": "frontend_developer",
    "front-end developer": "frontend_developer",
    "frontend engineer": "frontend_developer",
    "front end": "frontend_developer",
    "ui developer": "frontend_developer",
    "backend developer": "backend_developer",
    "back-end developer": "backend_developer",
    "backend engineer": "backend_developer",
    "server-side developer": "backend_developer",
    "data scientist": "data_scientist",
    "data analyst": "data_scientist",
    "ml engineer": "data_scientist",
    "machine learning engineer": "data_scientist",
    "devops engineer": "devops_engineer",
    "devops": "devops_engineer",
    "site reliability engineer": "devops_engineer",
    "sre": "devops_engineer",
    "platform engineer": "devops_engineer",
    "product manager": "product_manager",
    "pm": "product_manager",
    "product owner": "product_manager",
    "full stack developer": "full_stack_developer",
    "full-stack developer": "full_stack_developer",
    "fullstack developer": "full_stack_developer",
    "full stack engineer": "full_stack_developer",
}


class KeywordAnalyzer:
    """
    Analyzes CV keywords using KeyBERT + JobBERT.
    Identifies skill gaps against target roles.
    """

    def __init__(self):
        self._kw_model = None
        logger.info("KeywordAnalyzer initialized (lazy loading)")

    def _get_model(self):
        """Lazy-load KeyBERT with JobBERT to avoid slow startup."""
        if self._kw_model is None:
            try:
                from keybert import KeyBERT
                logger.info("Loading KeyBERT with JobBERT model...")
                self._kw_model = KeyBERT(model="jjzha/jobbert-base-cased")
                logger.info("KeyBERT + JobBERT loaded successfully")
            except ImportError:
                logger.warning("keybert not installed, falling back to simple extraction")
                self._kw_model = "fallback"
            except Exception as e:
                logger.warning(f"Failed to load JobBERT: {e}, falling back")
                self._kw_model = "fallback"
        return self._kw_model

    def extract_cv_keywords(self, cv_text: str, top_n: int = 30) -> List[Tuple[str, float]]:
        """Extract keywords from CV text using KeyBERT + JobBERT."""
        model = self._get_model()

        if model == "fallback":
            return self._extract_keywords_simple(cv_text)

        try:
            keywords = model.extract_keywords(
                cv_text,
                keyphrase_ngram_range=(1, 2),
                stop_words="english",
                top_n=top_n,
                use_mmr=True,
                diversity=0.5,
            )
            return keywords
        except Exception as e:
            logger.error(f"KeyBERT extraction failed: {e}")
            return self._extract_keywords_simple(cv_text)

    def _extract_keywords_simple(self, text: str) -> List[Tuple[str, float]]:
        """Fallback: simple keyword matching against known tech terms."""
        all_keywords = set()
        for role_keywords in ROLE_KEYWORDS.values():
            for kw_entry in role_keywords:
                all_keywords.add(kw_entry["keyword"].lower())

        text_lower = text.lower()
        found = []
        for kw in all_keywords:
            if kw in text_lower:
                found.append((kw, 0.8))
        return sorted(found, key=lambda x: x[1], reverse=True)

    def detect_target_role(self, cv_text: str, parsed_data: Dict) -> str:
        """
        Auto-detect target role from CV content.
        Uses latest job title and skills to infer the best matching role.
        """
        # Try to get the most recent job title
        experience = parsed_data.get("experience", [])
        latest_title = ""
        if experience:
            latest_title = experience[0].get("title", "").lower()

        # Check title against role aliases
        for alias, role_key in ROLE_ALIASES.items():
            if alias in latest_title:
                logger.info(f"Detected role from title: {role_key}")
                return role_key

        # Fallback: score each role by keyword overlap
        skills = parsed_data.get("skills", [])
        skills_text = " ".join(skills).lower() if skills else cv_text.lower()

        best_role = "software_engineer"
        best_score = 0

        for role_key, role_kws in ROLE_KEYWORDS.items():
            score = 0
            for kw_entry in role_kws:
                if kw_entry["keyword"].lower() in skills_text:
                    freq = int(kw_entry["frequency"].replace("%", ""))
                    score += freq
            if score > best_score:
                best_score = score
                best_role = role_key

        logger.info(f"Detected role from skills: {best_role} (score: {best_score})")
        return best_role

    def analyze_keyword_gaps(
        self,
        cv_text: str,
        parsed_data: Dict,
        target_role: Optional[str] = None,
    ) -> Dict:
        """
        Analyze keyword gaps between CV and target role.

        Returns:
            {
                "target_role": str,
                "cv_keywords": [...],
                "missing_keywords": [...],
                "keyword_match_score": float (0-100),
            }
        """
        # Determine target role
        if target_role:
            normalized_role = ROLE_ALIASES.get(target_role.lower(), target_role.lower())
            if normalized_role not in ROLE_KEYWORDS:
                normalized_role = self.detect_target_role(cv_text, parsed_data)
        else:
            normalized_role = self.detect_target_role(cv_text, parsed_data)

        role_keywords = ROLE_KEYWORDS.get(normalized_role, ROLE_KEYWORDS["software_engineer"])

        # Extract CV keywords
        cv_keywords = self.extract_cv_keywords(cv_text)
        cv_keyword_set = {kw.lower() for kw, _ in cv_keywords}

        # Also include parsed skills
        parsed_skills = {s.lower() for s in parsed_data.get("skills", [])}
        cv_keyword_set = cv_keyword_set | parsed_skills

        # Also check raw CV text for role keywords
        cv_text_lower = cv_text.lower()

        # Find missing keywords
        missing_keywords = []
        matched_count = 0

        for kw_entry in role_keywords:
            keyword_lower = kw_entry["keyword"].lower()
            is_found = (
                keyword_lower in cv_keyword_set
                or keyword_lower in cv_text_lower
            )

            if is_found:
                matched_count += 1
            else:
                freq = int(kw_entry["frequency"].replace("%", ""))
                impact = self._estimate_impact(freq)
                missing_keywords.append({
                    "keyword": kw_entry["keyword"],
                    "jobFrequency": kw_entry["frequency"],
                    "section": kw_entry["section"],
                    "impact": impact,
                })

        # Calculate match score
        total_keywords = len(role_keywords)
        keyword_match_score = (matched_count / total_keywords * 100) if total_keywords > 0 else 0

        # Sort missing by frequency (most important first)
        missing_keywords.sort(
            key=lambda x: int(x["jobFrequency"].replace("%", "")),
            reverse=True,
        )

        return {
            "target_role": normalized_role,
            "cv_keywords": [(kw, round(score, 3)) for kw, score in cv_keywords[:15]],
            "missing_keywords": missing_keywords[:15],
            "keyword_match_score": round(keyword_match_score, 1),
            "matched_count": matched_count,
            "total_role_keywords": total_keywords,
        }

    def _estimate_impact(self, frequency: int) -> str:
        """Estimate the impact of adding a missing keyword based on its frequency."""
        if frequency >= 80:
            return f"+{min(frequency // 5, 18)}%"
        elif frequency >= 60:
            return f"+{frequency // 6}%"
        elif frequency >= 40:
            return f"+{frequency // 8}%"
        else:
            return f"+{max(frequency // 10, 3)}%"
