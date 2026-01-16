# Changelog

All notable changes to the Alameda Sidewalk Map project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added - CI/CD Pipeline & Production Deployment (2026-01-16)

**GitHub Actions CI/CD Pipeline:**
- Configured `.github/workflows/ci.yml` with test, build, and deploy jobs
- PR trigger runs test + build jobs
- Push to main triggers test + build + deploy jobs
- Workload Identity Federation for keyless GCP authentication
- Cloud Build triggered from GitHub Actions for deployment

**Workload Identity Federation Setup:**
- Created `github-actions` workload identity pool
- Created `github-provider` OIDC provider with repository attribute condition
- Granted `roles/iam.workloadIdentityUser` to service account
- Service account roles: `cloudbuild.builds.editor`, `storage.admin`, `run.admin`, `iam.serviceAccountUser`

**Auth.js Cloud Run Configuration:**
- `AUTH_TRUST_HOST=true` for proxy environment (required for PKCE)
- `NEXTAUTH_URL` and `AUTH_URL` point to custom domain, not Cloud Run URL
- `allowDangerousEmailAccountLinking: true` for OAuth account linking
- SSL disabled for Cloud SQL Unix socket connections (`/cloudsql/...`)

**Test Infrastructure Fixes:**
- Fixed react-leaflet mock causing infinite re-renders
  - Made `useMapEvents` a no-op (no auto-firing events)
  - Made `useMap` return stable mock object reference
  - Added `CircleMarker` mock component
- All 167 tests passing in ~1 second

**Documentation:**
- Created comprehensive `CI_CD_SETUP.md` with:
  - Workload Identity Federation setup instructions
  - Service account role requirements
  - Troubleshooting guide for common OAuth/Cloud Run issues
- Updated `TODO.md` marking P0-P3 as completed
- Updated `CLAUDE.md` with OAuth auth flow, CI/CD details, troubleshooting
- Updated `ERRORS.md` with resolved OAuth issues

**Files Modified:**
- `.github/workflows/ci.yml` - Added deploy job with WIF authentication
- `__mocks__/react-leaflet.js` - Fixed infinite re-render issues
- `src/auth.ts` - Added `trustHost`, `allowDangerousEmailAccountLinking`, Unix socket SSL handling
- `cloudbuild.yaml` - Fixed `_APP_URL` substitution for custom domain
- `src/components/__tests__/Map.test.tsx` - Updated for new mock structure

---

### Added - OAuth Authentication Migration (2025-12-25)

**MAJOR CHANGE: Replaced custom password authentication with OAuth (Google + GitHub)**

**Authentication System Overhaul:**
- **Auth.js v5 Integration**: Installed next-auth@beta with PostgreSQL adapter (@auth/pg-adapter)
- **OAuth Providers**: Google OAuth 2.0 and GitHub OAuth configured
- **Database Schema**: New Auth.js tables added to database:
  - `accounts` table - stores OAuth provider accounts linked to users
  - `sessions` table - manages active user sessions
  - `verification_tokens` table - handles email verification and passwordless login
  - Extended `users` table with `email_verified` and `image` fields
- **Automatic Account Linking**: Existing users automatically linked to OAuth accounts by email
- **Session Strategy**: Database-backed sessions with 30-day expiry

**New Files Created:**
- `src/auth.ts` - Core Auth.js configuration with provider setup and callbacks
- `src/app/api/auth/[...nextauth]/route.ts` - Auth.js API route handler
- `src/types/next-auth.d.ts` - TypeScript module augmentation for custom session fields
- `src/components/Providers.tsx` - SessionProvider wrapper with nested providers
- `database-setup-authjs.sql` - Database migration for Auth.js tables
- `OAUTH_SETUP.md` - Comprehensive 7-section guide for OAuth credential setup

**Components Updated:**
- `AuthModal.tsx` - Completely rewritten for OAuth (715 lines → simple OAuth buttons)
  - Google sign-in button with brand colors
  - GitHub sign-in button with GitHub branding
  - Removed all password/email input fields
- `auth-context.tsx` - Rewritten to use NextAuth's useSession hook
  - Replaced custom JWT logic with Auth.js session management
  - Added session field to context
  - Automatic username derivation from email for OAuth users
- `UserMenu.tsx` - Updated to handle optional username field from OAuth
- `layout.tsx` - Wrapped with SessionProvider via Providers component
- `Providers.tsx` - New client component wrapping SessionProvider → AuthProvider → SidewalkProvider

**Files/Routes Removed (Password Auth Eliminated):**
- Deleted `/api/auth/login` route and tests
- Deleted `/api/auth/register` route
- Deleted `/api/auth/me` route
- Deleted `/api/auth/forgot-password` route and tests
- Deleted `/api/auth/reset-password` route and tests
- Deleted `ForgotPasswordModal.tsx` component and tests
- Deleted `/reset-password` page
- Removed all password reset functionality
- Removed BCrypt password hashing logic
- Removed JWT token generation and validation

**Environment Variables:**
- **Added (OAuth)**:
  - `GOOGLE_CLIENT_ID` - OAuth 2.0 client ID from Google Cloud Console
  - `GOOGLE_CLIENT_SECRET` - OAuth 2.0 client secret
  - `GITHUB_CLIENT_ID` - OAuth app client ID from GitHub
  - `GITHUB_CLIENT_SECRET` - OAuth app client secret
  - `AUTH_SECRET` - Encryption secret for Auth.js (32+ characters)
  - `NEXTAUTH_URL` - Application URL for OAuth callbacks
- **Removed (No Longer Needed)**:
  - `JWT_SECRET` - replaced by AUTH_SECRET
  - `SMTP_*` - all email configuration (password reset no longer needed)

**Dependencies:**
- Added: `next-auth@5.0.0-beta.30` (Auth.js v5)
- Added: `@auth/pg-adapter@1.7.3` (PostgreSQL adapter)

**Code Statistics:**
- **Net reduction**: -1,320 lines of code
- 715 insertions, 2,035 deletions
- 24 files changed (8 new, 11 deleted, 5 modified)

**Migration Path:**
- Existing users with email/password accounts will be automatically linked when they sign in with OAuth using the same email
- No data loss - all user data, segments, and photos preserved
- The `signIn` callback in `src/auth.ts` handles account linking seamlessly

**Security Improvements:**
- No more password storage vulnerabilities
- OAuth providers handle authentication security
- Reduced attack surface (no password reset flow to exploit)
- Industry-standard OAuth 2.0 implementation
- Automatic security updates from Auth.js team

**Next Steps Required:**
1. Set up Google OAuth credentials (see OAUTH_SETUP.md section 1)
2. Set up GitHub OAuth app (see OAUTH_SETUP.md section 2)
3. Generate AUTH_SECRET: `openssl rand -base64 32`
4. Update `.env.local` with all OAuth credentials
5. Test OAuth flow with both providers
6. Update production environment variables when deploying

---

### Added - Reference Sidewalk Data Improvements (2025-12-25)

**CRITICAL FIX: Preserved LineString connectivity**
- **Root Cause**: API was flattening 2,600 LineStrings into 16,742 disconnected points
- **Impact**: Reference sidewalks appeared as scattered dots instead of continuous lines
- **Solution**: API now returns proper LineString arrays preserving original OSM geometry

**Road-Based Sidewalk Import:**
- **Discovery**: Many roads have `sidewalk=both/left/right` tags not being imported
- **Implementation**: Created tiled import script for road-based sidewalks
  - Uses Turf.js `lineOffset()` to generate 3-meter offset geometries
  - Splits Alameda into 6 tiles to avoid Overpass API timeouts
  - Processes each tile with 3-second delays between requests
- **Database Schema Update**:
  - Added `side` column to reference_sidewalks (left, right, or NULL)
  - Updated unique constraint to `(osm_id, side)` for road-based sidewalks
- **Coverage Improvement**: 756 road ways imported → 1,280 sidewalk segments (2 per road with sidewalk=both)
- **Total Coverage**: Increased from 334 → 2,600 reference sidewalks (7.8x improvement!)

**Dynamic Viewport Features:**
- **Map Legend**: Now dynamically shows only decades present in visible viewport
  - Replaces hardcoded 1900s-2010s with actual data-driven decades
  - Shows "No segments in view" when viewport is empty
  - Updates automatically on pan/zoom
- **InteractiveSegmentDrawer**: Reference sidewalks now filter by viewport
  - Increased max visible lines from 500 → 1,000 (feasible with proper LineStrings)
  - Real-time updates when panning/zooming in Contribute dialog
  - Proper LineString rendering instead of point reconstruction

**Files Modified:**
- `src/app/api/sidewalks/route.ts` - Return LineStrings instead of flattened points
- `src/lib/sidewalk-context.tsx` - Updated context type to handle LineString arrays
- `src/components/InteractiveSegmentDrawer.tsx` - Direct LineString rendering with viewport filtering
- `src/components/Map.tsx` - Dynamic decade legend based on visible segments
- `src/components/Sidebar.tsx` - Use visibleSegments prop for dynamic statistics
- `database-setup.sql` - Added side column and updated constraints
- `scripts/import-osm-roads-tiled.js` - New tiled import for road-based sidewalks

**Example Impact:**
- **Before**: Fairview Ave showed as 22 disconnected dots
- **After**: Fairview Ave shows as 2 complete 530-meter LineStrings (left + right sides)

---

### Added - PostGIS Migration (2025-12-15)

**Phase 1: PostGIS Foundation**
- **PostGIS Extension**: Enabled PostGIS and PostGIS Topology extensions in database schema
- **Geometry Columns**: Added `geometry` column (LineString, SRID 4326) to `sidewalk_segments` table for spatial operations
- **Dual-Column Approach**: Maintains existing JSONB `coordinates` column alongside new PostGIS `geometry` for backward compatibility
- **Auto-Sync Trigger**: Created `sync_coordinates_to_geometry()` trigger to automatically convert JSONB coordinates to PostGIS geometry on insert/update
- **Reference Sidewalks Table**: New `reference_sidewalks` table for OpenStreetMap-sourced sidewalk geometries
  - PostGIS geometry column with GIST spatial index
  - Metadata fields: osm_id, osm_type, street, surface, width, tags (JSONB)
  - Status tracking (active, deleted, modified)
- **Docker Compose**: Local PostgreSQL + PostGIS development environment (postgis/postgis:15-3.4-alpine)
- **Database Functions**: 7 new PostGIS spatial query functions
  - `coordinatesToPostGIS()` - Convert [lat, lng] arrays to WKT LINESTRING
  - `getNearbyReferenceSidewalks()` - Find sidewalks within radius using ST_DWithin
  - `snapToNearestSidewalk()` - Snap point to closest sidewalk using ST_ClosestPoint
  - `createReferenceSidewalk()` - CRUD for reference data
  - `getAllReferenceSidewalks()` - Fetch with optional bounding box filter
  - `updateReferenceSidewalk()` - Update reference geometry/metadata
  - `deleteReferenceSidewalk()` - Soft delete (status='deleted')
- **Package Scripts**: Added `db:start`, `db:stop`, `db:logs`, `db:reset` for Docker management
- **Migration Script**: `database-setup-postgis-migration.sql` to backfill existing segments with geometry

**Phase 2: OpenStreetMap Import Pipeline**
- **OSM Import Script**: `scripts/import-osm-sidewalks.js` to fetch Alameda sidewalks from Overpass API
  - Queries footways, paths, and sidewalks within Alameda bounding box
  - Converts OSM node geometries to PostGIS LineStrings
  - Upsert logic with ON CONFLICT handling
  - Progress reporting and error handling
- **Snap API**: `/api/snap` endpoint for real-time coordinate snapping
  - POST endpoint accepting coordinate arrays
  - Uses PostGIS ST_ClosestPoint for precise snapping to LineString edges
  - 50-meter snap radius with distance reporting
  - Comprehensive test coverage (8 passing tests)
- **Reference Sidewalks API**: `/api/reference-sidewalks` endpoint
  - GeoJSON FeatureCollection output format
  - Optional bounding box filtering for viewport optimization
  - Returns sidewalk geometries with OSM metadata

**Phase 3: Admin Interface**
- **Admin Page**: `/admin/reference-sidewalks` for managing reference data
  - Interactive Leaflet map with GeoJSON overlay
  - Statistics dashboard (total sidewalks, named streets, status)
  - One-click OSM import with live progress logging
  - Refresh functionality to reload data
- **Admin Import API**: `/api/admin/import-osm` endpoint
  - Admin-only access control (checks x-user-role header)
  - Executes import script via Node.js child_process
  - 5-minute timeout with 10MB output buffer
  - Returns stdout/stderr for debugging

**Phase 4: Enhanced Frontend Snapping**
- **API-Based Snapping**: Replaced client-side Haversine calculation with PostGIS-powered `/api/snap` endpoint
  - `InteractiveSegmentDrawer` now uses async API calls for snapping
  - Loading indicator during snap operations
  - More accurate snapping to LineString edges (not just point nodes)
- **Removed Old Validation**: Cleaned up segments API route
  - Removed `validateSidewalkCoordinates()` calls (coordinates pre-validated by snap API)
  - Removed dependency on `sidewalk-validation.ts` functions
  - Simplified segment creation flow

### Changed
- **Development Database**: Switched from SQLite to PostgreSQL + PostGIS via Docker Compose for full spatial feature support
- **Environment Configuration**: Updated `.env.local.example` to recommend PostgreSQL connection string
- **Coordinate Snapping**: Moved from client-side approximation to server-side PostGIS spatial queries for higher accuracy
- **Database Abstraction**: Extended with PostGIS functions while maintaining backward compatibility

### Technical Details
- **Coordinate System**: SRID 4326 (WGS 84) for all geometries
- **Coordinate Order**: Leaflet uses [lat, lng], PostGIS uses [lng, lat] - conversion handled in `coordinatesToPostGIS()`
- **Spatial Queries**: ST_DWithin for proximity, ST_ClosestPoint for snapping, ST_Distance for measurements
- **Test Coverage**: Added 13 new test files for PostGIS utilities and snap API

### Migration Notes
- **Backward Compatible**: Existing JSONB coordinates remain intact; geometry column populated via trigger
- **Zero Downtime**: New geometry column added with IF NOT EXISTS; can deploy without data loss
- **Rollback Plan**: Geometry columns can remain unused if rollback needed; all old code still works
- **Production Setup**: Requires `CREATE EXTENSION postgis` on Cloud SQL before deployment

---

## [Previous Unreleased Changes]

### Fixed
- **UI/UX**: Fixed confusing block field placeholder text in Contribute modal
  - Changed placeholder from "e.g., 1400 or 1400-1499" to "Enter block number (e.g., 2300)"
  - Resolved user confusion where placeholder text appeared non-deleteable like default value
- **Google Places API**: Enhanced Google Street API integration with improved debugging
  - Added comprehensive console logging to track API loading and request/response flow
  - Simplified API request parameters to test basic connectivity before applying filters
  - Improved error handling and status reporting for easier troubleshooting
  - Made street filtering more flexible to show broader results if no Alameda-specific matches
  - Created standalone test file (test-places-api.html) for API key validation
- **Database**: Fixed "Too many parameter values were provided" error when saving segments
  - Removed extra status parameter from SQLite createSegment function call
  - SQL query hardcodes status as 'pending' but function was still passing status parameter
  - Fixed parameter count mismatch between SQL placeholders (9) and function parameters (10)
- **Testing Infrastructure**: Fixed multiple critical test infrastructure issues
  - Fixed NextRequest mock in jest.setup.js to handle read-only URL property properly  
  - Updated all admin/segments API tests to use new database abstraction layer instead of deprecated segmentQueries
  - Fixed auth context tests to use cookies (js-cookie) instead of localStorage for token storage
  - Fixed Sidebar component tests by using more specific selectors to avoid duplicate element conflicts
  - Updated mock data formats to match current SidewalkSegment interface structure
  - Ensured tests use SQLite in test environment by clearing DATABASE_URL environment variable
- **Critical**: Fixed SQLite dependency issue preventing production deployment
  - Removed SQLite dependencies from production build by moving them to devDependencies  
  - Created conditional dynamic imports that only load SQLite modules in development
  - Added production-safe stub module for type compatibility
  - Fixed production build compilation errors with proper environment detection
- **Critical**: Fixed database import errors breaking all API routes after database abstraction migration
  - Updated all API routes to use new database abstraction functions instead of removed `userQueries`, `segmentQueries`, `contractorQueries`
  - Fixed auth/login, auth/register, auth/me, segments, contractors, admin/segments routes
  - Fixed password reset functionality to use async database functions
  - Fixed photo upload/delete routes to use new storage abstraction
  - Added fallback utility functions for coordinate and special marks parsing
  - Fixed User interface type consistency with password_hash field
  - Fixed TypeScript build errors with proper null checks and type annotations
- **Performance**: Fixed Next.js cache overflow error (25MB limit) in sidewalk validation by disabling cache for large Overpass API responses
- **Build**: Fixed TypeScript iteration errors in captcha, rate-limiter, and storage modules by using Array.from() pattern
- **Security**: Upgraded multer from 1.x to 2.x to address security vulnerabilities
- **Build**: Updated Docker build process to use `--omit=dev` flag instead of deprecated `--only=production`
- **Build**: Fixed multi-stage Docker build to properly install dev dependencies for build stage
- **Dependencies**: Updated package.json scripts to include audit commands
- **Build**: Enhanced .dockerignore to include new documentation files

### Changed
- All API routes now use consistent async/await database abstraction layer
- Database operations automatically switch between SQLite (dev) and PostgreSQL (prod)
- Build process now separates dev dependencies properly in Docker stages
- npm ci now uses modern `--omit=dev` flag instead of deprecated `--only=production`
- Added npm audit scripts for security monitoring
- Overpass API requests now bypass Next.js cache to prevent memory issues

### Added
- Google Cloud deployment configuration and infrastructure
  - Docker containerization with multi-stage build
  - Cloud Build configuration (`cloudbuild.yaml`)
  - Complete PostgreSQL database schema (`database-setup.sql`)
  - Automated deployment script (`deploy.sh`)
  - Comprehensive deployment documentation (`DEPLOYMENT.md`)
  - Environment configuration templates (`.env.production.example`, `.env.local.example`)
  - GitHub Actions CI/CD pipeline (`.github/workflows/deploy.yml`)
  - Deployment summary guide (`README-DEPLOYMENT.md`)

- Database architecture improvements
  - PostgreSQL adapter for production (`src/lib/database-postgres.ts`)
  - SQLite async wrapper for development compatibility (`src/lib/database-sqlite-async.ts`)
  - Smart database switcher (`src/lib/database.ts`) - automatically detects environment
  - Renamed original SQLite implementation to `database-sqlite.ts`
  - Connection pooling and proper async/await patterns for PostgreSQL
  - Full CRUD operations converted from SQLite to PostgreSQL syntax

- File storage architecture
  - Google Cloud Storage service (`src/lib/storage.ts`)
  - Automatic switching between local storage (dev) and GCS (production)
  - Multipart form data handling for Next.js API routes
  - File upload, deletion, and URL generation utilities

- Dependencies
  - `pg` (^8.13.0) - PostgreSQL client
  - `@types/pg` (^8.11.10) - TypeScript types for PostgreSQL
  - `@google-cloud/storage` (^7.13.0) - Google Cloud Storage client

### Fixed (from BUGS.md)
- **Admin page**: Added segment preview functionality on map with highlighting
  - Added `onPreviewSegment` prop to `AdminSegmentApproval` component
  - Added "Preview on Map" button with Eye icon
  - Added 5-second auto-clear highlighting system in admin page
  - Added bright red highlighting for previewed segments on map

- **Logged in page**: Improved sidewalk snapping algorithm
  - Implemented intelligent 50-meter distance-based snapping in `InteractiveSegmentDrawer`
  - Added `findNearestSidewalk` function with Haversine distance calculation
  - Prevents drawing on houses by snapping to actual sidewalk segments
  - Geographic accuracy using latitude/longitude coordinate system

- **Logged in page**: Fixed street field validation to allow spaces
  - Changed validation timing from `onChange` to `onBlur` in `SegmentForm`
  - Added support for warning states (yellow) vs error states (red)
  - Implemented permissive validation allowing unknown streets with warnings
  - Added comprehensive street database including "Fairview Avenue" and 25+ other streets
  - Street name normalization on blur event for natural typing experience

### Changed
- Database operations now use consistent async/await patterns across both SQLite and PostgreSQL
- Environment-based configuration switching (development uses SQLite, production uses PostgreSQL)
- File storage automatically switches based on environment (local files vs Google Cloud Storage)
- Street validation approach changed from restrictive to permissive with helpful warnings
- All deployment-related configuration externalized to separate files

### Technical Details
- **Container**: Multi-stage Docker build optimized for Next.js standalone output
- **Database**: Connection pooling, proper indexing, UUID primary keys, timestamps with time zones
- **Security**: Secrets management via Google Cloud Secret Manager
- **CI/CD**: Automated testing, building, and deployment pipeline
- **Monitoring**: Cloud logging and error reporting configuration
- **Scalability**: Auto-scaling Cloud Run with configurable instance limits

### Infrastructure
- **Compute**: Google Cloud Run (serverless containers)
- **Database**: Cloud SQL PostgreSQL with automated backups
- **Storage**: Google Cloud Storage with public access for images
- **Secrets**: Google Cloud Secret Manager for sensitive data
- **CI/CD**: GitHub Actions with automated deployments on main branch

### Migration Path
- Existing development setup remains unchanged
- Automatic environment detection prevents breaking changes
- SQLite data can be migrated to PostgreSQL using provided schema
- All existing tests and functionality preserved