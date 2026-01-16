# Claude Code Instructions for Alameda Sidewalk Map

## Session Setup Requirements

### Always Start With These Tasks
1. **Read TODO.md** - Check current open items and bugs
2. **Review ERRORS.md** - Check for any deployment or runtime errors 
3. **Scan CHANGELOG.md** - Understand recent changes and current state
4. **Check git status** - See what files have been modified since last session

### Planning Protocol
- After any planning session, append notes and decisions to `CHANGELOG.md`
- Always validate work done during the session before closing
- Use the TodoWrite tool proactively to track progress on complex tasks

### **Test Coverage Requirements**
- **Current threshold: 20% minimum** (realistic for current codebase state)
- **ALWAYS verify tests when adding, changing, or modifying code under test**
- **Run `npm run test:ci` before committing changes**
- **All 167 tests must pass before deployment**
- **Goal: Gradually increase coverage as new features are added**

---

## Project Overview

**Alameda Sidewalk Map** is a community-driven web application for documenting historical sidewalk contractors and installation years throughout Alameda, CA. Users can contribute wiki-style entries with photos, contractor information, and historical context.

### Core Functionality
- **Interactive Map**: Full-screen Leaflet map with color-coded segments by decade
- **Community Contributions**: OAuth sign-in, photo uploads, segment creation
- **Admin Interface**: Full CRUD operations, user management, moderation tools
- **Authentication**: Auth.js v5 with Google OAuth and GitHub OAuth (replaced password auth on 2025-12-25)
- **File Management**: Photo uploads with Google Cloud Storage integration
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
- **Development**: SQLite with `better-sqlite3` (devDependencies only)
- **Production**: PostgreSQL with `pg` library
- **Database Abstraction**: Smart switcher at `src/lib/database.ts`
- **File Storage**: Local (dev) vs Google Cloud Storage (production)

### Deployment Infrastructure  
- **Platform**: Google Cloud Run (serverless containers)
- **Database**: Cloud SQL PostgreSQL with automated backups
- **Storage**: Google Cloud Storage for images
- **CI/CD**: GitHub Actions with automated deployment
- **Build**: Docker containerization with multi-stage builds

### Key Dependencies
```json
{
  "dependencies": {
    "@google-cloud/storage": "^7.13.0",
    "@turf/turf": "^7.2.0",
    "bcryptjs": "^2.4.3", 
    "jsonwebtoken": "^9.0.2",
    "leaflet": "^1.9.4",
    "multer": "^2.0.0",
    "next": "^14.2.31",
    "pg": "^8.13.0",
    "react-leaflet": "^4.2.1"
  },
  "devDependencies": {
    "better-sqlite3": "^9.2.2",
    "sqlite3": "^5.1.6"
  }
}
```

---

## Database Design & Environment Handling

### Multi-Environment Database Strategy
The app uses a sophisticated database abstraction layer:

**Development**: SQLite (`better-sqlite3`)
- Database file: `data/sidewalks.db` 
- Dependencies in devDependencies only (crucial for deployment)
- Async wrapper at `src/lib/database-sqlite-async.ts`

**Production**: PostgreSQL (`pg`)
- Cloud SQL with connection pooling
- Schema: `database-setup.sql`
- Implementation: `src/lib/database-postgres.ts`

**Smart Switcher Logic** (`src/lib/database.ts`):
```typescript
const usePostgres = process.env.DATABASE_URL?.startsWith('postgresql')
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
│   │   ├── auth/               # Authentication endpoints
│   │   │   ├── login/route.ts
│   │   │   ├── register/route.ts
│   │   │   ├── me/route.ts
│   │   │   ├── forgot-password/route.ts
│   │   │   └── reset-password/route.ts
│   │   ├── segments/           # Sidewalk segment CRUD
│   │   ├── contractors/        # Contractor statistics  
│   │   ├── photos/             # File upload handling
│   │   ├── admin/segments/     # Admin-only operations
│   │   └── sidewalks/          # Overpass API integration
│   ├── admin/                  # Admin interface
│   ├── reset-password/         # Password reset page
│   ├── globals.css            # Tailwind imports
│   ├── layout.tsx             # Root layout
│   └── page.tsx              # Home page (main map)
├── components/                 # React components
│   ├── Map.tsx               # Main Leaflet map component  
│   ├── Sidebar.tsx           # Filters and segment list
│   ├── SegmentForm.tsx       # Add/edit segment form
│   ├── PhotoUpload.tsx       # File upload component
│   ├── AuthModal.tsx         # Login/register modals
│   ├── UserMenu.tsx          # User account menu
│   ├── ContributeModal.tsx   # User segment creation
│   ├── AdminSegmentApproval.tsx # Admin approval interface
│   ├── InteractiveSegmentDrawer.tsx # Map drawing tools
│   └── __tests__/            # Component tests
├── lib/                       # Core utilities
│   ├── database.ts           # **Main database abstraction**
│   ├── auth.ts               # JWT utilities
│   ├── validation.ts         # Input validation & sanitization
│   ├── sidewalk-validation.ts # Overpass API integration
│   ├── storage.ts            # File storage abstraction
│   ├── rate-limiter.ts       # API rate limiting
│   ├── captcha.ts            # Bot protection
│   └── __tests__/            # Unit tests
├── types/                     # TypeScript definitions
│   ├── sidewalk.ts           # Core data models
│   └── auth.ts               # Authentication types
└── middleware.ts             # Next.js middleware (auth/CORS)
```

### Configuration Files
```
├── Dockerfile                # Multi-stage Docker build
├── .dockerignore            # Docker build exclusions
├── cloudbuild.yaml          # Google Cloud Build config
├── database-setup.sql       # PostgreSQL schema
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

**Routes with dynamic export**:
- `/api/auth/me` - Uses authorization header
- `/api/photos` - Uses user ID header  
- `/api/admin/segments` - Uses role/user headers
- `/api/segments` - Uses user ID header
- `/api/sidewalks` - Uses no-store fetch

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
   - Accounts stored in `accounts` table

4. **Cloud Run Configuration** (Critical):
   - `trustHost: true` in auth.ts (or `AUTH_TRUST_HOST=true` env var)
   - `NEXTAUTH_URL` must point to custom domain, not Cloud Run URL
   - SSL disabled for Cloud SQL Unix socket connections

### File Upload System
**Development**: Local storage (`public/uploads/`)
**Production**: Google Cloud Storage

**Implementation**: `src/lib/storage.ts`
- Automatic environment detection
- Consistent API for both storage types
- Image optimization with Sharp

---

## Testing Strategy & Coverage

### Current Test Coverage
- **Minimum Threshold**: 20% (configured in jest.config.js)
- **Current State**: 167 tests across 19 test suites
- **Goal**: Gradually increase coverage as new features are added

### Test Commands
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode for development
npm run test:coverage # Generate coverage report
npm run test:ci       # CI mode (no watch)
npm run test:coverage-report # Detailed HTML report
```

### Test Organization
```
src/
├── __tests__/                 # Integration tests
├── components/__tests__/      # Component tests  
├── lib/__tests__/            # Unit tests
└── app/api/*/__tests__/      # API route tests
```

### Testing Libraries
- **Jest** - Test runner and assertions
- **React Testing Library** - Component testing
- **jsdom** - Browser environment simulation
- **@testing-library/user-event** - User interaction testing

---

## Known Issues & Bug Tracking

### Open Bugs (from TODO.md)
1. **Street Validation**: Inconsistent street names ("Fairview Avenue" vs "Fairview Ave")
2. **Coordinate Snapping**: Segments not pegged to actual sidewalks
3. **Input Validation**: No fuzzy matching for existing contractors/streets

### Recent Fixes (from CHANGELOG.md)
- ✅ Fixed react-leaflet mock causing infinite re-renders in tests (2026-01-16)
- ✅ Fixed OAuth PKCE errors with `AUTH_TRUST_HOST=true` (2026-01-16)
- ✅ Fixed Cloud SQL SSL connection errors for Unix sockets (2026-01-16)
- ✅ Fixed OAuth account linking with `allowDangerousEmailAccountLinking` (2026-01-16)
- ✅ Fixed CI/CD pipeline with Workload Identity Federation (2026-01-16)
- ✅ Fixed Docker build standalone directory issues (2026-01-15)

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
npm run migrate-db   # Database migrations
npm run fix-db       # Database repair utilities

# Security  
npm audit           # Security audit
npm audit fix       # Fix security issues
```

### Environment Setup
1. **Development**: Copy `.env.local.example` to `.env.local`
2. **Production**: Use `.env.production.example` as template
3. **Required Variables**:
   ```bash
   JWT_SECRET=your-super-secure-jwt-secret
   NODE_ENV=development
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   # Optional: DATABASE_URL for PostgreSQL override
   ```

---

## Data Models & Schema

### Core Entities

**SidewalkSegment**:
```typescript
interface SidewalkSegment {
  id: string                    // UUID
  street: string                // Street name
  block: string                 // Block identifier  
  contractor: string            // Contractor name
  year: number                  // Installation year
  coordinates: [number, number][] // [lat, lng] pairs
  specialMarks?: string[]       // Special markings
  notes?: string                // Optional notes
  status: 'pending' | 'approved' | 'rejected'
  createdBy?: string            // User ID
  approvedBy?: string           // Admin ID
  createdAt: Date
  updatedAt: Date
}
```

**User**:
```typescript
interface User {
  id: string                    // UUID
  email: string                 // Unique email
  username: string              // Unique username
  role: 'admin' | 'user'       // Permission level
  createdAt: Date
  lastLoginAt?: Date
  password_hash?: string        // Internal use only
}
```

**Photo**:
```typescript
interface Photo {
  id: string                    // UUID
  sidewalkSegmentId: string     // Foreign key
  filename: string              // Storage filename
  originalName: string          // User's filename
  mimetype: string              // File type
  size: number                  // File size in bytes
  storageUrl: string            // Access URL
  uploadedBy?: string           // User ID
  createdAt: Date
}
```

---

## Deployment & Infrastructure

### Google Cloud Platform Setup
1. **Cloud Run**: Serverless container deployment
2. **Cloud SQL**: PostgreSQL database with automated backups
3. **Cloud Storage**: Image and file storage
4. **Secret Manager**: Environment variables and keys
5. **Cloud Build**: CI/CD pipeline from GitHub

### Docker Configuration
- **Multi-stage build** for optimization
- **Node.js 18 Alpine** base image
- **Standard Next.js pattern** (not standalone)
- **Production dependencies only** in final stage

### GitHub Actions CI/CD
- **Workflow**: `.github/workflows/ci.yml`
- **PR Trigger**: Runs test + build jobs
- **Push to main**: Runs test + build + deploy jobs
- **Authentication**: Workload Identity Federation (keyless GCP auth)
- **Deploy**: Triggers Cloud Build which deploys to Cloud Run
- **Secrets Required**: `GCP_PROJECT_ID`, `GCP_SERVICE_ACCOUNT`, `GCP_WORKLOAD_IDENTITY_PROVIDER`
- **Documentation**: See `CI_CD_SETUP.md` for setup details

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
- **Role-based Access**: Admin vs user permissions preserved across OAuth providers

### Rate Limiting & Protection
- **API Rate Limits**: IP-based request limiting
- **CAPTCHA System**: Bot protection for registration
- **CORS Configuration**: Origin restrictions

---

## External Integrations

### Overpass API (OpenStreetMap)
- **Purpose**: Fetch actual sidewalk coordinates for validation
- **Implementation**: `src/lib/sidewalk-validation.ts`
- **Rate Limiting**: Respectful API usage
- **Caching**: Prevent repeated requests

### Google Cloud Services
- **Cloud Storage**: Image uploads and serving
- **Cloud SQL**: Production database
- **Secret Manager**: Secure configuration
- **Cloud Build**: Automated deployments

---

## Common Development Patterns

### Database Operations
```typescript
// Always use the abstraction layer
import { createSegment, getAllSegments } from '@/lib/database'

// Async/await pattern for all operations
const segments = await getAllSegments()
const newSegment = await createSegment(segmentData)
```

### Error Handling
```typescript
// Consistent error responses
return NextResponse.json(
  { error: 'Descriptive error message' },
  { status: 400 }
)

// Try-catch for all async operations
try {
  const result = await databaseOperation()
  return NextResponse.json(result)
} catch (error) {
  console.error('Operation failed:', error)
  return NextResponse.json(
    { error: 'Internal server error' }, 
    { status: 500 }
  )
}
```

### Component Patterns
```typescript
// Use proper TypeScript interfaces
interface ComponentProps {
  segments: SidewalkSegment[]
  onUpdate: (segment: SidewalkSegment) => void
}

// Consistent event handling
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  // Handle form submission
}
```

---

## Troubleshooting Guide

### Common Issues

**Build Failures**:
- Check SQLite dependencies are in devDependencies only
- Verify all API routes have proper dynamic exports
- Ensure database switcher logic is correct

**Database Connection Issues**:
- Verify DATABASE_URL format for PostgreSQL
- Check SQLite file permissions in development
- Validate database initialization in startup

**OAuth/Auth.js Problems**:
- **PKCE errors**: Ensure `AUTH_TRUST_HOST=true` and `NEXTAUTH_URL` points to custom domain
- **redirect_uri_mismatch**: Update OAuth provider with correct callback URL
- **OAuthAccountNotLinked**: Enable `allowDangerousEmailAccountLinking` in providers
- **SSL connection errors**: Disable SSL for Cloud SQL Unix socket connections (`ssl: false`)
- Verify `AUTH_SECRET` is set (32+ character secret)

**File Upload Issues**:
- Check Google Cloud Storage permissions
- Verify local upload directory exists
- Validate file type and size limits

### Debug Commands
```bash
# Check environment variables
echo $DATABASE_URL
echo $NODE_ENV

# Validate database connection
node -e "const db = require('./src/lib/database'); db.healthCheck().then(console.log)"

# Test build process
npm run build 2>&1 | tee build.log
```

---

## Session Completion Checklist

Before ending any Claude session:

- [ ] All TodoWrite tasks marked complete
- [ ] **🧪 All tests passing (`npm run test:ci`)**
- [ ] **🧪 Coverage meets 20% minimum threshold**
- [ ] **🧪 New/modified code has corresponding tests**
- [ ] TypeScript validation clean (`npm run typecheck`)
- [ ] Build successful (`npm run build`)
- [ ] Git status clean (commit changes if needed)
- [ ] Update CHANGELOG.md with session notes
- [ ] Verify TODO.md reflects current state

### **Test Verification Steps**
1. Run `npm run test:ci` and verify all 167 tests pass
2. Run `npm run test:coverage` to check coverage meets threshold
3. Check that new functions/components have tests
4. Verify modified code paths are tested

---

*This CLAUDE.md was last updated: 2026-01-16*
*Project Version: 0.1.0*
*Next.js Version: 14.2.31*