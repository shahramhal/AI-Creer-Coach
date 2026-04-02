"""
ATS Scorer - Job-specific ATS keyword matching.
Compares a CV against a specific job description to produce
keyword match, semantic similarity, and skills coverage scores.
"""

import logging
import re
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

# Shared model instance - set from main.py to avoid double memory usage
_shared_sentence_model = None


def set_shared_model(model):
    """Set the shared SentenceTransformer model instance."""
    global _shared_sentence_model
    _shared_sentence_model = model


def get_shared_model():
    """Get or lazy-load the shared SentenceTransformer model."""
    global _shared_sentence_model
    if _shared_sentence_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info("Loading SentenceTransformer model for ATS scoring...")
            _shared_sentence_model = SentenceTransformer("all-MiniLM-L6-v2")
            logger.info("SentenceTransformer loaded successfully")
        except ImportError:
            logger.warning("sentence-transformers not installed, semantic scoring disabled")
        except Exception as exc:
            logger.warning(f"Failed to load SentenceTransformer: {exc}")
    return _shared_sentence_model


class ATSScorer:
    """
    Job-specific ATS scorer.
    Computes keyword match, semantic similarity, and skills coverage
    between a CV and a job description.
    """

    # Scoring weights
    KEYWORD_WEIGHT = 0.45
    SEMANTIC_WEIGHT = 0.30
    SKILLS_WEIGHT = 0.25

    def __init__(self):
        self._kw_model = None
        logger.info("ATSScorer initialized (lazy loading)")

    def _get_keybert_model(self):
        """Lazy-load KeyBERT for keyword extraction."""
        if self._kw_model is None:
            try:
                from keybert import KeyBERT
                logger.info("Loading KeyBERT for ATS keyword extraction...")
                self._kw_model = KeyBERT(model="jjzha/jobbert-base-cased")
                logger.info("KeyBERT loaded for ATS scoring")
            except ImportError:
                logger.warning("keybert not installed, falling back to simple extraction")
                self._kw_model = "fallback"
            except Exception as exc:
                logger.warning(f"Failed to load KeyBERT: {exc}, falling back")
                self._kw_model = "fallback"
        return self._kw_model

    def score(
        self,
        cv_text: str,
        parsed_data: Dict,
        job_description: str,
        job_requirements: str = "",
        job_skills: Optional[List[str]] = None,
    ) -> Dict:
        """
        Score CV against a specific job description.

        Args:
            cv_text: Raw CV text
            parsed_data: Structured parsed CV data
            job_description: Full job description text
            job_requirements: Additional requirements text
            job_skills: Explicit skill list from the Job record

        Returns:
            ATS score result with breakdown, matched/missing keywords, suggestions.
        """
        logger.info("Running ATS scoring against job description")

        # Combine job text for keyword extraction
        combined_job_text = job_description
        if job_requirements:
            combined_job_text += "\n" + job_requirements

        # Step 1: Extract keywords from job description
        job_keywords = self._extract_keywords(combined_job_text)

        # Step 2: Extract keywords from CV
        cv_keywords = self._extract_keywords(cv_text)
        cv_keyword_set = {kw.lower() for kw, _ in cv_keywords}

        # Also include parsed skills
        parsed_skills = {skill.lower() for skill in parsed_data.get("skills", [])}
        cv_keyword_set = cv_keyword_set | parsed_skills

        # Also check raw CV text for matches
        cv_text_lower = cv_text.lower()

        # Step 3: Compute keyword matches
        keywords_matched = []
        keywords_missing = []
        total_job_keywords = len(job_keywords)

        for keyword, relevance_score in job_keywords:
            keyword_lower = keyword.lower()
            found_in = self._find_keyword_location(keyword_lower, cv_keyword_set, cv_text_lower, parsed_data)

            if found_in:
                keywords_matched.append({
                    "keyword": keyword,
                    "foundIn": found_in,
                })
            else:
                importance = "high" if relevance_score >= 0.5 else "medium" if relevance_score >= 0.3 else "low"
                suggestion = self._generate_suggestion(keyword)
                keywords_missing.append({
                    "keyword": keyword,
                    "importance": importance,
                    "suggestion": suggestion,
                })

        # Keyword match score (0-100)
        matched_count = len(keywords_matched)
        keyword_match_score = round(matched_count / total_job_keywords * 100) if total_job_keywords > 0 else 0
        keyword_match_score = min(keyword_match_score, 100)

        # Step 4: Compute semantic similarity
        semantic_score = self._compute_semantic_similarity(cv_text, combined_job_text)

        # Step 5: Compute skills coverage
        skills_coverage_score = self._compute_skills_coverage(parsed_data, job_skills or [])

        # Step 6: Compute overall ATS score
        ats_score = round(
            keyword_match_score * self.KEYWORD_WEIGHT
            + semantic_score * self.SEMANTIC_WEIGHT
            + skills_coverage_score * self.SKILLS_WEIGHT
        )
        ats_score = min(ats_score, 100)

        # Generate suggestions
        suggestions = self._generate_suggestions(keywords_missing, keyword_match_score, semantic_score)

        result = {
            "atsScore": ats_score,
            "breakdown": {
                "keywordMatch": keyword_match_score,
                "semanticSimilarity": semantic_score,
                "skillsCoverage": skills_coverage_score,
            },
            "keywordsMatched": keywords_matched,
            "keywordsMissing": keywords_missing,
            "matchDetails": {
                "totalJobKeywords": total_job_keywords,
                "matchedCount": matched_count,
                "semanticScore": round(semantic_score / 100, 3),
            },
            "suggestions": suggestions,
        }

        logger.info(f"ATS scoring complete: score={ats_score}/100, matched={matched_count}/{total_job_keywords}")
        return result

    def _extract_keywords(self, text: str, top_n: int = 20) -> List[tuple]:
        """Extract keywords from text using KeyBERT or fallback."""
        model = self._get_keybert_model()

        if model == "fallback":
            return self._extract_keywords_simple(text)

        try:
            keywords = model.extract_keywords(
                text,
                keyphrase_ngram_range=(1, 2),
                stop_words="english",
                top_n=top_n,
                use_mmr=True,
                diversity=0.5,
            )
            return keywords
        except Exception as exc:
            logger.error(f"KeyBERT extraction failed: {exc}")
            return self._extract_keywords_simple(text)

    def _extract_keywords_simple(self, text: str) -> List[tuple]:
        """Fallback keyword extraction using common tech terms."""
        common_terms = {
            "python", "javascript", "typescript", "react", "node.js", "sql",
            "aws", "docker", "kubernetes", "git", "ci/cd", "rest api",
            "java", "c++", "go", "rust", "mongodb", "postgresql", "redis",
            "machine learning", "deep learning", "tensorflow", "pytorch",
            "agile", "scrum", "microservices", "graphql", "linux",
            "html", "css", "next.js", "vue.js", "angular", "tailwind",
            "terraform", "ansible", "jenkins", "kafka", "spark",
            "data analysis", "data visualization", "a/b testing",
            "project management", "leadership", "communication",
        }
        text_lower = text.lower()
        found = []
        for term in common_terms:
            if term in text_lower:
                found.append((term, 0.5))
        return sorted(found, key=lambda x: x[1], reverse=True)

    def _find_keyword_location(
        self,
        keyword_lower: str,
        cv_keyword_set: set,
        cv_text_lower: str,
        parsed_data: Dict,
    ) -> Optional[str]:
        """Determine where a keyword was found in the CV."""
        if keyword_lower in cv_keyword_set:
            # Check if it's in skills
            parsed_skills_lower = {s.lower() for s in parsed_data.get("skills", [])}
            if keyword_lower in parsed_skills_lower:
                return "Skills"
            return "Content"

        if keyword_lower in cv_text_lower:
            # Check specific sections
            summary = (parsed_data.get("summary", "") or "").lower()
            if keyword_lower in summary:
                return "Summary"

            for exp in parsed_data.get("experience", []):
                exp_text = " ".join(
                    [exp.get("title", ""), exp.get("company", "")]
                    + exp.get("responsibilities", [])
                    + exp.get("achievements", [])
                ).lower()
                if keyword_lower in exp_text:
                    return "Experience"

            return "Content"

        return None

    def _compute_semantic_similarity(self, cv_text: str, job_text: str) -> int:
        """Compute semantic similarity between CV and job description."""
        model = get_shared_model()
        if model is None:
            return 50  # Neutral fallback

        try:
            from sentence_transformers import util

            cv_embedding = model.encode(cv_text[:2000], convert_to_tensor=True)
            job_embedding = model.encode(job_text[:2000], convert_to_tensor=True)
            similarity = util.cos_sim(cv_embedding, job_embedding).item()
            # Map from [-1,1] cosine similarity to [0,100] score
            # Typical CV-job similarities range from 0.2-0.8
            score = round(max(0, min(similarity * 120, 100)))
            return score
        except Exception as exc:
            logger.error(f"Semantic similarity failed: {exc}")
            return 50

    def _compute_skills_coverage(self, parsed_data: Dict, job_skills: List[str]) -> int:
        """Compute how many explicit job skills are covered by the CV."""
        if not job_skills:
            return 70  # Neutral when no explicit skills listed

        cv_skills = {skill.lower() for skill in parsed_data.get("skills", [])}
        cv_text_skills = set()

        # Also check experience text for skill mentions
        for exp in parsed_data.get("experience", []):
            exp_text = " ".join(
                exp.get("responsibilities", []) + exp.get("achievements", [])
            ).lower()
            for job_skill in job_skills:
                if job_skill.lower() in exp_text:
                    cv_text_skills.add(job_skill.lower())

        all_cv_skills = cv_skills | cv_text_skills
        matched_skills = sum(1 for skill in job_skills if skill.lower() in all_cv_skills)

        coverage = round(matched_skills / len(job_skills) * 100) if job_skills else 0
        return min(coverage, 100)

    def _generate_suggestion(self, keyword: str) -> str:
        """Generate a suggestion for incorporating a missing keyword."""
        return f"Consider adding '{keyword}' to your Skills or Experience section where relevant."

    def _generate_suggestions(
        self,
        missing_keywords: List[Dict],
        keyword_score: int,
        semantic_score: int,
    ) -> List[str]:
        """Generate actionable suggestions based on scoring results."""
        suggestions = []

        high_importance_missing = [kw for kw in missing_keywords if kw["importance"] == "high"]
        if high_importance_missing:
            keyword_names = ", ".join(kw["keyword"] for kw in high_importance_missing[:5])
            suggestions.append(
                f"Add these high-priority keywords to your CV: {keyword_names}"
            )

        if keyword_score < 40:
            suggestions.append(
                "Your CV has low keyword overlap with this job. "
                "Tailor your Skills and Experience sections to match the job description."
            )
        elif keyword_score < 60:
            suggestions.append(
                "Moderate keyword match. Review the missing keywords and incorporate "
                "relevant ones into your experience descriptions."
            )

        if semantic_score < 50:
            suggestions.append(
                "Your CV's overall content doesn't closely match this job. "
                "Consider rephrasing your experience to align with the job's focus areas."
            )

        medium_importance_missing = [kw for kw in missing_keywords if kw["importance"] == "medium"]
        if medium_importance_missing and len(suggestions) < 4:
            keyword_names = ", ".join(kw["keyword"] for kw in medium_importance_missing[:3])
            suggestions.append(
                f"Also consider mentioning: {keyword_names}"
            )

        return suggestions[:5]
