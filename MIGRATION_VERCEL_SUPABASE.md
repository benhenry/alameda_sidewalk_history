# Migration Guide: GCP to Vercel + Supabase

This guide covers migrating from Google Cloud Platform (Cloud Run + Cloud SQL) to Vercel + Supabase.

## Cost Comparison

| Service | GCP Current | Vercel + Supabase |
|---------|-------------|-------------------|
| Hosting | ~$50/mo (Cloud Run) | Free - $20/mo |
| Database | ~$150/mo (Cloud SQL) | Free - $25/mo |
| Storage | ~$5/mo (Cloud Storage) | Included in Supabase |
| **Total** | **~$200/mo** | **$0 - $45/mo** |

## Prerequisites

- GitHub account (you have this)
- Vercel account (sign up at vercel.com with GitHub)
- Supabase account (sign up at supabase.com)

---

## Part 1: Supabase Setup

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose organization (or create one)
4. Set:
   - **Name**: `alameda-sidewalk-map`
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users (e.g., `West US`)
5. Click "Create new project" (takes ~2 minutes)

### 1.2 Enable PostGIS

1. In Supabase dashboard, go to **SQL Editor**
2. Run this query:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```

### 1.3 Get Connection String

1. Go to **Settings** → **Database**
2. Find "Connection string" section
3. Copy the **URI** (starts with `postgresql://`)
4. Replace `[YOUR-PASSWORD]` with your database password

Your connection string looks like:
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### 1.4 Run Database Migrations

Option A: Use Supabase SQL Editor
1. Open `database-setup.sql` from your project
2. Paste into Supabase SQL Editor
3. Run the script

Option B: Use psql locally
```bash
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" -f database-setup.sql
```

### 1.5 Migrate Existing Data (if any)

Export from Cloud SQL:
```bash
pg_dump -h [CLOUD_SQL_IP] -U postgres -d postgres --data-only > data_backup.sql
```

Import to Supabase:
```bash
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" -f data_backup.sql
```

---

## Part 2: Vercel Setup

### 2.1 Connect Repository

1. Go to [vercel.com](https://vercel.com) and sign up with GitHub
2. Click "Add New Project"
3. Import your `alameda_sidewalk_history` repository
4. Vercel auto-detects Next.js

### 2.2 Configure Environment Variables

In Vercel project settings → Environment Variables, add:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Supabase connection string |
| `AUTH_SECRET` | Generate with `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | `true` |
| `NEXTAUTH_URL` | `https://your-domain.com` (or Vercel URL) |
| `AUTH_GOOGLE_ID` | Your Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Your Google OAuth secret |
| `AUTH_GITHUB_ID` | Your GitHub OAuth client ID |
| `AUTH_GITHUB_SECRET` | Your GitHub OAuth secret |

### 2.3 Configure Build Settings

Vercel should auto-detect, but verify:
- **Framework**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

### 2.4 Deploy

Click "Deploy" - Vercel will build and deploy automatically.

---

## Part 3: Update OAuth Providers

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Edit your OAuth client
3. Add authorized redirect URI:
   ```
   https://your-vercel-domain.vercel.app/api/auth/callback/google
   ```

### GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Edit your OAuth app
3. Update callback URL:
   ```
   https://your-vercel-domain.vercel.app/api/auth/callback/github
   ```

---

## Part 4: File Storage Migration

Supabase includes file storage. To migrate from Google Cloud Storage:

### 4.1 Create Storage Bucket in Supabase

1. Go to **Storage** in Supabase dashboard
2. Create bucket: `photos`
3. Set to **Public** (for serving images)

### 4.2 Update Storage Code

The app currently uses `@google-cloud/storage`. You'll need to update `src/lib/storage.ts` to use Supabase storage instead:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function uploadFile(file: Buffer, filename: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('photos')
    .upload(filename, file)

  if (error) throw error

  const { data: urlData } = supabase.storage
    .from('photos')
    .getPublicUrl(filename)

  return urlData.publicUrl
}
```

Add to environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_KEY`: Service role key (Settings → API)

---

## Part 5: DNS & Domain (Optional)

If using a custom domain:

1. In Vercel: **Settings** → **Domains** → Add your domain
2. Update DNS records as Vercel instructs
3. Update `NEXTAUTH_URL` to your custom domain

---

## Part 6: Cleanup GCP Resources

After confirming everything works:

1. Delete Cloud Run service
2. Delete Cloud SQL instance
3. Delete Cloud Storage bucket (after migrating files)
4. Review and delete any remaining resources

---

## Troubleshooting

### "relation does not exist" errors
Run the database migrations again - PostGIS tables may not have been created.

### OAuth redirect errors
Ensure callback URLs are updated in both Google and GitHub OAuth settings.

### Connection timeout
Check that your Supabase project is in a region close to Vercel's deployment region.

### PostGIS functions not found
Run `CREATE EXTENSION postgis;` in Supabase SQL Editor.

---

## Checklist

- [ ] Supabase project created
- [ ] PostGIS extension enabled
- [ ] Database schema migrated
- [ ] Existing data migrated (if any)
- [ ] Vercel project connected to GitHub
- [ ] Environment variables configured
- [ ] OAuth redirect URLs updated
- [ ] File storage migrated (if using)
- [ ] Custom domain configured (if using)
- [ ] GCP resources cleaned up
