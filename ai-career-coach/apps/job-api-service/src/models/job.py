# apps/job-api-service/src/models/job.py
"""
Job data models
Defines structure for job postings from external APIs
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone


class JobSearchRequest(BaseModel):
    """Request model for job search"""
    keywords: str = Field(..., description="Search keywords (e.g., 'python developer')")
    location: str = Field(..., description="Location (e.g., 'London', 'Berlin')")
    country: str = Field(default="gb", description="Country code (e.g., 'gb', 'us', 'de', 'fr', 'ca')")


class Job(BaseModel):
    """
    Normalized job posting model
    This structure matches what goes into MongoDB
    """

    # Identifiers
    job_id: str = Field(..., description="Unique job ID from source")
    source: str = Field(..., description="'adzuna' or 'reed'")
    source_url: str = Field(..., description="Original job posting URL")

    # Basic info
    title: str
    company: str
    location: str

    # Job details
    description: str
    requirements: List[str] = Field(default_factory=list)

    # Salary (optional)
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_text: Optional[str] = None

    # Classification
    experience_level: str = "Not specified"
    job_type: str = "Not specified"
    remote_type: str = "Not specified"

    # Metadata
    posted_date: Optional[str] = None
    expiration_date: Optional[str] = None  # When the job listing expires (Reed provides this)
    scraped_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_seen_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    country: str = "gb"  # Country code where the job was found

    # Search metadata (for filtering)
    search_keywords: str = ""
    search_location: str = ""

    class Config:
        json_schema_extra = {
            "example": {
                "job_id": "12345678",
                "source": "adzuna",
                "source_url": "https://www.adzuna.co.uk/jobs/...",
                "title": "Senior Python Developer",
                "company": "Tech Corp",
                "location": "London",
                "description": "We are looking for...",
                "salary_min": 60000,
                "salary_max": 80000,
                "experience_level": "Senior",
                "job_type": "Full-time",
                "remote_type": "Hybrid",
                "country": "gb",
            }
        }
