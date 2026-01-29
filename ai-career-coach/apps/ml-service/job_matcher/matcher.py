# apps/ml-service/job_matcher/matcher.py
"""
Job Matching Service

Uses semantic similarity to match CVs with job postings
This is the CORE ML feature of the platform
"""

from sentence_transformers import SentenceTransformer, util
import torch
import numpy as np
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)

class JobMatcher:
    """
    Semantic job matching using sentence transformers
    
    How it works:
    1. Load pre-trained transformer model
    2. Generate embeddings for CV text
    3. Generate embeddings for job descriptions
    4. Calculate cosine similarity
    5. Rank jobs by similarity score
    6. Apply filters (location, salary, experience)
    """
    
    def __init__(self):
        """Initialize the sentence transformer model"""
        logger.info("Loading sentence transformer model...")
        
        # Load pre-trained model (384-dimensional embeddings)
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        
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
        
        logger.info(f"Matching CV against {len(jobs)} jobs")
        
        # Step 1: Generate CV embedding
        cv_embedding = self.model.encode(
            cv_text,
            convert_to_tensor=True,
            show_progress_bar=False
        )
        
        # Step 2: Extract job descriptions and generate embeddings
        job_descriptions = [self._prepare_job_text(job) for job in jobs]
        
        job_embeddings = self.model.encode(
            job_descriptions,
            convert_to_tensor=True,
            batch_size=32,
            show_progress_bar=False
        )
        
        # Step 3: Calculate cosine similarity
        similarities = util.cos_sim(cv_embedding, job_embeddings)[0]
        
        # Step 4: Get top K matches
        top_results = torch.topk(similarities, k=min(top_k, len(jobs)))
        
        # Step 5: Build result list with scores
        matched_jobs = []
        for idx, score in zip(top_results.indices, top_results.values):
            job = jobs[idx.item()]
            job_match = {
                'job_id': job['job_id'],
                'source': job['source'],
                'title': job['title'],
                'company': job['company'],
                'location': job['location'],
                'description': job['description'][:200] + '...',  # Truncate
                'salary_min': job.get('salary_min'),
                'salary_max': job.get('salary_max'),
                'source_url': job['source_url'],
                'posted_date': job.get('posted_date'),
                
                # Matching details
                'match_score': float(score.item() * 100),  # Convert to percentage
                'match_breakdown': self._calculate_breakdown(cv_text, job)
            }
            matched_jobs.append(job_match)
        
        # Step 6: Apply filters if provided
        if filters:
            matched_jobs = self._apply_filters(matched_jobs, filters)
        
        logger.info(f"✅ Matched {len(matched_jobs)} jobs")
        return matched_jobs
    
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
    
    def _calculate_breakdown(self, cv_text: str, job: Dict) -> Dict:
        """
        Calculate detailed match breakdown
        Provides explainability for match scores
        
        Args:
            cv_text: User's CV text
            job: Job dictionary
            
        Returns:
            Breakdown dictionary
        """
        # Extract skills from CV and job
        cv_skills = self._extract_keywords(cv_text)
        job_skills = self._extract_keywords(
            job.get('description', '') + ' ' + 
            ' '.join(job.get('requirements', []))
        )
        
        # Calculate skill overlap
        skill_overlap = len(cv_skills & job_skills)
        skill_coverage = (skill_overlap / len(job_skills) * 100) if job_skills else 0
        
        return {
            'skill_coverage': round(skill_coverage, 1),
            'matched_skills': list(cv_skills & job_skills)[:10],
            'missing_skills': list(job_skills - cv_skills)[:5]
        }
    
    def _extract_keywords(self, text: str) -> set:
        """
        Extract keywords/skills from text
        Simple implementation - can be improved with NER
        
        Args:
            text: Input text
            
        Returns:
            Set of keywords
        """
        if not text:
            return set()
        
        # Common tech skills/keywords
        keywords = {
            'python', 'javascript', 'java', 'react', 'node', 'nodejs',
            'aws', 'docker', 'kubernetes', 'sql', 'mongodb', 'postgresql',
            'typescript', 'vue', 'angular', 'django', 'flask', 'fastapi',
            'machine learning', 'data science', 'ai', 'ml', 'nlp',
            'git', 'agile', 'scrum', 'ci/cd', 'devops', 'cloud'
        }
        
        text_lower = text.lower()
        found = {kw for kw in keywords if kw in text_lower}
        
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