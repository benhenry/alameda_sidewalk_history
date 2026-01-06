# GitHub Actions Deployment Guide

This guide shows you how to deploy automatically to Google Cloud Run by pushing to GitHub.

## Prerequisites

Before you can deploy via GitHub, you need:
1. A Google Cloud project with billing enabled
2. GitHub repository secrets configured
3. Google Cloud resources set up (Cloud SQL, Secret Manager)

## Step 1: Set Up Google Cloud Resources

### Option A: Using GCP Console (No CLI needed)

1. **Create a GCP Project**
   - Go to https://console.cloud.google.com
   - Create a new project or select existing one
   - Note your Project ID (e.g., `my-project-12345`)

2. **Enable Required APIs**
   - Go to APIs & Services → Enable APIs and Services
   - Enable: Cloud Run API, Cloud Build API, Container Registry API, Cloud SQL Admin API

3. **Create Service Account for GitHub**
   - Go to IAM & Admin → Service Accounts
   - Click "Create Service Account"
   - Name: `github-actions`
   - Grant roles:
     - Cloud Run Admin
     - Storage Admin
     - Service Account User
   - Click "Create Key" → JSON
   - Download the JSON file (you'll paste this into GitHub secrets)

4. **Create Secrets in Secret Manager**
   - Go to Security → Secret Manager
   - Click "Create Secret" for each:
     - `jwt-secret`: A random 32+ character string
     - `postgres-password`: Your PostgreSQL password
     - `auth-secret`: Run `openssl rand -base64 32` to generate
     - `google-oauth-client-id`: From Google OAuth setup
     - `google-oauth-client-secret`: From Google OAuth setup
     - `github-oauth-client-id`: From GitHub OAuth setup
     - `github-oauth-client-secret`: From GitHub OAuth setup

5. **Set Up Cloud SQL** (optional for initial deployment)
   - Go to SQL → Create Instance → PostgreSQL
   - Instance ID: `sidewalk-db`
   - Region: `us-central1`
   - Set a root password
   - Note the instance connection name: `PROJECT_ID:us-central1:sidewalk-db`

6. **Create Cloud Storage Bucket** (optional)
   - Go to Cloud Storage → Create Bucket
   - Name: `alameda-sidewalk-uploads-PROJECT_ID`
   - Region: `us-central1`

### Option B: Using gcloud CLI

If you prefer the command line, install gcloud and run:

```bash
# Install gcloud
brew install --cask google-cloud-sdk

# Initialize and authenticate
gcloud init

# Run the setup script
./setup-secrets.sh

# Create service account for GitHub
PROJECT_ID=$(gcloud config get-value project)
gcloud iam service-accounts create github-actions --display-name="GitHub Actions"

# Grant permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Create service account key
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions@$PROJECT_ID.iam.gserviceaccount.com

# Display the key (copy this for GitHub secret)
cat github-actions-key.json
```

## Step 2: Configure GitHub Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** for each:

### Required Secrets:

| Secret Name | Value | Where to Get It |
|-------------|-------|-----------------|
| `GCP_PROJECT_ID` | Your GCP project ID | GCP Console → Project Info |
| `GCP_SA_KEY` | Service account JSON key | Contents of the JSON file you downloaded/created |
| `CLOUD_SQL_INSTANCE` | `PROJECT_ID:us-central1:sidewalk-db` | Format with your project ID |
| `GCS_BUCKET_NAME` | `alameda-sidewalk-uploads-PROJECT_ID` | Your bucket name |

**Example values:**
```
GCP_PROJECT_ID: my-sidewalk-project-12345
GCP_SA_KEY: {
  "type": "service_account",
  "project_id": "my-sidewalk-project-12345",
  ...entire JSON content...
}
CLOUD_SQL_INSTANCE: my-sidewalk-project-12345:us-central1:sidewalk-db
GCS_BUCKET_NAME: alameda-sidewalk-uploads-my-sidewalk-project-12345
```

## Step 3: Push to GitHub to Deploy

Once secrets are configured, any push to the `main` branch will trigger deployment:

```bash
# Commit your changes
git add .
git commit -m "Configure deployment for GCP"
git push origin main
```

## Step 4: Monitor Deployment

1. Go to your GitHub repository
2. Click **Actions** tab
3. You'll see the workflow running with two jobs:
   - **test**: Runs tests, linting, type checking
   - **deploy**: Builds Docker image and deploys to Cloud Run

The entire process takes about 5-10 minutes.

## What Happens During Deployment

1. **Test Job** (runs first):
   - Checks out code
   - Installs dependencies
   - Runs `npm run typecheck`
   - Runs `npm run lint`
   - Runs `npm run test:ci`

2. **Deploy Job** (only on main branch, after tests pass):
   - Builds Docker image
   - Pushes to Google Container Registry
   - Deploys to Cloud Run with all secrets and environment variables
   - Outputs the deployment URL

## Troubleshooting

### Deployment fails with "Permission denied"
- Check that the service account has the correct roles
- Verify `GCP_SA_KEY` is the complete JSON (including curly braces)

### Deployment fails with "Secret not found"
- Ensure all secrets are created in Google Secret Manager
- Verify the secret names match exactly (case-sensitive)
- Check that Cloud Run service account has `roles/secretmanager.secretAccessor`

### Tests fail
- Run tests locally first: `npm run test:ci`
- Check the Actions logs for specific test failures
- Fix issues and push again

### Database connection errors
- Verify Cloud SQL instance is running
- Check `CLOUD_SQL_INSTANCE` format is correct
- Ensure `postgres-password` secret matches your database password

## Getting Your App URL

After successful deployment, find your app URL:

1. Check the GitHub Actions logs (last step of deploy job)
2. Or go to: https://console.cloud.google.com/run
3. Click on `alameda-sidewalk-map` service
4. The URL will be shown at the top

Format: `https://alameda-sidewalk-map-HASH-uc.a.run.app`

## Next Steps After First Deployment

1. **Set up OAuth URLs**: Add your Cloud Run URL to Google/GitHub OAuth settings
2. **Test authentication**: Try signing in with Google/GitHub
3. **Set up custom domain** (optional): Add your own domain in Cloud Run
4. **Monitor logs**: Check Cloud Logging for any errors

## Making Updates

Simply push to main branch:

```bash
git add .
git commit -m "Your update message"
git push origin main
```

GitHub Actions will automatically:
- Run all tests
- Build new Docker image
- Deploy to Cloud Run if tests pass
