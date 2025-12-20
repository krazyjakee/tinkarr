#!/bin/bash

# Tinkarr Full Stack Build Script
# Builds both frontend and backend for production deployment

set -e  # Exit on error

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Building Tinkarr Full Stack${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Build frontend
echo -e "${BLUE}→ Building frontend...${NC}"
cd frontend
npm install
npm run build
echo -e "${GREEN}✓ Frontend built${NC}"
echo ""

# Copy frontend to backend
echo -e "${BLUE}→ Copying frontend to backend...${NC}"
rm -rf ../backend/public
cp -r dist ../backend/public
echo -e "${GREEN}✓ Frontend copied to backend/public/${NC}"
echo ""

# Build backend
echo -e "${BLUE}→ Building backend...${NC}"
cd ../backend
npm install
npm run build
echo -e "${GREEN}✓ Backend built${NC}"
echo ""

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✓ Build complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Build output:"
echo "  Backend:  backend/dist/"
echo "  Frontend: backend/public/"
echo ""
echo "To start production server:"
echo "  cd backend && npm start"
echo ""
echo "Or use the production start script:"
echo "  ./start-production.sh"
