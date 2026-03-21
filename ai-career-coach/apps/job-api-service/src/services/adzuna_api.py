# apps/job-api-service/src/services/adzuna_api.py
"""
Adzuna API integration
Fetches job postings from Adzuna's official API across multiple countries

Free-tier limits: 250 calls/day, 1000/week, 2500/month, 25/min
"""

import requests
from typing import List, Dict, Optional
from loguru import logger

from ..config.settings import settings
from ..utils.helpers import infer_job_type, detect_remote_type, detect_experience_level, normalize_date_to_iso


# Maps Adzuna contract_type + contract_time to a readable job_type
_CONTRACT_TYPE_MAP = {
    'permanent': 'Permanent',
    'contract': 'Contract',
}

_CONTRACT_TIME_MAP = {
    'full_time': 'Full-time',
    'part_time': 'Part-time',
}


class AdzunaAPI:
    """
    Adzuna API client with multi-country support

    Supported country codes: gb, us, de, fr, ca, au, br, in, nl, nz, pl, sg, za
    Documentation: https://developer.adzuna.com/docs/search
    """

    BASE_URL = "https://api.adzuna.com/v1/api/jobs"

    def __init__(self):
        self.app_id = settings.adzuna_app_id
        self.app_key = settings.adzuna_app_key

        if not self.app_id or not self.app_key:
            logger.warning("Adzuna API credentials not configured")

    def fetch_jobs(
        self,
        keywords: str,
        location: str,
        country: str = "gb",
        max_results: int = 50,
        max_days_old: Optional[int] = None,
    ) -> List[Dict]:
        """
        Fetch jobs from Adzuna API for a specific country.

        Args:
            keywords: Search terms
            location: Location filter (city/region name)
            country: Two-letter country code (gb, us, de, fr, ca, ...)
            max_results: Maximum jobs to fetch (default 50 = 1 page)
            max_days_old: Only return jobs posted within this many days

        Returns:
            List of normalized job dictionaries
        """
        if not self.app_id or not self.app_key:
            logger.warning("Skipping Adzuna: No API credentials")
            return []

        all_jobs = []
        page = 1
        results_per_page = min(max_results, 50)
        max_pages = settings.adzuna_max_pages
        effective_max_days = max_days_old or settings.adzuna_max_days_old

        try:
            while len(all_jobs) < max_results and page <= max_pages:
                url = f"{self.BASE_URL}/{country}/search/{page}"

                params = {
                    'app_id': self.app_id,
                    'app_key': self.app_key,
                    'results_per_page': results_per_page,
                    'what': keywords,
                    'where': location,
                    'max_days_old': effective_max_days,
                    'sort_by': 'date',
                    'content-type': 'application/json',
                }

                logger.info(f"Adzuna [{country.upper()}]: page {page} — '{keywords}' in '{location}'")

                response = requests.get(url, params=params, timeout=15)
                response.raise_for_status()

                data = response.json()
                results = data.get('results', [])

                logger.info(f"Adzuna [{country.upper()}]: page {page} returned {len(results)} jobs")

                if not results:
                    break

                for job in results:
                    normalized = self._normalize_job(job, keywords, location, country)
                    all_jobs.append(normalized)

                if len(results) < results_per_page:
                    break

                page += 1

            logger.info(f"✅ Adzuna [{country.upper()}]: {len(all_jobs)} jobs fetched")
            return all_jobs

        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Adzuna [{country.upper()}] API request error: {e}")
            return all_jobs
        except Exception as e:
            logger.error(f"❌ Adzuna [{country.upper()}] unexpected error: {e}")
            return all_jobs

    def _normalize_job(self, raw_job: Dict, keywords: str, location: str, country: str) -> Dict:
        """Convert Adzuna job format to our standard format."""
        try:
            company_data = raw_job.get('company', {})
            location_data = raw_job.get('location', {})
            title = raw_job.get('title', 'Not specified')
            description = raw_job.get('description', '')

            # Build job_type from contract_type + contract_time, fall back to inference
            contract_type = raw_job.get('contract_type') or ''
            contract_time = raw_job.get('contract_time') or ''

            job_type_parts = []
            if contract_time in _CONTRACT_TIME_MAP:
                job_type_parts.append(_CONTRACT_TIME_MAP[contract_time])
            if contract_type in _CONTRACT_TYPE_MAP:
                job_type_parts.append(_CONTRACT_TYPE_MAP[contract_type])

            if job_type_parts:
                job_type = ', '.join(job_type_parts)
            else:
                job_type = infer_job_type(title, description)

            posted_date_raw = raw_job.get('created', '')

            return {
                'job_id': str(raw_job.get('id', '')),
                'source': 'adzuna',
                'source_url': raw_job.get('redirect_url', ''),
                'title': title,
                'company': company_data.get('display_name', 'Not specified') if isinstance(company_data, dict) else 'Not specified',
                'location': location_data.get('display_name', location) if isinstance(location_data, dict) else location,
                'description': description,
                'requirements': [],
                'salary_min': raw_job.get('salary_min'),
                'salary_max': raw_job.get('salary_max'),
                'salary_text': None,
                'experience_level': detect_experience_level(title, description),
                'job_type': job_type,
                'remote_type': detect_remote_type(title, description),
                'posted_date': normalize_date_to_iso(posted_date_raw),
                'country': country,
                'search_keywords': keywords,
                'search_location': location,
            }

        except Exception as e:
            logger.error(f"Error normalizing Adzuna job: {e}")
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
                'country': country,
                'search_keywords': keywords,
                'search_location': location,
            }
