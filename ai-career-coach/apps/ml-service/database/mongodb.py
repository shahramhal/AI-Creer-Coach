"""
MongoDB connection configuration
Handles CV storage and retrieval
"""

from pymongo import MongoClient  # Fixed typo: was 'pymogo'
from typing import Optional
import os 
from dotenv import load_dotenv

load_dotenv()

class MongoDBConnection:
    """MongoDB connection manager"""
    
    def __init__(self):
        """Initialize MongoDB connection"""
        self.client: Optional[MongoClient] = None
        self.db = None
        self.collection = None
    
    def connect(self):
        """Establish connection to MongoDB"""
        try:
            # Get connection string from environment
            mongo_uri = os.getenv(  # Fixed typo: was 'gotenv'
                "MONGODB_URI", 
                "mongodb://localhost:27017/"
            )
            
            # Connect to MongoDB server
            self.client = MongoClient(mongo_uri)
            
            # Select database
            db_name = os.getenv("MONGODB_DB_NAME", "ai_career_coach_db")
            self.db = self.client[db_name]
            
            # Select collection for CVs (fixed typo: was 'colllection')
            self.collection = self.db['parsed_cvs']  # Fixed: removed space
            
            # Test connection
            self.client.admin.command('ping')
            print("✓ Connected to MongoDB successfully")
            
            return self.collection
        
        except Exception as e:
            print(f"✗ Error connecting to MongoDB: {e}")
            return None
    
    def save_parsed_cv(self, user_id: str, parsed_data: dict) -> str:
        """
        Save parsed CV data to MongoDB
        
        Args:
            user_id: User identifier
            parsed_data: Parsed CV dictionary
            
        Returns:
            Document ID
        """
        # Ensure connection exists
        if not self.collection:
            self.connect()
        
        # Add user_id to data
        parsed_data['user_id'] = user_id
        
        # Insert document
        result = self.collection.insert_one(parsed_data)
        
        return str(result.inserted_id)
    
    def get_cv_by_user(self, user_id: str) -> Optional[dict]:
        """
        Retrieve latest parsed CV data by user ID
        
        Args:
            user_id: User identifier
            
        Returns:
            Parsed CV data or None
        """
        # Ensure connection exists
        if not self.collection:
            self.connect()
        
        # Find most recent CV for user
        cv = self.collection.find_one(
            {'user_id': user_id},
            sort=[('parsed_at', -1)]
        )
        
        return cv
    
    def close(self):
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
            print("✓ MongoDB connection closed")


# Global connection instance
_mongodb = MongoDBConnection()

def get_mongodb_connection():
    """Get MongoDB connection instance"""
    return _mongodb