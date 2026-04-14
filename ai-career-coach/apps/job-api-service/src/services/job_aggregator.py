# apps/job-api-service/src/services/job_aggregator.py
"""
Job Aggregator Service

Coordinates fetching from multiple APIs across multiple countries.
Handles deduplication, storage, and stale-job cleanup in MongoDB.
"""

import re
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
        """Create indexes on the jobs collection if they don't exist. Idempotent.

        Uses individual try/except per index so a pre-existing index with a different
        name (IndexOptionsConflict, code 85) doesn't crash the whole startup sequence.
        """
        from pymongo.errors import OperationFailure

        col = self.jobs_collection

        indexes = [
            ([("source", 1), ("job_id", 1)], {"unique": True, "background": True, "name": "source_job_id_unique"}),
            ([("posted_date", -1)], {"background": True, "name": "posted_date_desc"}),
            ([("scraped_at", -1)], {"background": True, "name": "scraped_at_desc"}),
            ([("last_seen_at", -1)], {"background": True, "name": "last_seen_at_desc"}),
            ([("expiration_date", 1)], {"background": True, "name": "expiration_date_asc"}),
            ([("country", 1)], {"background": True, "name": "country_asc"}),
            ([("experience_level", 1)], {"background": True, "name": "experience_level_asc"}),
            ([("location", 1)], {"background": True, "name": "location_asc"}),
            (
                [("country", 1), ("experience_level", 1), ("posted_date", -1)],
                {"background": True, "name": "country_level_date_compound"},
            ),
        ]

        for keys, options in indexes:
            try:
                await col.create_index(keys, **options)
            except OperationFailure as e:
                if e.code == 85:
                    # Index already exists on this key pattern with a different name - safe to ignore
                    logger.debug(f"Index already exists (different name) for {keys}, skipping: {e.details.get('errmsg', '')}")
                else:
                    raise

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

    @staticmethod
    def _content_dedup_key(title: str, company: str, location: str) -> tuple:
        """
        Compute a normalised (title, company, city) tuple used to detect re-posts.
        Same job posted multiple times by the same company gets the same key even
        when Reed/Adzuna assigns a different job_id each time.
        """
        title_norm = re.sub(r'\s+', ' ', title.lower().strip())
        # Strip common legal suffixes so "Aldi Ltd" == "Aldi"
        company_norm = re.sub(
            r'\b(ltd|limited|inc|llc|plc|group|uk|&)\b\.?', '', company.lower()
        ).strip()
        company_norm = re.sub(r'\s+', ' ', company_norm).strip()
        city = (location or '').split(',')[0].lower().strip()
        return (title_norm, company_norm, city)

    async def _store_jobs(self, jobs: List[Dict]) -> int:
        """
        Store jobs in MongoDB with two-level deduplication:
        1. Exact match on (source, job_id) - same job seen again on re-fetch.
        2. Content match on (title, company, city) - same job re-posted with a new
           job_id (common on Reed where spam-posters publish dozens of identical
           listings and agencies refresh posts daily).
        For re-posts we update the existing record rather than creating a new one,
        keeping only the latest date and job_id.
        """
        if not jobs:
            return 0

        stored_count = 0

        for job_data in jobs:
            try:
                now = datetime.now(timezone.utc)
                job_data['last_seen_at'] = now

                title = job_data.get('title', '')
                company = job_data.get('company', '')
                location = job_data.get('location', '') or ''
                title_norm, company_norm, city_norm = self._content_dedup_key(title, company, location)

                # Level 1: exact job_id match (fast - indexed)
                existing = await self.jobs_collection.find_one({
                    'source': job_data['source'],
                    'job_id': job_data['job_id'],
                })

                if existing:
                    await self.jobs_collection.update_one(
                        {'_id': existing['_id']},
                        {'$set': {k: v for k, v in job_data.items() if k != 'scraped_at'}},
                    )
                    stored_count += 1
                    continue

                # Level 2: content match - same job, new job_id (re-post / spam)
                content_match = await self.jobs_collection.find_one({
                    'title': {'$regex': f'^{re.escape(title_norm)}$', '$options': 'i'},
                    'company': {'$regex': f'^{re.escape(company_norm)}', '$options': 'i'},
                    'location': {'$regex': f'^{re.escape(city_norm)}', '$options': 'i'},
                }) if title_norm and company_norm and city_norm else None

                if content_match:
                    new_date = job_data.get('posted_date') or ''
                    existing_date = content_match.get('posted_date') or ''
                    update: Dict = {'last_seen_at': now}
                    # Absorb the new job_id so future exact-match lookups find this record
                    update['job_id'] = job_data['job_id']
                    update['source'] = job_data['source']
                    if new_date and new_date > existing_date:
                        update['posted_date'] = new_date
                    if job_data.get('salary_min') is not None:
                        update['salary_min'] = job_data['salary_min']
                    if job_data.get('salary_max') is not None:
                        update['salary_max'] = job_data['salary_max']
                    await self.jobs_collection.update_one(
                        {'_id': content_match['_id']},
                        {'$set': update},
                    )
                else:
                    # Genuinely new job
                    job_data['scraped_at'] = now
                    await self.jobs_collection.insert_one(job_data)

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

    async def backfill_dedup(self) -> Dict:
        """
        One-time cleanup of existing duplicate jobs already in MongoDB.

        Groups all jobs by (title_lower, company_lower, location_city) and for each
        group with more than one record keeps only the most recent (by posted_date,
        falling back to scraped_at). Deletes the rest.

        Safe to re-run: groups with a single record are untouched.
        """
        pipeline = [
            {
                '$group': {
                    '_id': {
                        'title': {'$toLower': '$title'},
                        'company': {'$toLower': '$company'},
                        'city': {
                            '$toLower': {
                                '$arrayElemAt': [
                                    {'$split': [{'$ifNull': ['$location', '']}, ',']},
                                    0,
                                ]
                            }
                        },
                    },
                    'count': {'$sum': 1},
                    'doc_ids': {'$push': '$_id'},
                }
            },
            {'$match': {'count': {'$gt': 1}}},
        ]

        duplicate_groups = await self.jobs_collection.aggregate(pipeline).to_list(length=None)

        groups_merged = 0
        records_deleted = 0

        for group in duplicate_groups:
            doc_ids = group['doc_ids']

            # Fetch all docs in this group, most recent first
            docs = await self.jobs_collection.find(
                {'_id': {'$in': doc_ids}},
                {'_id': 1, 'posted_date': 1, 'scraped_at': 1},
            ).sort([('posted_date', -1), ('scraped_at', -1)]).to_list(length=None)

            if len(docs) < 2:
                continue

            keep_id = docs[0]['_id']
            delete_ids = [d['_id'] for d in docs[1:]]

            result = await self.jobs_collection.delete_many({'_id': {'$in': delete_ids}})
            groups_merged += 1
            records_deleted += result.deleted_count

        logger.info(
            f" Dedup backfill: {groups_merged} groups merged, {records_deleted} duplicate records removed"
        )

        return {
            'duplicate_groups_found': groups_merged,
            'records_deleted': records_deleted,
        }

    async def backfill_remote_types(self) -> Dict:
        """
        Re-run remote type detection on all jobs currently marked 'Not specified'.
        Uses the expanded detect_remote_type() which catches plain 'remote' keyword,
        hybrid office-day patterns, and common on-site language.
        """
        cursor = self.jobs_collection.find(
            {"remote_type": "Not specified"},
            {"_id": 1, "title": 1, "description": 1},
        )

        reclassified = 0
        scanned = 0
        type_counts: Dict[str, int] = {}

        async for job in cursor:
            scanned += 1
            title = job.get("title", "")
            description = job.get("description", "")
            new_type = detect_remote_type(title, description)

            if new_type != "Not specified":
                await self.jobs_collection.update_one(
                    {"_id": job["_id"]},
                    {"$set": {"remote_type": new_type}},
                )
                reclassified += 1
                type_counts[new_type] = type_counts.get(new_type, 0) + 1

        logger.info(
            f" Remote type backfill: scanned {scanned}, reclassified {reclassified} "
            f"({type_counts})"
        )

        return {
            "scanned": scanned,
            "reclassified": reclassified,
            "still_not_specified": scanned - reclassified,
            "breakdown": type_counts,
        }

    async def backfill_job_types(self) -> Dict:
        """
        Re-run job type inference on all jobs currently marked 'Not specified'.
        Many jobs from Adzuna/Reed don't send contract_type/contract_time fields,
        so they fall through to infer_job_type() which may miss patterns present
        in the description.
        """
        cursor = self.jobs_collection.find(
            {"job_type": "Not specified"},
            {"_id": 1, "title": 1, "description": 1},
        )

        reclassified = 0
        scanned = 0
        type_counts: Dict[str, int] = {}

        async for job in cursor:
            scanned += 1
            title = job.get("title", "")
            description = job.get("description", "")
            new_type = infer_job_type(title, description)

            if new_type != "Not specified":
                await self.jobs_collection.update_one(
                    {"_id": job["_id"]},
                    {"$set": {"job_type": new_type}},
                )
                reclassified += 1
                type_counts[new_type] = type_counts.get(new_type, 0) + 1

        logger.info(
            f" Job type backfill: scanned {scanned}, reclassified {reclassified} "
            f"({type_counts})"
        )

        return {
            "scanned": scanned,
            "reclassified": reclassified,
            "still_not_specified": scanned - reclassified,
            "breakdown": type_counts,
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

        scraped_at_cutoff = datetime.now(timezone.utc) - timedelta(days=30)

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

            # Delete any job first fetched more than 30 days ago regardless of posted_date
            result_scraped = await self.jobs_collection.delete_many({
                'scraped_at': {'$lt': scraped_at_cutoff},
            })

            total_deleted = (
                result_old.deleted_count
                + result_expired.deleted_count
                + result_no_date.deleted_count
                + result_scraped.deleted_count
            )

            logger.info(
                f"🧹 Cleanup done: {result_old.deleted_count} old + "
                f"{result_expired.deleted_count} expired + "
                f"{result_no_date.deleted_count} no-date + "
                f"{result_scraped.deleted_count} stale-fetch = {total_deleted} total removed"
            )

            return total_deleted

        except Exception as e:
            logger.error(f" Error during job cleanup: {e}")
            return 0
