# apps/job-api-service/src/services/job_aggregator.py
"""
Job Aggregator Service

Coordinates fetching from multiple APIs
Handles deduplication and storage to MongoDB
"""

from typing import List, Dict
from datetime import datetime
from loguru import logger
from motor.motor_asyncio import AsyncIOMotorDatabase

from .adzuna_api import AdzunaAPI
from .reed_api import ReedAPI
from ..models.job import Job


class JobAggregator:
    """
    Aggregates jobs from multiple sources
    Handles deduplication and database storage
    """
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.jobs_collection = db["jobs"]
        
        # Initialize API clients
        self.adzuna = AdzunaAPI()
        self.reed = ReedAPI()
    
    async def fetch_and_store_jobs(
        self,
        keywords: str,
        location: str
    ) -> Dict:
        """
        Fetch jobs from all sources and store in MongoDB
        
        Args:
            keywords: Search terms
            location: Location filter
            
        Returns:
            Dict with statistics about fetched jobs
        """
        logger.info(f"🔍 Fetching jobs: '{keywords}' in '{location}'")
        
        all_jobs = []
        
        # Fetch from Adzuna
        adzuna_jobs = self.adzuna.fetch_jobs(keywords, location)
        all_jobs.extend(adzuna_jobs)
        logger.info(f"Adzuna: {len(adzuna_jobs)} jobs")
        
        # Fetch from Reed
        reed_jobs = self.reed.fetch_jobs(keywords, location)
        all_jobs.extend(reed_jobs)
        logger.info(f"Reed: {len(reed_jobs)} jobs")
        
        # Deduplicate
        unique_jobs = self._deduplicate(all_jobs)
        logger.info(f"After deduplication: {len(unique_jobs)} unique jobs")
        
        # Store in MongoDB
        stored_count = await self._store_jobs(unique_jobs)
        
        return {
            "total_fetched": len(all_jobs),
            "unique_jobs": len(unique_jobs),
            "stored": stored_count,
            "sources": {
                "adzuna": len(adzuna_jobs),
                "reed": len(reed_jobs)
            }
        }
    
    def _deduplicate(self, jobs: List[Dict]) -> List[Dict]:
        """
        Remove duplicate jobs based on URL
        
        Args:
            jobs: List of job dictionaries
            
        Returns:
            Deduplicated list
        """
        seen_urls = set()
        unique = []
        
        for job in jobs:
            url = job.get('source_url', '')
            if url and url not in seen_urls:
                seen_urls.add(url)
                unique.append(job)
        
        return unique
    
    async def _store_jobs(self, jobs: List[Dict]) -> int:
        """
        Store jobs in MongoDB
        Uses upsert to avoid duplicates
        
        Args:
            jobs: List of job dictionaries
            
        Returns:
            Number of jobs stored
        """
        if not jobs:
            return 0
        
        stored_count = 0
        
        for job_data in jobs:
            try:
                # Add timestamp
                job_data['scraped_at'] = datetime.utcnow()
                
                # Upsert: update if exists, insert if new
                # Use source + job_id as unique identifier
                await self.jobs_collection.update_one(
                    {
                        'source': job_data['source'],
                        'job_id': job_data['job_id']
                    },
                    {'$set': job_data},
                    upsert=True
                )
                
                stored_count += 1
                
            except Exception as e:
                logger.error(f"Error storing job {job_data.get('job_id')}: {e}")
        
        logger.info(f"✅ Stored {stored_count} jobs in MongoDB")
        return stored_count