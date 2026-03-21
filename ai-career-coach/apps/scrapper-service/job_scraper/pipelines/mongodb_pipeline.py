# job_scraper/pipelines/mongodb_pipeline.py
"""
MongoDB Pipeline

Final pipeline - saves cleaned job data to MongoDB

Database structure:
- Database: ai_career_coach
- Collection: jobs
- Indexes: job_id (unique), title, company, location, posted_date
"""

from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import DuplicateKeyError


class MongoDBPipeline:
    """
    Third pipeline - saves to MongoDB
    
    Why MongoDB for jobs?
    - Flexible schema (job fields vary across sources)
    - Fast reads for matching algorithm
    - Good for storing large text (descriptions)
    - Easy to query by multiple fields
    """
    
    def __init__(self, mongodb_uri, mongodb_db, mongodb_collection):
        """
        Initialize MongoDB configuration
        
        Args:
            mongodb_uri: MongoDB connection string
            mongodb_db: Database name
            mongodb_collection: Collection name
        """
        self.mongodb_uri = mongodb_uri
        self.mongodb_db = mongodb_db
        self.mongodb_collection = mongodb_collection
        self.client = None
        self.db = None
        self.collection = None
        self.inserted_count = 0
        self.error_count = 0
    
    @classmethod
    def from_crawler(cls, crawler):
        """
        Factory method - gets settings from settings.py
        """
        return cls(
            mongodb_uri=crawler.settings.get('MONGODB_URI'),
            mongodb_db=crawler.settings.get('MONGODB_DATABASE'),
            mongodb_collection=crawler.settings.get('MONGODB_COLLECTION'),
        )
    
    def open_spider(self, spider):
        """
        Called when spider starts
        
        Connects to MongoDB and creates indexes
        """
        try:
            # Connect to MongoDB
            self.client = MongoClient(self.mongodb_uri)
            self.db = self.client[self.mongodb_db]
            self.collection = self.db[self.mongodb_collection]
            
            # Test connection
            self.client.server_info()
            
            spider.logger.info(f"✓ Connected to MongoDB: {self.mongodb_db}.{self.mongodb_collection}")
            
            # Create indexes for faster queries
            self._create_indexes(spider)
            
        except Exception as e:
            spider.logger.error(f"✗ Failed to connect to MongoDB: {e}")
            raise
    
    def close_spider(self, spider):
        """
        Called when spider closes
        
        Logs stats and closes connection
        """
        spider.logger.info(f"MongoDB pipeline stats:")
        spider.logger.info(f"  - Inserted: {self.inserted_count} jobs")
        spider.logger.info(f"  - Errors: {self.error_count}")
        
        if self.client:
            self.client.close()
            spider.logger.info("✓ MongoDB connection closed")
    
    def process_item(self, item, spider):
        """
        Save job to MongoDB
        
        Args:
            item: Cleaned JobItem from previous pipelines
            spider: Spider instance
            
        Returns:
            Item (for potential further processing)
        """
        try:
            # Convert Scrapy Item to dict
            job_dict = dict(item)
            
            # Insert into MongoDB
            result = self.collection.insert_one(job_dict)
            
            self.inserted_count += 1
            
            spider.logger.debug(
                f"✓ Saved to MongoDB: {item['title']} at {item['company']} "
                f"(ID: {result.inserted_id})"
            )
            
        except DuplicateKeyError:
            # This shouldn't happen if deduplication works correctly
            # But we handle it just in case
            self.error_count += 1
            spider.logger.warning(
                f"Duplicate key error: {item.get('job_id', 'Unknown')} "
                f"({item.get('title', 'Unknown')} at {item.get('company', 'Unknown')})"
            )
            
        except Exception as e:
            self.error_count += 1
            spider.logger.error(
                f"✗ Failed to save job: {item.get('title', 'Unknown')} - {e}"
            )
        
        return item
    
    def _create_indexes(self, spider):
        """
        Create database indexes for fast queries
        
        Indexes speed up queries by creating sorted data structures
        
        Without index: MongoDB scans all documents (slow)
        With index: MongoDB jumps directly to matches (fast)
        
        Args:
            spider: Spider instance for logging
        """
        try:
            # 1. Unique index on job_id (prevents duplicates at DB level)
            self.collection.create_index(
                [('job_id', ASCENDING)],
                unique=True,
                background=True,
                name='job_id_unique'
            )
            
            # 2. Compound index for job matching queries
            # Used when matching CVs to jobs by title + location
            self.collection.create_index(
                [
                    ('title', ASCENDING),
                    ('location', ASCENDING),
                ],
                background=True,
                name='title_location'
            )
            
            # 3. Index on company (for filtering by company)
            self.collection.create_index(
                [('company', ASCENDING)],
                background=True,
                name='company'
            )
            
            # 4. Index on posted_date (for sorting by newest jobs)
            self.collection.create_index(
                [('posted_date', DESCENDING)],
                background=True,
                name='posted_date_desc'
            )
            
            # 5. Index on source (for filtering by job board)
            self.collection.create_index(
                [('source', ASCENDING)],
                background=True,
                name='source'
            )
            
            # 6. Index on experience_level (for filtering by seniority)
            self.collection.create_index(
                [('experience_level', ASCENDING)],
                background=True,
                name='experience_level'
            )
            
            # 7. Text index on description (for full-text search)
            # Enables: db.jobs.find({ $text: { $search: "python react" } })
            self.collection.create_index(
                [('description', 'text')],
                background=True,
                name='description_text'
            )
            
            spider.logger.info("✓ MongoDB indexes created successfully")
            
        except Exception as e:
            # Index creation errors are non-fatal
            spider.logger.warning(f"Index creation warning: {e}")


# Example MongoDB queries after scraping:
"""
# Count total jobs
db.jobs.count_documents({})

# Find jobs by company
db.jobs.find({ "company": "Google" })

# Find recent jobs (last 7 days)
from datetime import datetime, timedelta
cutoff = (datetime.utcnow() - timedelta(days=7)).strftime('%Y-%m-%d')
db.jobs.find({ "posted_date": { "$gte": cutoff } })

# Find remote jobs with "python" in description
db.jobs.find({
    "remote_type": "Remote",
    "$text": { "$search": "python" }
})

# Get salary statistics
db.jobs.aggregate([
    { "$group": {
        "_id": "$experience_level",
        "avg_salary": { "$avg": "$salary_max" },
        "count": { "$sum": 1 }
    }}
])

# Find jobs matching a CV
# (This will be done by job matching service later)
db.jobs.find({
    "requirements": { "$in": ["Python", "React", "AWS"] },
    "location": "London"
}).sort("posted_date", -1).limit(20)
"""
