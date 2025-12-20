# Multi-stage build for Tinkarr - Backend + Frontend

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package.json ./

# Install frontend dependencies
RUN npm install

# Copy frontend source
COPY frontend .

# Build frontend
RUN npm run build

# Stage 2: Build Backend
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

# Copy backend package files
COPY backend/package.json ./

# Install dependencies
RUN npm install

# Copy backend source
COPY backend .

# Build TypeScript
RUN npm run build

# Stage 3: Production
FROM node:20-alpine

# Install su-exec for user switching and dumb-init for proper signal handling
RUN apk add --no-cache su-exec dumb-init

# Set working directory
WORKDIR /app

# Create default tinkarr user (entrypoint will adjust UID/GID based on PUID/PGID)
RUN addgroup -S tinkarr && \
    adduser -S -G tinkarr -D tinkarr

# Copy backend package files
COPY backend/package.json ./

# Install production dependencies only
RUN npm install --omit=dev && \
    npm cache clean --force

# Copy built backend from builder
COPY --from=backend-builder /app/backend/dist ./dist

# Copy migrations from backend source
COPY --from=backend-builder /app/backend/src/db/migrations ./migrations

# Copy built frontend from frontend-builder
COPY --from=frontend-builder /app/frontend/dist ./public

# Copy entrypoint script
COPY backend/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create database directory (permissions will be set by entrypoint)
RUN mkdir -p /app/data

# Expose port
EXPOSE 8677

# Set environment
ENV NODE_ENV=production \
    PORT=8677 \
    DATABASE_URL=/app/data/tinkarr.db \
    PUID=1000 \
    PGID=1000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8677/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly and run entrypoint
ENTRYPOINT ["dumb-init", "--", "/usr/local/bin/docker-entrypoint.sh"]
