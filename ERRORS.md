# Errors Log

This file tracks deployment and runtime errors for reference.

## Current Issues

_No current issues._

## Resolved Issues

### OAuth PKCE Error (Resolved 2026-01-16)
**Error:**
```
InvalidCheck: pkceCodeVerifier value could not be parsed
```

**Cause:** `NEXTAUTH_URL` was pointing to the Cloud Run URL (`https://...run.app`) instead of the custom domain.

**Resolution:**
1. Set `AUTH_TRUST_HOST=true` in environment variables
2. Set `NEXTAUTH_URL` and `AUTH_URL` to custom domain (`https://alameda-sidewalks.com`)
3. Hardcoded URLs in `cloudbuild.yaml` (substitutions were unreliable)

### OAuth redirect_uri_mismatch (Resolved 2026-01-16)
**Error:**
```
400 Error: redirect_uri_mismatch
```

**Cause:** Google OAuth callback URL in Cloud Console didn't match the actual callback URL.

**Resolution:** Added correct redirect URI to Google Cloud Console OAuth credentials:
- `https://alameda-sidewalks.com/api/auth/callback/google`

### Cloud SQL SSL Connection Error (Resolved 2026-01-16)
**Error:**
```
Error: The server does not support SSL connections
```

**Cause:** Auth.js adapter was trying to use SSL for Cloud SQL Unix socket connection.

**Resolution:** Set `ssl: false` in pool configuration when `PGHOST` starts with `/` (Unix socket path).

### OAuthAccountNotLinked Error (Resolved 2026-01-16)
**Error:**
```
OAuthAccountNotLinked: Another account already exists with the same email
```

**Cause:** Existing user in database couldn't link OAuth account.

**Resolution:** Added `allowDangerousEmailAccountLinking: true` to both Google and GitHub providers in `src/auth.ts`.

### Cloud Run setIamPolicy Permission Error (Resolved 2026-01-16)
**Error:**
```
Permission 'run.services.setIamPolicy' denied on resource
```

**Cause:** The `--allow-unauthenticated` flag in `gcloud run deploy` requires permission to set IAM policies.

**Resolution:** Removed `--allow-unauthenticated` from `cloudbuild.yaml`. This setting persists on the service and only needs to be set once manually.

### GitHub Actions WIF Permission Error (Resolved 2026-01-16)
**Error:**
```
Permission 'iam.serviceAccounts.getAccessToken' denied on resource
```

**Cause:** Service account didn't have Workload Identity User role.

**Resolution:** Granted `roles/iam.workloadIdentityUser` to service account with the correct principal set binding.

### Docker Build Error (Resolved 2026-01-15)
**Error:**
```
COPY failed: stat app/.next/standalone: file does not exist
```

**Cause:** Dockerfile was trying to copy standalone build output, but Next.js wasn't configured for standalone mode.

**Resolution:** Updated Dockerfile to copy standard Next.js build output (`.next/` directory) instead of standalone.
