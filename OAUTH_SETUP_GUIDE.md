# OAuth Setup Guide - Development & Production

This guide walks you through setting up Google OAuth and GitHub OAuth for both local development and production deployment.

## Overview

Auth.js v5 requires OAuth credentials from both Google and GitHub. Each environment (dev/prod) needs its own set of credentials with different redirect URLs.

## Table of Contents

1. [Generate AUTH_SECRET](#1-generate-auth_secret)
2. [Google OAuth Setup](#2-google-oauth-setup)
3. [GitHub OAuth Setup](#3-github-oauth-setup)
4. [Configure Development Environment](#4-configure-development-environment)
5. [Configure Production Environment](#5-configure-production-environment)
6. [Testing OAuth Flow](#6-testing-oauth-flow)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Generate AUTH_SECRET

Auth.js needs a secret for signing session tokens.

### For Development & Production

Generate a secure random string:

```bash
openssl rand -base64 32
```

You'll use this value for both environments. Copy it for later.

Example output: `kX9vH2pQ8rN3mL5wT7uY1bC4dF6gJ0sA2eI9oP3qR8=`

---

## 2. Google OAuth Setup

### Step 1: Go to Google Cloud Console

1. Visit https://console.cloud.google.com
2. Select your project (or create a new one for the app)

### Step 2: Enable Google+ API

1. Go to **APIs & Services** → **Library**
2. Search for "Google+ API"
3. Click **Enable**

### Step 3: Create OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** (unless you have Google Workspace)
3. Click **Create**

Fill in the form:
- **App name**: `Alameda Sidewalk Map` (or your preferred name)
- **User support email**: Your email
- **Developer contact**: Your email
- **Authorized domains**: Leave empty for development
- Click **Save and Continue**

On "Scopes" screen:
- Click **Add or Remove Scopes**
- Select:
  - `userinfo.email`
  - `userinfo.profile`
- Click **Update** → **Save and Continue**

On "Test users" screen (for development):
- Click **Add Users**
- Add your email address and any other test users
- Click **Save and Continue**

### Step 4: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Select **Web application**

**For Development:**
- Name: `Alameda Sidewalk Map - Development`
- Authorized JavaScript origins:
  - `http://localhost:3000`
- Authorized redirect URIs:
  - `http://localhost:3000/api/auth/callback/google`
- Click **Create**
- **Copy** the Client ID and Client Secret

**For Production:**
- Click **Create Credentials** → **OAuth client ID** again
- Name: `Alameda Sidewalk Map - Production`
- Authorized JavaScript origins:
  - `https://your-domain.run.app` (your actual Cloud Run URL)
- Authorized redirect URIs:
  - `https://your-domain.run.app/api/auth/callback/google`
- Click **Create**
- **Copy** the Client ID and Client Secret

### Step 5: Publish Your App (When Ready for Production)

1. Go back to **OAuth consent screen**
2. Click **Publish App**
3. Confirm publishing

Note: Your app will be "In Production" but not verified. Users will see a warning screen. To remove the warning, you need to go through Google's verification process (optional, takes time).

---

## 3. GitHub OAuth Setup

### Step 1: Go to GitHub Developer Settings

1. Visit https://github.com/settings/developers
2. Click **OAuth Apps**

### Step 2: Create Development OAuth App

1. Click **New OAuth App**
2. Fill in the form:
   - **Application name**: `Alameda Sidewalk Map (Dev)`
   - **Homepage URL**: `http://localhost:3000`
   - **Application description**: `Development instance of Alameda Sidewalk Map`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
3. Click **Register application**
4. Click **Generate a new client secret**
5. **Copy** both the Client ID and Client Secret

### Step 3: Create Production OAuth App

1. Click **New OAuth App** again
2. Fill in the form:
   - **Application name**: `Alameda Sidewalk Map`
   - **Homepage URL**: `https://your-domain.run.app`
   - **Application description**: `Community-driven historical sidewalk map for Alameda, CA`
   - **Authorization callback URL**: `https://your-domain.run.app/api/auth/callback/github`
3. Click **Register application**
4. Click **Generate a new client secret**
5. **Copy** both the Client ID and Client Secret

---

## 4. Configure Development Environment

### Step 1: Create/Update `.env.local`

```bash
# Create from example if it doesn't exist
cp .env.local.example .env.local
```

### Step 2: Add OAuth Credentials

Edit `.env.local` and add/update these values:

```bash
# Database (development uses SQLite by default)
DATABASE_URL=./data/sidewalks.db

# Auth.js Secret (generated earlier)
AUTH_SECRET=kX9vH2pQ8rN3mL5wT7uY1bC4dF6gJ0sA2eI9oP3qR8=

# Google OAuth (Development credentials)
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123def456ghi789

# GitHub OAuth (Development credentials)
GITHUB_CLIENT_ID=Iv1.a1b2c3d4e5f6g7h8
GITHUB_CLIENT_SECRET=0123456789abcdef0123456789abcdef01234567

# Application URLs
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: JWT for legacy session management
JWT_SECRET=your-development-jwt-secret-at-least-32-chars
```

### Step 3: Test Development Setup

```bash
# Start the development server
npm run dev

# Open http://localhost:3000
# Click "Sign In" and try both Google and GitHub OAuth
```

---

## 5. Configure Production Environment

You have two options for production: Google Secret Manager (recommended) or environment variables.

### Option A: Google Secret Manager (Recommended)

This is already configured in your deployment files. Create these secrets:

```bash
# Make sure you're authenticated
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Create AUTH_SECRET
echo -n "kX9vH2pQ8rN3mL5wT7uY1bC4dF6gJ0sA2eI9oP3qR8=" | \
  gcloud secrets create auth-secret --data-file=-

# Create Google OAuth secrets (Production credentials)
echo -n "YOUR_PROD_GOOGLE_CLIENT_ID" | \
  gcloud secrets create google-oauth-client-id --data-file=-

echo -n "YOUR_PROD_GOOGLE_CLIENT_SECRET" | \
  gcloud secrets create google-oauth-client-secret --data-file=-

# Create GitHub OAuth secrets (Production credentials)
echo -n "YOUR_PROD_GITHUB_CLIENT_ID" | \
  gcloud secrets create github-oauth-client-id --data-file=-

echo -n "YOUR_PROD_GITHUB_CLIENT_SECRET" | \
  gcloud secrets create github-oauth-client-secret --data-file=-
```

### Option B: Use the Setup Script

Much easier - just run:

```bash
./setup-secrets.sh
```

This interactive script will prompt you for all secrets.

### Step 4: Grant Secret Access to Cloud Run

```bash
PROJECT_ID=$(gcloud config get-value project)

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$PROJECT_ID-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Step 5: Update OAuth Redirect URLs

⚠️ **Important**: After your first deployment, you'll get a Cloud Run URL like:
`https://alameda-sidewalk-map-abc123.a.run.app`

You need to update your OAuth app redirect URLs:

**Google:**
1. Go to https://console.cloud.google.com/apis/credentials
2. Click your production OAuth client
3. Update **Authorized redirect URIs** to:
   - `https://alameda-sidewalk-map-abc123.a.run.app/api/auth/callback/google`
4. Click **Save**

**GitHub:**
1. Go to https://github.com/settings/developers
2. Click your production OAuth app
3. Update **Authorization callback URL** to:
   - `https://alameda-sidewalk-map-abc123.a.run.app/api/auth/callback/github`
4. Click **Update application**

---

## 6. Testing OAuth Flow

### Development Testing

1. Start dev server: `npm run dev`
2. Go to http://localhost:3000
3. Click **Sign In** button
4. You should see Google and GitHub buttons
5. Click **Sign in with Google**:
   - Should redirect to Google
   - Sign in with your Google account
   - Should redirect back to your app
   - You should be signed in
6. Sign out and try **Sign in with GitHub**
7. Verify your profile shows in the user menu

### Production Testing

1. Deploy to Cloud Run (via GitHub push or manual deployment)
2. Get your Cloud Run URL from:
   - GitHub Actions output
   - Or: `gcloud run services list`
3. Visit your production URL
4. Click **Sign In**
5. Test both Google and GitHub OAuth
6. Verify you can sign in and see your profile

### What to Check

✅ OAuth button appears
✅ Clicking redirects to Google/GitHub
✅ After signing in, redirects back to your app
✅ User is logged in (see profile in user menu)
✅ Can navigate around while logged in
✅ Can sign out
✅ Session persists on page reload

---

## 7. Troubleshooting

### "redirect_uri_mismatch" Error

**Problem**: The redirect URL doesn't match what's configured in OAuth app.

**Solution**:
- Double-check the redirect URI in Google/GitHub OAuth settings
- Make sure it matches exactly (including `/api/auth/callback/google` or `/github`)
- No trailing slash
- Correct protocol (`http://` for dev, `https://` for prod)

### "Error 400: invalid_request" from Google

**Problem**: Missing or incorrect OAuth configuration.

**Solution**:
- Verify Google+ API is enabled
- Check OAuth consent screen is configured
- Make sure you added your email as a test user (for development)
- Verify the client ID and secret are correct

### "The redirect_uri MUST match the registered callback URL" from GitHub

**Problem**: GitHub OAuth callback URL mismatch.

**Solution**:
- Check GitHub OAuth app settings
- Verify callback URL is exact: `https://your-domain/api/auth/callback/github`
- No extra spaces or characters

### OAuth Works in Dev but Not Production

**Problem**: Using development credentials in production.

**Solution**:
- Create separate OAuth apps for production
- Use production credentials in Google Secret Manager
- Update redirect URLs to production domain

### "No AUTH_SECRET environment variable" Error

**Problem**: Missing AUTH_SECRET.

**Solution**:
- Development: Add `AUTH_SECRET` to `.env.local`
- Production: Create `auth-secret` in Google Secret Manager

### User Can Sign In But Session Doesn't Persist

**Problem**: Database connection issue or missing Auth.js tables.

**Solution**:
- Development: Check `data/sidewalks.db` exists
- Production: Verify Cloud SQL is running and accessible
- Run database migrations to create Auth.js tables:
  ```sql
  -- Check if these tables exist:
  SELECT * FROM accounts;
  SELECT * FROM sessions;
  SELECT * FROM users;
  SELECT * FROM verification_tokens;
  ```

### "Failed to fetch" or CORS Errors

**Problem**: Network/CORS issues.

**Solution**:
- Check that `NEXT_PUBLIC_APP_URL` matches your actual URL
- Verify your Cloud Run service is publicly accessible
- Check browser console for specific CORS errors

---

## Quick Reference

### Development URLs

- App: `http://localhost:3000`
- Google callback: `http://localhost:3000/api/auth/callback/google`
- GitHub callback: `http://localhost:3000/api/auth/callback/github`

### Production URLs (replace with your actual domain)

- App: `https://alameda-sidewalk-map-abc123.a.run.app`
- Google callback: `https://alameda-sidewalk-map-abc123.a.run.app/api/auth/callback/google`
- GitHub callback: `https://alameda-sidewalk-map-abc123.a.run.app/api/auth/callback/github`

### Environment Variables Summary

**Development (`.env.local`):**
```bash
AUTH_SECRET=<generated-secret>
GOOGLE_CLIENT_ID=<dev-google-client-id>
GOOGLE_CLIENT_SECRET=<dev-google-secret>
GITHUB_CLIENT_ID=<dev-github-client-id>
GITHUB_CLIENT_SECRET=<dev-github-secret>
DATABASE_URL=./data/sidewalks.db
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Production (Google Secret Manager):**
- `auth-secret`
- `google-oauth-client-id`
- `google-oauth-client-secret`
- `github-oauth-client-id`
- `github-oauth-client-secret`

---

## Next Steps

After OAuth is working:

1. ✅ Test user registration flow
2. ✅ Verify user roles work correctly
3. ✅ Test creating/editing sidewalk segments
4. ✅ Test photo uploads (requires Cloud Storage setup)
5. ✅ Set up admin users in database
6. ✅ Configure custom domain (optional)

---

## Support

If you encounter issues not covered here:

1. Check Auth.js documentation: https://authjs.dev/
2. Check application logs:
   - Development: Terminal output
   - Production: `gcloud run services logs read alameda-sidewalk-map`
3. Check browser console for JavaScript errors
4. Verify all secrets are set correctly
