# ML Service

Python microservice that handles CV parsing, CV analysis, and job matching. Uses a combination of Claude (Anthropic) for intelligent CV parsing and local transformer models for semantic job matching.

## Tech Stack

- **Framework**: FastAPI + Uvicorn
- **Language**: Python 3.11
- **ML Models**: Sentence Transformers (`all-MiniLM-L6-v2`), KeyBERT (`jjzha/jobbert-base-cased`)
- **NLP**: spaCy (`en_core_web_sm`)
- **LLM**: Anthropic Claude (Sonnet) for CV parsing
- **PDF Processing**: pdfplumber, PyPDF2, Tesseract OCR
- **Database**: MongoDB (pymongo)

## Architecture

```
main.py                        # FastAPI app, endpoint definitions, CORS config

cv_parser/
  parserV2.py                  # Main parser: text extraction + LLM structuring
  llm_parser.py                # Claude API integration for structured CV extraction
  parser.py                    # Legacy regex-based parser (fallback)

cv_analyzer/
  analyzer.py                  # Orchestrator: runs all analysis modules, returns combined result
  keyword_analyzer.py          # Role-based keyword gap detection (7 role profiles)
  ats_checker.py               # 20+ ATS compatibility checks (format, content, structure)
  score_calculator.py          # Weighted scoring across 5 categories
  recommendation_engine.py     # Priority-ranked improvement suggestions

job_matcher/
  matcher.py                   # Semantic matching: CV embeddings vs job embeddings

database/
  mongodb.py                   # MongoDB connection and document operations

utils/
  serializers.py               # BSON ObjectId serialization for JSON responses
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check |
| GET | `/health` | Health check with embedding cache stats |
| POST | `/api/ml/parse-cv` | Parse a CV file (PDF/DOCX). Returns structured data |
| POST | `/api/ml/analyze-cv` | Run full ATS analysis on parsed CV data |
| POST | `/api/ml/match-jobs` | Match CV text against a list of jobs. Returns ranked results |
| POST | `/api/matching/find-jobs` | Alias for match-jobs |
| GET | `/api/ml/cache-stats` | Job embedding cache hit/miss statistics |
| POST | `/api/ml/clear-cache` | Clear the in-memory embedding cache |

### Parse CV

```
POST /api/ml/parse-cv
Content-Type: multipart/form-data
Authorization: Bearer <token>  (optional, used to associate with user)

Form field: file (PDF or DOCX)
```

Response includes structured fields: `contact_info`, `summary`, `skills`, `experience`, `education`, `projects`, `certifications`.

The parsing pipeline:
1. Extract raw text from PDF (pdfplumber, fallback to PyPDF2) or DOCX (python-docx)
2. Send extracted text to Claude Sonnet with a structured extraction prompt
3. Claude returns JSON with all CV sections parsed and categorized
4. Validate and calculate a confidence score (0-1.0)
5. If MongoDB is available, save the parsed document with raw text
6. Return parsed data and document ID to the caller

If LLM parsing fails, the service falls back to a regex-based parser.

### Analyze CV

```
POST /api/ml/analyze-cv
Content-Type: application/json

{
  "cv_text": "full raw text...",
  "parsed_data": { ... },
  "filename": "resume.pdf",
  "target_role": "software_engineer"  // optional
}
```

Analysis runs entirely locally (no external API calls) and produces:

**Keyword Gap Analysis** -- Compares CV keywords against role-specific keyword databases for 7 roles: software engineer, frontend developer, backend developer, data scientist, devops engineer, product manager, full-stack developer. Each keyword has a real-world job frequency percentage.

**ATS Compatibility Checks** -- 20+ automated checks including: file format, page length (300-1200 words ideal), contact info completeness, standard section headers, date formatting consistency, action verb usage, quantifiable achievements, bullet point length, special character issues, professional email format, chronological ordering.

**Score Calculation** -- Five weighted categories (0-100 each):
- Content Quality (25%) -- summary, experience depth, achievements, action verbs, skills
- ATS Compatibility (20%) -- based on pass/warning/fail counts from ATS checks
- Keywords Match (20%) -- coverage of role-relevant keywords
- Format & Structure (15%) -- headers, dates, length, section balance
- Experience Clarity (20%) -- position completeness, metrics, action verbs

**Recommendations** -- 1-8 prioritized suggestions with impact level, time estimate, and expected improvement rate. Generated from: quantifiable achievement gaps, missing summary, weak keywords, poor action verbs, incomplete contact info, shallow experience entries, ATS failures.

### Match Jobs

```
POST /api/ml/match-jobs
Content-Type: application/json

{
  "cv_text": "full raw text...",
  "jobs": [
    {"job_id": "...", "title": "...", "company": "...", "description": "...", ...}
  ],
  "top_k": 20,
  "filters": {"location": "London", "min_salary": 50000}
}
```

The matching algorithm:
1. Encode the CV text into a 384-dimensional embedding using `all-MiniLM-L6-v2`
2. For each job, combine title + company + description (truncated to 1000 chars) + requirements into a single text block
3. Encode all job texts into embeddings (processed in batches of 256, encoded with batch_size=64)
4. Calculate cosine similarity between the CV embedding and each job embedding
5. Apply optional filters (location, salary, remote type)
6. Return top-K results sorted by similarity score

Each matched job includes:
- `match_score` (0-100)
- `matched_skills` -- top 10 skills found in both CV and job
- `missing_skills` -- top 5 important skills the CV lacks
- `skill_coverage` -- percentage of job-required skills found in CV

Job embeddings are cached in memory (keyed by job_id) to avoid recomputation on repeated queries.

## Environment Variables

Create a `.env` file in this directory:

```
MONGODB_URI=mongodb://admin:admin123@localhost:27017/career_coach?authSource=admin
ANTHROPIC_API_KEY=sk-ant-api03-...
```

The MongoDB connection is optional. If unavailable, the service still functions but parsed CVs won't be persisted.

## Running Locally

Prerequisites: Python 3.11+, MongoDB 7 (optional)

```bash
cd apps/ml-service

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Linux/Mac
venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Download spaCy model
python -m spacy download en_core_web_sm

# Start the server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The service starts on `http://localhost:8000`. On first request, transformer models will be downloaded and cached locally (~90MB for all-MiniLM-L6-v2).

### Docker

```bash
docker build -t ml-service .
docker run -p 8000:8000 --env-file .env ml-service
```

The Dockerfile installs system dependencies (Tesseract OCR, Poppler) and uses CPU-only PyTorch to keep the image smaller.

## Dependencies

Key packages from `requirements.txt`:

| Category | Packages |
|----------|----------|
| Web Framework | fastapi, uvicorn, python-multipart |
| Document Processing | pdfplumber, PyPDF2, python-docx, pytesseract, Pillow, pdf2image |
| ML & NLP | sentence-transformers, keybert, torch (CPU), transformers, scikit-learn, spacy |
| LLM | anthropic |
| Database | pymongo, redis |
| Validation | pydantic, email-validator, phonenumbers |

## Performance Notes

- First request after startup is slow (~10-30s) while transformer models load into memory
- Subsequent matching requests process 1000+ jobs in under 10 seconds on a modern CPU
- The embedding cache eliminates redundant computation for jobs that have already been encoded
- CV parsing via Claude typically takes 2-4 seconds per document
