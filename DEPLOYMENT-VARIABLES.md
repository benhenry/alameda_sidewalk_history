# Environment Variables Deployment Guide

## 🔐 Required Secrets in Google Secret Manager

Before deploying, create these secrets in [Google Cloud Secret Manager](https://console.cloud.google.com/security/secret-manager):

### 1. JWT Secret
```
Secret ID: jwt-secret
Secret Value: [64-character random string - generate with: openssl rand -hex 32]
```

### 2. Database Password
```
Secret ID: postgres-password
Secret Value: [Your PostgreSQL password]
```

### 3. Google Maps API Key
```
Secret ID: google-maps-api-key  
Secret Value: [Your Google Maps API Key]
```

### 4. Email Service (Choose One Option)

#### Option A: SendGrid (Recommended - Easy Setup)
```
Secret ID: sendgrid-api-key
Secret Value: [Your SendGrid API Key from https://app.sendgrid.com]
```

#### Option B: Gmail API (Free but Complex)
```
Secret ID: gmail-client-id
Secret Value: [OAuth2 Client ID from Google Cloud Console]

Secret ID: gmail-client-secret  
Secret Value: [OAuth2 Client Secret]

Secret ID: gmail-refresh-token
Secret Value: [OAuth2 Refresh Token from OAuth Playground]
```

#### Option C: Generic SMTP
```
Secret ID: smtp-host
Secret Value: [SMTP server hostname]

Secret ID: smtp-user
Secret Value: [SMTP username]

Secret ID: smtp-password
Secret Value: [SMTP password]
```

## 🌍 Environment Variables (Included in cloudbuild.yaml)

These are automatically set during deployment:

**Application Settings:**
- `NODE_ENV=production`
- `ENABLE_REGISTRATION=true`
- `ENABLE_FILE_UPLOADS=true`
- `MAX_FILE_SIZE_MB=10`
- `RATE_LIMIT_WINDOW_MS=900000`
- `RATE_LIMIT_MAX_REQUESTS=100`
- `AUTH_RATE_LIMIT_MAX=5`
- `UPLOAD_RATE_LIMIT_MAX=10`
- `ENABLE_SECURITY_HEADERS=true`
- `ENABLE_CORS=false`
- `ENABLE_REQUEST_LOGGING=true`
- `LOG_LEVEL=info`
- `NEXT_PUBLIC_APP_URL=[Auto-generated based on project]`

**Database Connection (automatically configured):**
- `PGHOST=/cloudsql/PROJECT_ID:us-central1:sidewalk-db` *(Cloud SQL socket path)*
- `PGDATABASE=postgres`
- `PGUSER=postgres`
- `PGPASSWORD=[From postgres-password secret]`

> **Note:** The database assumes your Cloud SQL instance is named `sidewalk-db` in the `us-central1` region. If you use different names, update the `PGHOST` value in `cloudbuild.yaml`.

## 🚀 Deployment Process

1. **Create the required secrets** (see above)
2. **Push to main branch** - GitHub trigger will automatically deploy
3. **Variables persist** across deployments

## ⚙️ Customizing the App URL

If you want to use a custom domain, update the Cloud Build trigger substitutions:

1. Go to [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers)
2. Edit your GitHub trigger  
3. Add substitution variable:
   ```
   _APP_URL = https://your-custom-domain.com
   ```

## 🔧 Adding More Variables

To add more environment variables, edit `cloudbuild.yaml`:

```yaml
'--set-env-vars', 'NODE_ENV=production,YOUR_NEW_VAR=value'
'--set-secrets', 'SECRET_NAME=secret-id:latest'
```

## ✅ Verification

After deployment, check [Cloud Run Console](https://console.cloud.google.com/run) > your service > "Variables & Secrets" tab to verify all variables are set.