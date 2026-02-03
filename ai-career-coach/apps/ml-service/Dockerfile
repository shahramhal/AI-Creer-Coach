FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Set pip timeout for large downloads
ENV PIP_DEFAULT_TIMEOUT=300
ENV PIP_RETRIES=5

# Install all Python dependencies
# Use CPU-only PyTorch index as primary, PyPI as fallback for other packages
RUN pip install --no-cache-dir \
    --index-url https://download.pytorch.org/whl/cpu \
    --extra-index-url https://pypi.org/simple \
    -r requirements.txt
RUN python -m spacy download en_core_web_sm
# Install Tesseract OCR and Poppler for PDF processing
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-eng \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*
# Copy application code
COPY . .

EXPOSE 8000

# Run application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]