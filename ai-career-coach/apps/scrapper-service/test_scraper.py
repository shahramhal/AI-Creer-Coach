#!/usr/bin/env python3
# test_scraper.py
"""
Test Scraper Setup

Validates that all dependencies and configurations are correct
"""

import sys


def test_imports():
    """Test if all required packages are installed"""
    print("Testing imports...")
    
    try:
        import scrapy
        print(f"  ✓ Scrapy {scrapy.__version__}")
    except ImportError as e:
        print(f"  ✗ Scrapy: {e}")
        return False
    
    try:
        import pymongo
        print(f"  ✓ PyMongo {pymongo.__version__}")
    except ImportError as e:
        print(f"  ✗ PyMongo: {e}")
        return False
    
    try:
        import redis
        print(f"  ✓ Redis {redis.__version__}")
    except ImportError as e:
        print(f"  ✗ Redis: {e}")
        return False
    
    try:
        from fake_useragent import UserAgent
        print(f"  ✓ fake-useragent")
    except ImportError as e:
        print(f"  ✗ fake-useragent: {e}")
        return False
    
    return True


def test_mongodb():
    """Test MongoDB connection"""
    print("\nTesting MongoDB connection...")
    
    try:
        import os
        from pymongo import MongoClient
        from dotenv import load_dotenv
        
        load_dotenv()
        
        uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/')
        client = MongoClient(uri, serverSelectionTimeoutMS=5000)
        
        # Test connection
        client.server_info()
        
        # Get database
        db_name = os.getenv('MONGODB_DATABASE', 'ai_career_coach')
        db = client[db_name]
        
        # Count jobs
        job_count = db.jobs.count_documents({})
        
        print(f"  ✓ Connected to MongoDB")
        print(f"  ✓ Database: {db_name}")
        print(f"  ✓ Jobs collection: {job_count} documents")
        
        client.close()
        return True
        
    except Exception as e:
        print(f"  ✗ MongoDB error: {e}")
        return False


def test_redis():
    """Test Redis connection"""
    print("\nTesting Redis connection...")
    
    try:
        import os
        import redis
        from dotenv import load_dotenv
        
        load_dotenv()
        
        url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
        client = redis.from_url(url, decode_responses=True)
        
        # Test connection
        client.ping()
        
        # Check seen jobs set
        key = "job_scraper:seen_jobs"
        count = client.scard(key)
        
        print(f"  ✓ Connected to Redis")
        print(f"  ✓ Seen jobs: {count} hashes")
        
        client.close()
        return True
        
    except Exception as e:
        print(f"  ✗ Redis error: {e}")
        return False


def test_spider():
    """Test if Indeed spider can be imported"""
    print("\nTesting spider import...")
    
    try:
        from job_scraper.spiders.indeed_spider import IndeedSpider
        print(f"  ✓ Indeed spider imported")
        print(f"  ✓ Spider name: {IndeedSpider.name}")
        return True
    except Exception as e:
        print(f"  ✗ Spider import error: {e}")
        return False


def test_pipelines():
    """Test if pipelines can be imported"""
    print("\nTesting pipeline imports...")
    
    try:
        from job_scraper.pipelines.cleaning_pipeline import CleaningPipeline
        print(f"  ✓ CleaningPipeline imported")
    except Exception as e:
        print(f"  ✗ CleaningPipeline: {e}")
        return False
    
    try:
        from job_scraper.pipelines.deduplication_pipeline import DeduplicationPipeline
        print(f"  ✓ DeduplicationPipeline imported")
    except Exception as e:
        print(f"  ✗ DeduplicationPipeline: {e}")
        return False
    
    try:
        from job_scraper.pipelines.mongodb_pipeline import MongoDBPipeline
        print(f"  ✓ MongoDBPipeline imported")
    except Exception as e:
        print(f"  ✗ MongoDBPipeline: {e}")
        return False
    
    return True


def main():
    """Run all tests"""
    print("="*60)
    print("Job Scraper Setup Test")
    print("="*60)
    
    results = []
    
    # Run tests
    results.append(("Imports", test_imports()))
    results.append(("MongoDB", test_mongodb()))
    results.append(("Redis", test_redis()))
    results.append(("Spider", test_spider()))
    results.append(("Pipelines", test_pipelines()))
    
    # Summary
    print("\n" + "="*60)
    print("Test Summary")
    print("="*60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"  {status} - {name}")
    
    print("\n" + "="*60)
    print(f"Results: {passed}/{total} passed")
    print("="*60)
    
    if passed == total:
        print("\n🎉 All tests passed! Ready to scrape.\n")
        return 0
    else:
        print("\n⚠️  Some tests failed. Please fix issues before scraping.\n")
        return 1


if __name__ == '__main__':
    sys.exit(main())
