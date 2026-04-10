# apps/job-api-service/src/services/reed_api.py
"""
Reed.co.uk API integration
UK's largest job board API (UK-only)

Search endpoint returns truncated descriptions (~453 chars).
Detail endpoint (/api/1.0/jobs/{jobId}) returns the full description.
Detail fetches are parallelized with asyncio.gather to avoid N+1 blocking.
"""

import httpx
import asyncio
import base64
from typing import List, Dict, Optional
from loguru import logger

from ..config.settings import settings
from ..utils.helpers import infer_job_type, detect_remote_type, detect_experience_level, normalize_date_to_iso, extract_requirements, normalize_job_type


class ReedAPI:
    """
    Reed API client (UK-only).
    Uses httpx for async HTTP and asyncio.gather for parallel detail fetches.

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

    async def _fetch_job_detail(self, client: httpx.AsyncClient, job_id: str) -> Optional[Dict]:
        """Fetch full job details from Reed's detail endpoint."""
        if not job_id:
            return None
        try:
            response = await client.get(
                f"{self.DETAIL_URL}/{job_id}",
                headers=self._get_auth_header(),
                timeout=10.0,
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.debug(f"Reed detail fetch failed for {job_id}: {e}")
            return None

    async def fetch_jobs(self, keywords: str, location: str, max_results: int = 100) -> List[Dict]:
        """
        Fetch jobs from Reed API with full descriptions.

        1. Search endpoint to get job list (truncated descriptions)
        2. All detail endpoint calls are fired in parallel via asyncio.gather
        """
        if not self.api_key:
            logger.warning("Skipping Reed: No API key")
            return []

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                params = {
                    'keywords': keywords,
                    'locationName': location,
                    'resultsToTake': min(max_results, 100),
                    'distanceFromLocation': 15,
                }

                response = await client.get(
                    self.BASE_URL,
                    headers=self._get_auth_header(),
                    params=params,
                )
                response.raise_for_status()

                results = response.json().get('results', [])

                # Fire all detail fetches in parallel - eliminates the N+1 pattern
                job_ids = [str(r.get('jobId', '')) for r in results]
                detail_tasks = [self._fetch_job_detail(client, job_id) for job_id in job_ids]
                details = await asyncio.gather(*detail_tasks, return_exceptions=True)

                jobs = []
                for raw_job, detail in zip(results, details):
                    full_description = None
                    if isinstance(detail, dict):
                        full_description = detail.get('jobDescription', '')
                    normalized = self._normalize_job(raw_job, keywords, location, full_description)
                    jobs.append(normalized)

                logger.info(f"Reed: {len(jobs)} jobs for '{keywords}' in '{location}'")
                return jobs

        except httpx.HTTPStatusError as e:
            logger.error(f"Reed API HTTP {e.response.status_code} error: {e}")
            return []
        except httpx.RequestError as e:
            logger.error(f"Reed API request error: {e}")
            return []
        except Exception as e:
            logger.error(f"Reed API error: {e}")
            return []

    def _normalize_job(self, raw_job: Dict, keywords: str, location: str, full_description: Optional[str] = None) -> Dict:
        """Convert Reed job format to our standard format."""
        title = raw_job.get('jobTitle', 'Not specified')
        description = full_description or raw_job.get('jobDescription', '')

        raw_job_type = raw_job.get('jobType') or ''
        if raw_job_type:
            job_type = normalize_job_type(raw_job_type, title, description)
        else:
            job_type = infer_job_type(title, description)

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
            'requirements': extract_requirements(description),
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
