
### FEATURES - PRIORITY ORDER

**P0 - OAuth Authentication Setup (COMPLETED 2025-12-25)**
1. ✅ **COMPLETED**: Auth.js v5 implementation with Google + GitHub OAuth
   - ✅ Installed Auth.js v5 and PostgreSQL adapter
   - ✅ Created database schema (accounts, sessions, verification_tokens tables)
   - ✅ Configured Google OAuth and GitHub OAuth providers
   - ✅ Removed all custom password authentication code (-1,320 lines!)
   - ✅ Updated AuthModal to OAuth-only (simple button UI)
   - ✅ Rewritten auth context to use NextAuth sessions
   - ✅ Created comprehensive OAUTH_SETUP.md guide

**P1 - Deployment Automation (COMPLETED 2026-01-16)**
2. ✅ **COMPLETED**: CI/CD Pipeline with GitHub Actions + Cloud Build
   - ✅ GitHub Actions workflow runs tests on PRs
   - ✅ Deploy job triggers Cloud Build on push to main
   - ✅ Workload Identity Federation for keyless GCP auth
   - ✅ Cloud SQL connection via Unix socket
   - ✅ All secrets managed via Google Secret Manager
   - ✅ Documented in CI_CD_SETUP.md

**P2 - Domain & Production Setup (COMPLETED 2026-01-16)**
3. ✅ **COMPLETED**: Custom domain and production configuration
   - ✅ Custom domain: alameda-sidewalks.com
   - ✅ SSL certificate (automatic via Cloud Run)
   - ✅ OAuth redirect URIs configured for production
   - ✅ `AUTH_TRUST_HOST=true` for Cloud Run proxy
   - ✅ `allowDangerousEmailAccountLinking` for OAuth account linking

**P3 - Production Infrastructure (COMPLETED)**
4. ✅ **COMPLETED**: Production environment
   - ✅ Cloud SQL database with PostGIS extension
   - ✅ Cloud Storage bucket for file uploads
   - ✅ Production environment variables in Secret Manager
   - ✅ Reference sidewalk data imported (2,600+ sidewalks)

---

### NEXT PRIORITIES

**P4 - Data Quality & User Experience**
1. Street name validation and normalization
   - Handle variations: "Fairview Avenue" vs "Fairview Ave" vs "Fairview Ave."
   - Fuzzy matching for existing streets
   - Auto-suggest from existing database entries

2. Contractor name validation
   - Fuzzy matching for similar contractor names
   - "Dutch Bros" vs "Dutch Brothers" prompt

3. Reference sidewalk table creation
   - `reference_sidewalks` table needs to be created in production
   - Run migration SQL in Cloud SQL

**P5 - Admin Features**
1. User management dashboard
2. Bulk segment operations
3. Data export functionality

---

### COMPLETED ITEMS

**2026-01-16 - CI/CD & Production Deployment**
- ✅ GitHub Actions CI/CD pipeline with Workload Identity Federation
- ✅ Fixed react-leaflet mock causing infinite re-renders in tests
- ✅ Auth.js configuration for Cloud Run (trustHost, SSL disabled for Unix sockets)
- ✅ OAuth account linking with existing users (allowDangerousEmailAccountLinking)
- ✅ Fixed cloudbuild.yaml to use custom domain URL

**2025-12-25 - OAuth Authentication Migration**
- ✅ Replaced custom password auth with Auth.js v5
- ✅ Google OAuth and GitHub OAuth configured
- ✅ Database schema migration for Auth.js tables
- ✅ Automatic account linking for existing users
- ✅ Removed 2,035 lines of password-related code

**2025-12-25 - Reference Sidewalk Data**
- ✅ Fixed LineString connectivity (was flattening to points)
- ✅ Imported road-based sidewalks (sidewalk=both/left/right tags)
- ✅ Increased coverage from 334 → 2,600 sidewalks (7.8x improvement)

**2025-12-16 - PostGIS Migration**
- ✅ Migrated from basic PostgreSQL to PostGIS spatial database
- ✅ Imported 334+ sidewalk segments from OpenStreetMap
- ✅ Implemented smart coordinate snapping (50m radius)
- ✅ Created admin interface for reference sidewalk management

---

### OPEN BUGS

1. **Street Name Validation**: Inconsistent street names allowed
   - "Fairview Avenue" vs. "Fairview Ave." vs. "Fairview Ave"
   - No fuzzy matching or normalization

2. **Contractor Validation**: No fuzzy matching for similar names
   - Could result in duplicate contractors with slight name variations

3. **Reference Sidewalks Table**: May not exist in production database
   - Need to run migration: `CREATE TABLE IF NOT EXISTS reference_sidewalks...`

