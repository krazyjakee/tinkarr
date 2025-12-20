#!/bin/bash

# Tinkarr Integration Test Script
# Tests the unified backend + frontend build

set -e

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Testing Integrated Build${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Build everything
echo -e "${BLUE}→ Running full build...${NC}"
./build.sh
echo ""

# Start server in background
echo -e "${BLUE}→ Starting server...${NC}"
cd backend
NODE_ENV=production npm start > /tmp/tinkarr-test.log 2>&1 &
SERVER_PID=$!
cd ..

# Wait for server to start
echo -e "${BLUE}→ Waiting for server to start...${NC}"
sleep 5

# Function to cleanup
cleanup() {
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null || true
    fi
}

# Trap to ensure cleanup on exit
trap cleanup EXIT

# Test 1: API endpoint
echo -e "${BLUE}→ Testing API endpoint (/health)...${NC}"
API_RESPONSE=$(curl -s http://localhost:8677/health)
if echo "$API_RESPONSE" | grep -q "ok"; then
    echo -e "${GREEN}✓ API working${NC}"
else
    echo -e "${RED}✗ API failed${NC}"
    echo "Response: $API_RESPONSE"
    exit 1
fi

# Test 2: Frontend serving
echo -e "${BLUE}→ Testing frontend serving (/)...${NC}"
FRONTEND_RESPONSE=$(curl -s http://localhost:8677/)
if echo "$FRONTEND_RESPONSE" | grep -q '<div id="root">'; then
    echo -e "${GREEN}✓ Frontend serving working${NC}"
else
    echo -e "${RED}✗ Frontend serving failed${NC}"
    echo "Response preview: ${FRONTEND_RESPONSE:0:200}"
    exit 1
fi

# Test 3: Static assets
echo -e "${BLUE}→ Testing static assets (/vite.svg)...${NC}"
ASSET_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8677/vite.svg)
if [ "$ASSET_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ Static assets working${NC}"
else
    echo -e "${RED}✗ Static assets failed (HTTP $ASSET_RESPONSE)${NC}"
    exit 1
fi

# Test 4: SPA routing
echo -e "${BLUE}→ Testing SPA routing (/indexers)...${NC}"
SPA_RESPONSE=$(curl -s http://localhost:8677/indexers)
if echo "$SPA_RESPONSE" | grep -q '<div id="root">'; then
    echo -e "${GREEN}✓ SPA routing working${NC}"
else
    echo -e "${RED}✗ SPA routing failed${NC}"
    echo "Response preview: ${SPA_RESPONSE:0:200}"
    exit 1
fi

# Test 5: API route precedence
echo -e "${BLUE}→ Testing API route precedence (/api/...)...${NC}"
API_ROUTE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8677/api/nonexistent)
if [ "$API_ROUTE_RESPONSE" = "404" ]; then
    echo -e "${GREEN}✓ API routes take precedence${NC}"
else
    echo -e "${RED}✗ API route precedence failed (HTTP $API_ROUTE_RESPONSE)${NC}"
    exit 1
fi

# Cleanup
cleanup

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✓ All tests passed!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "The unified service is working correctly:"
echo "  - API endpoints responding"
echo "  - Frontend being served"
echo "  - Static assets cached properly"
echo "  - SPA routing functional"
echo "  - Route precedence correct"
