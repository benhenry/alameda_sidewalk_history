#!/bin/bash

# Development server startup script for Alameda Sidewalk Map
# This ensures you're always running from the correct directory

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "🚀 Starting Alameda Sidewalk Map Development Server"
echo "📂 Working Directory: $SCRIPT_DIR"
echo ""

# Check if database is running
if ! docker ps | grep -q alameda-sidewalk-db; then
    echo "⚠️  PostgreSQL database is not running!"
    echo "   Starting database with: npm run db:start"
    npm run db:start
    echo "   Waiting for database to be ready..."
    sleep 5
fi

echo "✅ Database is running"
echo ""

# Set database URL and start dev server
export DATABASE_URL="postgresql://postgres:postgres@localhost:5433/sidewalks_dev"

echo "🌐 Starting Next.js development server..."
echo "   Database: $DATABASE_URL"
echo ""

npm run dev
