#!/bin/bash

# Tinkarr Local Development Startup Script
# Starts the unified service (backend + frontend) on port 3000

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}→ $1${NC}"
}

print_cyan() {
    echo -e "${CYAN}$1${NC}"
}

# Cleanup function
cleanup() {
    echo ""
    print_warning "Shutting down services..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        print_info "Backend stopped"
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        print_info "Frontend stopped"
    fi
    exit 0
}

trap cleanup SIGINT SIGTERM

# Save original directory
ORIGINAL_DIR=$(pwd)

# Main script
print_header "Tinkarr Local Development Setup"

# Check Node.js installation
print_info "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 20+ and try again."
    exit 1
fi

NODE_VERSION=$(node -v)
print_success "Node.js found: $NODE_VERSION"

# Check npm installation
print_info "Checking npm installation..."
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm and try again."
    exit 1
fi

NPM_VERSION=$(npm -v)
print_success "npm found: $NPM_VERSION"

# Set flags
START_BACKEND=true
START_FRONTEND=true

# Setup Backend
if [ "$START_BACKEND" = true ]; then
    echo ""
    print_header "Setting up Backend"

    cd "$ORIGINAL_DIR/backend"

    # Check if .env file exists
    print_info "Checking backend environment configuration..."
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Creating from .env.example..."
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_success ".env file created"
            print_warning "IMPORTANT: Please edit backend/.env and set JWT_SECRET to a secure random string!"
            print_info "You can generate one with: openssl rand -base64 32"
            echo ""
            read -p "Press Enter to continue after updating JWT_SECRET, or Ctrl+C to exit..."
        else
            print_error ".env.example not found. Cannot create .env file."
            exit 1
        fi
    else
        print_success "Backend .env file exists"
    fi

    # Check if node_modules exists
    print_info "Checking backend dependencies..."
    if [ ! -d "node_modules" ]; then
        print_info "Dependencies not installed. Running npm install..."
        npm install
        print_success "Backend dependencies installed"
    else
        print_success "Backend dependencies already installed"
    fi

    # Check if database exists
    print_info "Checking database..."
    if [ ! -d "data" ]; then
        mkdir -p data
        print_success "Created data directory"
    fi

    if [ ! -f "data/tinkarr.db" ]; then
        print_warning "Database not found. Initializing..."

        print_info "Running database migrations..."
        npm run migrate
        print_success "Migrations completed"

        print_info "Seeding database with initial data..."
        npm run seed
        print_success "Database seeded"

        print_warning "Default admin credentials will be set during seeding."
        print_info "Check the seed script output for login details."
    else
        print_success "Database exists"
    fi

    echo ""
    print_info "Development Mode: Unified service on port 3000"
    print_info "  - Backend proxies to Vite for hot reload"
    print_info "  - Frontend served with HMR at http://localhost:3000"
    print_info ""
    print_info "For production build:"
    print_info "  ./build.sh && ./start-production.sh"
fi

# Setup Frontend
if [ "$START_FRONTEND" = true ]; then
    echo ""
    print_header "Setting up Frontend"

    cd "$ORIGINAL_DIR/frontend"

    # Check if .env file exists
    print_info "Checking frontend environment configuration..."
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Creating from .env.example..."
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_success "Frontend .env file created"
        else
            print_error ".env.example not found. Cannot create .env file."
            exit 1
        fi
    else
        print_success "Frontend .env file exists"
    fi

    # Check if node_modules exists
    print_info "Checking frontend dependencies..."
    if [ ! -d "node_modules" ]; then
        print_info "Dependencies not installed. Running npm install..."
        npm install
        print_success "Frontend dependencies installed"
    else
        print_success "Frontend dependencies already installed"
    fi
fi

# Start services
echo ""
print_header "Starting Unified Service"

cd "$ORIGINAL_DIR/backend"

echo ""
print_success "Starting Tinkarr on http://localhost:3000"
print_cyan "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_cyan "   Unified Service: http://localhost:3000"
print_cyan "   - Frontend UI served with HMR"
print_cyan "   - Backend API at /api/*"
print_cyan "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
print_warning "Press Ctrl+C to stop the service"
echo ""

# Start the unified service (backend starts both backend and frontend)
npm run dev
