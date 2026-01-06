#!/bin/bash
set -e

# Setup script for Google Cloud Secret Manager
# This script creates all required secrets for the Alameda Sidewalk Map deployment

echo "🔐 Setting up Google Cloud Secret Manager secrets"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed. Please install it first:"
    echo "https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Get project ID
PROJECT_ID=$(gcloud config get-value project)
if [ -z "$PROJECT_ID" ]; then
    echo "❌ No GCP project set. Run 'gcloud init' first."
    exit 1
fi

echo "📦 Project: $PROJECT_ID"
echo ""

# Enable Secret Manager API
echo "🔧 Enabling Secret Manager API..."
gcloud services enable secretmanager.googleapis.com

echo ""
echo "Creating secrets..."
echo "You will be prompted to enter values for each secret."
echo "Press Ctrl+D after entering each value (or Ctrl+C to skip)."
echo ""

# Function to create or update a secret
create_secret() {
    local secret_name=$1
    local description=$2

    echo "---"
    echo "Secret: $secret_name"
    echo "Description: $description"

    # Check if secret already exists
    if gcloud secrets describe $secret_name --project=$PROJECT_ID &> /dev/null; then
        echo "⚠️  Secret '$secret_name' already exists."
        read -p "Update it? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "⏭️  Skipped $secret_name"
            return
        fi
    fi

    # Read secret value
    echo "Enter value for $secret_name (input will be hidden):"
    read -s secret_value

    if [ -z "$secret_value" ]; then
        echo "⚠️  Empty value, skipping $secret_name"
        return
    fi

    # Create or update secret
    if gcloud secrets describe $secret_name --project=$PROJECT_ID &> /dev/null; then
        echo -n "$secret_value" | gcloud secrets versions add $secret_name --data-file=-
        echo "✅ Updated $secret_name"
    else
        echo -n "$secret_value" | gcloud secrets create $secret_name --data-file=- --replication-policy="automatic"
        echo "✅ Created $secret_name"
    fi
}

# Core secrets
create_secret "jwt-secret" "JWT secret for session management (min 32 chars)"
create_secret "postgres-password" "PostgreSQL database password"
create_secret "auth-secret" "NextAuth.js secret (generate with: openssl rand -base64 32)"

# OAuth secrets
create_secret "google-oauth-client-id" "Google OAuth Client ID (from Google Cloud Console)"
create_secret "google-oauth-client-secret" "Google OAuth Client Secret"
create_secret "github-oauth-client-id" "GitHub OAuth Client ID (from GitHub Developer Settings)"
create_secret "github-oauth-client-secret" "GitHub OAuth Client Secret"

# Optional: Google Maps API (if needed)
echo ""
read -p "Do you need Google Maps API? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    create_secret "google-maps-api-key" "Google Maps API key"
fi

# Optional: Email configuration (if needed)
echo ""
echo "Email configuration (optional, for notifications):"
read -p "Configure email? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Choose email provider:"
    echo "1) SendGrid"
    echo "2) Gmail API"
    echo "3) Generic SMTP"
    read -p "Enter choice (1-3): " email_choice

    case $email_choice in
        1)
            create_secret "sendgrid-api-key" "SendGrid API key"
            ;;
        2)
            create_secret "gmail-client-id" "Gmail API Client ID"
            create_secret "gmail-client-secret" "Gmail API Client Secret"
            create_secret "gmail-refresh-token" "Gmail API Refresh Token"
            ;;
        3)
            create_secret "smtp-host" "SMTP server host"
            create_secret "smtp-user" "SMTP username"
            create_secret "smtp-password" "SMTP password"
            ;;
    esac
fi

echo ""
echo "✅ Secret setup complete!"
echo ""
echo "🔧 Next steps:"
echo "1. Grant Cloud Run access to secrets:"
echo "   gcloud projects add-iam-policy-binding $PROJECT_ID \\"
echo "     --member=\"serviceAccount:$PROJECT_ID-compute@developer.gserviceaccount.com\" \\"
echo "     --role=\"roles/secretmanager.secretAccessor\""
echo ""
echo "2. Deploy your application:"
echo "   ./deploy.sh $PROJECT_ID"
echo ""
echo "3. Or push to GitHub to trigger automatic deployment"
