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

### 3. Set Up Cloud SQL Database

```bash
# Create PostgreSQL instance
gcloud sql instances create sidewalk-db \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=us-central1 \
    --root-password=STRONG_PASSWORD_HERE

# Create database
gcloud sql databases create alameda_sidewalk --instance=sidewalk-db

# Create user
gcloud sql users create app-user \
    --instance=sidewalk-db \
    --password=STRONG_USER_PASSWORD
```

Run the database setup:
```bash
# Connect to your database and run database-setup.sql
gcloud sql connect sidewalk-db --user=postgres
# Then run the contents of database-setup.sql
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

```bash
# Create JWT secret
echo -n "your-super-secure-jwt-secret-32-chars" | gcloud secrets create jwt-secret --data-file=-

# Create database URL secret
DB_URL="postgresql://app-user:STRONG_USER_PASSWORD@/alameda_sidewalk?host=/cloudsql/YOUR_PROJECT_ID:us-central1:sidewalk-db"
echo -n "$DB_URL" | gcloud secrets create database-url --data-file=-
```

### 6. Build and Deploy

```bash
# Build the Docker image
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/alameda-sidewalk-map

# Deploy to Cloud Run
gcloud run deploy alameda-sidewalk-map \
    --image gcr.io/YOUR_PROJECT_ID/alameda-sidewalk-map \
    --region=us-central1 \
    --platform=managed \
    --allow-unauthenticated \
    --port=3000 \
    --memory=1Gi \
    --cpu=1 \
    --max-instances=10 \
    --add-cloudsql-instances=YOUR_PROJECT_ID:us-central1:sidewalk-db \
    --set-env-vars=NODE_ENV=production,GCS_BUCKET_NAME=alameda-sidewalk-uploads-YOUR_PROJECT_ID,GCS_PROJECT_ID=YOUR_PROJECT_ID \
    --set-secrets=JWT_SECRET=jwt-secret:latest,DATABASE_URL=database-url:latest
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

| Secret | Description |
|--------|-------------|
| `jwt-secret` | JWT signing key |
| `database-url` | PostgreSQL connection string |

### Database Migration

The app will need to be updated to use PostgreSQL instead of SQLite. Key changes needed:

1. **Replace better-sqlite3** with `pg` (PostgreSQL client)
2. **Update database.ts** to use PostgreSQL queries
3. **Migrate existing SQLite data** to PostgreSQL

## 🔄 Updates & CI/CD

### Manual Updates
```bash
# Rebuild and redeploy
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/alameda-sidewalk-map
gcloud run deploy alameda-sidewalk-map --image gcr.io/YOUR_PROJECT_ID/alameda-sidewalk-map --region=us-central1
```

### Automatic CI/CD
The included `cloudbuild.yaml` enables automatic deployment on code changes:

```bash
# Connect to GitHub repo
gcloud builds triggers create github \
    --repo-name=alameda_sidewalk_map \
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