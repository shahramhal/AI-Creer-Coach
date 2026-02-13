# Job API Service

FastAPI microservice that aggregates job listings from external job board APIs (Adzuna, Reed) and stores them in MongoDB. Runs on a scheduled interval to keep the job database fresh.

## Tech Stack

- **Framework**: FastAPI + Uvicorn
- **Language**: Python 3.11
- **Database**: Motor 3.3 (async MongoDB driver)
- **Scheduler**: APScheduler 3.10
- **HTTP**: httpx (async), requests
- **Logging**: Loguru

## Architecture

```
main.py                          # FastAPI app with lifespan, endpoints, scheduler setup

src/
  config/
    settings.py                  # Pydantic Settings for env var management
  models/
    job.py                       # Pydantic models: JobSearchRequest, Job
  services/
    job_aggregator.py            # Orchestrator: coordinates fetching from all sources
    adzuna_api.py                # Adzuna API client (pagination, normalization)
    reed_api.py                  # Reed API client (Basic Auth, normalization)

Dockerfile                       # Python 3.11-slim container
requirements.txt                 # Dependencies
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check |
| GET | `/health` | Detailed health check (includes MongoDB connection status) |
| POST | `/api/jobs/fetch` | Manually trigger job fetching. Body: `{keywords, location}` |
| GET | `/api/jobs/stats` | Job statistics (total count, breakdown by source) |

### Manual Fetch

```
POST /api/jobs/fetch
Content-Type: application/json

{
  "keywords": "python developer",
  "location": "London"
}
```

Fetches jobs from all configured sources for the given query and saves them to MongoDB.

## External API Integrations

### Adzuna

- Base URL: `https://api.adzuna.com/v1/api/jobs/gb/search`
- Authentication: `app_id` + `app_key` as query parameters
- Pagination: fetches up to `MAX_JOBS_PER_SEARCH` results across multiple pages
- Normalization: maps Adzuna fields to the internal Job model

### Reed

- Base URL: `https://www.reed.co.uk/api/1.0/search`
- Authentication: HTTP Basic Auth (API key as username, empty password)
- Pagination: single-page result sets
- Normalization: maps Reed fields to the internal Job model

## Scheduled Fetching

On startup, APScheduler registers an interval job that runs every `JOB_FETCH_INTERVAL_HOURS` hours (default: 24).

Each scheduled run searches for multiple keyword/location combinations:

**Keywords**: software engineer, python developer, data scientist

**Locations**: London, Manchester, Birmingham, Edinburgh, Bristol

Jobs are upserted into MongoDB using a compound key of `source` + `job_id` to avoid duplicates.

## Environment Variables

```
MONGODB_URL=mongodb://admin:admin123@localhost:27017/career_coach?authSource=admin
MONGODB_DB_NAME=career_coach

ADZUNA_APP_ID=your_adzuna_app_id
ADZUNA_APP_KEY=your_adzuna_app_key
REED_API_KEY=your_reed_api_key

PORT=8001
ENV=development

JOB_FETCH_INTERVAL_HOURS=24
JOBS_PER_REQUEST=50
MAX_JOBS_PER_SEARCH=500
```

## Running Locally

Prerequisites: Python 3.11+, MongoDB 7

```bash
cd apps/job-api-service

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Linux/Mac
venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

The service starts on `http://localhost:8001`. The scheduled fetcher begins on startup.

### Docker

```bash
docker build -t job-api-service .
docker run -p 8001:8001 --env-file .env job-api-service
```

## How Other Services Use This

The backend proxies job search requests to this service via `GET /api/jobs/search?keywords=X&location=Y`. The ML service reads job listings directly from the MongoDB `jobs` collection for matching against user CVs.
