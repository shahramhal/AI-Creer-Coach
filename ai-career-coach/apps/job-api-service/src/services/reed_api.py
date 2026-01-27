# apps/job-api-service/src/services/reed_api.py
"""
Reed.co.uk API integration
UK's largest job board API
"""

import requests
import base64
from typing import List, Dict
from loguru import logger

from ..config.settings import settings


class ReedAPI:
    """
    Reed API client
    
    Documentation: https://www.reed.co.uk/developers
    """
    
    BASE_URL = "https://www.reed.co.uk/api/1.0/search"
    
    def __init__(self):
        self.api_key = settings.reed_api_key
        
        if not self.api_key:
            logger.warning("Reed API key not configured")
    
    def fetch_jobs(self, keywords: str, location: str, max_results: int = 500) -> List[Dict]:
        """
        Fetch jobs from Reed API
        
        Args:
            keywords: Search terms
            location: Location filter
            max_results: Maximum jobs to fetch
            
        Returns:
            List of job dictionaries
        """
        if not self.api_key:
            logger.warning("Skipping Reed: No API key")
            return []
        
        try:
            # Reed uses Basic Authentication
            auth_string = f"{self.api_key}:"
            auth_header = base64.b64encode(auth_string.encode()).decode()
            
            headers = {
                'Authorization': f'Basic {auth_header}'
            }
            
            # Reed returns max 100 results per request
            results_to_take = min(max_results, 100)
            
            params = {
                'keywords': keywords,
                'locationName': location,
                'resultsToTake': results_to_take
            }
            
            response = requests.get(
                self.BASE_URL,
                headers=headers,
                params=params,
                timeout=10
            )
            response.raise_for_status()
            
            data = response.json()
            results = data.get('results', [])
            
            # Convert to normalized format
            jobs = [self._normalize_job(job, keywords, location) for job in results]
            
            logger.info(f"✅ Reed total: {len(jobs)} jobs")
            return jobs
            
        except Exception as e:
            logger.error(f"❌ Reed API error: {e}")
            return []
    
    def _normalize_job(self, raw_job: Dict, keywords: str, location: str) -> Dict:
        """Convert Reed job format to our standard format"""
        
        return {
            'job_id': str(raw_job.get('jobId', '')),
            'source': 'reed',
            'source_url': raw_job.get('jobUrl', ''),
            'title': raw_job.get('jobTitle', 'Not specified'),
            'company': raw_job.get('employerName', 'Not specified'),
            'location': raw_job.get('locationName', location),
            'description': raw_job.get('jobDescription', ''),
            'requirements': [],
            'salary_min': raw_job.get('minimumSalary'),
            'salary_max': raw_job.get('maximumSalary'),
            'salary_text': None,
            'experience_level': 'Not specified',
            'job_type': raw_job.get('jobType', 'Not specified'),
            'remote_type': 'Not specified',
            'posted_date': raw_job.get('date', ''),
            'search_keywords': keywords,
            'search_location': location
        }