

FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libxml2-dev \
    libxslt-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (for Docker layer caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Set Python path
ENV PYTHONPATH=/app

# Default command (can be overridden)
CMD ["python", "run_scrapers.py"]

# Usage:
# Build:    docker build -t job-scraper .
# Run:      docker run --rm --env-file .env job-scraper
# Shell:    docker run --rm -it --env-file .env job-scraper /bin/bash