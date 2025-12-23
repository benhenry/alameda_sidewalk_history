
### FEATURES - PRIORITY ORDER

**P0 - Authentication Overhaul**
1. Replace custom login with Google OAuth authentication
   - Remove custom username/password system
   - Implement Google Sign-In OAuth flow
   - Migrate existing user accounts (map emails to Google accounts)
   - Update AuthModal and auth context for OAuth
   - Remove password reset functionality (no longer needed)

**P1 - Deployment Automation**
2. Set up automatic deployment from GitHub to Google Cloud Run
   - Configure GitHub Actions for CI/CD
   - Automated builds on push to main branch
   - Environment variable management via Google Secret Manager
   - Verify cloudbuild.yaml configuration

**P2 - Domain & Production Setup**
3. Configure custom domain (after OAuth is working)
   - Domain name: TBD
   - SSL certificate setup
   - DNS configuration
   - Cloud Run custom domain mapping

**P3 - Production Infrastructure**
4. Set up Cloud SQL database with PostGIS extension (production)
5. Set up Cloud Storage for file uploads (production)
6. Configure environment variables and secrets for production

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

