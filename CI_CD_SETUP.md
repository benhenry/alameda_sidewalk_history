# CI/CD Setup

## Overview

This project uses **GitHub Actions** to run tests on PRs and **Google Cloud Build** for deployment to Cloud Run.

### Pipeline Flow

```
PR to main → GitHub Actions (test) → Merge → GitHub Actions (test + deploy) → Cloud Build → Cloud Run
```

## GitHub Actions Workflow

The workflow (`.github/workflows/ci.yml`) runs:

| Trigger | Jobs |
|---------|------|
| **Pull Request to main** | test, build |
| **Push to main** | test, build, **deploy** |

### Test Job
- Runs on Node.js 18.x and 20.x
- TypeScript type checking
- ESLint linting
- Jest tests with coverage (20% minimum threshold)

### Build Job
- Builds the Next.js application
- Uploads build artifacts

### Deploy Job (main branch only)
- Authenticates to GCP via Workload Identity Federation
- Submits build to Cloud Build
- Cloud Build deploys to Cloud Run

## GitHub Secrets Required

| Secret | Description |
|--------|-------------|
| `GCP_PROJECT_ID` | Your GCP project ID (e.g., `alameda-sidewalks`) |
| `GCP_SERVICE_ACCOUNT` | Service account email (e.g., `github-deployer@PROJECT.iam.gserviceaccount.com`) |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Format: `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL/providers/PROVIDER` |

## Workload Identity Federation Setup

Workload Identity Federation allows GitHub Actions to authenticate to GCP without storing service account keys.

### 1. Create Workload Identity Pool

```bash
gcloud iam workload-identity-pools create "github-actions" \
  --location="global" \
  --display-name="GitHub Actions Pool"
```

### 2. Create OIDC Provider

```bash
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --location="global" \
  --workload-identity-pool="github-actions" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository_owner == 'YOUR_GITHUB_USERNAME'" \
  --issuer-uri="https://token.actions.githubusercontent.com"
```

### 3. Get Provider Resource Name

```bash
gcloud iam workload-identity-pools providers describe github-provider \
  --workload-identity-pool="github-actions" \
  --location="global" \
  --format="value(name)"
```

This output is your `GCP_WORKLOAD_IDENTITY_PROVIDER` secret value.

### 4. Grant Service Account Permissions

```bash
# Get project number
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")

# Allow GitHub to impersonate service account
gcloud iam service-accounts add-iam-policy-binding "YOUR_SA@PROJECT.iam.gserviceaccount.com" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-actions/attribute.repository/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME"
```

### 5. Service Account Roles Required

The service account needs these roles:

```bash
SA="your-sa@project.iam.gserviceaccount.com"
PROJECT_ID="your-project-id"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA}" --role="roles/cloudbuild.builds.editor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA}" --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA}" --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA}" --role="roles/iam.serviceAccountUser"
```

## Cloud Build Configuration

The `cloudbuild.yaml` file configures:

1. **Docker Build**: Builds the Next.js app container
2. **Push to GCR**: Pushes image to Google Container Registry
3. **Deploy to Cloud Run**: Updates the Cloud Run service

### Key Environment Variables

Set in `cloudbuild.yaml`:
- `NEXTAUTH_URL` / `AUTH_URL`: Must be your custom domain (e.g., `https://alameda-sidewalks.com`)
- `AUTH_TRUST_HOST=true`: Required for Cloud Run proxy environment
- `PGHOST`: Cloud SQL Unix socket path (`/cloudsql/PROJECT:REGION:INSTANCE`)
- Database credentials via Secret Manager

### Cloud SQL Connection

Cloud Run connects to Cloud SQL via Unix socket (not TCP):
- **No SSL required** - Unix sockets are already secure
- Add `--add-cloudsql-instances` to the deploy command
- Set `PGHOST=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME`

## Local Development

```bash
# Run tests
npm run test:ci

# Check coverage (20% minimum)
npm run test:coverage

# Type check
npm run typecheck

# Lint
npm run lint

# Build
npm run build
```

## Monitoring

### Check GitHub Actions
https://github.com/YOUR_USERNAME/YOUR_REPO/actions

### Check Cloud Build
```bash
gcloud builds list --limit 5
gcloud builds log BUILD_ID
```

### Check Cloud Run
```bash
gcloud run services describe alameda-sidewalk-map --region=us-central1
gcloud run revisions list --service=alameda-sidewalk-map --region=us-central1
```

### View Logs
```bash
gcloud run services logs read alameda-sidewalk-map --region=us-central1 --limit=100
```

## Troubleshooting

### "Permission denied" on deploy
Service account missing required roles. See "Service Account Roles Required" above.

### "Unable to acquire impersonated credentials"
Workload Identity not configured correctly. Verify:
1. Pool and provider exist
2. Service account has `roles/iam.workloadIdentityUser` binding
3. Attribute condition matches your repository

### OAuth "redirect_uri_mismatch"
1. Check `NEXTAUTH_URL` in Cloud Run env vars matches your domain
2. Update Google OAuth credentials with correct redirect URI

### PKCE "pkceCodeVerifier value could not be parsed"
1. Ensure `AUTH_TRUST_HOST=true` is set
2. Verify `NEXTAUTH_URL` and `AUTH_URL` point to your custom domain (not Cloud Run URL)
3. URLs are hardcoded in `cloudbuild.yaml` (not using substitutions for reliability)

### Database "SSL connection" errors
Cloud SQL via Unix socket doesn't use SSL. Ensure `ssl: false` in database config when using `/cloudsql/...` host.

### "run.services.setIamPolicy" permission denied
This error occurs when using `--allow-unauthenticated` in `gcloud run deploy`. The flag tries to set an IAM policy to allow public access.

**Solution**: Remove `--allow-unauthenticated` from `cloudbuild.yaml`. This setting persists on the Cloud Run service, so it only needs to be set once manually:
```bash
gcloud run services add-iam-policy-binding alameda-sidewalk-map \
  --region=us-central1 \
  --member="allUsers" \
  --role="roles/run.invoker"
```

---

*Last updated: 2026-01-16*
