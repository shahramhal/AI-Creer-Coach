# apps/job-api-service/src/services/adzuna_api.py
"""
Adzuna API integration
Fetches job postings from Adzuna's official API
"""

import requests
from typing import List, Dict
from loguru import logger

from ..config.settings import settings
from ..models.job import Job

class AdzunaAPI:
    """
    Adzuna API client
    
    Documentation: https://developer.adzuna.com/docs/search
    """
    
    BASE_URL = "https://api.adzuna.com/v1/api/jobs/gb/search"
    
    def __init__(self):
        self.app_id = settings.adzuna_app_id
        self.app_key = settings.adzuna_app_key
        
        if not self.app_id or not self.app_key:
            logger.warning("Adzuna API credentials not configured")
    
    def fetch_jobs(self, keywords: str, location: str, max_results: int = 500) -> List[Dict]:
        """
        Fetch jobs from Adzuna API
        
        Args:
            keywords: Search terms
            location: Location filter
            max_results: Maximum jobs to fetch
            
        Returns:
            List of job dictionaries
        """
        if not self.app_id or not self.app_key:
            logger.warning("Skipping Adzuna: No API credentials")
            return []
        
        all_jobs = []
        page = 1  # Adzuna pagination starts at 1
        results_per_page = 50
        max_pages = 10  # Limit to 10 pages to avoid excessive API calls
        
        try:
            while len(all_jobs) < max_results and page <= max_pages:
                url = f"{self.BASE_URL}/{page}"
                
                params = {
                    'app_id': self.app_id,
                    'app_key': self.app_key,
                    'results_per_page': results_per_page,
                    'what': keywords,
                    'where': location,
                    'content-type': 'application/json'
                }
                
                logger.info(f"Adzuna: Requesting page {page}...")
                
                response = requests.get(url, params=params, timeout=10)
                response.raise_for_status()
                
                data = response.json()
                results = data.get('results', [])
                
                # Log response details for debugging
                logger.info(f"Adzuna: Page {page} returned {len(results)} jobs")
                
                if not results:
                    logger.info(f"Adzuna: No more results on page {page}, stopping")
                    break
                
                # Convert to normalized format
                for job in results:
                    normalized = self._normalize_job(job, keywords, location)
                    all_jobs.append(normalized)
                
                logger.info(f"Adzuna: Total fetched so far: {len(all_jobs)}")
                
                # Check if we got fewer results than requested (last page)
                if len(results) < results_per_page:
                    logger.info(f"Adzuna: Received {len(results)} < {results_per_page}, last page reached")
                    break
                
                page += 1
            
            logger.info(f"✅ Adzuna total: {len(all_jobs)} jobs")
            return all_jobs
            
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Adzuna API request error: {e}")
            return all_jobs
        except Exception as e:
            logger.error(f"❌ Adzuna API unexpected error: {e}")
            return all_jobs
    
    def _normalize_job(self, raw_job: Dict, keywords: str, location: str) -> Dict:
        """Convert Adzuna job format to our standard format"""
    
        try:
            company_data = raw_job.get('company', {})
            location_data = raw_job.get('location', {})
            
            normalized = {
                'job_id': str(raw_job.get('id', '')),
                'source': 'adzuna',
                'source_url': raw_job.get('redirect_url', ''),
                'title': raw_job.get('title', 'Not specified'),
                'company': company_data.get('display_name', 'Not specified'),
                'location': location_data.get('display_name', location),
                'description': raw_job.get('description', ''),
                'requirements': [],  # Adzuna doesn't separate requirements
                'salary_min': raw_job.get('salary_min'),
                'salary_max': raw_job.get('salary_max'),
                'salary_text': None,
                'experience_level': 'Not specified',
                'job_type': raw_job.get('contract_type', 'Not specified'),
                'remote_type': 'Not specified',
                'posted_date': raw_job.get('created', ''),
                'search_keywords': keywords,
                'search_location': location
            }
            
            return normalized
            
        except Exception as e:
            logger.error(f"Error normalizing Adzuna job: {e}")
            logger.error(f"Raw job data: {raw_job}")
            # Return a minimal valid job structure
            return {
                'job_id': str(raw_job.get('id', 'unknown')),
                'source': 'adzuna',
                'source_url': raw_job.get('redirect_url', ''),
                'title': raw_job.get('title', 'Error parsing job'),
                'company': 'Not specified',
                'location': location,
                'description': '',
                'requirements': [],
                'salary_min': None,
                'salary_max': None,
                'salary_text': None,
                'experience_level': 'Not specified',
                'job_type': 'Not specified',
                'remote_type': 'Not specified',
                'posted_date': '',
                'search_keywords': keywords,
                'search_location': location
            }
