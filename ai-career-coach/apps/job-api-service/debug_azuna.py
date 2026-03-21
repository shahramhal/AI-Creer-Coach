# debug_adzuna.py
"""
Debug script to test Adzuna API integration
"""

import sys
from src.services.adzuna_api import AdzunaAPI
from loguru import logger

# Configure logging
logger.remove()
logger.add(sys.stdout, level="DEBUG")

def main():
    api = AdzunaAPI()
    
    logger.info(f"App ID: {api.app_id}")
    logger.info(f"App Key: {api.app_key[:10]}..." if api.app_key else "No key")
    
    jobs = api.fetch_jobs(
        keywords="python developer",
        location="london",
        max_results=100
    )
    
    logger.info(f"\n{'='*60}")
    logger.info(f"FINAL RESULT: {len(jobs)} jobs fetched")
    logger.info(f"{'='*60}\n")
    
    if jobs:
        logger.info("First job sample:")
        first_job = jobs[0]
        for key, value in first_job.items():
            logger.info(f"  {key}: {value}")
    else:
        logger.warning("No jobs returned!")

if __name__ == "__main__":
    main()