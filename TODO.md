
### FEATURES - PRIORITY ORDER

**P0 - OAuth Authentication Setup (IN PROGRESS - 95% Complete)**
1. ✅ **COMPLETED**: Auth.js v5 implementation with Google + GitHub OAuth
   - ✅ Installed Auth.js v5 and PostgreSQL adapter
   - ✅ Created database schema (accounts, sessions, verification_tokens tables)
   - ✅ Configured Google OAuth and GitHub OAuth providers
   - ✅ Removed all custom password authentication code (-1,320 lines!)
   - ✅ Updated AuthModal to OAuth-only (simple button UI)
   - ✅ Rewritten auth context to use NextAuth sessions
   - ✅ Created comprehensive OAUTH_SETUP.md guide
   - ⚠️ **NEXT STEP**: Set up OAuth credentials (see OAUTH_SETUP.md)
     - Get Google OAuth Client ID and Secret
     - Get GitHub OAuth App credentials
     - Generate AUTH_SECRET
     - Update .env.local
     - Test OAuth flow

**P1 - Deployment Automation (READY TO START)**
2. Set up automatic deployment from GitHub to Google Cloud Run
   - Review existing cloudbuild.yaml configuration
   - Set up GitHub Actions workflow (or verify Cloud Build GitHub integration)
   - Configure automatic builds on push to main branch
   - Set up Google Secret Manager for OAuth credentials
   - Test deployment pipeline
   - Document deployment process

**P2 - Domain & Production Setup (BLOCKED - Waiting for OAuth Testing)**
3. Configure custom domain
   - Choose and register domain name (TBD)
   - Set up Cloud Run custom domain mapping
   - Configure SSL certificate (automatic via Cloud Run)
   - Update DNS configuration
   - Add production URLs to OAuth providers (Google + GitHub)

**P3 - Production Infrastructure (BLOCKED - Waiting for Domain)**
4. Production environment setup
   - Provision Cloud SQL database with PostGIS extension
   - Set up Cloud Storage bucket for file uploads
   - Configure production environment variables in Secret Manager
   - Run database migrations on production database
   - Import reference sidewalk data to production

### COMPLETED (2025-12-25)

✅ **OAuth Authentication Implementation**
  * Replaced custom password auth with Auth.js v5
  * Google OAuth and GitHub OAuth configured
  * Database schema migration for Auth.js tables
  * Automatic account linking for existing users
  * Removed 2,035 lines of password-related code
  * Created OAUTH_SETUP.md documentation

✅ **Reference Sidewalk Data Improvements**
  * Fixed LineString connectivity (was flattening to points)
  * Imported road-based sidewalks (sidewalk=both/left/right tags)
  * Increased coverage from 334 → 2,600 sidewalks (7.8x improvement)
  * Implemented dynamic viewport-based legend
  * Real-time reference sidewalk filtering in Contribute dialog

### COMPLETED (2025-12-16)

✅ **PostGIS Migration & Geospatial Features**
  * Migrated from basic PostgreSQL to PostGIS spatial database
  * Imported 334+ sidewalk segments from OpenStreetMap via Overpass API
  * Implemented smart coordinate snapping to reference sidewalks (50m radius, sub-meter accuracy)
  * Created admin interface for managing reference sidewalk data
  * Added PostGIS spatial queries with GIST indexes for performance
  * Created Docker Compose setup for local PostgreSQL + PostGIS development
  * Built OSM import script with automatic data updates
  * Dual-column approach: JSONB coordinates + PostGIS geometry with auto-sync

### OPEN BUGS

  * Streets are not validated, which allows for a lot of redundancies, e.g. "Fairview Avenue" vs. "Fairview Ave." vs. "Fairview Ave".
  * ~~Because segments ask for two coordinates to draw a line between, nothing is pegged to actual sidewalks.~~ **FIXED: PostGIS snapping implemented (2025-12-16)**
  * Not just streets, but all input should be validated against what already exists in the database, e.g. if the contractor is "Dutch Bros" and there's a "Dutch Brothers" in the database, ask the user if Dutch Brothers is correct.

