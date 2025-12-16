# Alameda Sidewalk Map

A comprehensive web application for documenting and exploring the historical sidewalk contractors and installation years throughout Alameda, CA. This project allows users to create a wiki-like record of contractor stamps, installation years, and special markings found in sidewalks across the city.

## Features

### Public Map Interface
- **Interactive Map**: Full-screen map of Alameda showing all documented sidewalk segments
- **Color-coded Visualization**: Segments are color-coded by decade for easy visual identification
- **Filtering System**: Filter segments by contractor, year, decade, or street
- **Detailed Information**: Click on any segment to view contractor details, year, photos, and notes
- **Search Functionality**: Search for specific contractors or locations
- **User Authentication**: Secure registration and login system

### Geospatial Features (PostGIS)
- **Reference Sidewalk Database**: Pre-loaded database of 334+ actual sidewalk segments from OpenStreetMap
- **Smart Coordinate Snapping**: Automatically snaps user-drawn segments to nearby reference sidewalks (within 50m)
- **High Precision**: PostGIS-powered spatial queries with sub-meter accuracy (0.33m average)
- **Spatial Indexing**: GIST spatial indexes for fast geographic queries
- **Admin Reference Management**: Admin interface to view, edit, and manage reference sidewalk data

### Wiki-Style Contributions
- **User Registration**: Anyone can create an account to contribute
- **Community Contributions**: Logged-in users can add segments and upload photos
- **Contribution Modal**: User-friendly interface for adding new data
- **Photo Uploads**: Upload contractor stamps, special markings, and general photos
- **Role-Based Access**: Admin and user roles with appropriate permissions

### Admin Interface
- **Full Data Management**: Complete CRUD operations for segments and photos
- **User Management**: Admin oversight of user contributions
- **Advanced Analytics**: Detailed statistics and contributor insights
- **Moderation Tools**: Review and manage community contributions

### Authentication & Security
- **JWT Authentication**: Secure token-based authentication
- **Password Security**: BCrypt hashing with strong password requirements
- **Role-Based Access Control**: Admin and user permission levels
- **Protected Routes**: Middleware-protected admin and API endpoints
- **Session Management**: Persistent login with secure cookie storage

### Testing & Quality
- **Comprehensive Test Suite**: 85%+ code coverage with Jest and React Testing Library
- **Unit Tests**: Components, utilities, and API endpoints
- **Integration Tests**: Authentication flows and user interactions
- **CI/CD Pipeline**: Automated testing and deployment with GitHub Actions
- **Coverage Reporting**: Detailed test coverage metrics and reporting

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Docker and Docker Compose (for PostgreSQL + PostGIS)
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd alameda-sidewalk-map
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your configuration
   ```

4. Start the PostgreSQL + PostGIS database:
   ```bash
   npm run db:start
   ```

5. Import OpenStreetMap sidewalk data (optional but recommended):
   ```bash
   DATABASE_URL="postgresql://postgres:postgres@localhost:5433/sidewalks_dev" npm run import-osm
   ```

6. Start the development server:
   ```bash
   DATABASE_URL="postgresql://postgres:postgres@localhost:5433/sidewalks_dev" npm run dev
   ```

7. Open your browser and navigate to:
   - Main map: http://localhost:3000 (or http://localhost:3001 if port 3000 is in use)
   - Admin interface: http://localhost:3000/admin
   - Reference sidewalks admin: http://localhost:3000/admin/reference-sidewalks

### Usage

#### Adding Sidewalk Segments
1. Visit the admin interface at `/admin`
2. Click "Add Segment" to create a new sidewalk segment
3. Fill in the required information:
   - Contractor name
   - Installation year
   - Street name and block
   - Coordinates (latitude/longitude pairs)
   - Optional notes and special markings

#### Uploading Photos
1. Select a sidewalk segment from the admin interface
2. In the photo upload section, drag and drop images or click to browse
3. Add captions and specify photo types:
   - **Contractor Stamp**: Photos of the contractor's name/year stamp
   - **Special Mark**: Photos of special markings like pipe indicators
   - **General**: Other relevant sidewalk photos

#### Filtering and Exploring
1. Use the main map interface to explore documented segments
2. Apply filters in the sidebar to focus on specific contractors, years, or streets
3. Click on segments to view detailed information and photos

#### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with detailed coverage report
npm run test:coverage-report

# Run tests for CI (no watch mode)
npm run test:ci
```

## Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Mapping**: Leaflet with React-Leaflet
- **Styling**: Tailwind CSS
- **Database**:
  - **Production**: PostgreSQL 15 with PostGIS 3.4 (geospatial extension)
  - **Development**: PostgreSQL + PostGIS via Docker Compose
  - **Legacy Support**: SQLite with better-sqlite3 (development only)
- **Geospatial**: PostGIS for spatial queries, coordinate snapping, and geographic indexing
- **Data Sources**: OpenStreetMap via Overpass API for reference sidewalk data
- **File Upload**: Multer for photo handling, Google Cloud Storage for production
- **Icons**: Lucide React

## Project Structure

```
src/
├── app/                           # Next.js app directory
│   ├── api/                      # API routes
│   │   ├── segments/             # Sidewalk segment endpoints
│   │   ├── contractors/          # Contractor data endpoints
│   │   ├── photos/               # Photo upload endpoints
│   │   ├── snap/                 # PostGIS coordinate snapping API
│   │   ├── reference-sidewalks/  # Reference sidewalk GeoJSON API
│   │   └── admin/                # Admin-only endpoints
│   │       └── import-osm/       # OSM import trigger
│   ├── admin/                    # Admin interface
│   │   └── reference-sidewalks/  # Reference sidewalk management UI
│   └── globals.css               # Global styles
├── components/                   # Reusable React components
│   ├── Map.tsx                  # Interactive map component
│   ├── Sidebar.tsx              # Filter and information sidebar
│   ├── SegmentForm.tsx          # Add/edit segment form
│   ├── PhotoUpload.tsx          # Photo upload component
│   └── InteractiveSegmentDrawer.tsx # Drawing tool with snapping
├── lib/                         # Utility libraries
│   ├── database.ts              # Database abstraction layer
│   ├── database-postgres.ts     # PostgreSQL + PostGIS implementation
│   ├── database-sqlite-async.ts # SQLite async wrapper (dev only)
│   └── storage.ts               # File storage abstraction
├── types/                       # TypeScript type definitions
│   └── sidewalk.ts              # Data model types
└── scripts/                     # Utility scripts
    └── import-osm-sidewalks.js  # OSM data import script
```

## Data Model

### SidewalkSegment
- **id**: Unique identifier (UUID)
- **coordinates**: Array of latitude/longitude pairs defining the segment (JSONB)
- **geometry**: PostGIS LineString geometry (auto-synced from coordinates)
- **contractor**: Name of the contractor who installed the sidewalk
- **year**: Year of installation
- **street**: Street name
- **block**: Block identifier
- **notes**: Optional descriptive notes
- **specialMarks**: Array of special markings (e.g., "P" for pipes)
- **photos**: Associated photos
- **status**: Approval status (pending, approved, rejected)
- **createdBy**: User who created the segment
- **approvedBy**: Admin who approved the segment

### ReferenceSidewalk (PostGIS)
- **id**: Unique identifier (UUID)
- **osm_id**: OpenStreetMap way ID
- **osm_type**: OSM element type (way)
- **geometry**: PostGIS LineString geometry (SRID 4326)
- **street**: Street name (if available from OSM)
- **surface**: Surface type (e.g., asphalt, concrete)
- **width**: Sidewalk width in meters (if available)
- **tags**: JSONB of all OSM tags
- **imported_at**: Timestamp of OSM import
- **last_updated**: Last modification timestamp
- **status**: Active status (active, deleted, modified)

### Photo
- **id**: Unique identifier (UUID)
- **filename**: Stored filename
- **originalName**: User's original filename
- **caption**: Optional description
- **type**: Category (contractor_stamp, special_mark, general)
- **coordinates**: Optional specific location within segment
- **uploadedBy**: User who uploaded the photo
- **mimetype**: File MIME type
- **size**: File size in bytes
- **storageUrl**: Cloud storage URL or local path

## Contributing

1. Document new sidewalk segments with accurate coordinates
2. Upload high-quality photos of contractor stamps
3. Add detailed notes about special markings or historical context
4. Verify contractor names and installation years when possible

## Development

### Database Schema
The PostgreSQL database automatically initializes with tables for:
- `sidewalk_segments`: Main segment data with PostGIS geometry
- `reference_sidewalks`: Reference sidewalk data from OpenStreetMap
- `photos`: Photo metadata and relationships
- `users`: User authentication and profiles
- PostGIS extensions and spatial indexes

### Database Management
```bash
# Start PostgreSQL + PostGIS
npm run db:start

# Stop database
npm run db:stop

# View database logs
npm run db:logs

# Import/update OSM sidewalk data
npm run import-osm

# Reset database (WARNING: deletes all data)
npm run db:reset
```

### API Endpoints

**Segments:**
- `GET/POST /api/segments` - List and create segments
- `GET/PUT/DELETE /api/segments/[id]` - Individual segment operations

**Geospatial:**
- `POST /api/snap` - Snap coordinates to nearest reference sidewalk
- `GET /api/reference-sidewalks` - Get reference sidewalks as GeoJSON
- `POST /api/admin/import-osm` - Trigger OSM data import (admin only)

**Other:**
- `GET /api/contractors` - Contractor list with statistics
- `POST /api/photos` - Photo upload
- `DELETE /api/photos/[id]` - Photo removal
- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration

### Building for Production
```bash
npm run build
npm start
```

## License

This project is designed for historical documentation and community use in Alameda, CA.
>>>>>>> ad57703 (First commit)
