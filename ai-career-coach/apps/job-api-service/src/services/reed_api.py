# apps/job-api-service/src/services/reed_api.py
"""
Reed.co.uk API integration
UK's largest job board API (UK-only)

Search endpoint returns truncated descriptions (~453 chars).
Detail endpoint (/api/1.0/jobs/{jobId}) returns the full description.
We fetch details for each job to get accurate experience level detection.
"""

import requests
import base64
from typing import List, Dict, Optional
from loguru import logger

from ..config.settings import settings
from ..utils.helpers import infer_job_type, detect_remote_type, detect_experience_level, normalize_date_to_iso


class ReedAPI:
    """
    Reed API client (UK-only)

    Documentation: https://www.reed.co.uk/developers
    """

    BASE_URL = "https://www.reed.co.uk/api/1.0/search"
    DETAIL_URL = "https://www.reed.co.uk/api/1.0/jobs"

    def __init__(self):
        self.api_key = settings.reed_api_key

        if not self.api_key:
            logger.warning("Reed API key not configured")

    def _get_auth_header(self) -> dict:
        """Build the Basic auth header Reed requires."""
        auth_string = f"{self.api_key}:"
        auth_header = base64.b64encode(auth_string.encode()).decode()
        return {'Authorization': f'Basic {auth_header}'}

    def _fetch_job_detail(self, job_id: str) -> Optional[Dict]:
        """Fetch full job details from Reed's detail endpoint."""
        try:
            response = requests.get(
                f"{self.DETAIL_URL}/{job_id}",
                headers=self._get_auth_header(),
                timeout=10,
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.debug(f"Reed detail fetch failed for {job_id}: {e}")
            return None

    def fetch_jobs(self, keywords: str, location: str, max_results: int = 100) -> List[Dict]:
        """
        Fetch jobs from Reed API with full descriptions.

        1. Search endpoint to get job list (truncated descriptions)
        2. Detail endpoint per job for full description text
        """
        if not self.api_key:
            logger.warning("Skipping Reed: No API key")
            return []

        try:
            headers = self._get_auth_header()
            results_to_take = min(max_results, 100)

            params = {
                'keywords': keywords,
                'locationName': location,
                'resultsToTake': results_to_take,
                'distanceFromLocation': 15,
            }

            response = requests.get(
                self.BASE_URL,
                headers=headers,
                params=params,
                timeout=15,
            )
            response.raise_for_status()

            data = response.json()
            results = data.get('results', [])

            jobs = []
            for raw_job in results:
                job_id = str(raw_job.get('jobId', ''))

                # Fetch full description from detail endpoint
                full_description = None
                if job_id:
                    detail = self._fetch_job_detail(job_id)
                    if detail:
                        full_description = detail.get('jobDescription', '')

                normalized = self._normalize_job(raw_job, keywords, location, full_description)
                jobs.append(normalized)

            logger.info(f"✅ Reed: {len(jobs)} jobs for '{keywords}' in '{location}'")
            return jobs

        except Exception as e:
            logger.error(f"❌ Reed API error: {e}")
            return []

    def _normalize_job(self, raw_job: Dict, keywords: str, location: str, full_description: Optional[str] = None) -> Dict:
        """Convert Reed job format to our standard format."""
        title = raw_job.get('jobTitle', 'Not specified')
        description = full_description or raw_job.get('jobDescription', '')

        # Reed sometimes provides jobType, but often it's missing
        raw_job_type = raw_job.get('jobType') or ''
        if raw_job_type:
            job_type = raw_job_type.strip()
        else:
            job_type = infer_job_type(title, description)

        # Normalize dates to ISO 8601 (Reed uses dd/mm/yyyy)
        posted_date_raw = raw_job.get('date', '')
        expiration_date_raw = raw_job.get('expirationDate', '')

        return {
            'job_id': str(raw_job.get('jobId', '')),
            'source': 'reed',
            'source_url': raw_job.get('jobUrl', ''),
            'title': title,
            'company': raw_job.get('employerName', 'Not specified'),
            'location': raw_job.get('locationName', location),
            'description': description,
            'requirements': [],
            'salary_min': raw_job.get('minimumSalary'),
            'salary_max': raw_job.get('maximumSalary'),
            'salary_text': None,
            'experience_level': detect_experience_level(title, description),
            'job_type': job_type,
            'remote_type': detect_remote_type(title, description),
            'posted_date': normalize_date_to_iso(posted_date_raw),
            'expiration_date': normalize_date_to_iso(expiration_date_raw),
            'country': 'gb',
            'search_keywords': keywords,
            'search_location': location,
        }
