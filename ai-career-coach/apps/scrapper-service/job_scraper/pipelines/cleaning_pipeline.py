# job_scraper/pipelines/cleaning_pipeline.py
"""
Data Cleaning Pipeline

Normalizes and cleans scraped job data before storage

Processing steps:
1. Remove extra whitespace
2. Standardize formats (dates, locations)
3. Extract structured data from text
4. Validate required fields
"""

import re
from datetime import datetime, timedelta
from scrapy.exceptions import DropItem


class CleaningPipeline:
    """
    First pipeline - cleans and normalizes data
    
    Why this is needed:
    - Websites have inconsistent formatting
    - Extra spaces, HTML entities, weird characters
    - Need clean data for matching algorithm
    """
    
    def process_item(self, item, spider):
        """
        Process each scraped item
        
        Args:
            item: JobItem from spider
            spider: Spider instance
            
        Returns:
            Cleaned JobItem
            
        Raises:
            DropItem: If item fails validation
        """
        
        # Validate required fields
        if not self._validate_item(item):
            raise DropItem(f"Missing required fields: {item.get('title', 'Unknown')}")
        
        # Clean text fields
        item['title'] = self._clean_text(item.get('title', ''))
        item['company'] = self._clean_text(item.get('company', ''))
        item['location'] = self._clean_text(item.get('location', ''))
        item['description'] = self._clean_description(item.get('description', ''))
        
        # Standardize location format
        item['location'] = self._standardize_location(item['location'])
        
        # Parse posted date to standard format
        item['posted_date'] = self._parse_posted_date(item.get('posted_date', ''))
        
        # Clean salary text
        if item.get('salary_text'):
            item['salary_text'] = self._clean_text(item['salary_text'])
        
        # Clean requirements list
        if item.get('requirements'):
            item['requirements'] = [
                self._clean_text(req) 
                for req in item['requirements'] 
                if req and self._clean_text(req)
            ]
        
        # Ensure experience_level has valid value
        if not item.get('experience_level'):
            item['experience_level'] = 'Not specified'
        
        # Ensure job_type has valid value
        if not item.get('job_type'):
            item['job_type'] = 'Full-time'  # Default assumption
        
        # Mark as cleaned
        item['cleaned'] = True
        
        spider.logger.debug(f"Cleaned job: {item['title']} at {item['company']}")
        
        return item
    
    def _validate_item(self, item):
        """
        Check if item has required fields
        
        Required fields:
        - title
        - company
        - source
        
        Args:
            item: JobItem to validate
            
        Returns:
            Boolean - True if valid
        """
        required_fields = ['title', 'company', 'source']
        
        for field in required_fields:
            if not item.get(field):
                return False
        
        return True
    
    def _clean_text(self, text):
        """
        Remove extra whitespace and normalize text
        
        Example:
            Input:  "  Senior   Developer  \n  "
            Output: "Senior Developer"
        
        Args:
            text: String to clean
            
        Returns:
            Cleaned string
        """
        if not text:
            return ''
        
        # Convert to string (in case it's not)
        text = str(text)
        
        # Remove HTML entities
        text = re.sub(r'&[a-z]+;', ' ', text)
        
        # Remove multiple spaces
        text = re.sub(r'\s+', ' ', text)
        
        # Strip leading/trailing whitespace
        text = text.strip()
        
        return text
    
    def _clean_description(self, description):
        """
        Clean job description text
        
        Removes:
        - HTML tags
        - URLs
        - Email addresses
        - Extra whitespace
        
        Args:
            description: Raw description text
            
        Returns:
            Cleaned description
        """
        if not description:
            return ''
        
        # Remove HTML tags
        description = re.sub(r'<[^>]+>', ' ', description)
        
        # Remove URLs
        description = re.sub(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', '', description)
        
        # Remove email addresses
        description = re.sub(r'\S+@\S+', '', description)
        
        # Remove extra whitespace
        description = re.sub(r'\s+', ' ', description)
        
        # Truncate if too long (>10000 chars)
        if len(description) > 10000:
            description = description[:10000] + '...'
        
        return description.strip()
    
    def _standardize_location(self, location):
        """
        Standardize location format
        
        Examples:
            "London, UK" → "London, United Kingdom"
            "San Francisco, CA" → "San Francisco, California"
            "Remote" → "Remote"
        
        Args:
            location: Raw location string
            
        Returns:
            Standardized location string
        """
        if not location:
            return 'Not specified'
        
        location = location.strip()
        
        # Handle remote jobs
        if 'remote' in location.lower():
            return 'Remote'
        
        # Expand common abbreviations
        abbreviations = {
            'UK': 'United Kingdom',
            'US': 'United States',
            'CA': 'California',
            'NY': 'New York',
            'TX': 'Texas',
            'FL': 'Florida',
            'WA': 'Washington',
            # Add more as needed
        }
        
        for abbr, full in abbreviations.items():
            if location.endswith(f', {abbr}'):
                location = location.replace(f', {abbr}', f', {full}')
        
        return location
    
    def _parse_posted_date(self, date_text):
        """
        Parse relative dates to absolute dates
        
        Indeed shows dates like:
        - "Just posted" → today
        - "2 days ago" → 2 days before today
        - "30+ days ago" → 30 days before today
        
        Args:
            date_text: Raw date string from website
            
        Returns:
            ISO format date string (YYYY-MM-DD)
        """
        if not date_text:
            return datetime.utcnow().strftime('%Y-%m-%d')
        
        date_text_lower = date_text.lower()
        today = datetime.utcnow()
        
        # Parse relative dates
        if 'just posted' in date_text_lower or 'today' in date_text_lower:
            return today.strftime('%Y-%m-%d')
        
        # Extract number of days
        days_match = re.search(r'(\d+)\s*days?\s*ago', date_text_lower)
        if days_match:
            days = int(days_match.group(1))
            posted_date = today - timedelta(days=days)
            return posted_date.strftime('%Y-%m-%d')
        
        # "30+ days ago" → assume 30 days
        if '30+' in date_text_lower or 'month' in date_text_lower:
            posted_date = today - timedelta(days=30)
            return posted_date.strftime('%Y-%m-%d')
        
        # If can't parse, return today
        return today.strftime('%Y-%m-%d')


# Pipeline execution order:
"""
1. Spider yields item
2. CleaningPipeline.process_item() ← YOU ARE HERE
3. DeduplicationPipeline.process_item()
4. MongoDBPipeline.process_item()
5. Item saved to database
"""
