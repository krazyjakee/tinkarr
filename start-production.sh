#!/bin/bash

# Tinkarr Production Start Script
# Starts the unified backend + frontend service

set -e

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Starting Tinkarr (Production)${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Check if build exists
if [ ! -d "backend/dist" ] || [ ! -d "backend/public" ]; then
    echo -e "${YELLOW}⚠ Build not found. Running full build...${NC}"
    echo ""
    ./build.sh
    echo ""
fi

# Start backend
echo -e "${GREEN}→ Starting unified service on http://localhost:3000${NC}"
echo -e "${BLUE}  - Backend API: /api/*${NC}"
echo -e "${BLUE}  - Frontend UI: /${NC}"
echo -e "${BLUE}  - Health Check: /health${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo ""

cd backend
NODE_ENV=production npm start
