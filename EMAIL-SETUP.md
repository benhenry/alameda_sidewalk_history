# Email Service Setup Guide

This guide explains how to set up email functionality for password reset and welcome emails in the Alameda Sidewalk Map application.

## ✅ Email Features

Once configured, the application will send:
- **Password Reset Emails**: Secure links for password recovery
- **Welcome Emails**: Greeting new users after registration
- **Test Emails**: Admin functionality to verify email service

## 🔧 Email Provider Options

Choose ONE of the following options based on your needs:

### Option A: SendGrid (Recommended for GCP)

**Pros**: Easy setup, reliable delivery, good free tier, perfect for Google Cloud
**Cons**: Requires account setup
**Cost**: Free tier includes 100 emails/day

#### Setup Steps:

1. **Create SendGrid Account**:
   - Go to https://app.sendgrid.com
   - Sign up for free account
   - Complete email verification

2. **Create API Key**:
   - Navigate to Settings → API Keys
   - Click "Create API Key"
   - Choose "Restricted Access"
   - Give it Mail Send permissions
   - Copy the generated API key

3. **Verify Sender Identity**:
   - Go to Settings → Sender Authentication
   - Add a sender email (e.g., `noreply@yourdomain.com`)
   - Complete domain/single sender verification

4. **Add to Google Cloud Secrets**:
   ```bash
   # Create secret in Google Secret Manager
   gcloud secrets create sendgrid-api-key --data="your-sendgrid-api-key"
   ```

5. **Update Environment**:
   ```bash
   # For local development (.env.local)
   SENDGRID_API_KEY=your-sendgrid-api-key
   SENDGRID_FROM_EMAIL=noreply@yourdomain.com
   ```

### Option B: Gmail API (Free but Complex)

**Pros**: Completely free, uses your existing Gmail account
**Cons**: Complex OAuth2 setup, Gmail sending limits
**Cost**: Free

#### Setup Steps:

1. **Google Cloud Console Setup**:
   - Go to https://console.cloud.google.com
   - Enable Gmail API for your project
   - Create OAuth2 credentials (Desktop Application)
   - Download credentials JSON

2. **OAuth Playground Setup**:
   - Go to https://developers.google.com/oauthplayground
   - Click gear icon, check "Use your own OAuth credentials"
   - Enter your Client ID and Client Secret
   - In "Select & Authorize APIs", add: `https://www.googleapis.com/auth/gmail.send`
   - Authorize and get refresh token

3. **Add to Google Cloud Secrets**:
   ```bash
   gcloud secrets create gmail-client-id --data="your-client-id"
   gcloud secrets create gmail-client-secret --data="your-client-secret"
   gcloud secrets create gmail-refresh-token --data="your-refresh-token"
   ```

4. **Update Environment**:
   ```bash
   # For local development (.env.local)
   GMAIL_CLIENT_ID=your-client-id
   GMAIL_CLIENT_SECRET=your-client-secret
   GMAIL_REFRESH_TOKEN=your-refresh-token
   GMAIL_FROM_EMAIL=your-email@gmail.com
   ```

### Option C: Generic SMTP

**Pros**: Works with any email provider (Microsoft 365, custom mail servers)
**Cons**: Provider-specific configuration, potentially less reliable
**Cost**: Varies by provider

#### Setup Steps:

1. **Get SMTP Details from Provider**:
   - **Microsoft 365**: smtp.office365.com:587
   - **Yahoo**: smtp.mail.yahoo.com:587
   - **Custom**: Check your hosting provider

2. **Add to Google Cloud Secrets**:
   ```bash
   gcloud secrets create smtp-host --data="smtp.yourdomain.com"
   gcloud secrets create smtp-user --data="your-username"
   gcloud secrets create smtp-password --data="your-password"
   ```

3. **Update Environment**:
   ```bash
   # For local development (.env.local)
   SMTP_HOST=smtp.yourdomain.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-username
   SMTP_PASSWORD=your-password
   SMTP_FROM_EMAIL=noreply@yourdomain.com
   ```

## 🚀 Deployment

After setting up your chosen email provider:

1. **Create Secrets**: Ensure all required secrets exist in Google Secret Manager
2. **Deploy**: Push changes to trigger automatic deployment
3. **Verify**: Check Cloud Run logs for email service initialization

## 🧪 Testing Email Service

Use the admin test endpoint to verify email is working:

```bash
# Test email endpoint (admin access required)
curl -X POST https://your-app-url.com/api/admin/test-email \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

Or use the admin interface to test email functionality.

## 🔍 Troubleshooting

### Common Issues:

1. **"No email provider configured"**:
   - Ensure at least one set of email environment variables is properly set
   - Check Google Secret Manager for missing secrets

2. **"Authentication failed"**:
   - **SendGrid**: Verify API key has Mail Send permissions
   - **Gmail**: Check OAuth2 setup and refresh token validity
   - **SMTP**: Verify username/password and server settings

3. **"Domain not verified"**:
   - **SendGrid**: Complete sender authentication process
   - **SMTP**: Ensure FROM email matches authenticated domain

4. **Emails not received**:
   - Check spam/junk folders
   - Verify recipient email address
   - Check Cloud Run logs for email sending errors

### Debug Commands:

```bash
# Check Cloud Run logs
gcloud logs read --service=alameda-sidewalk-map --limit=50

# Verify secrets exist
gcloud secrets list | grep -E "(sendgrid|gmail|smtp)"

# Test secret access
gcloud secrets versions access latest --secret=sendgrid-api-key
```

## 📈 Monitoring

Monitor email delivery through:
- **SendGrid**: Dashboard with delivery statistics
- **Gmail API**: Google Cloud Console API usage metrics  
- **SMTP**: Check your email provider's logs
- **Application**: Cloud Run logs show email sending attempts

## 🔒 Security Best Practices

1. **Use least-privilege secrets**: Only grant necessary permissions
2. **Rotate API keys regularly**: Update keys every 6-12 months
3. **Monitor usage**: Set up alerts for unusual email volumes
4. **Validate email addresses**: Prevent spam and abuse
5. **Rate limiting**: Built into the application to prevent email bombing

## 📚 Additional Resources

- [SendGrid Documentation](https://docs.sendgrid.com/)
- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Google Secret Manager Guide](https://cloud.google.com/secret-manager/docs)
- [OAuth2 Playground](https://developers.google.com/oauthplayground)