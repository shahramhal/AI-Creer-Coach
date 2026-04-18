
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings"""

    # Server
    host: str = "::"
    port: int = 8001
    env: str = "development"

    # MongoDB
    mongodb_url: str
    mongodb_db_name: str = "career_coach"

    # API Keys
    adzuna_app_id: Optional[str] = None
    adzuna_app_key: Optional[str] = None
    reed_api_key: Optional[str] = None

    # Job fetching config
    job_fetch_interval_hours: int = 24
    jobs_per_request: int = 50
    max_jobs_per_search: int = 50  # Reduced for free-tier (1 page of 50)

    # Job freshness - remove stale jobs, only fetch recent ones
    job_max_age_days: int = 14
    adzuna_max_days_old: int = 14

    # Multi-country Adzuna codes: gb, us, de, fr, ca, au, nl, in, etc.
    adzuna_countries: str = "gb,us,de,fr,ca"

    # Free-tier budget: 250 calls/day, 1000/week, 2500/month
    # 1 page = 1 API call. Keep this at 1 to stay within budget.
    adzuna_max_pages: int = 1

    # Comma-separated search keywords used when fetching jobs.
    # Override via SEARCH_KEYWORDS env var to add non-tech roles.
    search_keywords: str = (
        "software engineer,python developer,data scientist,"
        "product manager,data analyst,marketing manager,"
        "finance analyst,ux designer,project manager,devops engineer"
    )

    # Shared secret for internal service-to-service calls.
    # Set INTERNAL_API_TOKEN in env. If unset, auth is skipped (dev only).
    internal_api_token: Optional[str] = None

    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()