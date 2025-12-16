# Getting Started with Alameda Sidewalk Map

This guide will help you set up the development environment for the Alameda Sidewalk Map project.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 18+** and npm
- **Docker Desktop** (for PostgreSQL + PostGIS)
- **Git**
- A code editor (VS Code recommended)

## Quick Start

Follow these steps to get the application running locally:

### 1. Clone the Repository

```bash
git clone <repository-url>
cd alameda-sidewalk-map
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including Next.js, React, TypeScript, and development dependencies.

### 3. Set Up Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your settings:

```bash
# Database Configuration
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/sidewalks_dev"

# JWT Configuration (generate a secure random string)
JWT_SECRET="your-super-secure-jwt-secret-at-least-32-characters-long"

# Application Configuration
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Features
ENABLE_REGISTRATION="true"
ENABLE_FILE_UPLOADS="true"
MAX_FILE_SIZE_MB="10"
```

### 4. Start the Database

Start the PostgreSQL + PostGIS database using Docker Compose:

```bash
npm run db:start
```

This will:
- Pull the PostGIS Docker image (first time only)
- Start PostgreSQL on port 5433
- Automatically run database initialization scripts
- Create all necessary tables and PostGIS extensions

**Verify the database is running:**

```bash
docker ps | grep alameda-sidewalk-db
```

You should see the container running.

### 5. Import Reference Sidewalk Data (Recommended)

Import actual sidewalk data from OpenStreetMap:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/sidewalks_dev" npm run import-osm
```

This will:
- Fetch sidewalk data from OpenStreetMap's Overpass API
- Import 334+ sidewalk segments for Alameda, CA
- Store data in the `reference_sidewalks` table
- Enable coordinate snapping features

**Expected output:**
```
📍 Fetching sidewalk data from Overpass API...
📦 Received 5000+ elements
🛣️  Processing 334 ways...
✅ Import complete!
   Imported: 334
   Updated: 0
   Errors: 0
```

### 6. Start the Development Server

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/sidewalks_dev" npm run dev
```

The application will start on:
- **Main app**: http://localhost:3000 (or :3001 if 3000 is in use)
- **Admin interface**: http://localhost:3000/admin
- **Reference sidewalks**: http://localhost:3000/admin/reference-sidewalks

## Accessing the Application

### Public Interface

Visit http://localhost:3000 to see:
- Interactive map of Alameda with sidewalk segments
- Filters for contractors, years, and streets
- Ability to view segment details and photos

### Admin Interface

The admin interface requires authentication. To create an admin user:

1. Register a new account at http://localhost:3000
2. Manually update the user role in the database:

```bash
# Connect to the database
docker exec -it alameda-sidewalk-db psql -U postgres -d sidewalks_dev

# Update your user to admin (replace with your email)
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';

# Exit psql
\q
```

3. Log in again and access http://localhost:3000/admin

## Development Workflow

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (recommended during development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# View detailed coverage report
npm run test:coverage-report
open coverage/index.html
```

### Database Commands

```bash
# Start database
npm run db:start

# Stop database
npm run db:stop

# View database logs
docker logs -f alameda-sidewalk-db

# Connect to database directly
docker exec -it alameda-sidewalk-db psql -U postgres -d sidewalks_dev

# Reset database (WARNING: deletes all data)
docker-compose down -v
npm run db:start
```

### Type Checking

```bash
# Run TypeScript type checking
npm run typecheck
```

### Linting

```bash
# Run ESLint
npm run lint
```

### Building for Production

```bash
# Create production build
npm run build

# Run production server
npm start
```

## Understanding the Architecture

### Database Architecture

The application uses a dual-database approach:

- **Development**: PostgreSQL with PostGIS via Docker
- **Production**: Cloud SQL PostgreSQL with PostGIS
- **Abstraction Layer**: `src/lib/database.ts` automatically switches between implementations

Key database tables:
- `sidewalk_segments`: User-contributed sidewalk data
- `reference_sidewalks`: OpenStreetMap reference data for snapping
- `users`: User authentication and profiles
- `photos`: Photo uploads and metadata

### PostGIS Features

The application uses PostGIS for geospatial features:

1. **Coordinate Snapping**: When users draw segments, coordinates automatically snap to nearby reference sidewalks
2. **Spatial Queries**: Fast geographic queries using GIST spatial indexes
3. **Geometry Storage**: Dual storage (JSONB + PostGIS geometry) for compatibility
4. **Auto-sync**: Database trigger keeps JSONB and geometry columns in sync

### API Endpoints

Key API routes:
- `/api/segments` - CRUD operations for sidewalk segments
- `/api/snap` - PostGIS coordinate snapping
- `/api/reference-sidewalks` - GeoJSON reference data
- `/api/auth/*` - Authentication endpoints
- `/api/admin/*` - Admin-only operations

## Common Tasks

### Adding a New Sidewalk Segment

1. Log in to the application
2. Click "Contribute" in the top menu
3. Use the drawing tool to click points on the map
4. Coordinates will automatically snap to nearby reference sidewalks
5. Fill in contractor, year, street, and block information
6. Submit for review (admin approval required)

### Uploading Photos

1. Navigate to a segment in the admin interface
2. Use the photo upload section
3. Drag and drop or browse for images
4. Select photo type (contractor stamp, special mark, or general)
5. Add optional captions

### Managing Reference Sidewalks

1. Log in as admin
2. Visit http://localhost:3000/admin/reference-sidewalks
3. View the map of all reference sidewalks
4. Use "Import from OSM" to update data from OpenStreetMap
5. Reference data is shown in blue on the map

## Troubleshooting

### Port Already in Use

If port 5433 is already in use:

```bash
# Find what's using the port
lsof -i :5433

# Stop the existing PostgreSQL
docker stop alameda-sidewalk-db

# Or change the port in docker-compose.yml
```

### Database Connection Issues

```bash
# Check if database is running
docker ps | grep alameda-sidewalk-db

# View database logs
docker logs alameda-sidewalk-db

# Restart database
npm run db:stop
npm run db:start
```

### Import Errors

If OSM import fails:

```bash
# Check network connectivity
curl -I https://overpass-api.de/api/status

# Try importing again (safe to run multiple times)
npm run import-osm

# The import script handles duplicates automatically
```

### Module Not Found Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Build Errors

```bash
# Clear Next.js cache
rm -rf .next

# Rebuild
npm run build
```

## Next Steps

Now that you have the development environment set up:

1. **Explore the codebase**: Start with `src/app/page.tsx` for the main map
2. **Read the documentation**: Check `CLAUDE.md` for architectural details
3. **Run the tests**: Make sure everything works with `npm test`
4. **Try adding a feature**: Follow the contribution guidelines in `CONTRIBUTING.md`
5. **Join the community**: Help document Alameda's sidewalk history!

## Additional Resources

- [README.md](./README.md) - Project overview and features
- [CLAUDE.md](./CLAUDE.md) - Detailed architectural documentation
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment guide
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guidelines
- [SECURITY.md](./SECURITY.md) - Security best practices

## Getting Help

If you encounter issues:

1. Check this guide first
2. Review the error messages in the console
3. Check Docker logs for database issues
4. Look at existing issues in the GitHub repository
5. Create a new issue with detailed information

Happy coding! 🎉
