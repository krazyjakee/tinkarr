# Multi-stage build for Tinkarr - Backend + Frontend

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source
COPY frontend .

# Build frontend
RUN npm run build

# Stage 2: Build Backend
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci

# Copy backend source
COPY backend .

# Build TypeScript
RUN npm run build

# Stage 3: Production
FROM node:20-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Set working directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S tinkarr && \
    adduser -S -u 1001 -G tinkarr tinkarr

# Copy backend package files
COPY backend/package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built backend from builder
COPY --from=backend-builder /app/backend/dist ./dist

# Copy built frontend from frontend-builder
COPY --from=frontend-builder /app/frontend/dist ./public

# Create database directory
RUN mkdir -p /app/data && \
    chown -R tinkarr:tinkarr /app

# Switch to non-root user
USER tinkarr

# Expose port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_URL=file:/app/data/tinkarr.db

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Run migrations and start server
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/server.js"]
