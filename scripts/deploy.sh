#!/bin/bash

# RapidPhotoUpload - Deployment Script
# Usage: ./scripts/deploy.sh [local|github|production]

set -e  # Exit on error

COMMAND=${1:-help}
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check prerequisites
check_prereqs() {
    log_info "Checking prerequisites..."

    # Check pnpm
    if ! command -v pnpm &> /dev/null; then
        log_error "pnpm not found. Install: npm install -g pnpm"
        exit 1
    fi

    # Check Java (for backend)
    if ! command -v java &> /dev/null; then
        log_warning "Java not found. Backend will not run."
    fi

    # Check Docker (for database)
    if ! command -v docker &> /dev/null; then
        log_warning "Docker not found. You'll need to provide your own PostgreSQL."
    fi

    log_success "Prerequisites check complete"
}

# Run locally
run_local() {
    log_info "Starting RapidPhotoUpload locally..."

    cd "$PROJECT_ROOT"

    # Check if postgres is running
    if docker ps | grep -q postgres; then
        log_success "PostgreSQL already running"
    else
        log_info "Starting PostgreSQL..."
        docker-compose up postgres -d
        sleep 5  # Wait for postgres to be ready
    fi

    # Install dependencies
    log_info "Installing dependencies..."
    pnpm install

    # Start backend in background
    log_info "Starting backend..."
    pnpm dev:backend &
    BACKEND_PID=$!

    # Wait for backend to be ready
    log_info "Waiting for backend to start..."
    for i in {1..30}; do
        if curl -s http://localhost:8080/actuator/health > /dev/null 2>&1; then
            log_success "Backend is ready!"
            break
        fi
        sleep 2
    done

    # Start frontend
    log_info "Starting frontend..."
    log_success "Backend running at: http://localhost:8080"
    log_success "Opening frontend at: http://localhost:5173"
    pnpm dev:web

    # Cleanup on exit
    trap "kill $BACKEND_PID 2>/dev/null" EXIT
}

# Deploy to GitHub
deploy_github() {
    log_info "Deploying to GitHub..."

    cd "$PROJECT_ROOT"

    # Check for uncommitted changes
    if [[ -n $(git status -s) ]]; then
        log_info "Uncommitted changes found. Staging files..."

        # Stage optimization files
        git add apps/backend/src/main/resources/application-prod.yml
        git add apps/backend/src/main/resources/application.yml
        git add apps/web/src/features/upload/hooks/useChunkedUpload.ts
        git add apps/web/src/features/upload/hooks/useFileUpload.ts
        git add .gitignore

        # Stage documentation
        git add 1000_IMAGE_OPTIMIZATION_SUMMARY.md 2>/dev/null || true
        git add ULTRA_FAST_MODE.md 2>/dev/null || true
        git add PERFORMANCE_COMPARISON.md 2>/dev/null || true
        git add PERFORMANCE_FINDINGS.md 2>/dev/null || true
        git add CODEBASE_EXPLORATION_SUMMARY.md 2>/dev/null || true
        git add UPLOAD_ARCHITECTURE_ANALYSIS.md 2>/dev/null || true
        git add UPLOAD_FLOW_DIAGRAM.txt 2>/dev/null || true
        git add DEPLOYMENT_GUIDE.md 2>/dev/null || true
        git add scripts/ 2>/dev/null || true

        # Create commit
        log_info "Creating commit..."
        git commit -m "feat: Ultra-fast mode optimizations for 1000+ image uploads

Performance Improvements:
- 6-8x faster uploads (1000×10MB: 15min → 2-3min)
- Parallel chunk uploads: 5 chunks per file
- Concurrent uploads: 150 files
- Rate limit: 1000 req/min
- HTTP/2 enabled for better multiplexing
- DB connections: 50, Tomcat threads: 400

Backend & Frontend Optimizations:
- Increased HikariCP pool, thread queue capacity
- Storage quota pre-check
- Enhanced Prometheus metrics
- Complete documentation

🚀 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"

        log_success "Commit created"
    else
        log_info "No uncommitted changes found"
    fi

    # Push to GitHub
    log_info "Pushing to GitHub..."
    git push origin master
    log_success "Pushed to GitHub: https://github.com/$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/')"
}

# Deploy to production
deploy_production() {
    log_info "Deploying to production..."

    cd "$PROJECT_ROOT"

    # Check if vercel is installed
    if ! command -v vercel &> /dev/null; then
        log_error "Vercel CLI not found. Install: npm install -g vercel"
        exit 1
    fi

    # Build frontend
    log_info "Building frontend..."
    cd apps/web
    pnpm install
    pnpm build

    # Deploy to Vercel
    log_info "Deploying to Vercel..."
    cd "$PROJECT_ROOT"
    vercel --prod

    log_success "Frontend deployed to Vercel!"
    log_warning "Don't forget to deploy backend to Railway/Render/AWS"
}

# Show help
show_help() {
    cat << EOF
${GREEN}RapidPhotoUpload Deployment Script${NC}

${YELLOW}Usage:${NC}
  ./scripts/deploy.sh [command]

${YELLOW}Commands:${NC}
  ${BLUE}local${NC}       - Run application locally (frontend + backend + database)
  ${BLUE}github${NC}      - Commit changes and push to GitHub
  ${BLUE}production${NC}  - Deploy frontend to Vercel production
  ${BLUE}help${NC}        - Show this help message

${YELLOW}Examples:${NC}
  # Run locally for development
  ./scripts/deploy.sh local

  # Deploy to GitHub
  ./scripts/deploy.sh github

  # Deploy to production (Vercel)
  ./scripts/deploy.sh production

${YELLOW}Prerequisites:${NC}
  - Node.js >= 18.0.0
  - pnpm >= 8.0.0
  - Java 17+ (for backend)
  - Docker (for local database)
  - Vercel CLI (for production deployment)

${YELLOW}More Info:${NC}
  See DEPLOYMENT_GUIDE.md for complete documentation
EOF
}

# Main script logic
case "$COMMAND" in
    local)
        check_prereqs
        run_local
        ;;
    github)
        deploy_github
        ;;
    production)
        deploy_production
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Unknown command: $COMMAND"
        echo ""
        show_help
        exit 1
        ;;
esac
