# Alameda Sidewalk Map - Deployment Guide

## 🚀 Quick Start

Your app is now ready for Google Cloud deployment! Here's what's been prepared:

### Files Created
- `Dockerfile` - Container configuration
- `cloudbuild.yaml` - Google Cloud Build configuration  
- `database-setup.sql` - PostgreSQL schema
- `deploy.sh` - Deployment script
- `DEPLOYMENT.md` - Detailed deployment instructions
- `.env.production.example` - Production environment template
- `.env.local.example` - Development environment template
- `.github/workflows/deploy.yml` - CI/CD pipeline

### Database Configuration
- **Development**: Uses SQLite (existing setup)
- **Production**: Automatically switches to PostgreSQL
- Database adapter in `src/lib/database.ts` handles the switching

### File Storage
- **Development**: Local file storage in `public/uploads/`
- **Production**: Google Cloud Storage
- Storage service in `src/lib/storage.ts` handles the switching

## 📦 Dependencies Added
- `pg` - PostgreSQL client
- `@types/pg` - TypeScript types for PostgreSQL
- `@google-cloud/storage` - Google Cloud Storage client

## 🔧 Next Steps

### 1. Set Up Google Cloud Project
```bash
# Run the deployment script
./deploy.sh YOUR_PROJECT_ID us-central1
```

### 2. Configure Environment Variables
Copy `.env.production.example` and set up your production secrets in Google Cloud Secret Manager.

### 3. Set Up Database
1. Create Cloud SQL PostgreSQL instance
2. Run `database-setup.sql` to create tables
3. Configure DATABASE_URL secret

### 4. Set Up File Storage
1. Create Google Cloud Storage bucket
2. Configure GCS_BUCKET_NAME and GCS_PROJECT_ID

### 5. Enable CI/CD (Optional)
Set up GitHub Actions with these secrets:
- `GCP_PROJECT_ID`
- `GCP_SA_KEY` 
- `GCS_BUCKET_NAME`
- `CLOUD_SQL_INSTANCE`

## 🏗️ Architecture

The app now supports dual environments:

```
Development:
├── SQLite database (existing)
├── Local file storage
└── Next.js dev server

Production:
├── PostgreSQL on Cloud SQL
├── Google Cloud Storage
└── Next.js on Cloud Run
```

## 🔄 Database Migration

The existing SQLite data can be migrated to PostgreSQL:

1. Export data from SQLite
2. Transform to PostgreSQL format
3. Import to Cloud SQL instance

See `DEPLOYMENT.md` for detailed migration steps.

## ⚙️ Environment Variables

### Required for Production
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing key
- `GCS_BUCKET_NAME` - Cloud Storage bucket
- `GCS_PROJECT_ID` - Google Cloud project ID

### Optional
- `SMTP_*` - Email configuration
- `ENABLE_*` - Feature flags

All sensitive values should be stored in Google Cloud Secret Manager.

## 🚨 Important Notes

1. **No Breaking Changes**: Your existing development setup continues to work unchanged
2. **Automatic Switching**: Database and storage automatically detect environment
3. **Type Safety**: Full TypeScript support maintained across both environments
4. **Testing**: All existing tests should continue to pass

## 📞 Support

For deployment issues:
1. Check Cloud Run logs: `gcloud run services logs read alameda-sidewalk-map --region=us-central1`
2. Verify secrets are set correctly in Secret Manager
3. Ensure all required APIs are enabled
4. Test database connectivity

The deployment is production-ready and follows Google Cloud best practices!