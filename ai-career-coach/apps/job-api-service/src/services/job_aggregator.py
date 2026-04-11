# apps/job-api-service/src/services/job_aggregator.py
"""
Job Aggregator Service

Coordinates fetching from multiple APIs across multiple countries.
Handles deduplication, storage, and stale-job cleanup in MongoDB.
"""

from typing import List, Dict, Optional
from datetime import datetime, timedelta, timezone
from loguru import logger
from motor.motor_asyncio import AsyncIOMotorDatabase

from .adzuna_api import AdzunaAPI
from .reed_api import ReedAPI
from ..config.settings import settings
from ..models.job import Job
from ..utils.helpers import detect_experience_level, detect_remote_type, infer_job_type


class JobAggregator:
    """
    Aggregates jobs from multiple sources and countries.
    Handles deduplication, database storage, and expired-job cleanup.
    """

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.jobs_collection = db["jobs"]

        # Initialize API clients
        self.adzuna = AdzunaAPI()
        self.reed = ReedAPI()

    async def ensure_indexes(self) -> None:
        """Create indexes on the jobs collection if they don't exist. Idempotent."""
        col = self.jobs_collection
        await col.create_index(
            [("source", 1), ("job_id", 1)], unique=True, background=True, name="source_job_id_unique"
        )
        await col.create_index([("posted_date", -1)], background=True, name="posted_date_desc")
        await col.create_index([("scraped_at", -1)], background=True, name="scraped_at_desc")
        await col.create_index([("last_seen_at", -1)], background=True, name="last_seen_at_desc")
        await col.create_index([("expiration_date", 1)], background=True, name="expiration_date_asc")
        await col.create_index([("country", 1)], background=True, name="country_asc")
        await col.create_index([("experience_level", 1)], background=True, name="experience_level_asc")
        await col.create_index([("location", 1)], background=True, name="location_asc")
        await col.create_index(
            [("country", 1), ("experience_level", 1), ("posted_date", -1)],
            background=True,
            name="country_level_date_compound",
        )
        logger.info("MongoDB indexes ensured on jobs collection")

    async def fetch_and_store_jobs(
        self,
        keywords: str,
        location: str,
        country: str = "gb",
    ) -> Dict:
        """
        Fetch jobs from all applicable sources for one country and store them.

        Args:
            keywords: Search terms
            location: Location filter
            country: Adzuna country code (gb, us, de, fr, ca, …)

        Returns:
            Dict with statistics about fetched jobs
        """
        logger.info(f"🔍 Fetching jobs: '{keywords}' in '{location}' [{country.upper()}]")

        all_jobs = []

        # Adzuna is available for all countries
        adzuna_jobs = await self.adzuna.fetch_jobs(keywords, location, country=country)
        all_jobs.extend(adzuna_jobs)
        logger.info(f"Adzuna [{country.upper()}]: {len(adzuna_jobs)} jobs")

        # Reed is UK-only
        reed_jobs_count = 0
        if country == "gb":
            reed_jobs = await self.reed.fetch_jobs(keywords, location)
            all_jobs.extend(reed_jobs)
            reed_jobs_count = len(reed_jobs)
            logger.info(f"Reed [GB]: {reed_jobs_count} jobs")

        # Deduplicate
        unique_jobs = self._deduplicate(all_jobs)
        logger.info(f"After deduplication: {len(unique_jobs)} unique jobs")

        # Store in MongoDB
        stored_count = await self._store_jobs(unique_jobs)

        return {
            "total_fetched": len(all_jobs),
            "unique_jobs": len(unique_jobs),
            "stored": stored_count,
            "country": country,
            "sources": {
                "adzuna": len(adzuna_jobs),
                "reed": reed_jobs_count,
            },
        }

    def _deduplicate(self, jobs: List[Dict]) -> List[Dict]:
        """Remove duplicate jobs based on source + job_id (matches the DB upsert key)."""
        seen = set()
        unique = []

        for job in jobs:
            key = (job.get('source', ''), job.get('job_id', ''))
            if key not in seen and all(key):
                seen.add(key)
                unique.append(job)

        return unique

    async def _store_jobs(self, jobs: List[Dict]) -> int:
        """
        Store jobs in MongoDB using upsert (source + job_id as unique key).
        """
        if not jobs:
            return 0

        stored_count = 0

        for job_data in jobs:
            try:
                now = datetime.now(timezone.utc)
                job_data['last_seen_at'] = now

                await self.jobs_collection.update_one(
                    {
                        'source': job_data['source'],
                        'job_id': job_data['job_id'],
                    },
                    {
                        '$set': {k: v for k, v in job_data.items() if k != 'scraped_at'},
                        '$setOnInsert': {'scraped_at': now},
                    },
                    upsert=True,
                )

                stored_count += 1

            except Exception as e:
                logger.error(f"Error storing job {job_data.get('job_id')}: {e}")

        logger.info(f" Stored {stored_count} jobs in MongoDB")
        return stored_count

    async def backfill_experience_levels(self) -> Dict:
        """
        Re-run experience level detection on all jobs currently marked 'Not specified'.
        Uses the improved detect_experience_level() which scans both title and description.

        Returns:
            Dict with reclassification statistics
        """
        cursor = self.jobs_collection.find(
            {"experience_level": "Not specified"},
            {"_id": 1, "title": 1, "description": 1},
        )

        reclassified = 0
        scanned = 0
        level_counts: Dict[str, int] = {}

        async for job in cursor:
            scanned += 1
            title = job.get("title", "")
            description = job.get("description", "")
            new_level = detect_experience_level(title, description)

            if new_level != "Not specified":
                await self.jobs_collection.update_one(
                    {"_id": job["_id"]},
                    {"$set": {"experience_level": new_level}},
                )
                reclassified += 1
                level_counts[new_level] = level_counts.get(new_level, 0) + 1

        logger.info(
            f" Backfill complete: scanned {scanned}, reclassified {reclassified} "
            f"({level_counts})"
        )

        return {
            "scanned": scanned,
            "reclassified": reclassified,
            "still_not_specified": scanned - reclassified,
            "breakdown": level_counts,
        }

    async def cleanup_expired_jobs(self, max_age_days: Optional[int] = None) -> int:
        """
        Remove jobs that are older than max_age_days based on posted_date.
        Also removes jobs where Reed's expiration_date has passed.

        Returns:
            Number of deleted jobs
        """
        effective_max_age = max_age_days or settings.job_max_age_days
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=effective_max_age)
        cutoff_iso = cutoff_date.isoformat()

        logger.info(f"🧹 Cleaning up jobs older than {effective_max_age} days (cutoff: {cutoff_iso})")

        try:
            # Delete jobs with posted_date older than cutoff
            # posted_date is now normalized to ISO 8601, so string comparison works
            result_old = await self.jobs_collection.delete_many({
                'posted_date': {'$lt': cutoff_iso, '$nin': ['', None]},
            })

            # Delete Reed jobs whose expiration_date has passed
            # Use $nin to exclude empty strings and null - prevents BSON null < string comparison
            now_iso = datetime.now(timezone.utc).isoformat()
            result_expired = await self.jobs_collection.delete_many({
                'expiration_date': {
                    '$exists': True,
                    '$nin': ['', None],
                    '$lt': now_iso,
                },
            })

            # Delete jobs with empty/missing posted_date that haven't been seen recently
            result_no_date = await self.jobs_collection.delete_many({
                'posted_date': {'$in': ['', None]},
                'last_seen_at': {'$lt': cutoff_date},
            })

            total_deleted = (
                result_old.deleted_count
                + result_expired.deleted_count
                + result_no_date.deleted_count
            )

            logger.info(
                f"🧹 Cleanup done: {result_old.deleted_count} old + "
                f"{result_expired.deleted_count} expired + "
                f"{result_no_date.deleted_count} no-date = {total_deleted} total removed"
            )

            return total_deleted

        except Exception as e:
            logger.error(f" Error during job cleanup: {e}")
            return 0
