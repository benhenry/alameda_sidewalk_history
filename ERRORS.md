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

**Cause:** `NEXTAUTH_URL` was not pointing to the custom domain.

**Resolution:**
1. Set `AUTH_TRUST_HOST=true` in environment variables
2. Set `NEXTAUTH_URL` and `AUTH_URL` to custom domain (`https://alameda-sidewalks.com`)

### OAuth redirect_uri_mismatch (Resolved 2026-01-16)
**Error:**
```
400 Error: redirect_uri_mismatch
```

**Cause:** Google OAuth callback URL in Cloud Console didn't match the actual callback URL.

**Resolution:** Added correct redirect URI to Google Cloud Console OAuth credentials:
- `https://alameda-sidewalks.com/api/auth/callback/google`

### OAuthAccountNotLinked Error (Resolved 2026-01-16)
**Error:**
```
OAuthAccountNotLinked: Another account already exists with the same email
```

**Cause:** Existing user in database couldn't link OAuth account.

**Resolution:** Added `allowDangerousEmailAccountLinking: true` to both Google and GitHub providers in `src/auth.ts`.

### Vercel Build: SQLite Native Dependencies (Resolved 2026-02-24)
**Error:**
```
Error: Cannot find module 'better-sqlite3'
```

**Cause:** SQLite native dependencies were in `dependencies` instead of `devDependencies`, causing Vercel build failures.

**Resolution:**
1. Moved `better-sqlite3` to `devDependencies`
2. Added `--ignore-scripts` to `vercel.json` build command
3. Created `database-sqlite-stub.ts` for production type safety
