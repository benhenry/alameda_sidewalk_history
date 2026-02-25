
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
2. ✅ **COMPLETED**: CI/CD Pipeline with GitHub Actions + Vercel
   - ✅ GitHub Actions workflow runs tests on PRs
   - ✅ Vercel auto-deploys on push to main
   - ✅ Preview deployments for pull requests
   - ✅ Environment variables managed via Vercel Dashboard

**P2 - Domain & Production Setup (COMPLETED 2026-01-16)**
3. ✅ **COMPLETED**: Custom domain and production configuration
   - ✅ Custom domain: alameda-sidewalks.com
   - ✅ SSL certificate (automatic via Vercel)
   - ✅ OAuth redirect URIs configured for production
   - ✅ `AUTH_TRUST_HOST=true` for Vercel proxy
   - ✅ `allowDangerousEmailAccountLinking` for OAuth account linking

**P3 - Production Infrastructure (COMPLETED)**
4. ✅ **COMPLETED**: Production environment (migrated from GCP to Vercel + Supabase)
   - ✅ Supabase PostgreSQL with PostGIS extension
   - ✅ Supabase Storage for file uploads
   - ✅ Production environment variables in Vercel Dashboard
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
   - Run migration SQL in Supabase

**P5 - Admin Features (PARTIALLY COMPLETED 2026-02-06)**
1. User management dashboard
2. ✅ **COMPLETED**: Bulk segment operations
   - ✅ Batch correction for misaligned segments
   - ✅ Overlap detection and resolution
3. Data export functionality
4. ✅ **COMPLETED**: Admin segment editing
   - ✅ Full edit modal with coordinate adjustment
   - ✅ Edit button on segment approval list
   - ✅ Audit trail (edited_by, edited_at)

**P6 - Enhanced Snapping (COMPLETED 2026-02-06)**
1. ✅ **COMPLETED**: Snap to approved segments
   - ✅ Green overlay for approved segments on drawing map
   - ✅ Priority snapping: approved (10m) > reference (50m)
   - ✅ Source indicator in snap API response

---

### COMPLETED ITEMS

**2026-01-16 - CI/CD & Production Deployment**
- ✅ GitHub Actions CI/CD pipeline with Workload Identity Federation
- ✅ Fixed react-leaflet mock causing infinite re-renders in tests
- ✅ Auth.js configuration for Vercel (trustHost)
- ✅ OAuth account linking with existing users (allowDangerousEmailAccountLinking)

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

### OPEN ITEMS

1. **Street Name Validation**: Inconsistent street names allowed
   - "Fairview Avenue" vs. "Fairview Ave." vs. "Fairview Ave"
   - No fuzzy matching or normalization

2. **Contractor Validation**: No fuzzy matching for similar names
   - Could result in duplicate contractors with slight name variations

