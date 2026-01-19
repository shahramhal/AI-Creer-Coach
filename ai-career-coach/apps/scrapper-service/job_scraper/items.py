# job_scraper/items.py
"""
Data Models for Scraped Jobs

Defines the structure of job data that spiders will collect.
Think of this as your database schema for scraped data.
"""

import scrapy
from scrapy import Field


class JobItem(scrapy.Item):
    """
    Job posting data model
    
    How it works:
    - Spiders populate these fields when scraping
    - Pipelines process and validate the data
    - Finally saved to MongoDB
    """
    
    # Unique identifiers
    job_id = Field()          # Hash of title+company+location (for deduplication)
    source = Field()          # 'indeed', 'linkedin', 'glassdoor'
    source_url = Field()      # Original job posting URL
    
    # Basic info
    title = Field()           # Job title (e.g., "Senior Software Engineer")
    company = Field()         # Company name (e.g., "Google")
    location = Field()        # Location (e.g., "San Francisco, CA")
    
    # Job details
    description = Field()     # Full job description (HTML or text)
    requirements = Field()    # List of requirements/skills (extracted from description)
    
    # Salary info (optional - not always available)
    salary_min = Field()      # Minimum salary (int)
    salary_max = Field()      # Maximum salary (int)
    salary_text = Field()     # Original salary text (e.g., "$120K - $180K per year")
    
    # Classification
    experience_level = Field()  # 'Entry', 'Mid', 'Senior', 'Lead', 'Executive'
    job_type = Field()         # 'Full-time', 'Part-time', 'Contract', 'Internship'
    remote_type = Field()      # 'Remote', 'Hybrid', 'On-site'
    
    # Metadata
    posted_date = Field()     # When job was posted (date string or datetime)
    scraped_at = Field()      # When we scraped it (datetime)
    
    # Processing flags (used by pipelines)
    is_duplicate = Field()    # Boolean - marked by deduplication pipeline
    cleaned = Field()         # Boolean - marked by cleaning pipeline


# How to use in spiders:
"""
from job_scraper.items import JobItem

def parse_job(self, response):
    job = JobItem()
    job['title'] = response.css('.job-title::text').get()
    job['company'] = response.css('.company::text').get()
    # ... populate other fields
    yield job  # Send to pipeline
"""
