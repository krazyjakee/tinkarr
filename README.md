# Tinkarr

A universal Torznab API adapter that converts any website or API into a Torznab-compatible indexer for *arr applications (Sonarr, Radarr, Prowlarr, etc.). It accepts Torznab requests, scrapes target websites using CSS selectors, and returns standardized XML responses.

## Features

- **Universal Adapter** with CSS selector parsing and attribute extraction
- **Cloudflare Bypass** via Flaresolverr integration with intelligent fallback
- **JWT Authentication** with per-user API keys
- **Response Caching** with configurable TTL and cache management
- **Health Monitoring** with dead indexer detection
- **Import/Export** for backup and restore of configurations
- **Favicon Fetching** from multiple sources (HTML tags, standard paths, Google service)

## Technology Stack

**Backend:** Node.js/TypeScript, Express.js, SQLite + Drizzle ORM, Cheerio, Axios, JWT auth
**Frontend:** React, Tailwind CSS, React Query, Vite

## Quick Start

### Docker (Recommended)

```bash
git clone https://github.com/krazyjakee/tinkarr.git
cd tinkarr
cp .env.docker.example .env  # Edit and set JWT_SECRET
docker-compose up -d
```

### Local Development

```bash
git clone https://github.com/krazyjakee/tinkarr.git
cd tinkarr
./start-local.sh  # Automated setup with hot reload
```

**Or manually:**
```bash
npm run install:all
cd backend
cp .env.example .env  # Edit and set JWT_SECRET
npm run migrate && npm run seed
npm run dev  # Starts unified service on port 8677
```

### Access & First Steps

Service runs on `http://localhost:8677` (API + frontend)

1. Login with default credentials: `admin` / `admin123`
2. Create an indexer via API
3. Add to your *arr app:
   - Type: Torznab
   - URL: `http://localhost:8677/api/torznab/{indexerId}`
   - API Key: From login response

## API Endpoints

**Authentication:** `/api/auth/*` - register, login, me, regenerate-api-key
**Indexers:** `/api/indexers/*` - CRUD operations, toggle, test, auto-detect, fetch-favicon, health
**Import/Export:** `/api/indexers/export/*`, `/api/indexers/import`, `/api/indexers/backup/*`
**System:** `/api/system/health/*`, `/api/system/cache/*`
**Torznab:** `/api/torznab/:id?t={caps|search|tvsearch|movie}&apikey={key}`

## Configuration Example

See https://github.com/krazyjakee/tinkarr/tree/main/indexers and use the import tool

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

## Development

### Project Structure
```
tinkarr/
├── backend/           # Node.js/Express API (serves frontend + API)
│   ├── src/          # Routes, services, middleware, database
│   └── data/         # SQLite database
├── frontend/          # React UI built with Vite
└── docker-compose.yml # Docker deployment
```

### Scripts

```bash
npm run dev          # Start dev server with HMR (port 8677)
npm run build        # Build for production
npm start            # Run production build
npm test             # Run tests
npm run migrate      # Database migrations
npm run seed         # Seed initial data
```

## *arr Integration

In Sonarr/Radarr/Prowlarr:
1. Settings → Indexers → Add Torznab
2. URL: `http://localhost:8677/api/torznab/{indexerId}`
3. API Key: From Tinkarr login response

## Troubleshooting

**Invalid API key:** Verify correct API key from login response
**Empty results:** Check result selectors match HTML structure, review logs
**Cloudflare blocking:** Enable Flaresolverr integration, set `requiresFlaresolverr: true`
**Cache issues:** Check `/api/system/cache/stats`, clear cache, verify database permissions

## License

MIT License - See LICENSE file for details
