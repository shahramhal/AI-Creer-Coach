#!/usr/bin/env python3
# run_scrapers.py
"""
Run All Job Scrapers

Executes all spiders sequentially
Use this for daily automated scraping
"""

import sys
import logging
from scrapy.crawler import CrawlerProcess
from scrapy.utils.project import get_project_settings


def main():
    """
    Run all job spiders
    
    Execution order:
    1. Indeed (fastest, most reliable)
    2. Glassdoor (similar to Indeed)
    3. LinkedIn (slowest, uses Selenium)
    """
    
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(name)s] %(levelname)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    logger = logging.getLogger(__name__)
    logger.info("="*60)
    logger.info("Starting job scraper pipeline")
    logger.info("="*60)
    
    # Load Scrapy settings
    settings = get_project_settings()
    
    # Create crawler process
    process = CrawlerProcess(settings)
    
    # Define spiders to run
    # Format: (spider_name, kwargs)
    spiders_config = [
        # Indeed - Software Engineer jobs in UK
        ('indeed', {
            'keywords': 'software engineer',
            'location': 'United Kingdom'
        }),
        
        # Indeed - Python Developer jobs in UK
        ('indeed', {
            'keywords': 'python developer',
            'location': 'United Kingdom'
        }),
        
        # Indeed - Frontend Developer jobs in UK
        ('indeed', {
            'keywords': 'frontend developer',
            'location': 'United Kingdom'
        }),
        
        # Add more spider configurations as needed
        # Uncomment when LinkedIn spider is ready:
        # ('linkedin', {
        #     'keywords': 'software engineer',
        #     'location': 'United Kingdom'
        # }),
    ]
    
    # Add spiders to crawler
    for spider_name, spider_kwargs in spiders_config:
        try:
            logger.info(f"Scheduling spider: {spider_name} with {spider_kwargs}")
            process.crawl(spider_name, **spider_kwargs)
        except Exception as e:
            logger.error(f"Failed to schedule {spider_name}: {e}")
    
    # Start scraping (blocking call)
    logger.info("Starting scrapers...")
    process.start()
    
    logger.info("="*60)
    logger.info("All scrapers completed")
    logger.info("="*60)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nScraping interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n\nFatal error: {e}")
        sys.exit(1)


# How to use:
"""
# Run all spiders with default settings
python run_scrapers.py

# Schedule as cron job (daily at 2 AM)
# Add to crontab:
0 2 * * * cd /path/to/scraper-service && python run_scrapers.py >> logs/scraper.log 2>&1

# Docker:
docker-compose run scraper-service python run_scrapers.py
"""
