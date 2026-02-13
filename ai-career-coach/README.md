# AI Career Coach

Full-stack platform that helps job seekers optimize their CVs, find matching jobs, and understand salary markets. Built as a microservices monorepo with a React frontend, Express API, Python ML pipeline, job aggregation service, and web scraper.

## System Overview

```
                                 +------------------+
                                 |    Frontend       |
                                 |  Next.js :3000    |
                                 +--------+---------+
                                          |
                                          v
                              +-----------+-----------+
                              |      Backend API      |
                              |    Express.js :4000   |
                              +--+-------+-------+---+
                                 |       |       |
                    +------------+   +---+---+   +------------+
                    |                |       |                |
                    v                v       v                v
            +-------+------+  +-----+--+ +--+-----+  +-------+------+
            |  ML Service  |  | Postgres| |MongoDB |  | Job API Svc  |
            | FastAPI :8000|  |  :5432  | | :27017 |  | FastAPI :8001|
            +--------------+  +---------+ +---+----+  +------+-------+
                                              |              |
                                          +---+----+         |
                                          | Redis  |         |
                                          | :6379  +---------+
                                          +---+----+
                                              |
                                       +------+-------+
                                       |   Scraper    |
                                       | Scrapy batch |
                                       +--------------+
```

### Services

| Service | Port | Stack | Purpose |
|---------|------|-------|---------|
| [Frontend](apps/frontend/) | 3000 | Next.js 15, React 19, Tailwind | User interface |
| [Backend](apps/backend/) | 4000 | Express 5, Prisma, Mongoose | REST API, auth, orchestration |
| [ML Service](apps/ml-service/) | 8000 | FastAPI, Sentence Transformers, Claude | CV parsing, analysis, job matching |
| [Job API Service](apps/job-api-service/) | 8001 | FastAPI, Motor, APScheduler | Job aggregation from Adzuna/Reed APIs |
| [Scraper Service](apps/scrapper-service/) | -- | Scrapy, Selenium | Indeed job scraping (batch) |

### Data Stores

| Store | Purpose |
|-------|---------|
| PostgreSQL 17 | Users, profiles, CV metadata, applications, skills, courses (Prisma ORM) |
| MongoDB 7 | Parsed CV documents, job listings for ML matching |
| Redis 7 | Application cache, session storage, Bull job queues, scraper deduplication |

## Features

### CV Management and Analysis
Upload a PDF or DOCX resume. The ML service extracts structured data using Claude, then runs a local analysis pipeline that scores the CV across five categories (content quality, ATS compatibility, keyword match, format/structure, experience clarity). Users get actionable recommendations with priority rankings and estimated time to implement.

### Job Matching
Semantic similarity matching between user CVs and job listings. The ML service encodes both using Sentence Transformers (`all-MiniLM-L6-v2`), calculates cosine similarity, and returns ranked matches with skill breakdowns showing what matches and what's missing. Results are cached in Redis for one hour.

### Salary Insights
Salary predictions based on job title, location, and user profile. Pulls market data from the Adzuna API (histogram and historical endpoints), then adjusts for experience level, education, skill premiums, and regional factors. Supports seven countries (UK, US, DE, FR, NL, AU, CA).

### Job Aggregation
Two sources feed the job database:
1. **Job API Service** -- fetches from Adzuna and Reed APIs on a 24-hour schedule across multiple keywords and UK cities
2. **Scraper Service** -- crawls Indeed with Scrapy, processes through cleaning/dedup/storage pipelines

### Authentication
JWT-based auth with access tokens (1h) and refresh tokens (7d, httpOnly cookie). Email verification, password reset via email, bcrypt password hashing.

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL 17
- MongoDB 7
- Redis 7
- Adzuna API credentials (free at developer.adzuna.com)
- Anthropic API key (for CV parsing)

### Option 1: Docker Compose (recommended)

Create a `.env` file in the project root:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_postgres_password
POSTGRES_DB=career_coach

MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=admin123
MONGO_INITDB_DATABASE=career_coach

REDIS_PASSWORD=your_redis_password

ADZUNA_APP_ID=your_adzuna_app_id
ADZUNA_APP_KEY=your_adzuna_app_key
REED_API_KEY=your_reed_api_key
```

Then start everything:

```bash
docker-compose up --build
```

This brings up all seven services (frontend, backend, ml-service, job-api-service, postgres, mongodb, redis) with proper networking.

### Option 2: Local Development

```bash
# Install Node.js dependencies
npm install

# Start infrastructure (databases)
docker-compose up postgres mongodb redis

# In separate terminals:

# Backend
cd apps/backend
cp .env.example .env  # Edit with your credentials
npm run prisma:generate
npm run prisma:migrate
npm run dev

# Frontend
cd apps/frontend
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env.local
npm run dev

# ML Service
cd apps/ml-service
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
uvicorn main:app --port 8000 --reload

# Job API Service
cd apps/job-api-service
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8001 --reload
```

### Option 3: Turborepo (Node services only)

```bash
npm install
npx turbo dev
```

This starts the frontend and backend simultaneously with Turborepo's task orchestration. You'll still need to run the Python services separately.

## Monorepo Structure

```
ai-career-coach/
  apps/
    backend/              # Express.js REST API
    frontend/             # Next.js web app
    ml-service/           # Python ML microservice
    job-api-service/      # Python job aggregation service
    scrapper-service/     # Python Scrapy job scraper
    docs/                 # Next.js documentation site (Turborepo template)
  packages/
    ui/                   # Shared React component library (@repo/ui)
    typescript-config/    # Shared tsconfig presets (@repo/typescript-config)
    eslint-config/        # Shared ESLint config (@repo/eslint-config)
  scripts/
    init-db/
      postgres-init.sql   # PostgreSQL initialization
      mongo-init.js       # MongoDB initialization
    setup-database.sh     # Database setup helper
  docker-compose.yml      # Full stack orchestration
  turbo.json              # Turborepo task configuration
  package.json            # Root workspace config (npm workspaces)
```

Managed with npm workspaces and Turborepo. The `packages/` directory contains shared configurations consumed by the Node.js apps. The Python services are standalone with their own virtual environments.

## Environment Variables Reference

Each service has its own README with full environment variable documentation. Here's a summary of external API keys you'll need:

| Variable | Where to Get It | Used By |
|----------|----------------|---------|
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` | [developer.adzuna.com](https://developer.adzuna.com) | Backend (salary), Job API Service |
| `REED_API_KEY` | [reed.co.uk/developers](https://www.reed.co.uk/developers) | Job API Service |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) | ML Service (CV parsing) |

## Development

### Turborepo Commands

```bash
npx turbo dev          # Start all Node.js services in dev mode
npx turbo build        # Build all packages
npx turbo lint         # Lint all packages
npx turbo check-types  # Type-check all packages
```

### Database Management

```bash
cd apps/backend
npm run prisma:studio      # Visual database browser at localhost:5555
npm run prisma:migrate     # Create and apply new migration
npm run prisma:deploy      # Apply migrations (production)
```

### Populating Jobs

Run the scraper to seed the job database for matching:

```bash
cd apps/scrapper-service
python run_scrapers.py
```

Or trigger the job API service to fetch from external APIs:

```bash
curl -X POST http://localhost:8001/api/jobs/fetch \
  -H "Content-Type: application/json" \
  -d '{"keywords": "software engineer", "location": "London"}'
```
