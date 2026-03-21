
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings"""

    # Server
    host: str = "0.0.0.0"
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

    # Job freshness — remove stale jobs, only fetch recent ones
    job_max_age_days: int = 14
    adzuna_max_days_old: int = 14

    # Multi-country Adzuna codes: gb, us, de, fr, ca, au, nl, in, etc.
    adzuna_countries: str = "gb,us,de,fr,ca"

    # Free-tier budget: 250 calls/day, 1000/week, 2500/month
    # 1 page = 1 API call. Keep this at 1 to stay within budget.
    adzuna_max_pages: int = 1

    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()