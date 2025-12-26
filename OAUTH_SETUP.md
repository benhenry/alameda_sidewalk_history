# OAuth Setup Guide

This document explains how to set up Google and GitHub OAuth for the Alameda Sidewalk Map.

## Overview

The application uses [Auth.js v5](https://authjs.dev/) (formerly NextAuth) for authentication with:
- **Google OAuth** - Primary authentication method
- **GitHub OAuth** - Alternative for developer community

## Prerequisites

- Google Cloud Console account
- GitHub account
- Local development environment running on `http://localhost:3000`

---

## 1. Google OAuth Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a Project" → "New Project"
3. Name: "Alameda Sidewalk Map" (or your preferred name)
4. Click "Create"

### Step 2: Enable Google+ API

1. In the left sidebar, go to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click "Enable"

### Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Select "External" user type → Click "Create"
3. Fill in the required fields:
   - **App name**: Alameda Sidewalk Map
   - **User support email**: your-email@example.com
   - **Developer contact**: your-email@example.com
4. Click "Save and Continue"
5. **Scopes**: Click "Add or Remove Scopes"
   - Add: `userinfo.email`
   - Add: `userinfo.profile`
6. Click "Save and Continue"
7. **Test users** (for development):
   - Add your email address
   - Click "Save and Continue"

### Step 4: Create OAuth Client ID

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: "Web application"
4. Name: "Alameda Sidewalk Map - Development"
5. **Authorized JavaScript origins**:
   - Development: `http://localhost:3000`
   - Production: `https://yourdomain.com` (add later)
6. **Authorized redirect URIs**:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://yourdomain.com/api/auth/callback/google` (add later)
7. Click "Create"
8. **Copy the Client ID and Client Secret**

### Step 5: Add to Environment Variables

Add to your `.env.local` file:

```bash
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
```

---

## 2. GitHub OAuth Setup

### Step 1: Create OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "OAuth Apps" → "New OAuth App"
3. Fill in the form:
   - **Application name**: Alameda Sidewalk Map (Dev)
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
   - **Application description**: (optional) Community mapping project for Alameda sidewalks
4. Click "Register application"

### Step 2: Generate Client Secret

1. On the OAuth app page, click "Generate a new client secret"
2. **Copy the Client ID and Client Secret immediately** (secret is only shown once)

### Step 3: Add to Environment Variables

Add to your `.env.local` file:

```bash
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

---

## 3. Generate Auth Secret

Auth.js requires a secret for encrypting tokens and sessions.

### Generate the Secret

Run this command:

```bash
openssl rand -base64 32
```

### Add to Environment Variables

Add to your `.env.local` file:

```bash
AUTH_SECRET="your-generated-secret"
NEXTAUTH_URL="http://localhost:3000"
```

---

## 4. Complete `.env.local` File

Your final `.env.local` should look like this:

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/sidewalks_dev"

# Auth.js Configuration
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
AUTH_SECRET="your-auth-secret-at-least-32-characters-long"
NEXTAUTH_URL="http://localhost:3000"

# Application
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
ENABLE_REGISTRATION="true"
ENABLE_FILE_UPLOADS="true"
MAX_FILE_SIZE_MB="10"
```

---

## 5. Test the Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000`

3. Click "Sign In"

4. Try signing in with Google and GitHub

5. Check the browser console and server logs for any errors

---

## 6. Production Setup

When deploying to production, you'll need to:

### Google OAuth (Production)

1. Return to your Google OAuth Client ID settings
2. Add production URLs:
   - **Authorized JavaScript origins**: `https://yourdomain.com`
   - **Authorized redirect URIs**: `https://yourdomain.com/api/auth/callback/google`
3. Update OAuth consent screen to "In Production" status
4. Add production environment variables to Google Secret Manager or your hosting platform

### GitHub OAuth (Production)

1. Create a **separate** OAuth App for production:
   - **Homepage URL**: `https://yourdomain.com`
   - **Callback URL**: `https://yourdomain.com/api/auth/callback/github`
2. Generate new client ID and secret for production
3. Add to production environment variables

### Production Environment Variables

Add to your production environment (Google Cloud Run / Secret Manager):

```bash
GOOGLE_CLIENT_ID="production-google-client-id"
GOOGLE_CLIENT_SECRET="production-google-client-secret"
GITHUB_CLIENT_ID="production-github-client-id"
GITHUB_CLIENT_SECRET="production-github-client-secret"
AUTH_SECRET="production-auth-secret-different-from-dev"
NEXTAUTH_URL="https://yourdomain.com"
```

---

## 7. Migrating Existing Users

Existing users with email/password accounts will be automatically linked to their OAuth accounts when they sign in with the same email address.

The Auth.js adapter handles this automatically in the `signIn` callback:

```typescript
// In src/auth.ts
async signIn({ user, account }) {
  // Auto-link accounts by email if user exists
  if (!user.email) return false

  const existingUser = await checkForExistingUser(user.email)
  if (existingUser) {
    // Account will be linked automatically
    console.log(`Linking ${account?.provider} to existing user`)
  }
  return true
}
```

---

## Troubleshooting

### "Redirect URI mismatch" error

- Double-check that the redirect URIs in Google/GitHub match exactly
- Ensure there are no trailing slashes
- Development: `http://localhost:3000/api/auth/callback/google`
- Production: `https://yourdomain.com/api/auth/callback/google`

### "Invalid client" error

- Verify your Client ID and Secret are correct in `.env.local`
- Make sure there are no extra spaces or quotes
- Restart your dev server after changing environment variables

### Database connection errors

- Ensure PostgreSQL is running (`docker ps`)
- Verify the database has the Auth.js tables (`accounts`, `sessions`, `verification_tokens`)
- Run the migration if needed: `cat database-setup-authjs.sql | docker exec -i alameda-sidewalk-db psql -U postgres -d sidewalks_dev`

### Session not persisting

- Check that `AUTH_SECRET` is set and is at least 32 characters
- Verify cookies are being set (check browser DevTools → Application → Cookies)
- Ensure `NEXTAUTH_URL` matches your actual URL

---

## Security Best Practices

1. **Never commit secrets to git**
   - `.env.local` is in `.gitignore`
   - Use separate secrets for development and production

2. **Rotate secrets regularly**
   - Generate new `AUTH_SECRET` periodically
   - Rotate OAuth client secrets if compromised

3. **Use HTTPS in production**
   - OAuth requires HTTPS for production
   - Google Cloud Run provides this automatically

4. **Limit OAuth scopes**
   - Only request `userinfo.email` and `userinfo.profile`
   - Don't request unnecessary permissions

5. **Monitor authentication logs**
   - Check for suspicious sign-in attempts
   - Auth.js logs are in your application logs

---

## Resources

- [Auth.js Documentation](https://authjs.dev/)
- [Google OAuth Setup Guide](https://support.google.com/cloud/answer/6158849)
- [GitHub OAuth Apps](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Auth.js PostgreSQL Adapter](https://authjs.dev/reference/adapter/pg)

---

## Support

If you encounter issues:

1. Check the Auth.js documentation
2. Enable debug mode by setting `debug: true` in `src/auth.ts`
3. Check browser console and server logs
4. Verify all environment variables are set correctly
