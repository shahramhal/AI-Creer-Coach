# job_scraper/pipelines/deduplication_pipeline.py
"""
Deduplication Pipeline

Prevents storing duplicate job postings

How it works:
1. Create unique hash from job (title + company + location)
2. Check if hash exists in Redis cache
3. If exists → drop item (duplicate)
4. If new → add hash to Redis and continue to next pipeline

Why Redis?
- Fast in-memory lookups (O(1) time complexity)
- TTL support (expire old jobs after 30 days)
- Better than checking MongoDB every time (much faster)
"""

import hashlib
import redis
from scrapy.exceptions import DropItem


class DeduplicationPipeline:
    """
    Second pipeline - removes duplicate jobs
    
    Duplicate detection:
    - Same title + company + location = duplicate
    - Use hash for efficient comparison
    """
    
    def __init__(self, redis_url, ttl_days=30):
        """
        Initialize Redis connection
        
        Args:
            redis_url: Redis connection string
            ttl_days: Days to keep job hashes (default 30)
        """
        self.redis_url = redis_url
        self.ttl_seconds = ttl_days * 24 * 60 * 60  # Convert days to seconds
        self.redis_client = None
        self.duplicate_count = 0
        self.new_count = 0
    
    @classmethod
    def from_crawler(cls, crawler):
        """
        Factory method - Scrapy calls this to create pipeline instance
        
        Gets settings from settings.py
        """
        return cls(
            redis_url=crawler.settings.get('REDIS_URL'),
            ttl_days=30  # Jobs older than 30 days are considered stale
        )
    
    def open_spider(self, spider):
        """
        Called when spider opens
        
        Establishes Redis connection
        """
        try:
            self.redis_client = redis.from_url(
                self.redis_url,
                decode_responses=True  # Return strings not bytes
            )
            # Test connection
            self.redis_client.ping()
            spider.logger.info(f"✓ Connected to Redis for deduplication")
        except Exception as e:
            spider.logger.error(f"✗ Failed to connect to Redis: {e}")
            spider.logger.warning("Deduplication disabled - all jobs will be saved")
            self.redis_client = None
    
    def close_spider(self, spider):
        """
        Called when spider closes
        
        Logs statistics
        """
        total = self.duplicate_count + self.new_count
        
        if total > 0:
            duplicate_rate = (self.duplicate_count / total) * 100
            spider.logger.info(f"Deduplication stats:")
            spider.logger.info(f"  - New jobs: {self.new_count}")
            spider.logger.info(f"  - Duplicates: {self.duplicate_count}")
            spider.logger.info(f"  - Duplicate rate: {duplicate_rate:.1f}%")
        
        # Close Redis connection
        if self.redis_client:
            self.redis_client.close()
    
    def process_item(self, item, spider):
        """
        Check if job is duplicate
        
        Args:
            item: JobItem from previous pipeline
            spider: Spider instance
            
        Returns:
            Item if not duplicate
            
        Raises:
            DropItem: If duplicate detected
        """
        
        # If Redis not available, allow all items
        if not self.redis_client:
            return item
        
        # Generate unique hash for this job
        job_hash = self._generate_hash(item)
        item['job_id'] = job_hash
        
        # Check if hash exists in Redis
        if self._is_duplicate(job_hash):
            self.duplicate_count += 1
            item['is_duplicate'] = True
            
            # Drop duplicate item (won't be saved to MongoDB)
            raise DropItem(f"Duplicate job: {item.get('title', 'Unknown')} at {item.get('company', 'Unknown')}")
        
        # New job - add hash to Redis
        self._add_hash(job_hash, spider)
        self.new_count += 1
        item['is_duplicate'] = False
        
        spider.logger.debug(f"New job detected: {item['title']} at {item['company']}")
        
        return item
    
    def _generate_hash(self, item):
        """
        Create unique hash from job details
        
        Hash formula: MD5(title + company + location)
        
        Why these fields?
        - Title: "Software Engineer"
        - Company: "Google"
        - Location: "London"
        
        Same job posted twice = same hash
        
        Args:
            item: JobItem
            
        Returns:
            MD5 hash string (32 chars)
        """
        # Normalize and combine key fields
        title = str(item.get('title', '')).lower().strip()
        company = str(item.get('company', '')).lower().strip()
        location = str(item.get('location', '')).lower().strip()
        
        # Create composite string
        composite = f"{title}|{company}|{location}"
        
        # Generate MD5 hash
        hash_object = hashlib.md5(composite.encode('utf-8'))
        job_hash = hash_object.hexdigest()
        
        return job_hash
    
    def _is_duplicate(self, job_hash):
        """
        Check if job hash exists in Redis
        
        Args:
            job_hash: MD5 hash string
            
        Returns:
            Boolean - True if duplicate
        """
        try:
            # Redis SET contains seen job hashes
            # Key: "job_scraper:seen_jobs"
            redis_key = "job_scraper:seen_jobs"
            
            # SISMEMBER returns 1 if exists, 0 if not
            exists = self.redis_client.sismember(redis_key, job_hash)
            
            return bool(exists)
            
        except Exception as e:
            # If Redis error, allow item to pass (don't block scraping)
            return False
    
    def _add_hash(self, job_hash, spider):
        """
        Add job hash to Redis set
        
        Args:
            job_hash: MD5 hash string
            spider: Spider instance for logging
        """
        try:
            redis_key = "job_scraper:seen_jobs"
            
            # Add hash to Redis SET
            # SET automatically handles uniqueness
            self.redis_client.sadd(redis_key, job_hash)
            
            # Set TTL on the entire set (30 days)
            # After 30 days, old jobs will be considered "new" again
            self.redis_client.expire(redis_key, self.ttl_seconds)
            
        except Exception as e:
            spider.logger.error(f"Failed to add hash to Redis: {e}")


# How deduplication works in practice:
"""
Day 1:
- Scrape 500 jobs from Indeed
- All are new → 500 hashes added to Redis
- All 500 saved to MongoDB

Day 2:
- Scrape 500 jobs from Indeed again
- 450 are duplicates (same jobs as yesterday) → dropped
- 50 are new → added to Redis and MongoDB

Result:
- MongoDB has 550 unique jobs
- Scrapy logged "Duplicates: 450"

After 30 days:
- Redis key expires
- Next scrape treats all jobs as new again
- Prevents stale jobs from blocking fresh postings
"""
