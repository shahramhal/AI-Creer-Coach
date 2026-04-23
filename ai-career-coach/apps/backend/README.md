# Backend API

Express.js REST API that serves as the central orchestrator for the AI Career Coach platform. Handles authentication, user management, CV lifecycle, job matching coordination, salary insights, application tracking, skill gap analysis, and admin management.

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express 5.1
- **Language**: TypeScript 5.9
- **ORM**: Prisma 6.17 (PostgreSQL)
- **ODM**: Mongoose 9.1 (MongoDB)
- **Cache**: ioredis 5.9
- **Queue**: Bull 4.16
- **Auth**: JWT (jsonwebtoken) + bcrypt
- **Uploads**: Multer 2.0
- **Email**: Nodemailer 7.0, Resend 6.12
- **Logging**: Pino 10 + pino-http
- **Security**: Helmet 8, compression, express-rate-limit
- **API Docs**: swagger-jsdoc + swagger-ui-express (at `/api/docs`)

## Architecture

```
src/
  server.ts                  # Express app bootstrap, route registration, graceful shutdown
  config/
    database.ts              # Prisma, Mongoose, Redis, Bull queue connections + CacheManager
    redis.js                 # Redis client factory
  controllers/
    auth.controller.ts       # Registration, login, token refresh, password reset
    profile.controller.ts    # Profile CRUD, avatar upload/delete
    matching.controller.ts   # Job matching orchestration, diagnostics
    application.controller.ts # Application tracker CRUD + ATS check
    admin.controller.ts      # User management, system health, job management
    dashboard.controller.ts  # Recent activity feed
    skillGap.controller.ts   # Skill gap analysis, learning paths, course progress
  services/
    auth.service.ts          # Business logic for auth flows
    profile.service.ts       # Profile upsert, avatar management
    admin.service.ts         # Admin operations and audit logging
  middlewares/
    auth.middleware.ts        # JWT verification, optional auth, email verification guard
    admin.middleware.ts       # Admin role guard
    upload.middleware.ts      # Multer config for avatars (disk) and CVs (memory)
    validation.middleware.ts  # express-validator rules for endpoints
  routes/
    auth.routes.ts           # /api/v1/auth/*
    profile.routes.ts        # /api/v1/profile/*
    ml.routes.ts             # /api/v1/ml/* (CV parse, analyze, list, download, delete)
    matching.routes.ts       # /api/v1/matching/*
    jobs.routes.ts           # /api/v1/jobs/*
    salary.routes.ts         # /api/v1/salary/*
    applications.routes.ts   # /api/v1/applications/*
    skillGap.routes.ts       # /api/v1/skill-gap/*
    dashboard.routes.ts      # /api/v1/dashboard/*
    admin.routes.ts          # /api/v1/admin/* (admin only)
  models/
    ParsedCV.ts              # Mongoose schema for parsed_cvs collection
    user.model.ts            # User-related type definitions
  utils/
    jwt.util.ts              # Token generation/verification helpers
    email.util.ts            # SMTP transport, HTML email templates
prisma/
  schema.prisma              # PostgreSQL schema (14 models)
```

## Database Schema

The backend uses a polyglot persistence approach:

**PostgreSQL** (via Prisma) stores relational data - 14 models:
- `users` - account credentials, email verification status, role (USER/ADMIN)
- `user_profiles` - phone, location, social links, bio, avatar
- `cvs` - file metadata, reference to MongoDB doc, analysis results (JSONB)
- `jobs` - scraped job listings with salary, type, experience level
- `saved_jobs` - user bookmarks with match scores
- `applications` - application tracker with status workflow
- `interview_sessions` / `interview_answers` - mock interview data with scoring
- `skills` - master skill catalog by category
- `learning_paths` - personalized skill development plans
- `courses` / `user_courses` - course catalog and progress tracking
- `user_activity` - activity log for dashboard feed
- `admin_audit_logs` - audit trail for admin actions

**MongoDB** stores unstructured/large documents:
- `parsed_cvs` - full parsed CV content (skills, experience, education, raw text)
- `jobs` - job listings used for ML matching

**Redis** handles three responsibilities:
- **DB 0**: Application cache (CV lists, match results, salary data, job lists)
- **DB 1**: Session storage
- **DB 3**: Bull job queues

## API Reference

All authenticated endpoints require `Authorization: Bearer <token>` header.

Base path: `/api/v1`

Interactive docs available at `http://localhost:4000/api/docs` (Swagger UI).

### Authentication `/api/v1/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | No | Create account. Body: `{email, password, firstName?, lastName?}` |
| POST | `/login` | No | Returns `{accessToken, user}` + sets httpOnly refresh cookie |
| GET | `/verify-email` | No | Query: `?token=xxx` |
| POST | `/forgot-password` | No | Body: `{email}`. Sends reset link |
| POST | `/reset-password` | No | Body: `{token, password}` |
| POST | `/refresh` | No | Reads refresh cookie, returns new access token |
| POST | `/logout` | Yes | Clears refresh cookie |
| GET | `/me` | Yes | Returns current user object |

Password requirements: minimum 8 characters, at least one uppercase, one lowercase, one digit.

### Profile `/api/v1/profile`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/:userId` | Yes | Get user profile |
| PUT | `/` | Yes | Update profile fields (phone, location, links, bio) |
| POST | `/avatar` | Yes | Upload avatar (JPEG/PNG, max 5MB, multipart) |
| DELETE | `/avatar` | Yes | Remove avatar |

### CV Management `/api/v1/ml`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/parse-cv` | Yes | Upload CV (PDF/DOCX multipart). Forwards to ML service for parsing |
| GET | `/cvs` | Yes | List user's CVs (cached 5 min) |
| GET | `/cvs/:cvId` | Yes | Get single CV with parsed + analysis data |
| GET | `/cvs/:cvId/download` | Yes | Stream original file |
| POST | `/cvs/:cvId/analyze` | Yes | Trigger ATS analysis. Body: `{targetRole?, forceReanalyze?}` |
| DELETE | `/cvs/:cvId` | Yes | Delete CV and associated files |
| PATCH | `/cvs/:cvId/primary` | Yes | Set as primary CV |
| GET | `/health` | Yes | ML service health check |

### Job Matching `/api/v1/matching`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/find-jobs` | Yes | Get ranked job recommendations. Body: `{cv_id?, filters?, top_k?, job_limit?}` |
| GET | `/diagnostics` | Yes | System health checks (MongoDB, CV, jobs count, ML service) |

### Job Search `/api/v1/jobs`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/search` | Yes | Proxy to job-api-service. Query: `keywords` (required), `location` (required) |
| GET | `/stats` | Yes | Job database statistics |

### Salary Insights `/api/v1/salary`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/insights` | Yes | Query: `jobTitle` (required), `location?`, `country?` (default: gb) |
| PATCH | `/preferences` | Yes | Save job title/location preferences |

### Applications `/api/v1/applications`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | Yes | Create application. Body: `{jobId, company, role, ...}` |
| GET | `/` | Yes | List user applications |
| GET | `/stats` | Yes | Application statistics by status |
| PATCH | `/:id/status` | Yes | Update application status |
| DELETE | `/:id` | Yes | Delete application |
| POST | `/ats-check` | Yes | Run ATS check on CV against job description |
| POST | `/jobs/:jobId/ats-preview` | Yes | Preview ATS match for a specific job |
| POST | `/:applicationId/ats-score` | Yes | Score existing application against CV |

### Skill Gap `/api/v1/skill-gap`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/analyze` | Yes | Analyze skill gaps for a target role |
| GET | `/learning-paths` | Yes | Get user's learning paths |
| GET | `/learning-paths/:learningPathId` | Yes | Get learning path with course details |
| PATCH | `/learning-paths/:learningPathId/progress` | Yes | Update learning path progress |
| PATCH | `/courses/:courseId/progress` | Yes | Update course completion progress |
| GET | `/summary` | Yes | Overall skill progress summary |

### Dashboard `/api/v1/dashboard`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/recent-activity` | Yes | Recent user activity feed |

### Admin `/api/v1/admin` (Admin role required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/dashboard/stats` | Platform-wide statistics |
| GET | `/dashboard/user-growth` | User growth trend data |
| GET | `/users` | List all users (paginated, filterable) |
| GET | `/users/:userId` | Get detailed user profile |
| PATCH | `/users/:userId/status` | Enable/disable user account |
| POST | `/users/:userId/promote` | Promote user to ADMIN role |
| POST | `/users/:userId/demote` | Demote admin to USER role |
| POST | `/users/:userId/force-reset-password` | Force password reset |
| DELETE | `/users/:userId` | Delete user account |
| GET | `/jobs` | List all jobs in system |
| GET | `/jobs/stats` | Job statistics by source |
| POST | `/jobs/fetch` | Manually trigger job aggregation |
| POST | `/jobs/cleanup` | Remove stale job listings |
| DELETE | `/jobs/:jobId` | Delete a job listing |
| GET | `/system/health` | Service health status |
| GET | `/system/cache` | Redis cache statistics |
| GET | `/system/queues` | Bull queue status |
| GET | `/system/database` | Database statistics |
| GET | `/system/performance` | API performance metrics |
| POST | `/system/vitals` | Report web vitals from frontend |

## Caching Strategy

The `CacheManager` class provides a cache-aside pattern with automatic invalidation:

| Key Pattern | TTL | Invalidated On |
|-------------|-----|----------------|
| `cvs:user:{userId}` | 5 min | CV upload, delete, or analysis |
| `match:user:{userId}:cv:{ts}:topk:{k}:filters:{hash}` | 1 hour | CV changes |
| `jobs:list:{limit}` | 30 min | New scraper run |
| `salary:user:{userId}:job:{title}:loc:{loc}:country:{cc}` | 2 hours | Preference update |

## Authentication Flow

1. **Access token**: JWT, 1 hour lifetime, sent in `Authorization` header
2. **Refresh token**: JWT, 7 day lifetime, stored in httpOnly secure cookie (sameSite: strict)
3. **Email verification token**: JWT, 24 hour lifetime, sent via email link
4. **Password reset token**: JWT, 1 hour lifetime, single-use, stored in DB

Passwords are hashed with bcrypt (10 salt rounds). The auth middleware attaches the full user object to `req.user` after verification.

## Environment Variables

Create a `.env` file in this directory. See `.env.example` for reference.

```
DATABASE_URL=postgresql://postgres:password@localhost:5432/career_coach?schema=public
MONGODB_URL=mongodb://admin:admin123@localhost:27017/career_coach?authSource=admin
REDIS_URL=redis://:password@localhost:6379

PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=7d

ML_SERVICE_URL=http://localhost:8000
JOB_API_SERVICE_URL=http://localhost:8001

ADZUNA_APP_ID=your_adzuna_app_id
ADZUNA_APP_KEY=your_adzuna_app_key

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

## Running Locally

Prerequisites: Node.js 18+, PostgreSQL 17, MongoDB 7, Redis 7

```bash
# Install dependencies (from monorepo root)
npm install

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed admin user (optional)
npm run seed:admin

# Start development server (hot reload via tsx)
npm run dev
```

The server starts on `http://localhost:4000`.

### Other Commands

```bash
npm run build             # Compile TypeScript to dist/
npm run start             # Run compiled output
npm run test              # Run Vitest test suite
npm run test:coverage     # Run tests with coverage report
npm run prisma:studio     # Open Prisma visual database browser
npm run prisma:deploy     # Apply migrations in production
```

## File Uploads

- **Avatars**: Saved to `public/uploads/avatars/` as `{userId}-{timestamp}.{ext}`. JPEG/PNG only, 5MB max.
- **CVs**: Saved to `public/uploads/cvs/{userId}/`. Original filename preserved. File buffer is also forwarded to the ML service for parsing.
- Static files served from `/uploads` route.
