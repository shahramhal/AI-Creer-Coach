# apps/ml-service/job_matcher/matcher.py
"""
Job Matching Service

Uses semantic similarity to match CVs with job postings
This is the CORE ML feature of the platform
"""

from sentence_transformers import SentenceTransformer, util
import torch
import numpy as np
from typing import List, Dict, Optional
import logging
import hashlib
import re
import time

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Comprehensive multi-industry skill set (~200+ skills)
# Used by _extract_keywords() for CV and job skill extraction
# ---------------------------------------------------------------------------

SKILL_CATEGORIES = {
    'programming': {
        'python', 'javascript', 'typescript', 'java', 'c++', 'c#', 'go',
        'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'r', 'matlab',
        'perl', 'shell', 'bash', 'powershell',
    },
    'frontend': {
        'react', 'angular', 'vue', 'svelte', 'next.js', 'nextjs', 'nuxt',
        'html', 'css', 'sass', 'tailwind', 'bootstrap', 'jquery', 'webpack',
        'vite',
    },
    'backend': {
        'node', 'nodejs', 'express', 'django', 'flask', 'fastapi', 'spring',
        'spring boot', '.net', 'asp.net', 'rails', 'laravel', 'gin', 'fiber',
    },
    'database': {
        'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
        'dynamodb', 'cassandra', 'sqlite', 'oracle', 'neo4j', 'graphql',
    },
    'cloud_devops': {
        'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform',
        'ansible', 'jenkins', 'ci/cd', 'github actions', 'gitlab ci',
        'devops', 'linux', 'nginx',
    },
    'data_ml': {
        'machine learning', 'deep learning', 'data science', 'ai', 'ml',
        'nlp', 'computer vision', 'tensorflow', 'pytorch', 'pandas', 'numpy',
        'scikit-learn', 'spark', 'hadoop', 'data analysis',
        'data engineering', 'etl', 'power bi', 'tableau',
    },
    'business': {
        'project management', 'agile', 'scrum', 'kanban', 'jira',
        'confluence', 'stakeholder management', 'budgeting', 'forecasting',
        'strategy', 'business analysis', 'requirements gathering',
        'product management',
    },
    'design': {
        'figma', 'sketch', 'adobe xd', 'photoshop', 'illustrator', 'ui/ux',
        'ux design', 'ui design', 'wireframing', 'prototyping',
        'user research',
    },
    'marketing': {
        'seo', 'sem', 'google analytics', 'social media', 'content marketing',
        'email marketing', 'copywriting', 'crm', 'salesforce', 'hubspot',
    },
    'finance': {
        'financial analysis', 'accounting', 'bookkeeping', 'excel',
        'financial modeling', 'auditing', 'tax', 'compliance',
        'risk management',
    },
    'soft_skills': {
        'leadership', 'communication', 'teamwork', 'problem solving',
        'critical thinking', 'time management', 'presentation', 'negotiation',
        'mentoring',
    },
    'security': {
        'cybersecurity', 'penetration testing', 'soc', 'siem', 'iso 27001',
        'gdpr', 'encryption', 'firewall', 'vulnerability assessment',
    },
    'other_tech': {
        'git', 'github', 'rest api', 'microservices', 'api design',
        'websockets', 'grpc', 'rabbitmq', 'kafka', 'testing',
        'unit testing', 'tdd', 'bdd',
    },
}

ALL_SKILLS: set = set()
for _category_skills in SKILL_CATEGORIES.values():
    ALL_SKILLS.update(_category_skills)


class JobMatcher:
    """
    Semantic job matching using sentence transformers

    How it works:
    1. Load pre-trained transformer model
    2. Generate embeddings for CV text
    3. Generate embeddings for job descriptions (with caching)
    4. Calculate cosine similarity
    5. Rank jobs by similarity score
    6. Apply filters (location, salary, experience)
    """

    def __init__(self):
        """Initialize the sentence transformer model"""
        logger.info("Loading sentence transformer model...")

        # Load pre-trained model (384-dimensional embeddings)
        self.model = SentenceTransformer('all-MiniLM-L6-v2')

        # In-memory cache for job embeddings (job_id -> embedding)
        self._embedding_cache: Dict[str, np.ndarray] = {}
        self._cache_hits = 0
        self._cache_misses = 0

        logger.info("✅ Model loaded successfully")
    
    def match_jobs(
        self,
        cv_text: str,
        jobs: List[Dict],
        top_k: int = 20,
        filters: Dict = None
    ) -> List[Dict]:
        """
        Match CV with jobs using semantic similarity

        Args:
            cv_text: Extracted text from user's CV
            jobs: List of job dictionaries from MongoDB
            top_k: Number of top matches to return
            filters: Optional filters (location, salary, etc.)

        Returns:
            List of matched jobs with similarity scores
        """
        if not cv_text or not jobs:
            logger.warning("Empty CV text or job list")
            return []

        start_time = time.time()
        logger.info(f"Matching CV against {len(jobs)} jobs")

        # Step 1: Generate CV embedding
        cv_embedding = self.model.encode(
            cv_text,
            convert_to_tensor=True,
            show_progress_bar=False
        )

        # Step 2: Get job embeddings (with caching for efficiency)
        job_embeddings = self._get_job_embeddings_cached(jobs)

        embedding_time = time.time() - start_time
        logger.info(f"📊 Embeddings ready in {embedding_time:.2f}s (cache hits: {self._cache_hits}, misses: {self._cache_misses})")

        # Step 3: Calculate cosine similarity
        similarities = util.cos_sim(cv_embedding, job_embeddings)[0]

        # Step 4: Get top K matches
        top_results = torch.topk(similarities, k=min(top_k, len(jobs)))

        # Pre-compute CV snippet embedding once (used by title similarity in breakdown)
        cv_snippet_embedding = self.model.encode(
            cv_text[:500],
            convert_to_tensor=True,
            show_progress_bar=False
        )

        # Step 5: Build result list with scores
        matched_jobs = []
        for idx, score in zip(top_results.indices, top_results.values):
            job = jobs[idx.item()]
            description = job.get('description', '')
            truncated_description = (description[:200] + '...') if len(description) > 200 else description

            job_match = {
                'job_id': job['job_id'],
                'source': job.get('source', ''),
                'title': job.get('title', ''),
                'company': job.get('company', ''),
                'location': job.get('location', ''),
                'description': truncated_description,
                'salary_min': job.get('salary_min'),
                'salary_max': job.get('salary_max'),
                'source_url': job.get('source_url', ''),
                'posted_date': job.get('posted_date'),

                # Matching details
                'match_score': float(score.item() * 100),  # Convert to percentage
                'match_breakdown': self._calculate_breakdown(cv_text, job, cv_snippet_embedding)
            }
            matched_jobs.append(job_match)

        # Step 6: Apply filters if provided
        if filters:
            matched_jobs = self._apply_filters(matched_jobs, filters)

        total_time = time.time() - start_time
        logger.info(f"✅ Matched {len(matched_jobs)} jobs in {total_time:.2f}s")
        return matched_jobs

    def _get_job_embeddings_cached(self, jobs: List[Dict]) -> torch.Tensor:
        """
        Get job embeddings with caching support

        Args:
            jobs: List of job dictionaries

        Returns:
            Tensor of job embeddings
        """
        embeddings_list = []
        jobs_to_encode = []
        jobs_to_encode_indices = []

        # Check cache for each job
        for i, job in enumerate(jobs):
            job_id = job.get('job_id', '')
            if job_id and job_id in self._embedding_cache:
                embeddings_list.append((i, self._embedding_cache[job_id]))
                self._cache_hits += 1
            else:
                jobs_to_encode.append(job)
                jobs_to_encode_indices.append(i)
                self._cache_misses += 1

        # Encode uncached jobs in batches
        if jobs_to_encode:
            logger.info(f"🔄 Encoding {len(jobs_to_encode)} uncached jobs...")
            job_texts = [self._prepare_job_text(job) for job in jobs_to_encode]

            # Process in smaller batches to avoid memory issues
            batch_size = 256
            new_embeddings = []

            for batch_start in range(0, len(job_texts), batch_size):
                batch_end = min(batch_start + batch_size, len(job_texts))
                batch_texts = job_texts[batch_start:batch_end]

                batch_embeddings = self.model.encode(
                    batch_texts,
                    convert_to_numpy=True,
                    batch_size=64,
                    show_progress_bar=False
                )
                new_embeddings.extend(batch_embeddings)

            # Cache and collect new embeddings
            for idx, (job, embedding) in enumerate(zip(jobs_to_encode, new_embeddings)):
                job_id = job.get('job_id', '')
                if job_id:
                    self._embedding_cache[job_id] = embedding
                embeddings_list.append((jobs_to_encode_indices[idx], embedding))

        # Sort by original index and extract embeddings
        embeddings_list.sort(key=lambda x: x[0])
        embeddings_array = np.array([emb for _, emb in embeddings_list])

        return torch.tensor(embeddings_array)

    def clear_cache(self):
        """Clear the embedding cache"""
        self._embedding_cache.clear()
        self._cache_hits = 0
        self._cache_misses = 0
        logger.info("🗑️ Embedding cache cleared")

    def get_cache_stats(self) -> Dict:
        """Get cache statistics"""
        return {
            'cached_jobs': len(self._embedding_cache),
            'cache_hits': self._cache_hits,
            'cache_misses': self._cache_misses,
            'hit_rate': self._cache_hits / max(1, self._cache_hits + self._cache_misses) * 100
        }
    
    def _prepare_job_text(self, job: Dict) -> str:
        """
        Prepare job text for embedding generation
        Combines title, company, description for better matching
        
        Args:
            job: Job dictionary
            
        Returns:
            Combined text string
        """
        parts = []
        
        # Title (most important)
        if job.get('title'):
            parts.append(f"Job Title: {job['title']}")
        
        # Company
        if job.get('company'):
            parts.append(f"Company: {job['company']}")
        
        # Description (main content)
        if job.get('description'):
            # Limit description length to avoid token limits
            desc = job['description'][:1000]
            parts.append(f"Description: {desc}")
        
        # Requirements (if available)
        if job.get('requirements'):
            reqs = ', '.join(job['requirements'][:10])
            parts.append(f"Requirements: {reqs}")
        
        return ' '.join(parts)
    
    def _calculate_title_similarity(self, job_title: str, cv_snippet_embedding=None) -> float:
        """
        Calculate how relevant the job title is to the user's CV experience.

        Uses a precomputed CV snippet embedding (first 500 chars) compared
        against the job title via cosine similarity.

        Args:
            job_title: Job posting title
            cv_snippet_embedding: Precomputed embedding of CV snippet

        Returns:
            Similarity percentage (0-100)
        """
        if cv_snippet_embedding is None or not job_title:
            return 0.0

        title_embedding = self.model.encode(job_title, convert_to_tensor=True)
        similarity = util.cos_sim(cv_snippet_embedding, title_embedding)[0][0]
        return float(similarity.item() * 100)

    def _calculate_breakdown(self, cv_text: str, job: Dict, cv_snippet_embedding=None) -> Dict:
        """
        Calculate detailed match breakdown with multi-component scoring.

        Returns skill coverage, title relevance, matched/missing skills,
        and a human-readable summary sentence.

        Args:
            cv_text: User's CV text
            job: Job dictionary
            cv_snippet_embedding: Precomputed embedding of CV snippet (first 500 chars)

        Returns:
            Breakdown dictionary with skill_coverage, title_relevance,
            matched_skills, missing_skills, and summary
        """
        # Extract skills from CV and job
        cv_skills = self._extract_keywords(cv_text)

        job_text = (
            job.get('description', '') + ' ' +
            ' '.join(job.get('requirements', []))
        )
        job_skills = self._extract_keywords(job_text)

        # Also treat each requirement string as a potential skill phrase
        for requirement in job.get('requirements', []):
            normalized_requirement = requirement.strip().lower()
            if normalized_requirement and len(normalized_requirement) < 60:
                # Check if it closely matches any known skill
                if normalized_requirement in ALL_SKILLS:
                    job_skills.add(normalized_requirement)

        matched_skills = cv_skills & job_skills
        missing_skills = job_skills - cv_skills
        skill_overlap = len(matched_skills)
        total_job_skills = len(job_skills)
        skill_coverage = (skill_overlap / total_job_skills * 100) if total_job_skills else 0

        # Title relevance
        job_title = job.get('title', '')
        title_relevance = self._calculate_title_similarity(job_title, cv_snippet_embedding)

        # Build summary sentence
        summary_parts = []
        if skill_coverage >= 70:
            summary_parts.append(
                f"Strong skill match — you have {skill_overlap} of {total_job_skills} required skills."
            )
        elif skill_coverage >= 40:
            summary_parts.append(
                f"Moderate skill match — you have {skill_overlap} of {total_job_skills} required skills."
            )
        elif total_job_skills > 0:
            summary_parts.append(
                f"You have {skill_overlap} of {total_job_skills} required skills — consider developing the missing ones."
            )
        else:
            summary_parts.append("No specific skills could be extracted from this job listing.")

        if title_relevance >= 70:
            summary_parts.append(f"Your experience aligns well with this \"{job_title}\" role.")
        elif title_relevance >= 40:
            summary_parts.append(f"Your background has some relevance to this \"{job_title}\" role.")

        summary = ' '.join(summary_parts)

        return {
            'skill_coverage': round(skill_coverage, 1),
            'matched_skills': sorted(list(matched_skills))[:15],
            'missing_skills': sorted(list(missing_skills))[:10],
            'title_relevance': round(title_relevance, 1),
            'summary': summary,
        }

    def _extract_keywords(self, text: str) -> set:
        """
        Extract skills/keywords from text using a comprehensive
        multi-industry skill set (~200+ skills).

        Uses word-boundary regex for short skills (<=3 chars) to avoid
        false positives (e.g. 'r' matching inside 'researcher').
        Longer / multi-word skills use substring matching.

        Args:
            text: Input text

        Returns:
            Set of matched skill keywords
        """
        if not text:
            return set()

        text_lower = text.lower()
        found = set()
        for skill in ALL_SKILLS:
            if len(skill) <= 3:
                # Short tokens need word-boundary guards
                if re.search(r'\b' + re.escape(skill) + r'\b', text_lower):
                    found.add(skill)
            else:
                if skill in text_lower:
                    found.add(skill)
        return found
    
    def _apply_filters(self, jobs: List[Dict], filters: Dict) -> List[Dict]:
        """
        Apply user-specified filters
        
        Args:
            jobs: List of matched jobs
            filters: Filter criteria
            
        Returns:
            Filtered job list
        """
        filtered = jobs
        
        # Location filter
        if filters.get('location'):
            filtered = [
                job for job in filtered
                if filters['location'].lower() in job['location'].lower()
            ]
        
        # Minimum salary filter
        if filters.get('min_salary'):
            filtered = [
                job for job in filtered
                if job.get('salary_min') and job['salary_min'] >= filters['min_salary']
            ]
        
        # Remote type filter
        if filters.get('remote_type'):
            filtered = [
                job for job in filtered
                if job.get('remote_type') == filters['remote_type']
            ]
        
        return filtered
    
    def batch_generate_embeddings(self, jobs: List[Dict]) -> Dict[str, np.ndarray]:
        """
        Pre-compute embeddings for all jobs (optimization)
        Store in cache/database for faster matching
        
        Args:
            jobs: List of job dictionaries
            
        Returns:
            Dictionary mapping job_id to embedding array
        """
        logger.info(f"Generating embeddings for {len(jobs)} jobs")
        
        job_texts = [self._prepare_job_text(job) for job in jobs]
        
        embeddings = self.model.encode(
            job_texts,
            convert_to_numpy=True,
            batch_size=32,
            show_progress_bar=True
        )
        
        # Map job_id to embedding
        embedding_map = {
            job['job_id']: embeddings[i]
            for i, job in enumerate(jobs)
        }
        
        logger.info(f"✅ Generated {len(embedding_map)} embeddings")
        return embedding_map