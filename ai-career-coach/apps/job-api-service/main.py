# apps/job-api-service/main.py
"""
Job API Service

Fetches job data from official APIs (Adzuna, Reed)
Stores jobs in MongoDB for the job matching system
Runs as a separate microservice alongside ml-service
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


# Database connection
mongodb_client: AsyncIOMotorClient = None
db = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup and shutdown events
    - Connect to MongoDB on startup
    - Start job fetching scheduler
    - Close connections on shutdown
    """
    # Startup
    global mongodb_client, db
    
    logger.info("🚀 Starting Job API Service")
    
    # Connect to MongoDB
    mongodb_client = AsyncIOMotorClient(settings.mongodb_url)
    db = mongodb_client[settings.mongodb_db_name]
    app.state.db = db
    
    logger.info(f"✅ Connected to MongoDB: {settings.mongodb_db_name}")
    
    # Initialize scheduler for automated job fetching
    scheduler = AsyncIOScheduler()
    
    # Schedule job fetching every 24 hours
    aggregator = JobAggregator(db)
    
    # Run immediately on startup
    await fetch_jobs_task(aggregator)
    
    # Then schedule for regular intervals
    scheduler.add_job(
        fetch_jobs_task,
        'interval',
        hours=settings.job_fetch_interval_hours,
        args=[aggregator],
        id='fetch_jobs'
    )
    
    scheduler.start()
    logger.info(f"⏰ Scheduled job fetching every {settings.job_fetch_interval_hours} hours")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down Job API Service")
    scheduler.shutdown()
    mongodb_client.close()


async def fetch_jobs_task(aggregator: JobAggregator):
    """Background task to fetch jobs from all sources"""
    try:
        logger.info("🔄 Starting scheduled job fetch...")
        
         # Multiple cities for better UK coverage
        locations = ["London", "Manchester", "Birmingham", "Edinburgh", "Bristol"]
        keywords_list = ["software engineer", "python developer", "data scientist"]
        
        search_queries = []
        
        # Generate combinations of keywords and locations
        for keywords in keywords_list:
            for location in locations:
                search_queries.append({
                    "keywords": keywords,
                    "location": location
                })
        
        logger.info(f" Total searches planned: {len(search_queries)}")
        
        total_jobs = 0
        for query in search_queries:
            result = await aggregator.fetch_and_store_jobs(
                keywords=query["keywords"],
                location=query["location"]
            )
            total_jobs += result["total_fetched"]
            
        logger.info(f"✅ Scheduled fetch complete: {total_jobs} jobs")
        
    except Exception as e:
        logger.error(f"❌ Scheduled fetch failed: {e}")


# Initialize FastAPI app
app = FastAPI(
    title="AI Career Coach - Job API Service",
    description="Microservice for fetching job data from external APIs",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000"],
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
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    try:
        # Check MongoDB connection
        await app.state.db.command('ping')
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "healthy",
        "database": db_status,
        "environment": settings.env
    }


@app.post("/api/jobs/fetch")
async def fetch_jobs(request: JobSearchRequest):
    """
    Manual endpoint to fetch jobs
    
    Use this to trigger job fetching for specific searches
    
    Example:
        POST /api/jobs/fetch
        {
            "keywords": "python developer",
            "location": "London"
        }
    """
    try:
        aggregator = JobAggregator(app.state.db)
        
        result = await aggregator.fetch_and_store_jobs(
            keywords=request.keywords,
            location=request.location
        )
        
        return {
            "success": True,
            "message": "Jobs fetched successfully",
            "data": result
        }
        
    except Exception as e:
        logger.error(f"Error fetching jobs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/jobs/stats")
async def get_job_stats():
    """Get statistics about stored jobs"""
    try:
        jobs_collection = app.state.db["jobs"]
        
        total_jobs = await jobs_collection.count_documents({})
        
        # Count by source
        pipeline = [
            {"$group": {"_id": "$source", "count": {"$sum": 1}}}
        ]
        by_source = await jobs_collection.aggregate(pipeline).to_list(None)
        
        return {
            "success": True,
            "data": {
                "total_jobs": total_jobs,
                "by_source": {item["_id"]: item["count"] for item in by_source}
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    # Run the service
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.env == "development"
    )