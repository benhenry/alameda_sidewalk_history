# Google Cloud Deployment Guide

This guide walks you through deploying the Alameda Sidewalk Map to Google Cloud using Cloud Run.

## 📋 Prerequisites

1. **Google Cloud Account** with billing enabled
2. **gcloud CLI** installed and authenticated
3. **Docker** installed (for local testing)
4. **Node.js 18+** for local development

## 🚀 Quick Deploy

For a quick deployment, run:

```bash
./deploy.sh YOUR_PROJECT_ID us-central1
```

## 📖 Step-by-Step Deployment

### 1. Set up Google Cloud Project

```bash
# Create a new project (or use existing)
gcloud projects create alameda-sidewalk-map-prod
gcloud config set project alameda-sidewalk-map-prod

# Enable billing (required)
# Go to https://console.cloud.google.com/billing
```

### 2. Enable Required APIs

```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable storage.googleapis.com
```

### 3. Set Up Cloud SQL Database with PostGIS

```bash
# Create PostgreSQL instance with PostGIS support
gcloud sql instances create sidewalk-db \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=us-central1 \
    --database-flags=cloudsql.enable_postgis=on \
    --root-password=STRONG_PASSWORD_HERE

# Create database
gcloud sql databases create alameda_sidewalk --instance=sidewalk-db

# Create user
gcloud sql users create app-user \
    --instance=sidewalk-db \
    --password=STRONG_USER_PASSWORD
```

Run the database setup with PostGIS:
```bash
# Connect to your database
gcloud sql connect sidewalk-db --user=postgres

# Then run the SQL setup scripts in order:
\i database-setup.sql
\i database-setup-postgis-migration.sql

# Verify PostGIS is enabled
SELECT PostGIS_version();

# Verify tables are created
\dt

# Check reference_sidewalks table
SELECT COUNT(*) FROM reference_sidewalks;
```

Import OpenStreetMap sidewalk data:
```bash
# Set the database URL
export DATABASE_URL="postgresql://app-user:STRONG_USER_PASSWORD@/alameda_sidewalk?host=/cloudsql/YOUR_PROJECT_ID:us-central1:sidewalk-db"

# Run the OSM import
npm run import-osm

# This will import 334+ sidewalk segments from OpenStreetMap
```

### 4. Set Up Cloud Storage

```bash
# Create bucket for file uploads
gsutil mb gs://alameda-sidewalk-uploads-YOUR_PROJECT_ID
gsutil uniformbucketlevelaccess set on gs://alameda-sidewalk-uploads-YOUR_PROJECT_ID

# Set public access for uploaded images (optional)
gsutil iam ch allUsers:objectViewer gs://alameda-sidewalk-uploads-YOUR_PROJECT_ID
```

### 5. Create Secrets

Use the included helper script for easy setup:

```bash
./setup-secrets.sh
```

Or create secrets manually:

```bash
# Core secrets
echo -n "your-super-secure-jwt-secret-32-chars" | gcloud secrets create jwt-secret --data-file=-
echo -n "your-postgres-password" | gcloud secrets create postgres-password --data-file=-
echo -n "$(openssl rand -base64 32)" | gcloud secrets create auth-secret --data-file=-

# OAuth secrets (required for Auth.js)
echo -n "your-google-client-id" | gcloud secrets create google-oauth-client-id --data-file=-
echo -n "your-google-client-secret" | gcloud secrets create google-oauth-client-secret --data-file=-
echo -n "your-github-client-id" | gcloud secrets create github-oauth-client-id --data-file=-
echo -n "your-github-client-secret" | gcloud secrets create github-oauth-client-secret --data-file=-

# Grant Cloud Run access to secrets
PROJECT_ID=$(gcloud config get-value project)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$PROJECT_ID-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

**Setting up OAuth credentials:**

1. **Google OAuth**: https://console.cloud.google.com/apis/credentials
   - Create OAuth 2.0 Client ID
   - Add authorized redirect: `https://your-domain.run.app/api/auth/callback/google`

2. **GitHub OAuth**: https://github.com/settings/developers
   - Create new OAuth App
   - Add callback URL: `https://your-domain.run.app/api/auth/callback/github`

### 6. Build and Deploy

Use Cloud Build (recommended):

```bash
gcloud builds submit --config=cloudbuild.yaml
```

Or use the deployment script:

```bash
./deploy.sh YOUR_PROJECT_ID us-central1
```

Or deploy manually:

```bash
# Build the Docker image
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/alameda-sidewalk-map

# Deploy to Cloud Run
PROJECT_ID=$(gcloud config get-value project)
gcloud run deploy alameda-sidewalk-map \
    --image gcr.io/$PROJECT_ID/alameda-sidewalk-map \
    --region=us-central1 \
    --platform=managed \
    --allow-unauthenticated \
    --port=3000 \
    --memory=1Gi \
    --cpu=1 \
    --max-instances=10 \
    --add-cloudsql-instances=$PROJECT_ID:us-central1:sidewalk-db \
    --set-env-vars=NODE_ENV=production,ENABLE_REGISTRATION=true,ENABLE_FILE_UPLOADS=true,MAX_FILE_SIZE_MB=10,PGHOST=/cloudsql/$PROJECT_ID:us-central1:sidewalk-db,PGDATABASE=postgres,PGUSER=postgres,GCS_BUCKET_NAME=alameda-sidewalk-uploads-$PROJECT_ID,GCS_PROJECT_ID=$PROJECT_ID \
    --set-secrets=JWT_SECRET=jwt-secret:latest,PGPASSWORD=postgres-password:latest,AUTH_SECRET=auth-secret:latest,GOOGLE_CLIENT_ID=google-oauth-client-id:latest,GOOGLE_CLIENT_SECRET=google-oauth-client-secret:latest,GITHUB_CLIENT_ID=github-oauth-client-id:latest,GITHUB_CLIENT_SECRET=github-oauth-client-secret:latest
```

## 🔧 Configuration

### Environment Variables

Set these in Cloud Run:

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `GCS_BUCKET_NAME` | Storage bucket | `alameda-sidewalk-uploads-proj` |
| `GCS_PROJECT_ID` | Project ID | `alameda-sidewalk-map-prod` |

### Secrets

Store sensitive data in Secret Manager:

| Secret | Description | Required |
|--------|-------------|----------|
| `jwt-secret` | JWT signing key | Yes |
| `postgres-password` | PostgreSQL password | Yes |
| `auth-secret` | NextAuth.js secret | Yes |
| `google-oauth-client-id` | Google OAuth client ID | Yes |
| `google-oauth-client-secret` | Google OAuth secret | Yes |
| `github-oauth-client-id` | GitHub OAuth client ID | Yes |
| `github-oauth-client-secret` | GitHub OAuth secret | Yes |
| `google-maps-api-key` | Google Maps API key | Optional |
| Email-related secrets | SendGrid/Gmail/SMTP | Optional |

### Database Migration

The app uses PostgreSQL with PostGIS for geospatial features:

1. **PostgreSQL with PostGIS**: Production database uses `pg` client with PostGIS extension
2. **Dual database support**: Smart database abstraction supports both PostgreSQL (production) and SQLite (development)
3. **PostGIS features**:
   - Geometry columns with GIST spatial indexes
   - Reference sidewalk data from OpenStreetMap
   - Coordinate snapping with sub-meter accuracy
   - Auto-sync trigger between JSONB coordinates and PostGIS geometry
4. **OSM data import**: `npm run import-osm` to populate reference_sidewalks table

## 🔄 Updates & CI/CD

### Manual Updates
```bash
# Rebuild and redeploy
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/alameda-sidewalk-map
gcloud run deploy alameda-sidewalk-map --image gcr.io/YOUR_PROJECT_ID/alameda-sidewalk-map --region=us-central1
```

### Automatic CI/CD with GitHub Actions

The app includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) for automatic deployment on push to main.

#### Setup GitHub Secrets:

Go to your GitHub repository → Settings → Secrets → Actions and add:

1. **`GCP_PROJECT_ID`**: Your Google Cloud project ID
2. **`GCP_SA_KEY`**: Service account JSON key (create with commands below)
3. **`CLOUD_SQL_INSTANCE`**: Format: `PROJECT_ID:us-central1:sidewalk-db`
4. **`GCS_BUCKET_NAME`**: Your Cloud Storage bucket name

#### Create Service Account for GitHub Actions:

```bash
PROJECT_ID=$(gcloud config get-value project)

# Create service account
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions"

# Grant necessary permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Create and download key
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions@$PROJECT_ID.iam.gserviceaccount.com

# Copy contents of github-actions-key.json and paste as GCP_SA_KEY secret
cat github-actions-key.json

# Delete the local key file after copying
rm github-actions-key.json
```

### Alternative: Cloud Build Triggers

Or use Cloud Build triggers directly:

```bash
# Connect to GitHub repo
gcloud builds triggers create github \
    --repo-name=alameda_sidewalk_history \
    --repo-owner=YOUR_GITHUB_USERNAME \
    --branch-pattern="^main$" \
    --build-config=cloudbuild.yaml
```

## 🔐 Security Considerations

1. **Update default admin password** in database
2. **Restrict IAM permissions** to minimum required
3. **Enable Cloud Armor** for DDoS protection
4. **Set up monitoring** and alerting
5. **Regular security updates** for dependencies

## 💰 Cost Optimization

- **Cloud Run**: Pay per request, scales to zero
- **Cloud SQL**: Use smallest tier initially (db-f1-micro)
- **Cloud Storage**: Lifecycle policies for old uploads
- **Enable autoscaling**: Set min-instances=0 for cost savings

## 📊 Monitoring

Set up monitoring:

```bash
# Enable Cloud Logging
gcloud logging sinks create app-logs \
    bigquery.googleapis.com/projects/YOUR_PROJECT_ID/datasets/app_logs

# Enable error reporting
gcloud error-reporting events report ...
```

## 🚨 Troubleshooting

### Common Issues

1. **Database connection failed**: Check Cloud SQL connection and secrets
2. **File upload errors**: Verify Cloud Storage permissions
3. **Memory errors**: Increase Cloud Run memory allocation
4. **Timeout errors**: Check database query performance

### Debug Commands

```bash
# View logs
gcloud run services logs read alameda-sidewalk-map --region=us-central1

# Check service status
gcloud run services describe alameda-sidewalk-map --region=us-central1

# Test database connection
gcloud sql connect sidewalk-db --user=app-user
```

## 🎯 Next Steps

After deployment:

1. **Set up custom domain** (optional)
2. **Configure CDN** for static assets
3. **Set up backup strategy** for database
4. **Implement monitoring** and alerting
5. **Load test** the application

## 📞 Support

If you encounter issues:
1. Check Cloud Run logs
2. Verify all secrets are set correctly
3. Test database connectivity
4. Ensure all APIs are enabled