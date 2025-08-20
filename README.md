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

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to:
   - Main map: http://localhost:3000
   - Admin interface: http://localhost:3000/admin

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
- **Database**: SQLite with better-sqlite3
- **File Upload**: Multer for photo handling
- **Icons**: Lucide React

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── segments/      # Sidewalk segment endpoints
│   │   ├── contractors/   # Contractor data endpoints
│   │   └── photos/        # Photo upload endpoints
│   ├── admin/             # Admin interface
│   └── globals.css        # Global styles
├── components/            # Reusable React components
│   ├── Map.tsx           # Interactive map component
│   ├── Sidebar.tsx       # Filter and information sidebar
│   ├── SegmentForm.tsx   # Add/edit segment form
│   └── PhotoUpload.tsx   # Photo upload component
├── lib/                  # Utility libraries
│   └── database.ts       # SQLite database functions
└── types/                # TypeScript type definitions
    └── sidewalk.ts       # Data model types
```

## Data Model

### SidewalkSegment
- **id**: Unique identifier
- **coordinates**: Array of latitude/longitude pairs defining the segment
- **contractor**: Name of the contractor who installed the sidewalk
- **year**: Year of installation
- **street**: Street name
- **block**: Block identifier
- **notes**: Optional descriptive notes
- **specialMarks**: Array of special markings (e.g., "P" for pipes)
- **photos**: Associated photos

### Photo
- **id**: Unique identifier
- **filename**: Stored filename
- **caption**: Optional description
- **type**: Category (contractor_stamp, special_mark, general)
- **coordinates**: Optional specific location within segment

## Contributing

1. Document new sidewalk segments with accurate coordinates
2. Upload high-quality photos of contractor stamps
3. Add detailed notes about special markings or historical context
4. Verify contractor names and installation years when possible

## Development

### Database Schema
The SQLite database automatically initializes with tables for:
- `sidewalk_segments`: Main segment data
- `photos`: Photo metadata and relationships
- `contractors`: Contractor summary statistics

### API Endpoints
- `GET/POST /api/segments` - List and create segments
- `GET/PUT/DELETE /api/segments/[id]` - Individual segment operations  
- `GET /api/contractors` - Contractor list with statistics
- `POST /api/photos` - Photo upload
- `DELETE /api/photos/[id]` - Photo removal

### Building for Production
```bash
npm run build
npm start
```

## License

This project is designed for historical documentation and community use in Alameda, CA.
>>>>>>> ad57703 (First commit)
