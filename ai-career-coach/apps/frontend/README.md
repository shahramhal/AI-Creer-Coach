# Frontend

Next.js web application for the AI Career Coach platform. Provides the user-facing interface for CV management, job matching, salary insights, and profile management.

## Tech Stack

- **Framework**: Next.js 15.5 (App Router)
- **Language**: TypeScript
- **UI**: React 19.2, Radix UI primitives, Tailwind CSS 3.4
- **State**: React Context (auth), Zustand (general)
- **Forms**: react-hook-form 7.65 + Zod 4.1
- **HTTP**: Axios 1.12 with interceptors
- **Charts**: Recharts 2.15
- **Icons**: Lucide React

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing page |
| `/auth/login` | Email/password login |
| `/auth/register` | New account registration |
| `/auth/forgot-password` | Request password reset email |
| `/auth/verify-email` | Email confirmation handler |
| `/auth/reset-password` | Set new password via reset token |
| `/dashboard` | Overview with CV health score, quick stats, application chart, recent activity |
| `/cvs` | Upload CVs, view parsed data, run ATS analysis, see keyword gaps and recommendations |
| `/jobs` | Browse job recommendations matched against your CV with scores and skill breakdowns |
| `/salary-insights` | Salary predictions by job title and location with trend charts and skill ROI data |
| `/profile` | Edit personal info, social links, avatar |

## Project Structure

```
app/                              # Next.js App Router pages
  layout.tsx                      # Root layout with AuthProvider wrapper
  page.tsx                        # Landing page
  dashboard/page.tsx
  cvs/page.tsx
  jobs/page.tsx
  salary-insights/page.tsx
  profile/page.tsx
  auth/
    login/page.tsx
    register/page.tsx
    forgot-password/page.tsx
    verify-email/page.tsx
    reset-password/page.tsx

components/
  auth/
    AuthLayout.tsx                # Centered card layout for auth pages
    LoginForm.tsx                 # Email/password form with validation
    RegisterForm.tsx              # Registration with password strength rules
    ProtectedRoute.tsx            # Redirects to /login if not authenticated
    PublicRoute.tsx               # Redirects to /dashboard if already logged in
  layout/
    AppLayout.tsx                 # Main app wrapper (sidebar + topnav + content)
    AppSidebar.tsx                # Collapsible navigation sidebar
    TopNav.tsx                    # Header bar with search and user menu
  dashboard/
    CVHealthScore.tsx             # Circular SVG progress indicator
    QuickStats.tsx                # Metric cards
    ApplicationChart.tsx          # Recharts area chart (applications over time)
    ApplicationKanban.tsx         # Kanban board for application stages
    RecentActivity.tsx
    RecommendedActions.tsx
    JobMatchPreview.tsx
    MarketInsights.tsx
  cv/
    CVUpload.tsx                  # Drag-and-drop file upload with progress bar
    CVList.tsx                    # Uploaded CV history
    CVCard.tsx / CVSummaryCard.tsx # CV display cards with download/delete actions
    CVDetail.tsx                  # Full CV view modal
    CVEditModal.tsx               # Edit parsed CV data
    CVAnalysisTabs.tsx            # Tab container for analysis views
    OverviewTab.tsx               # Overall score + category breakdown
    ATSTab.tsx                    # ATS compatibility checks (pass/warning/fail)
    KeywordsTab.tsx               # Missing keywords with job frequency
    RecommendationsTab.tsx        # Prioritized improvement suggestions
  jobs/
    JobMatchCard.tsx              # Job card with match %, skills breakdown, apply link
  salary/
    SalaryPredictionCard.tsx      # Predicted salary with range and confidence
    SalaryFactorBreakdown.tsx     # Bar chart of salary factors
    MarketSalaryTrend.tsx         # Line chart of historical salary data
    SkillROITable.tsx             # Skill-by-skill ROI comparison table
    SalaryByLocation.tsx          # Regional salary comparison
  profile/
    ProfileForm.tsx               # Editable profile fields
    AvatarUpload.tsx              # Avatar upload with preview
  ui/                             # Radix-based design system components
    button, card, input, badge, progress, alert, avatar,
    dropdown-menu, label, select, separator, switch, tabs, tooltip

context/
  authContext.tsx                  # Auth state, login/logout/refresh methods

library/
  api.ts                          # Axios instance with token interceptor + auto-refresh
  auth.ts                         # Auth API call wrappers
  config.ts                       # Environment config
  utils.ts                        # Shared utilities (cn, formatters)

services/
  cv.service.ts                   # CV upload, list, analyze, download, delete
  matching.service.ts             # Job match requests (150s timeout for ML processing)
  salary.service.ts               # Salary insights and preference saving

types/
  cv.types.ts                     # CV, ParsedCVData, AnalysisData, ATSCheck, etc.
  matching.types.ts               # MatchedJob, MatchFilters, JobMatchResponse
  salary.types.ts                 # SalaryPrediction, MarketTrendPoint, SkillROIEntry
  profile.ts                      # UserProfile interface
```

## Authentication Flow

The `AuthProvider` context manages the full auth lifecycle:

1. On app load, checks localStorage for an existing access token and validates it via `GET /api/auth/me`
2. On login, stores the access token in localStorage and user object in context state
3. The Axios interceptor automatically attaches `Authorization: Bearer <token>` to every request
4. On 401 response, the interceptor calls `POST /api/auth/refresh` (using the httpOnly cookie), stores the new token, and retries the original request
5. If refresh fails, the user is logged out and redirected to `/auth/login`
6. On logout, localStorage is cleared, history state is replaced to prevent back-button navigation

Route protection is handled by two wrapper components:
- `ProtectedRoute` wraps authenticated pages, redirects to login if no session
- `PublicRoute` wraps auth pages, redirects to dashboard if already logged in

## API Integration

All API calls go through the Axios instance configured in `library/api.ts`:

```
Base URL: NEXT_PUBLIC_API_URL (default: http://localhost:4000)
Timeout: 60 seconds (150 seconds for job matching)
Credentials: withCredentials: true (for refresh token cookie)
```

The service layer (`services/`) provides typed wrappers around every backend endpoint. Components never call Axios directly.

### Service Methods

**cv.service.ts**
- `uploadCV(file)` -- POST multipart to `/api/ml/parse-cv` with progress tracking
- `getUserCVs()` -- fetch all CVs for current user
- `analyzeCV(cvId)` -- trigger ATS analysis
- `downloadCV(cvId, filename)` -- binary download via blob response
- `deleteCV(cvId)` / `setPrimaryCV(cvId)` -- CV management

**matching.service.ts**
- `findMatches(filters?, topK?)` -- POST to `/api/matching/find-jobs` (150s timeout)
- Handles error codes: `NO_CV`, `NO_JOBS`, `ML_SERVICE_ERROR`, etc.

**salary.service.ts**
- `getInsights(jobTitle, location, country)` -- salary prediction data
- `savePreferences(jobTitle, location?)` -- persist user preferences
- Supported countries: GB, US, DE, FR, NL, AU, CA

## Styling

- Tailwind CSS with a custom theme using CSS variables (HSL-based)
- Dark mode supported via class-based toggling
- Custom color tokens: `primary`, `secondary`, `success`, `warning`, `destructive`, `metric-excellent/good/average/poor`
- Animations: `fade-in`, `slide-up`, Radix accordion transitions
- Component variants via `class-variance-authority`
- Class merging with `clsx` + `tailwind-merge` (the `cn()` utility)

## Environment Variables

Create `.env.local` in this directory:

```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

The `NEXT_PUBLIC_` prefix is required for client-side access in Next.js.

## Running Locally

Prerequisites: Node.js 18+

```bash
# Install dependencies (from monorepo root)
npm install

# Start development server
npm run dev
```

The app starts on `http://localhost:3000`.

### Other Commands

```bash
npm run build     # Production build
npm run start     # Start production server
npm run lint      # Run ESLint
```
