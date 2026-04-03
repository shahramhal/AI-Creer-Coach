# AI Career Coach - Project Analysis

## Repository Layout

```
AI-Creer-Coach/ai-career-coach/          (monorepo root)
  apps/
    backend/          Express 5 API (TypeScript, ESM)
    frontend/         Next.js 15 App Router (React 19)
    ml-service/       FastAPI ML pipeline (Python 3.11)
    job-api-service/  FastAPI job aggregator (Python 3.11)
    scrapper-service/ Scrapy + Selenium batch scraper (Python 3.11)
    docs/             Turborepo docs app
  packages/
    eslint-config/    Shared ESLint config
    typescript-config/ Shared TS configs
    ui/               Shared React components
  scripts/
    init-db/          postgres-init.sql, mongo-init.js
    seed-admin.ts     Admin user seeding
    setup-databse.sh  DB setup helper
```

## Monorepo Tooling

- **Package manager**: npm 10.9.2 with workspaces (`apps/*`, `packages/*`)
- **Build orchestrator**: Turborepo 2.5.8
- **Root scripts**: `build`, `dev`, `lint`, `format` (Prettier), `check-types`
- **Node requirement**: >= 18

## Service Details

### Backend (Express 5, TypeScript)
- **Entry**: `src/server.ts`, compiled via `tsc` to `dist/`
- **Dev runner**: `tsx watch`
- **Port**: 4000 (Dockerfile exposes 8080, docker-compose maps 4000)
- **Databases**: Prisma (PostgreSQL), Mongoose (MongoDB), ioredis (Redis)
- **Queue**: Bull (Redis DB 3)
- **Auth**: bcrypt + jsonwebtoken, JWT access (1h) + refresh cookie (7d)
- **Tests**: Vitest with v8 coverage, `vitest run`, pool: forks
  - 18 test files covering middleware, routes, services, utils, controllers
  - Coverage thresholds: 80% lines/functions/statements, 75% branches
  - Setup file: `src/test-setup.ts`
- **Lint**: ESLint 9 + @typescript-eslint + Prettier
- **Key deps**: express 5.1, @prisma/client 6.17, mongoose 9.1, bull 4.16, multer 2

### Frontend (Next.js 15)
- **Framework**: Next.js 15, React 19, App Router
- **Port**: 3000
- **UI**: Radix UI primitives, Tailwind CSS 3.4, framer-motion, lucide-react, recharts
- **State**: Zustand (via context/hooks), React Query (@tanstack/react-query 5)
- **Forms**: react-hook-form 7 + zod 4
- **Build**: `next build`, output in `.next/`
- **Lint**: `next lint` with react-app config
- **Tests**: @testing-library/react installed, one legacy `App.test.tsx`
- **Env**: `NEXT_PUBLIC_API_URL` set at build time via Dockerfile ARG

### ML Service (FastAPI, Python 3.11)
- **Entry**: `main.py` via uvicorn on port 8000
- **Modules**: cv_parser, cv_analyzer, job_matcher, salary_prediction, skill_gap, skill_relevance
- **ML stack**: spaCy (en_core_web_sm), sentence-transformers (all-MiniLM-L6-v2), KeyBERT, XGBoost, scikit-learn
- **LLM**: Anthropic Claude API for CV text extraction
- **OCR**: Tesseract + Poppler (PDF processing)
- **Heavy deps**: PyTorch (CPU-only via custom index), transformers
- **DB clients**: pymongo, psycopg2-binary, redis
- **Tests**: No automated test suite (only manual `test.py`)

### Job API Service (FastAPI, Python 3.11)
- **Entry**: `main.py` via uvicorn on port 8001
- **Purpose**: Aggregates jobs from Adzuna and Reed APIs on a 24h schedule
- **Scheduler**: APScheduler 3.10
- **DB**: motor (async MongoDB driver), pymongo
- **HTTP**: httpx, requests
- **Tests**: No automated test suite (only manual `test.py`)

### Scrapper Service (Scrapy + Selenium, Python 3.11)
- **Entry**: `run_scrapers.py`
- **Purpose**: Batch job scraping (not always-on)
- **Stack**: Scrapy 2.11, Selenium 4.16 + selenium-stealth, BeautifulSoup4
- **DB**: pymongo, redis
- **Tests**: One `test_scraper.py` file

## Infrastructure

### Docker Compose (7 services + 3 data stores)
- **frontend** - node:18-alpine, builds Next.js, depends on backend
- **backend** - node:18, runs tsx + Prisma migrations, depends on postgres/mongodb/redis
- **ml-service** - python:3.11-slim, heavy build (PyTorch, spaCy, Tesseract)
- **job-api-service** - python:3.11-slim, lightweight FastAPI
- **scrapper-service** - python:3.11-slim, batch runner (not in compose default)
- **postgres** - postgres:17, with init SQL script, healthcheck
- **mongodb** - mongo:7, with init JS script
- **redis** - redis:7-alpine, AOF persistence, password auth, healthcheck

### Networking
- All services on `career_coach_network` bridge
- Internal service discovery by container name (e.g., `http://ml-service:8000`)

### Data Volumes
- `postgres_data`, `mongo_data`, `redis_data` (named Docker volumes)

## Environment Variables

### Backend
- `DATABASE_URL` - PostgreSQL connection (Prisma)
- `MONGODB_URL` - MongoDB connection (Mongoose)
- `REDIS_URL` - Redis connection
- `JWT_SECRET`, `JWT_EXPIRES_IN`, `REFRESH_TOKEN_EXPIRES_IN`
- `ML_SERVICE_URL` - ML service endpoint
- `PORT`, `NODE_ENV`

### Frontend
- `NEXT_PUBLIC_API_URL` - Backend API URL (build-time)

### Job API Service
- `MONGODB_URL` - MongoDB connection
- `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, `REED_API_KEY` - Job API credentials
- `PORT`, `ENV`

### ML Service
- Anthropic API key (for Claude), database URLs, Redis URL

### Docker Compose level
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `MONGO_ROOT_USER`, `MONGO_ROOT_PASSWORD`, `MONGO_INITDB_DATABASE`
- `REDIS_PASSWORD`
- `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, `REED_API_KEY`

## Current Gaps (relevant to CI/CD)

1. **No Python test suites** - ML service and Job API have no automated tests
2. **Frontend has minimal test coverage** - only one legacy test file
3. **Backend has good test coverage** - 18 test files with Vitest + coverage thresholds
4. **Dockerfiles are functional but not optimized** - no multi-stage builds, no layer caching hints for CI
5. **No health check endpoints defined** in application code (only Postgres/Redis in compose)
6. **Backend Dockerfile port mismatch** - exposes 8080 but app runs on 4000
7. **Python services lack linting config** - no ruff/flake8/mypy setup
8. **Scrapper service is inactive** - excluded from CI/CD pipeline
