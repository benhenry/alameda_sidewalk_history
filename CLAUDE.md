# Claude Code Instructions for Alameda Sidewalk Map

## Session Setup Requirements

### Always Start With These Tasks
1. **Read TODO.md** - Check current open items and bugs
2. **Review ERRORS.md** - Check for any deployment or runtime errors
3. **Scan CHANGELOG.md** - Understand recent changes and current state
4. **Check git status** - See what files have been modified since last session

### Planning Protocol
- Always validate work done during the session before closing
- Use the TodoWrite tool proactively to track progress on complex tasks
- The `docs-reviewer` agent handles CHANGELOG and documentation updates after code changes

### **Test Coverage Requirements**
- **Current threshold: 70% minimum** (statements, branches, functions, lines)
- **ALWAYS verify tests when adding, changing, or modifying code under test**
- **Run `npm run test:ci` before committing changes**
- **All 659+ tests must pass before deployment (60 test suites)**
- **Current coverage: 78.11% stmts, 70.44% branches, 73.51% functions, 80.2% lines**

---

## Project Overview

**Alameda Sidewalk Map** is a community-driven web application for documenting historical sidewalk contractors and installation years throughout Alameda, CA. Users can contribute wiki-style entries with photos, contractor information, and historical context.

**Live Site**: https://alameda-sidewalks.com

### Core Functionality
- **Interactive Map**: Full-screen Leaflet map with color-coded segments by decade
- **Community Contributions**: OAuth sign-in, photo uploads, segment creation
- **Admin Interface**: Full CRUD operations, user management, moderation tools
- **Authentication**: Auth.js v5 with Google OAuth and GitHub OAuth
- **File Management**: Photo uploads with Supabase Storage
- **Geospatial Features**: PostGIS-powered coordinate snapping with 2,600+ reference sidewalks from OpenStreetMap

---

## Architecture & Technology Stack

### Frontend Stack
- **Next.js 14** with App Router (not Pages Router)
- **React 18** with TypeScript for type safety
- **Tailwind CSS** for styling
- **Leaflet + React-Leaflet** for interactive mapping
- **Lucide React** for icons

### Backend & Database
- **Development**: SQLite with `better-sqlite3` or local PostgreSQL via Docker
- **Production**: Supabase PostgreSQL with PostGIS
- **Database Abstraction**: Smart switcher at `src/lib/database.ts`
- **File Storage**: Three-tier: Local (dev), Supabase Storage (primary production), GCS (fallback production)

### Deployment Infrastructure
- **Platform**: Vercel (serverless edge deployment)
- **Database**: Supabase PostgreSQL with PostGIS
- **Storage**: Supabase Storage for images
- **CI/CD**: GitHub Actions for tests, Vercel for automatic deployment
- **Domain**: Custom domain via Vercel

### Key Dependencies
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.97.0",
    "@turf/turf": "^7.2.0",
    "leaflet": "^1.9.4",
    "next": "^14.2.31",
    "next-auth": "^5.0.0-beta.30",
    "pg": "^8.13.0",
    "react-leaflet": "^4.2.1"
  },
  "devDependencies": {
    "better-sqlite3": "^9.2.2"
  }
}
```

---

## Database Design & Environment Handling

### Multi-Environment Database Strategy
The app uses a sophisticated database abstraction layer:

**Development**: SQLite (`better-sqlite3`) or local PostgreSQL
- SQLite file: `data/sidewalks.db`
- Docker PostgreSQL: `localhost:5433`
- Dependencies in devDependencies only (crucial for Vercel deployment)

**Production**: Supabase PostgreSQL
- Connection pooler URL for optimal performance
- PostGIS extension for geospatial queries
- Schema: `database-setup.sql`
- Implementation: `src/lib/database-postgres.ts`

**Smart Switcher Logic** (`src/lib/database.ts`):
```typescript
const usePostgres = process.env.DATABASE_URL?.startsWith('postgresql') || process.env.PGHOST || process.env.NODE_ENV === 'production'
```

### Critical Database Files
- `src/lib/database.ts` - Main abstraction layer (entry point)
- `src/lib/database-postgres.ts` - Production PostgreSQL implementation
- `src/lib/database-sqlite-async.ts` - Development SQLite async wrapper
- `src/lib/database-sqlite.ts` - Core SQLite implementation
- `src/lib/database-sqlite-stub.ts` - Production fallback (type safety)

---

## File Structure & Key Directories

### Source Code Organization
```
src/
├── app/                          # Next.js 14 App Router
│   ├── api/                     # API routes (all async)
│   │   ├── auth/               # Auth.js endpoints
│   │   ├── segments/           # Sidewalk segment CRUD + history/comments
│   │   ├── contractors/        # Contractor statistics
│   │   ├── photos/             # File upload handling
│   │   ├── autocomplete/       # Contractor and block autocomplete
│   │   ├── reverse-geocode/    # Reverse geocoding
│   │   ├── admin/              # Admin-only operations (segments, conflicts, perf)
│   │   └── sidewalks/          # Reference sidewalk data
│   ├── admin/                  # Admin interface
│   ├── globals.css            # Tailwind imports
│   ├── layout.tsx             # Root layout
│   └── page.tsx              # Home page (main map)
├── components/                 # React components (~20 components)
│   ├── Map.tsx               # Main Leaflet map component
│   ├── Sidebar.tsx           # Filters and segment list
│   ├── AuthModal.tsx         # OAuth login modal
│   ├── ContributeModal.tsx   # User segment creation
│   ├── AdminSegmentApproval.tsx # Admin approval interface
│   ├── AdminSegmentEditor.tsx # Admin segment editing
│   ├── AdminConflictResolution.tsx # Overlap resolution
│   ├── InteractiveSegmentDrawer.tsx # Map drawing tools
│   ├── SegmentEditHistory.tsx # Segment edit history
│   ├── SegmentComments.tsx   # Segment comments
│   ├── AutocompleteInput.tsx # Autocomplete for fields
│   ├── UserMenu.tsx          # User profile menu
│   ├── Providers.tsx         # SessionProvider wrapper
│   ├── Toast.tsx             # Toast notifications
│   └── __tests__/            # Component tests
├── lib/                       # Core utilities (~19 modules)
│   ├── database.ts           # **Main database abstraction**
│   ├── storage.ts            # File storage (local/Supabase/GCS)
│   ├── validation.ts         # Input validation & sanitization
│   ├── street-validation.ts  # Street name validation
│   ├── get-auth-user.ts      # Auth user extraction helper
│   ├── perf-logger.ts        # Performance logging
│   ├── rate-limiter.ts       # API rate limiting
│   ├── batch-correction.ts   # Batch correction algorithm
│   ├── auth-context.tsx      # Auth context provider
│   ├── sidewalk-context.tsx  # Sidewalk data context
│   └── __tests__/            # Unit tests
├── types/                     # TypeScript definitions
│   ├── sidewalk.ts           # Core data models
│   └── auth.ts               # Authentication types
└── middleware.ts             # Next.js middleware
```

### Configuration Files
```
├── vercel.json              # Vercel deployment config
├── database-setup.sql       # PostgreSQL/Supabase schema
├── next.config.js          # Next.js configuration
├── tailwind.config.js      # Tailwind CSS config
├── jest.config.js          # Testing configuration
├── .env.local.example      # Development environment template
└── .env.production.example # Production environment template
```

---

## API Architecture & Route Configuration

### Dynamic vs Static Routes
**Critical**: All API routes using `request.headers` must have:
```typescript
export const dynamic = 'force-dynamic'
```

### Authentication Flow (Auth.js v5 OAuth)
1. **OAuth Sign-in**: `/api/auth/signin/google` or `/api/auth/signin/github`
   - Redirects to OAuth provider
   - PKCE flow for security
   - Callback to `/api/auth/callback/[provider]`

2. **Session Management**: Database-backed sessions
   - 30-day session expiry
   - Automatic token refresh
   - Session stored in `sessions` table

3. **Account Linking**: `allowDangerousEmailAccountLinking: true`
   - OAuth accounts auto-link to existing users by email
   - Preserves existing user roles (including admin)

4. **Vercel Configuration**:
   - `trustHost: true` in auth.ts
   - `NEXTAUTH_URL` must point to custom domain
   - `AUTH_TRUST_HOST=true` environment variable

### File Upload System
**Development**: Local storage (`public/uploads/`)
**Production**: Supabase Storage

**Implementation**: `src/lib/storage.ts`
- Automatic environment detection via `NEXT_PUBLIC_SUPABASE_URL`
- Consistent API for both storage types
- Image optimization with Sharp

---

## Testing Strategy & Coverage

### Current Test Coverage
- **Minimum Threshold**: 70% (configured in jest.config.js)
- **Current State**: 659+ tests across 60 test suites
- **Coverage**: 78.11% stmts, 70.44% branches, 73.51% functions, 80.2% lines

### Test Commands
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode for development
npm run test:coverage # Generate coverage report
npm run test:ci       # CI mode (no watch)
npm run test:coverage-report # Detailed HTML report
```

### Testing Libraries
- **Jest** - Test runner and assertions
- **React Testing Library** - Component testing
- **jsdom** - Browser environment simulation
- **@testing-library/user-event** - User interaction testing

---

## Development Workflow & Commands

### Essential Commands
```bash
# Development
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run typecheck    # TypeScript validation
npm run lint         # ESLint checking

# Database
npm run db:start     # Start local PostgreSQL via Docker
npm run db:stop      # Stop local PostgreSQL
npm run migrate-db   # Database migrations

# Testing
npm test             # Run tests
npm run test:ci      # CI mode with coverage
```

### Environment Setup
1. **Development**: Copy `.env.local.example` to `.env.local`
2. **Production**: Set variables in Vercel Dashboard
3. **Required Variables**:
   ```bash
   DATABASE_URL=postgresql://...
   AUTH_SECRET=your-auth-secret
   NEXTAUTH_URL=https://your-domain.com
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   ```

---

## Deployment & Infrastructure

### Vercel Deployment
- **Automatic**: Pushes to `main` branch deploy automatically
- **Preview**: Pull requests get preview deployments
- **Environment**: Variables set in Vercel Dashboard
- **Build**: Uses `vercel.json` with `--ignore-scripts` to skip native deps

### Supabase Setup
1. **Database**: PostgreSQL with PostGIS extension
2. **Storage**: `photos` bucket for image uploads
3. **Connection**: Use pooler URL (port 6543) for serverless

### GitHub Actions CI
- **Workflow**: `.github/workflows/ci.yml`
- **Triggers**: PRs and pushes to main
- **Jobs**: Test (Node 18 & 20), Build
- **Coverage**: 70% minimum threshold enforced

---

## Security & Validation

### Input Sanitization
- **DOMPurify**: HTML sanitization for all text inputs
- **Validation Rules**: Defined in `src/lib/validation.ts`
- **Coordinate Bounds**: Limited to Alameda city boundaries
- **File Upload**: Type and size restrictions

### Authentication Security (OAuth)
- **Auth.js v5**: Industry-standard OAuth implementation
- **OAuth Providers**: Google and GitHub (no password storage)
- **Session Management**: Database-backed sessions with 30-day expiry
- **Account Linking**: Auto-links OAuth to existing users by email
- **Role-based Access**: Admin vs user permissions

---

## Troubleshooting Guide

### Common Issues

**Build Failures on Vercel**:
- SQLite dependencies must be in devDependencies only
- Use `--ignore-scripts` in vercel.json to skip native compilation
- Verify all API routes have proper dynamic exports

**Database Connection Issues**:
- Use Supabase pooler URL (port 6543) not direct connection
- URL-encode special characters in passwords
- Verify DATABASE_URL format: `postgresql://postgres.[ref]:[pass]@[host]:6543/postgres`

**OAuth/Auth.js Problems**:
- **PKCE errors**: Ensure `AUTH_TRUST_HOST=true` and correct `NEXTAUTH_URL`
- **redirect_uri_mismatch**: Update OAuth provider with exact callback URL
- **New user fails**: Ensure `username` and `password_hash` columns are nullable
- Verify `AUTH_SECRET` is set (32+ character secret)

**File Upload Issues**:
- Check Supabase Storage bucket permissions (public read)
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set
- Check file type and size limits

---

## Session Completion Checklist

Before ending any Claude session:

- [ ] All TodoWrite tasks marked complete
- [ ] **All tests passing (`npm run test:ci`)** - currently 659+ tests
- [ ] **Coverage meets 70% minimum threshold**
- [ ] TypeScript validation clean (`npm run typecheck`)
- [ ] Build successful (`npm run build`)
- [ ] Git status clean (commit changes if needed)
- [ ] Verify TODO.md reflects current state

**Note:** The `docs-reviewer` and `security-reviewer` agents handle documentation updates and security reviews proactively after code changes.

---

*This CLAUDE.md was last updated: 2026-02-25*
*Project Version: 0.1.0*
*Next.js Version: 14.2.31*
*Deployment: Vercel + Supabase*
