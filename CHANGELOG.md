# Changelog

All notable changes to the Alameda Sidewalk Map project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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