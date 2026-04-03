# CI/CD Pipeline

## Overview

The pipeline uses GitHub Actions with three workflows that cover the full lifecycle from code push to production deployment.

```
PR/Push to develop/main
    |
    v
  [CI Workflow] -- lint, type-check, test, build validation
    |                per-service (only changed services run)
    |
    v (on main only)
  [Docker Build & Push] -- builds images, pushes to GHCR
    |
    v (after successful build)
  [Deploy Workflow] -- SSH into server, pull images, migrate, restart
```

## Workflows

### 1. CI (`ci.yml`)

**Triggers**: Push/PR to `main` or `develop` (ignores markdown/docs changes)

**What it does per service**:

| Service | Lint | Type Check | Tests | Build |
|---------|------|------------|-------|-------|
| Backend | ESLint via Turbo | `tsc --noEmit` | Vitest + coverage | `tsc` |
| Frontend | `next lint` | `tsc --noEmit` | - | `next build` |
| ML Service | ruff (non-blocking) | - | import validation | - |
| Job API | ruff (non-blocking) | - | import validation | - |

**Path-based filtering**: Only services with changed files will run. The `detect-changes` job uses `dorny/paths-filter` to determine which services need CI. Changes to shared packages trigger both backend and frontend CI.

**Docker validation**: When service Dockerfiles or their contexts change, the pipeline does a dry-run Docker build (no push) using GitHub Actions build cache.

**Status gate**: The `ci-status` job aggregates results from all service jobs. If any required job fails, this job fails too - use it as a branch protection rule.

### 2. Docker Build & Push (`docker-build.yml`)

**Triggers**:
- Automatic: push to `main` when service files change
- Manual: `workflow_dispatch` with service selection

**What it does**:
- Builds Docker images for changed services
- Tags with both `latest` and commit SHA
- Pushes to GitHub Container Registry (`ghcr.io`)
- Uses GitHub Actions build cache for faster rebuilds

**Images produced**:
- `ghcr.io/<owner>/ai-career-coach-backend`
- `ghcr.io/<owner>/ai-career-coach-frontend`
- `ghcr.io/<owner>/ai-career-coach-ml-service`
- `ghcr.io/<owner>/ai-career-coach-job-api`

**Manual trigger**: Go to Actions > Docker Build & Push > Run workflow. You can specify which services to build (e.g., `backend,frontend`) or `all`.

### 3. Deploy (`deploy.yml`)

**Triggers**:
- Automatic: after successful Docker Build & Push on main
- Manual: `workflow_dispatch` with environment selection (staging/production)

**What it does**:
1. SSH into the target server
2. Pull latest Docker images
3. Run Prisma database migrations
4. Restart services with `docker compose up -d`
5. Verify deployment by hitting the app URL

## Setup

### Required Secrets (Settings > Secrets and variables > Actions)

| Secret | Purpose |
|--------|---------|
| `DEPLOY_HOST` | Server hostname/IP for SSH deployment |
| `DEPLOY_USER` | SSH username on the server |
| `DEPLOY_SSH_KEY` | Private SSH key for authentication |

`GITHUB_TOKEN` is provided automatically and handles GHCR authentication.

### Required Variables (Settings > Secrets and variables > Actions > Variables)

| Variable | Purpose | Example |
|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL for frontend build | `https://api.example.com` |
| `APP_URL` | App URL for deploy verification | `https://example.com` |
| `DEPLOY_PATH` | Path on server where docker-compose lives | `/opt/ai-career-coach` |

### Branch Protection Rules (recommended)

For `main` branch:
- Require status checks: `ci-status`
- Require PR reviews
- No direct pushes

For `develop` branch:
- Require status checks: `ci-status`

### Server Prerequisites

The deploy target server needs:
- Docker and Docker Compose installed
- The repository cloned at `DEPLOY_PATH`
- A `.env` file with all required environment variables
- Network access to GHCR (`ghcr.io`)
- SSH access configured for the deploy user

### First-time Server Setup

```bash
# On the deploy server
mkdir -p /opt/ai-career-coach
cd /opt/ai-career-coach

# Clone and configure
git clone <repo-url> .
cp .env.example .env
# Edit .env with production values

# Login to GHCR (one-time)
echo $GITHUB_TOKEN | docker login ghcr.io -u <username> --password-stdin

# Initial start
docker compose up -d
```

## Python Linting Note

The Python services (ML service, Job API) currently run `ruff` lint checks as **non-blocking** (`continue-on-error: true`). This means lint failures show as warnings but don't fail the CI. Once the existing codebase is cleaned up, remove `continue-on-error: true` from those steps to make linting mandatory.

## Adding a New Service

1. Add a path filter entry in `ci.yml` under `detect-changes`
2. Add a CI job for the service (follow existing patterns)
3. Add the service to `ci-status` needs and result check
4. Add a build job in `docker-build.yml` if the service has a Dockerfile
5. Update docker-compose.yml on the deploy server
