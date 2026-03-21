# job_scraper/settings.py
"""
Scrapy Settings
https://docs.scrapy.org/en/latest/topics/settings.html
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


# BASIC SETTINGS


BOT_NAME = 'job_scraper'

SPIDER_MODULES = ['job_scraper.spiders']
NEWSPIDER_MODULE = 'job_scraper.spiders'

# Obey robots.txt rules
# Set to False if you want to ignore (not recommended for production)
ROBOTSTXT_OBEY = True


# ANTI-BOT MEASURES


# Delay between requests to same domain (in seconds)
# Prevents overwhelming servers and getting banned
DOWNLOAD_DELAY = 3  # 3 seconds between requests

# Additional randomization (20% variance)
# So delay will be 2.4 - 3.6 seconds
RANDOMIZE_DOWNLOAD_DELAY = True

# Concurrent requests per domain
# Lower = more polite, less likely to get banned
CONCURRENT_REQUESTS_PER_DOMAIN = 2

# Total concurrent requests across all domains
CONCURRENT_REQUESTS = 8

# Auto-throttle settings (adaptive speed based on server load)
AUTOTHROTTLE_ENABLED = True
AUTOTHROTTLE_START_DELAY = 2
AUTOTHROTTLE_MAX_DELAY = 10
AUTOTHROTTLE_TARGET_CONCURRENCY = 1.0

# Cookies (disable to avoid tracking)
COOKIES_ENABLED = False

# User-Agent rotation
# Makes requests look like they come from different browsers
USER_AGENT_LIST = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
]

# Pick random User-Agent for each request
import random
USER_AGENT = random.choice(USER_AGENT_LIST)


# MIDDLEWARE CONFIGURATION


# Downloader middlewares (process requests/responses)
DOWNLOADER_MIDDLEWARES = {
    # Rotate User-Agent
    'scrapy.downloadermiddlewares.useragent.UserAgentMiddleware': None,
    'scrapy.downloadermiddlewares.retry.RetryMiddleware': 90,
    
    # Handle retries on errors
    'scrapy.downloadermiddlewares.httpcompression.HttpCompressionMiddleware': 810,
}

# Retry settings
RETRY_ENABLED = True
RETRY_TIMES = 3  # Retry failed requests up to 3 times
RETRY_HTTP_CODES = [500, 502, 503, 504, 408, 429]  # HTTP errors to retry


# ITEM PIPELINES


# Process scraped data through these pipelines (in order)
ITEM_PIPELINES = {
    'job_scraper.pipelines.cleaning_pipeline.CleaningPipeline': 100,         # Clean data first
    'job_scraper.pipelines.deduplication_pipeline.DeduplicationPipeline': 200,  # Remove duplicates
    'job_scraper.pipelines.mongodb_pipeline.MongoDBPipeline': 300,          # Save to database
}


# DATABASE CONFIGURATION


# MongoDB connection
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/')
MONGODB_DATABASE = os.getenv('MONGODB_DATABASE', 'ai_career_coach')
MONGODB_COLLECTION = 'jobs'

# Redis (for deduplication)
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')


# LOGGING


# Log level: DEBUG, INFO, WARNING, ERROR, CRITICAL
LOG_LEVEL = 'INFO'

# Log format
LOG_FORMAT = '%(asctime)s [%(name)s] %(levelname)s: %(message)s'
LOG_DATEFORMAT = '%Y-%m-%d %H:%M:%S'

# Save logs to file (optional)
# LOG_FILE = 'scrapy_logs.log'


# FEED EXPORTS (optional - save to file)


# Uncomment to save scraped data to JSON file
# FEEDS = {
#     'jobs_%(time)s.json': {
#         'format': 'json',
#         'encoding': 'utf8',
#         'store_empty': False,
#         'indent': 4,
#     },
# }


# REQUEST FINGERPRINTER


# Used for deduplication - identifies unique requests
REQUEST_FINGERPRINTER_IMPLEMENTATION = '2.7'


# TELNET CONSOLE (debugging)


TELNETCONSOLE_ENABLED = False  # Disable for production


# SPIDER LIMITS


# Uncomment to limit number of pages scraped (for testing)
# CLOSESPIDER_PAGECOUNT = 10  # Stop after 10 pages

# Stop spider after timeout (in seconds)
# CLOSESPIDER_TIMEOUT = 3600  # 1 hour


# How these settings work together:
"""
1. Spider sends request → USER_AGENT is added
2. Request waits for DOWNLOAD_DELAY seconds
3. If request fails → RETRY up to RETRY_TIMES
4. Response comes back → parsed by spider
5. Item created → goes through ITEM_PIPELINES:
   - CleaningPipeline: normalizes data
   - DeduplicationPipeline: checks if job exists
   - MongoDBPipeline: saves to database
"""
