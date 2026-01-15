# Errors Log

This file tracks deployment and runtime errors for reference.

## Current Issues

_No current issues._

## Resolved Issues

### Docker Build Error (Resolved 2026-01-15)
**Error:**
```
COPY failed: stat app/.next/standalone: file does not exist
```

**Cause:** Dockerfile was trying to copy standalone build output, but Next.js wasn't configured for standalone mode.

**Resolution:** Updated Dockerfile to copy standard Next.js build output (`.next/` directory) instead of standalone.
