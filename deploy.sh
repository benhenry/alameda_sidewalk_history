#!/bin/bash

# Deployment script for Google Cloud Run
# Usage: ./deploy.sh [PROJECT_ID] [REGION]

set -e

# Default values
PROJECT_ID=${1:-"your-project-id"}
REGION=${2:-"us-central1"}
SERVICE_NAME="alameda-sidewalk-map"

echo "🚀 Deploying Alameda Sidewalk Map to Google Cloud Run"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Service: $SERVICE_NAME"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed. Please install it first:"
    echo "https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Set the project
echo "📋 Setting project..."
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable storage.googleapis.com

# Build and deploy
echo "🏗️  Building and deploying..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME

echo "🚢 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
    --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
    --region=$REGION \
    --platform=managed \
    --allow-unauthenticated \
    --port=3000 \
    --memory=1Gi \
    --cpu=1 \
    --max-instances=10 \
    --set-env-vars=NODE_ENV=production

echo "✅ Deployment complete!"
echo ""
echo "Your app is available at:"
gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)"

echo ""
echo "🔧 Next steps:"
echo "1. Set up Cloud SQL database"
echo "2. Configure environment variables and secrets"
echo "3. Set up Cloud Storage for file uploads"
echo "4. Configure custom domain (optional)"