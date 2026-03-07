# Scraper Service

Scrapy-based web scraping system that collects job postings from job boards and stores them in MongoDB. The scraped jobs feed directly into the job matching pipeline used by the ML service.

## Tech Stack

- **Framework**: Scrapy 2.11
- **Language**: Python 3.11
- **Browser Automation**: Selenium 4.16 (prepared for JS-heavy sites)
- **Database**: MongoDB (pymongo) for job storage, Redis for deduplication
- **NLP**: NLTK for text processing

## Architecture

```
run_scrapers.py                    # Entry point: runs all spiders sequentially
test_scraper.py                    # Setup validation (imports, DB connections, spider loading)
scrapy.cfg                         # Scrapy project config
settings.py                        # Root settings

job_scraper/
  __init__.py                      # Package metadata (v1.0.0)
  settings.py                      # Scrapy settings: delays, concurrency, anti-bot config
  items.py                         # JobItem schema definition
  spiders/
    indeed_spider.py               # Indeed.com scraper (fully implemented)
    linkedin_spider.py             # LinkedIn scraper (placeholder)
    glassdoor_spider.py            # Glassdoor scraper (placeholder)
  pipelines/
    cleaning_pipeline.py           # Text normalization, date parsing, validation
    deduplication_pipeline.py      # Redis-backed duplicate detection (MD5 hashing)
    mongodb_pipeline.py            # Database persistence with 7 strategic indexes
```

## How It Works

This is a batch scraper, not an HTTP API. It runs as a standalone process (manually or on a schedule) and writes results to MongoDB.

### Data Flow

```
Indeed.com
    |
    v
IndeedSpider (CSS selectors, pagination up to 50 pages)
    |
    v
CleaningPipeline (priority 100)
  - Validate required fields (title, company, source)
  - Strip whitespace, HTML entities, stray URLs
  - Standardize location names (UK -> United Kingdom)
  - Parse relative dates ("2 days ago" -> ISO format)
  - Set defaults for missing fields
    |
    v
DeduplicationPipeline (priority 200)
  - Generate MD5 hash from (title + company + location)
  - Check Redis SET "job_scraper:seen_jobs"
  - Drop item if already seen, otherwise add with 30-day TTL
    |
    v
MongoDBPipeline (priority 300)
  - Insert document into "jobs" collection
  - Maintain indexes: job_id (unique), title+location, company,
    posted_date, source, experience_level, description (text)
    |
    v
MongoDB "jobs" collection  -->  Read by ML service for job matching
```

### Indeed Spider

The only fully implemented spider. Scrapes `https://uk.indeed.com/jobs`.

**CSS Selectors:**
- Job cards: `div.job_seen_beacon`
- Title: `h2.jobTitle span::attr(title)`
- Company: `span[data-testid="company-name"]::text`
- Location: `div[data-testid="text-location"]::text`
- Description: `div#jobDescriptionText`
- Salary: `div#salaryInfoAndJobType span::text`

**Classification logic applied during scraping:**
- Experience level inferred from title keywords (intern, junior, senior, lead, director, etc.)
- Remote type detected from description (fully remote, hybrid, on-site)
- Salary parsed with regex and split into min/max

**Default search configuration** (in `run_scrapers.py`):
- "software engineer" in United Kingdom
- "python developer" in United Kingdom
- "frontend developer" in United Kingdom

Each search paginates up to 50 pages (~750 jobs).

### JobItem Schema

```python
job_id              # MD5(title + company + location)
source              # "indeed" / "linkedin" / "glassdoor"
source_url          # Original posting URL
title               # Job title
company             # Company name
location            # Normalized location
description         # Full job description
requirements        # List of extracted requirements
salary_min          # Parsed minimum salary
salary_max          # Parsed maximum salary
salary_text         # Raw salary string
experience_level    # Entry / Mid / Senior / Lead / Executive / Internship
job_type            # Full-time / Part-time / Contract / Internship
remote_type         # Remote / Hybrid / On-site
posted_date         # ISO date
scraped_at          # ISO timestamp
is_duplicate        # Set by deduplication pipeline
cleaned             # Set by cleaning pipeline
```

## Anti-Bot Configuration

Defined in `job_scraper/settings.py`:

- **Request delay**: 3 seconds base, randomized +/-20%
- **Concurrency**: 2 per domain, 8 total
- **Autothrottle**: enabled, adapts to server response times (2-10s range)
- **User-agent rotation**: 4 browser signatures (Chrome, Firefox, Safari on Windows/Mac)
- **robots.txt**: respected (`ROBOTSTXT_OBEY = True`)
- **Cookies**: disabled to avoid tracking
- **Retries**: 3 attempts on 500/502/503/504/408/429

## Environment Variables

Create a `.env` file in this directory:

```
MONGODB_URL=mongodb://admin:admin123@localhost:27017/career_coach?authSource=admin
MONGODB_URI=mongodb://admin:admin123@localhost:27017/career_coach?authSource=admin
MONGODB_DATABASE=career_coach

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_URL=redis://:your_redis_password@localhost:6379
```

## Running

Prerequisites: Python 3.11+, MongoDB 7, Redis 7

```bash
cd apps/scrapper-service

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Linux/Mac
venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Validate setup (checks imports, DB connections, spider loading)
python test_scraper.py

# Run all configured spiders
python run_scrapers.py

# Or run a single spider with custom parameters
scrapy crawl indeed -a keywords="react developer" -a location="London"
```

### Docker

```bash
docker build -t job-scraper .
docker run --rm --env-file .env job-scraper
```

### Scheduling (Production)

```bash
# Daily at 2 AM via cron
0 2 * * * cd /path/to/scrapper-service && python run_scrapers.py >> logs/scraper.log 2>&1

# Or via Docker Compose
docker-compose run scraper-service python run_scrapers.py
```

## Performance Targets

- ~100 jobs/hour per spider
- 95%+ data extraction accuracy
- Initial database population: 5,000+ jobs
- Daily additions: 500+ new jobs
- Duplicate rate on repeat runs: ~50% (expected, handled by dedup pipeline)

## Troubleshooting

**"Connection refused"** -- Make sure MongoDB and Redis are running. Check connection strings in `.env`.

**"Rate limited / 429"** -- Increase `DOWNLOAD_DELAY` in `job_scraper/settings.py`. Default is 3 seconds.

**Low job count** -- Indeed frequently changes their HTML structure. Check CSS selectors in `indeed_spider.py` against the live site. Use `scrapy shell 'URL'` for interactive debugging.

**Redis unavailable** -- The dedup pipeline degrades gracefully. Jobs will still be scraped and saved, but duplicates won't be filtered.
