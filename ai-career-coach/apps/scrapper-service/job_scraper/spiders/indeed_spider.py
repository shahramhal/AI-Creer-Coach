# job_scraper/spiders/indeed_spider.py
"""
Indeed Job Spider

Scrapes job postings from Indeed.com
This is the simplest spider - good starting point
"""

import scrapy
from scrapy import Request
from datetime import datetime
from urllib.parse import urlencode
from ..items  import JobItem
import re


class IndeedSpider(scrapy.Spider):
    """
    Spider for scraping Indeed.com job listings
    
    How it works:
    1. Build search URL with keywords and location
    2. Parse search results page (lists of jobs)
    3. Extract job URLs from search results
    4. Visit each job page and extract details
    5. Follow pagination to next pages
    """
    
    name = 'indeed'
    allowed_domains = ['indeed.com']
    
    # Search parameters (customize these)
    # You can modify these or pass via command line:
    # scrapy crawl indeed -a keywords="python developer" -a location="London"
    
    def __init__(self, keywords='software engineer', location='United Kingdom', *args, **kwargs):
        super(IndeedSpider, self).__init__(*args, **kwargs)
        self.keywords = keywords
        self.location = location
        self.max_pages = 50  # Limit to 50 pages (750 jobs) to avoid rate limiting
        
        self.logger.info(f'Starting Indeed spider: {keywords} in {location}')
    
    def start_requests(self):
        """
        Generate initial search URL and start scraping
        
        Indeed URL structure:
        https://uk.indeed.com/jobs?q=software+engineer&l=London&start=0
        - q: search query (keywords)
        - l: location
        - start: pagination offset (0, 10, 20, ...)
        """
        
        # Start with page 0
        url = self._build_search_url(start=0)
        
        yield Request(
            url=url,
            callback=self.parse_search_results,
            meta={'page': 0},
            dont_filter=True  # Allow duplicate filtering by Scrapy
        )
    
    def _build_search_url(self, start=0):
        """
        Build Indeed search URL with parameters
        
        Args:
            start: Pagination offset (0, 10, 20, ...)
            
        Returns:
            Complete search URL string
        """
        base_url = 'https://uk.indeed.com/jobs'
        
        params = {
            'q': self.keywords,      # Search keywords
            'l': self.location,      # Location
            'start': start,          # Pagination
            'sort': 'date',          # Sort by date (newest first)
        }
        
        # Build query string: ?q=software&l=London&start=0
        query_string = urlencode(params)
        full_url = f'{base_url}?{query_string}'
        
        return full_url
    
    def parse_search_results(self, response):
        """
        Parse job listing page (search results)
        
        Extracts:
        - Links to individual job pages
        - Pagination link to next page
        
        Args:
            response: Scrapy response object containing HTML
        """
        
        current_page = response.meta.get('page', 0)
        self.logger.info(f'Parsing search results page {current_page}')
        
        # Extract job cards from search results
        # CSS selector targets job listing elements
        job_cards = response.css('div.job_seen_beacon')
        
        self.logger.info(f'Found {len(job_cards)} jobs on page {current_page}')
        
        # Loop through each job card
        for job_card in job_cards:
            # Extract job page URL
            # The job title link contains the URL to full job posting
            job_url = job_card.css('h2.jobTitle a::attr(href)').get()
            
            if job_url:
                # Convert relative URL to absolute
                full_url = response.urljoin(job_url)
                
                # Extract basic info from search results (for speed)
                # We'll get full details on the job page
                title = job_card.css('h2.jobTitle span::attr(title)').get()
                company = job_card.css('span[data-testid="company-name"]::text').get()
                location = job_card.css('div[data-testid="text-location"]::text').get()
                
                # Visit the full job posting page
                yield Request(
                    url=full_url,
                    callback=self.parse_job,
                    meta={
                        'title': title,
                        'company': company,
                        'location': location,
                    }
                )
        
        # Pagination: follow link to next page
        # Indeed shows 15 jobs per page
        # Stop after max_pages to avoid overwhelming the site
        if current_page < self.max_pages:
            next_page = current_page + 1
            next_start = next_page * 10  # Indeed uses 10-job increments
            
            next_url = self._build_search_url(start=next_start)
            
            self.logger.info(f'Following pagination to page {next_page}')
            
            yield Request(
                url=next_url,
                callback=self.parse_search_results,
                meta={'page': next_page}
            )
    
    def parse_job(self, response):
        """
        Parse individual job posting page
        
        Extracts all detailed information about the job
        
        Args:
            response: Scrapy response containing job details page
            
        Yields:
            JobItem with complete job data
        """
        
        # Create job item
        job = JobItem()
        
        # Basic info (from search results, passed via meta)
        job['title'] = response.meta.get('title') or response.css('h1.jobsearch-JobInfoHeader-title::text').get()
        job['company'] = response.meta.get('company') or response.css('div[data-company-name="true"] a::text').get()
        job['location'] = response.meta.get('location') or response.css('div[data-testid="job-location"]::text').get()
        
        # Source info
        job['source'] = 'indeed'
        job['source_url'] = response.url
        job['scraped_at'] = datetime.utcnow().isoformat()
        
        # Job description (main content)
        # Get full HTML for later processing
        description_html = response.css('div#jobDescriptionText').get()
        description_text = ' '.join(response.css('div#jobDescriptionText *::text').getall())
        
        job['description'] = description_text.strip() if description_text else ''
        
        # Extract salary if available
        salary_text = response.css('div#salaryInfoAndJobType span::text').get()
        if salary_text:
            job['salary_text'] = salary_text
            # Parse salary numbers (e.g., "£50,000 - £70,000 a year")
            salary_numbers = re.findall(r'[\d,]+', salary_text)
            if len(salary_numbers) >= 2:
                job['salary_min'] = int(salary_numbers[0].replace(',', ''))
                job['salary_max'] = int(salary_numbers[1].replace(',', ''))
            elif len(salary_numbers) == 1:
                salary = int(salary_numbers[0].replace(',', ''))
                job['salary_min'] = salary
                job['salary_max'] = salary
        
        # Job type (Full-time, Part-time, Contract)
        job_type = response.css('div#salaryInfoAndJobType span::text').getall()
        for text in job_type:
            if any(t in text.lower() for t in ['full-time', 'part-time', 'contract', 'temporary', 'internship']):
                job['job_type'] = text.strip()
                break
        
        # Posted date
        posted_date = response.css('span.date::text').get()
        job['posted_date'] = posted_date if posted_date else 'Not specified'
        
        # Requirements (extract from description)
        # Look for bullet points, numbered lists, or "Requirements:" section
        requirements = []
        req_section = response.css('div#jobDescriptionText ul li::text').getall()
        if req_section:
            requirements = [req.strip() for req in req_section if req.strip()]
        
        job['requirements'] = requirements[:20]  # Limit to 20 items
        
        # Classify experience level from title
        job['experience_level'] = self._classify_experience_level(job['title'])
        
        # Remote type (Remote, Hybrid, On-site)
        job['remote_type'] = self._extract_remote_type(description_text)
        
        # Log successful scrape
        self.logger.info(f'Scraped job: {job["title"]} at {job["company"]}')
        
        # Send to pipeline for processing
        yield job
    
    def _classify_experience_level(self, title):
        """
        Determine experience level from job title
        
        Args:
            title: Job title string
            
        Returns:
            Experience level category
        """
        if not title:
            return 'Not specified'
        
        title_lower = title.lower()
        
        if any(word in title_lower for word in ['intern', 'trainee']):
            return 'Internship'
        elif any(word in title_lower for word in ['junior', 'entry', 'graduate']):
            return 'Entry'
        elif any(word in title_lower for word in ['senior', 'sr.', 'lead']):
            return 'Senior'
        elif any(word in title_lower for word in ['principal', 'staff', 'architect']):
            return 'Lead'
        elif any(word in title_lower for word in ['director', 'vp', 'chief', 'head of']):
            return 'Executive'
        else:
            return 'Mid'
    
    def _extract_remote_type(self, description):
        """
        Determine if job is remote/hybrid/on-site from description
        
        Args:
            description: Job description text
            
        Returns:
            Remote type category
        """
        if not description:
            return 'Not specified'
        
        desc_lower = description.lower()
        
        if any(word in desc_lower for word in ['fully remote', '100% remote', 'work from home', 'remote work']):
            return 'Remote'
        elif any(word in desc_lower for word in ['hybrid', 'flexible', 'part remote']):
            return 'Hybrid'
        else:
            return 'On-site'


# How to run this spider:
"""
Command line:
    scrapy crawl indeed

With custom parameters:
    scrapy crawl indeed -a keywords="python developer" -a location="London"

With settings override:
    scrapy crawl indeed -s DOWNLOAD_DELAY=5

Output to JSON file:
    scrapy crawl indeed -o jobs.json
"""
