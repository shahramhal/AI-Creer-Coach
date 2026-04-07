# apps/job-api-service/main.py
"""
Job API Service

Fetches job data from official APIs (Adzuna, Reed) across multiple countries.
Stores jobs in MongoDB for the job matching system.
Runs as a separate microservice alongside ml-service.

Adzuna free-tier: 250 calls/day, 1000/week, 2500/month
Reed free-tier: UK-only
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from motor.motor_asyncio import AsyncIOMotorClient
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import uvicorn
import os
from dotenv import load_dotenv
from loguru import logger

from src.services.job_aggregator import JobAggregator
from src.models.job import JobSearchRequest
from src.config.settings import settings

# Load environment variables
load_dotenv()

# ─── Per-country search configurations ──────────────────────────────────────
# Each country has its own set of locations.
# Keywords are shared across all countries.
# Total Adzuna calls per cycle ≈ len(keywords) × sum(locations per country) × max_pages
# With defaults below: 3 × (3+3+2+2+2) = 3 × 12 = 36 Adzuna calls + 9 Reed calls = 45 total
# Well within 250/day free-tier limit.

SEARCH_KEYWORDS = [
    "software engineer",
    "python developer",
    "data scientist",
]

COUNTRY_LOCATIONS = {
    "gb": ["London", "Manchester", "Birmingham"],
    "us": ["New York", "San Francisco", "Austin"],
    "de": ["Berlin", "Munich"],
    "fr": ["Paris", "Lyon"],
    "ca": ["Toronto", "Vancouver"],
}

# Database connection
mongodb_client: AsyncIOMotorClient = None
db = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup and shutdown events
    - Connect to MongoDB on startup
    - Clean up expired jobs
    - Start job fetching scheduler
    - Close connections on shutdown
    """
    global mongodb_client, db

    logger.info("🚀 Starting Job API Service")

    # Connect to MongoDB
    mongodb_client = AsyncIOMotorClient(settings.mongodb_url)
    db = mongodb_client[settings.mongodb_db_name]
    app.state.db = db

    logger.info(f" Connected to MongoDB: {settings.mongodb_db_name}")

    aggregator = JobAggregator(db)

    # Ensure indexes exist before any queries run
    await aggregator.ensure_indexes()

    # Clean up expired jobs before fetching new ones
    await aggregator.cleanup_expired_jobs()

    # Run initial fetch
    await fetch_jobs_task(aggregator)

    # Initialize scheduler
    scheduler = AsyncIOScheduler()

    # Fetch new jobs every N hours
    scheduler.add_job(
        fetch_jobs_task,
        'interval',
        hours=settings.job_fetch_interval_hours,
        args=[aggregator],
        id='fetch_jobs',
    )

    # Clean up expired jobs every 12 hours
    scheduler.add_job(
        cleanup_task,
        'interval',
        hours=12,
        args=[aggregator],
        id='cleanup_expired_jobs',
    )

    scheduler.start()
    logger.info(f"⏰ Scheduled: fetch every {settings.job_fetch_interval_hours}h, cleanup every 12h")

    yield

    # Shutdown
    logger.info("🛑 Shutting down Job API Service")
    scheduler.shutdown()
    mongodb_client.close()


async def fetch_jobs_task(aggregator: JobAggregator):
    """Background task to fetch jobs from all sources across all configured countries."""
    try:
        logger.info("🔄 Starting scheduled job fetch...")

        # Determine which countries to fetch
        configured_countries = [
            c.strip()
            for c in settings.adzuna_countries.split(",")
            if c.strip()
        ]

        # Build search plan
        search_queries = []
        for country_code in configured_countries:
            locations = COUNTRY_LOCATIONS.get(country_code, [])
            if not locations:
                logger.warning(f"No locations configured for country: {country_code}")
                continue

            for keywords in SEARCH_KEYWORDS:
                for location in locations:
                    search_queries.append({
                        "keywords": keywords,
                        "location": location,
                        "country": country_code,
                    })

        logger.info(
            f"📋 Search plan: {len(search_queries)} searches across "
            f"{len(configured_countries)} countries ({', '.join(c.upper() for c in configured_countries)})"
        )

        total_jobs = 0
        for query in search_queries:
            result = await aggregator.fetch_and_store_jobs(
                keywords=query["keywords"],
                location=query["location"],
                country=query["country"],
            )
            total_jobs += result["stored"]

        logger.info(f" Scheduled fetch complete: {total_jobs} jobs stored")

    except Exception as e:
        logger.error(f"❌ Scheduled fetch failed: {e}")


async def cleanup_task(aggregator: JobAggregator):
    """Background task to remove expired/stale jobs."""
    try:
        logger.info("🧹 Starting scheduled cleanup...")
        deleted = await aggregator.cleanup_expired_jobs()
        logger.info(f"🧹 Cleanup complete: {deleted} jobs removed")
    except Exception as e:
        logger.error(f"❌ Cleanup task failed: {e}")


# Initialize FastAPI app
app = FastAPI(
    title="AI Career Coach - Job API Service",
    description="Microservice for fetching job data from external APIs across multiple countries",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:4000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "Job API Service",
        "status": "running",
        "version": "2.0.0",
        "countries": settings.adzuna_countries,
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    try:
        await app.state.db.command('ping')
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "healthy",
        "database": db_status,
        "environment": settings.env,
        "countries": settings.adzuna_countries,
    }


@app.post("/api/jobs/fetch")
async def fetch_jobs(request: JobSearchRequest):
    """
    Manual endpoint to fetch jobs for a specific search.

    Example:
        POST /api/jobs/fetch
        {
            "keywords": "python developer",
            "location": "London",
            "country": "gb"
        }
    """
    try:
        aggregator = JobAggregator(app.state.db)

        result = await aggregator.fetch_and_store_jobs(
            keywords=request.keywords,
            location=request.location,
            country=request.country,
        )

        return {
            "success": True,
            "message": "Jobs fetched successfully",
            "data": result,
        }

    except Exception as e:
        logger.error(f"Error fetching jobs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/jobs/backfill-levels")
async def backfill_experience_levels():
    """
    Re-run the improved experience level detection on all 'Not specified' jobs.
    This scans both title and description for level keywords and years-of-experience patterns.
    """
    try:
        aggregator = JobAggregator(app.state.db)
        result = await aggregator.backfill_experience_levels()

        return {
            "success": True,
            "message": f"Backfill complete: {result['reclassified']} jobs reclassified",
            "data": result,
        }
    except Exception as e:
        logger.error(f"Error during backfill: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/jobs/cleanup")
async def cleanup_jobs():
    """Manual endpoint to trigger expired job cleanup."""
    try:
        aggregator = JobAggregator(app.state.db)
        deleted = await aggregator.cleanup_expired_jobs()

        return {
            "success": True,
            "message": f"Removed {deleted} expired jobs",
            "data": {"deleted": deleted},
        }

    except Exception as e:
        logger.error(f"Error during cleanup: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/jobs/stats")
async def get_job_stats():
    """Get statistics about stored jobs"""
    try:
        jobs_collection = app.state.db["jobs"]

        total_jobs = await jobs_collection.count_documents({})

        # Count by source
        by_source_pipeline = [
            {"$group": {"_id": "$source", "count": {"$sum": 1}}}
        ]
        by_source = await jobs_collection.aggregate(by_source_pipeline).to_list(None)

        # Count by country
        by_country_pipeline = [
            {"$group": {"_id": "$country", "count": {"$sum": 1}}}
        ]
        by_country = await jobs_collection.aggregate(by_country_pipeline).to_list(None)

        # Count by job_type (non "Not specified")
        by_job_type_pipeline = [
            {"$group": {"_id": "$job_type", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]
        by_job_type = await jobs_collection.aggregate(by_job_type_pipeline).to_list(None)

        return {
            "success": True,
            "data": {
                "total_jobs": total_jobs,
                "by_source": {item["_id"]: item["count"] for item in by_source},
                "by_country": {(item["_id"] or "unknown"): item["count"] for item in by_country},
                "by_job_type": {(item["_id"] or "unknown"): item["count"] for item in by_job_type},
            },
        }

    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.env == "development",
    )
