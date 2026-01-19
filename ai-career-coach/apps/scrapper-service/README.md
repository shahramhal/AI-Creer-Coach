# Job Scraper Service

## Overview
Automated job scraping service that collects job postings from multiple platforms (Indeed, LinkedIn, Glassdoor) and stores them in MongoDB for job matching.

## Tech Stack
- **Scrapy**: Web scraping framework
- **Selenium**: For JavaScript-heavy sites (LinkedIn)
- **MongoDB**: Job storage
- **Redis**: Request queuing and deduplication

## Project Structure
```
scraper-service/
├── scrapy.cfg              # Scrapy configuration
├── requirements.txt        # Python dependencies
├── Dockerfile             # Container configuration
├── job_scraper/           # Main Scrapy project
│   ├── __init__.py
│   ├── settings.py        # Scrapy settings
│   ├── items.py           # Data models
│   ├── pipelines/         # Data processing
│   │   ├── __init__.py
│   │   ├── cleaning_pipeline.py      # Clean and normalize data
│   │   ├── deduplication_pipeline.py # Remove duplicates
│   │   └── mongodb_pipeline.py       # Save to database
│   ├── spiders/           # Site-specific scrapers
│   │   ├── __init__.py
│   │   ├── indeed_spider.py          # Indeed.com scraper
│   │   ├── linkedin_spider.py        # LinkedIn scraper
│   │   └── glassdoor_spider.py       # Glassdoor scraper
│   └── utils/
│       ├── __init__.py
│       └── helpers.py     # Shared utility functions
└── run_scrapers.py        # Script to run all spiders
```

## Installation

### 1. Install Dependencies
```bash
cd scraper-service
pip install -r requirements.txt
```

### 2. Environment Variables
Create `.env` file:
```
MONGODB_URI=mongodb://localhost:27017/ai_career_coach
REDIS_URL=redis://localhost:6379/0
SCRAPING_ENABLED=true
```

### 3. Run Spider
```bash
# Single spider
scrapy crawl indeed

# All spiders
python run_scrapers.py
```

## How It Works

### 1. **Indeed Spider** (Easiest)
- Sends HTTP requests to Indeed search results
- Parses HTML using CSS selectors
- Extracts: title, company, location, salary, description
- Follows pagination (50 pages max = ~750 jobs)

### 2. **LinkedIn Spider** (Complex - Uses Selenium)
- Selenium simulates real browser
- Bypasses anti-bot detection
- Scrolls to load dynamic content
- More realistic but slower

### 3. **Data Pipeline**
```
Spider → Cleaning Pipeline → Deduplication → MongoDB
```

### 4. **Scheduling** (Production)
```bash
# Run daily at 2 AM using cron
0 2 * * * cd /path/to/scraper-service && python run_scrapers.py
```

## Anti-Bot Measures
- Random delays between requests (2-5 seconds)
- Rotating User-Agent headers
- Respect robots.txt
- Request throttling

## Expected Output
After running scrapers, MongoDB `jobs` collection will contain:
```json
{
  "_id": ObjectId("..."),
  "job_id": "unique_hash",
  "title": "Senior Software Engineer",
  "company": "Google",
  "location": "San Francisco, CA",
  "salary_min": 150000,
  "salary_max": 200000,
  "description": "...",
  "requirements": ["Python", "React", "AWS"],
  "experience_level": "Senior",
  "job_type": "Full-time",
  "posted_date": "2025-01-15",
  "source": "indeed",
  "url": "https://...",
  "scraped_at": "2025-01-16T10:30:00Z"
}
```

## Performance Targets
- **Speed**: 100 jobs/hour per spider
- **Accuracy**: 95%+ data extraction accuracy
- **Database Size**: 5,000+ jobs initially
- **Daily Updates**: 500+ new jobs added daily

## Troubleshooting

### Error: "Connection refused"
- Check MongoDB is running: `docker ps | grep mongo`
- Verify connection string in `.env`

### Error: "Rate limited / 429"
- Increase delay in `settings.py`: `DOWNLOAD_DELAY = 3`
- Check robots.txt compliance

### Low job count
- Check search keywords are relevant
- Verify CSS selectors (sites change HTML structure)
- Use Scrapy shell for debugging: `scrapy shell 'URL'`