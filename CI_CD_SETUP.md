# CI/CD Setup

## Deployment Pipeline

This project uses **Google Cloud Build** for automated deployments.

### How It Works

1. **Push to GitHub main branch**
2. **Cloud Build trigger automatically starts** (trigger name: "CD")
3. **Cloud Build executes** `cloudbuild.yaml`:
   - Builds Docker image
   - Pushes to Google Container Registry
   - Deploys to Cloud Run
4. **Production is live** at https://alameda-sidewalk-map-nrlykf3v7q-uc.a.run.app

### Configuration Files

- **`cloudbuild.yaml`** - Cloud Build configuration (primary CI/CD)
- **`.github/workflows/ci.yml`** - Test workflow (runs only on pull requests)
- **`.github/workflows/deploy.yml.disabled`** - Deprecated deployment workflow (disabled)

### Testing Strategy

**Tests run only on pull requests**, not on direct pushes to main. This allows:
- Fast iteration when pushing to main
- Code quality checks before merging PRs
- Deployments proceed regardless of test status (deployments are independent)

To run tests locally:
```bash
npm run test:ci        # Run all tests
npm run test:coverage  # Check coverage (90%+ required)
npm run typecheck      # TypeScript validation
npm run lint           # Code linting
```

### Monitoring Deployments

Check build status:
```bash
gcloud builds list --limit 5
```

View build logs:
```bash
gcloud builds log <BUILD_ID>
```

Check Cloud Run service:
```bash
gcloud run services describe alameda-sidewalk-map --region us-central1
```

### Environment Configuration

**Production environment variables** are set in `cloudbuild.yaml`:
- Database connection via Cloud SQL Unix socket
- OAuth URLs configured for production domain
- All secrets pulled from Google Secret Manager

### Secrets Management

All sensitive values are stored in Google Secret Manager:
- `auth-secret` - Auth.js secret key
- `postgres-password` - Database password
- `google-oauth-client-id` / `google-oauth-client-secret` - Google OAuth
- `github-oauth-client-id` / `github-oauth-client-secret` - GitHub OAuth
- Email provider secrets (SendGrid, Gmail, SMTP)

View secrets:
```bash
gcloud secrets list
```

### Deployment Workflow

```
Local Development → Git Commit → Git Push to main → Cloud Build Trigger
                                                            ↓
                                                    Build Docker Image
                                                            ↓
                                                   Push to GCR
                                                            ↓
                                                   Deploy to Cloud Run
                                                            ↓
                                                   Production Live ✅
```

### Troubleshooting

**Build failing?**
```bash
# Check recent builds
gcloud builds list --limit 5

# View specific build log
gcloud builds log <BUILD_ID>
```

**Deployment not updating?**
```bash
# Check Cloud Run revision
gcloud run revisions list --service=alameda-sidewalk-map --region=us-central1
```

**Need to manually deploy?**
```bash
# Trigger build manually
gcloud builds submit --config cloudbuild.yaml
```

### Why Cloud Build Instead of GitHub Actions?

- **Native GCP integration** - Direct access to Secret Manager, Cloud Run, Cloud SQL
- **No credential management** - Service account automatically configured
- **Simpler configuration** - Single `cloudbuild.yaml` file
- **Better performance** - Faster builds, closer to deployment target
- **Already working** - Existing trigger is configured and operational

### Pull Request Testing

When you create a pull request:
1. GitHub Actions CI automatically runs
2. Tests, type checking, and linting execute on both Node 18 and Node 20
3. Coverage must meet 85% threshold
4. All checks must pass before merging (recommended)

**Note**: This test PR verifies the CI workflow runs correctly on pull requests.

---

*Last updated: 2026-01-13*
