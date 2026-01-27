

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
    max_jobs_per_search: int = 500
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()