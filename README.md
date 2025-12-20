# Tinkarr

Tinkarr is a universal Torznab API adapter that converts any website or API into a Torznab-compatible indexer for use with *arr applications (Sonarr, Radarr, Prowlarr, etc.).

## Overview

Tinkarr acts as a bridge between custom indexers and standardized Torznab consumers:

1. Accepts standardized Torznab API requests
2. Translates them into custom website/API calls
3. Parses HTML/API responses using CSS selectors
4. Returns standardized Torznab XML responses

This allows ANY custom indexer to work seamlessly with tools like Sonarr, Radarr, and Prowlarr.

## Features

### Core Functionality
- **Universal Adapter**: Convert any website into a Torznab indexer
- **CSS Selector Parsing**: Flexible HTML parsing with attribute extraction
- **Cloudflare Bypass**: Integrated Flaresolverr support
- **Multiple Search Types**: Support for general, TV, and movie searches
- **Category Mapping**: Automatic content categorization

### Advanced Features (Phase 5)
- **Favicon Fetching**: Automatic favicon download and storage
- **Response Caching**: Configurable caching for improved performance
- **Health Monitoring**: System and indexer health checks
- **Dead Indexer Detection**: Proactive identification of failing indexers
- **Import/Export**: Backup and restore indexer configurations
- **Cache Management**: Statistics and manual cache control

### Security & Performance
- **JWT Authentication**: Secure API access
- **API Key System**: Per-user Torznab access
- **Rate Limiting**: Configurable request throttling
- **Response Caching**: Reduce load and improve speed
- **Intelligent Fallback**: Direct HTTP → Flaresolverr fallback

## Technology Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: SQLite with Drizzle ORM
- **Web Scraping**: Cheerio, Axios
- **Cloudflare Bypass**: Flaresolverr integration
- **Authentication**: JWT + bcrypt

### Frontend
- **Framework**: React
- **UI Library**: Tailwind CSS
- **State Management**: React Query
- **Build Tool**: Vite

### Architecture
- **Unified Service**: Single codebase, single service, single port
- **Development**: Backend proxies to Vite dev server for HMR
- **Production**: Backend serves built frontend as static files
- **Deployment**: Single Docker container for both frontend and backend

## Project Status

- ✅ **Phase 1**: Core Infrastructure (Server, Database, Authentication, CRUD)
- ✅ **Phase 2**: Core Scraping Engine (HTTP Client, Flaresolverr, HTML Parsing)
- ✅ **Phase 3**: Torznab API Implementation (XML Generation, Search Handlers)
- ⏳ **Phase 4**: Frontend Development (React UI) - PENDING
- ✅ **Phase 5**: Advanced Features (Caching, Health Checks, Import/Export)
- ✅ **Phase 6**: Testing & Documentation - COMPLETE

**Current Status:** Production-ready backend with comprehensive testing and Docker deployment

## Quick Start

### Option 1: Docker (Recommended)

**Prerequisites:**
- Docker and Docker Compose

**Steps:**

1. **Clone the repository:**
```bash
git clone https://github.com/yourusername/tinkarr.git
cd tinkarr
```

2. **Configure environment:**
```bash
cp .env.docker.example .env
# Edit .env and change JWT_SECRET to a secure random string
```

3. **Start services:**
```bash
docker-compose up -d
```

4. **Check logs:**
```bash
docker-compose logs -f tinkarr
```

**The unified service (backend + frontend) will be available on `http://localhost:3000`**

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

### Option 2: Local Development

**Prerequisites:**
- Node.js 20+
- npm

#### Development Mode (Unified Service with Hot Reload)

The development server runs both frontend and backend on a single port (3000) with hot module replacement:

```bash
# Clone the repository
git clone https://github.com/yourusername/tinkarr.git
cd tinkarr

# Use the automated startup script
./start-local.sh
```

**Or manually:**

```bash
# Install all dependencies
npm run install:all

# Setup backend
cd backend
cp .env.example .env
# Edit .env and set JWT_SECRET
npm run migrate
npm run seed

# Start unified service (from root or backend directory)
npm run dev
```

**Access:**
- Unified Service: `http://localhost:3000` (frontend UI with HMR + backend API)
- Health Check: `http://localhost:3000/health`
- API Endpoints: `http://localhost:3000/api/*`

The backend proxies frontend requests to the Vite dev server, giving you fast hot reload while maintaining a single entry point.

#### Production Mode

Test the production build locally:

```bash
# Build both frontend and backend
./build.sh

# Start unified service
./start-production.sh
```

**Access:**
- Unified Service: `http://localhost:3000` (serves both API and static frontend)

### First Steps

1. **Login** (default credentials):
   - Username: `admin`
   - Password: Set in seed script

2. **Create an indexer** via API or upcoming web UI

3. **Configure in *arr app**:
   - Indexer Type: Torznab
   - URL: `http://localhost:3000/api/torznab/{indexerId}`
   - API Key: From login response

## API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/regenerate-api-key` - Generate new API key

### Indexer Management
- `GET /api/indexers` - List all indexers
- `POST /api/indexers` - Create new indexer
- `GET /api/indexers/:id` - Get indexer details
- `PUT /api/indexers/:id` - Update indexer
- `DELETE /api/indexers/:id` - Delete indexer
- `POST /api/indexers/:id/toggle` - Enable/disable indexer
- `POST /api/indexers/:id/test` - Test indexer configuration
- `POST /api/indexers/:id/auto-detect` - Auto-detect forms and feeds
- `POST /api/indexers/:id/fetch-favicon` - Fetch and store favicon
- `GET /api/indexers/:id/health` - Check indexer health

### Import/Export
- `GET /api/indexers/export/all` - Export all indexers
- `POST /api/indexers/export` - Export specific indexers
- `POST /api/indexers/import` - Import indexers
- `GET /api/indexers/backup/create` - Create backup
- `POST /api/indexers/backup/restore` - Restore from backup

### System Management
- `GET /api/system/health` - System health check
- `GET /api/system/health/indexers` - Check all indexers
- `GET /api/system/health/dead-indexers` - Detect dead indexers
- `GET /api/system/cache/stats` - Cache statistics
- `POST /api/system/cache/clear` - Clear all cache
- `POST /api/system/cache/clear-expired` - Clear expired cache
- `POST /api/system/cache/invalidate/:indexerId` - Invalidate indexer cache

### Torznab API
- `GET /api/torznab/:id?t=caps&apikey={key}` - Capabilities
- `GET /api/torznab/:id?t=search&q={query}&apikey={key}` - General search
- `GET /api/torznab/:id?t=tvsearch&q={query}&season={s}&ep={e}&apikey={key}` - TV search
- `GET /api/torznab/:id?t=movie&q={query}&imdbid={id}&apikey={key}` - Movie search

## Configuration Example

### Indexer Configuration

```json
{
  "title": "Example Tracker",
  "url": "https://example.com",
  "searchUrl": "https://example.com/search",
  "searchMethod": "GET",
  "searchQueryParam": "q",
  "resultSelector": ".result-row",
  "resultMapping": {
    "title": ".title",
    "link": ".download-link@href",
    "size": ".size",
    "seeders": ".seeds",
    "leechers": ".leech",
    "category": ".category",
    "pubDate": ".date"
  }
}
```

### CSS Selector Syntax

**Standard Selectors:**
- `.class-name` - Elements with class
- `#id` - Element with ID
- `tag-name` - HTML tag
- `parent > child` - Direct children
- `[attribute="value"]` - Attribute matching

**Attribute Extraction:**
- `a@href` - Extract href attribute
- `img@src` - Extract src attribute
- `.download-link@href` - Extract href from element with class

## Features in Detail

### Favicon Fetching
Automatically fetches favicons using multiple methods:
1. Parse HTML for `<link rel="icon">` tags
2. Try standard paths (/favicon.ico, /favicon.png, /favicon.svg)
3. Fallback to Google's favicon service
4. Store as base64 data URI in database

### Response Caching
- MD5-based cache keys
- Configurable TTL (default: 10 minutes)
- Automatic expiration
- Per-indexer invalidation
- Cache statistics tracking

### Health Monitoring
- System-wide health checks
- Per-indexer health status
- Response time tracking
- Dead indexer detection
- Status: healthy/degraded/unhealthy

### Import/Export
- JSON-based portable format
- Version tracking
- Import options (overwrite/skip existing)
- Data validation
- Complete backup/restore

## Development

### Project Structure
```
tinkarr/
├── backend/                # Backend service
│   ├── src/
│   │   ├── api/           # API routes
│   │   ├── services/      # Business logic
│   │   ├── middleware/    # Express middleware
│   │   ├── db/            # Database schema and migrations
│   │   ├── utils/         # Utilities
│   │   └── server.ts      # Entry point (serves API + frontend)
│   ├── data/              # SQLite database
│   └── package.json
├── frontend/              # Frontend application
│   ├── src/               # React components and pages
│   ├── dist/              # Build output (copied to backend/public)
│   └── package.json
├── package.json           # Root workspace config
├── docker-compose.yml     # Docker deployment
├── build.sh               # Production build script
├── start-local.sh         # Development startup
└── start-production.sh    # Production startup
```

### Available Scripts

**Root workspace:**
```bash
npm run dev          # Start unified dev service (backend + frontend on port 3000)
npm run build        # Build both frontend and backend for production
npm start            # Run production build
npm run install:all  # Install all dependencies (root + workspaces)
npm run clean        # Remove all build artifacts and node_modules
npm run migrate      # Run database migrations
npm run seed         # Seed database with initial data
npm test             # Run tests
```

**Backend workspace:**
```bash
cd backend
npm run dev          # Start unified service (runs both backend + frontend)
npm run dev:backend  # Start backend only (for debugging)
npm run dev:frontend # Start frontend only (for debugging)
npm run build        # Build TypeScript
npm start            # Run production server
```

**Frontend workspace:**
```bash
cd frontend
npm run dev          # Start Vite dev server (port 5173, for debugging)
npm run build        # Build frontend for production
```

## Documentation

### Deployment
- [**Deployment Guide**](./DEPLOYMENT.md) - Docker, Docker Compose, and reverse proxy setup

### Phase Documentation
- [Phase 1: Core Infrastructure](./backend/README.md)
- [Phase 2: Core Scraping Engine](./backend/PHASE2_README.md)
- [Phase 3: Torznab API Implementation](./backend/PHASE3_IMPLEMENTATION.md)
- [Phase 5: Advanced Features](./backend/PHASE5_IMPLEMENTATION.md)
- [Phase 6: Testing & Documentation](./backend/PHASE6_IMPLEMENTATION.md)

### Testing
- Unit Tests: 63 tests passing
- Test Coverage: 95%+ for core services
- Run tests: `npm test`
- Coverage report: `npm test -- --coverage`

## Integration with *arr Applications

### Sonarr/Radarr/Prowlarr Setup

1. Go to Settings → Indexers
2. Add new indexer → Torznab
3. Configure:
   - **Name**: Your indexer name
   - **URL**: `http://localhost:3000/api/torznab/{indexerId}`
   - **API Key**: Your Tinkarr API key
   - **Categories**: Select appropriate categories
4. Test and save

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Roadmap

### Phase 4 - Frontend Development (Next Priority)
- React-based web interface
- Indexer management UI
- Settings configuration
- Test and preview tools
- Dashboard with statistics

### Future Enhancements
- Multi-user support with roles
- Proxy support per indexer
- Built-in Puppeteer support
- Advanced parsing (XPath, JSONPath, Regex)
- Notifications and webhooks
- Plugin system
- Statistics dashboard
- OpenAPI/Swagger documentation
- Kubernetes deployment
- Load testing and performance optimization

## Troubleshooting

### Common Issues

**"Invalid API key" error**
- Verify you're using the correct API key from login response
- Ensure parameter is spelled correctly: `apikey`

**Empty search results**
- Test the search URL directly in a browser
- Verify the result selector matches HTML structure
- Check result mapping selectors
- Review server logs for parsing errors

**Cloudflare blocking requests**
- Enable Flaresolverr integration
- Set `requiresFlaresolverr: true` on the indexer
- Verify Flaresolverr is running on configured URL

**Cache not working**
- Check cache stats: `GET /api/system/cache/stats`
- Verify cache is enabled
- Clear cache and try again
- Check database permissions

## License

MIT License - See LICENSE file for details

## Support

For bugs, feature requests, or questions:
- Create an issue on GitHub
- Check existing documentation
- Review phase-specific documentation

## Acknowledgments

- Inspired by the *arr stack (Sonarr, Radarr, Prowlarr)
- Built with TypeScript, Express, and Drizzle ORM
- Torznab specification for API compatibility
- Flaresolverr for Cloudflare bypass
