#!/bin/bash

##############################################################################
# ProjectUp Deployment Script
# Usage: ./deploy.sh [component]
# Components: all, frontend, backend, ai-agent
##############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/opt/projectup"
FRONTEND_DIR="$PROJECT_DIR/frontend"
BACKEND_DIR="$PROJECT_DIR/backend"
AI_AGENT_DIR="$PROJECT_DIR/ai-agent"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as correct user
check_user() {
    if [ "$(whoami)" != "ubuntu" ] && [ "$(whoami)" != "root" ]; then
        log_warn "This script should be run as ubuntu user"
    fi
}

# Pull latest code
pull_code() {
    log_info "Pulling latest code from repository..."
    cd "$PROJECT_DIR"
    git pull origin main
    log_info "Code updated successfully"
}

# Deploy Backend
deploy_backend() {
    log_info "Deploying Backend..."

    cd "$BACKEND_DIR"

    # Install dependencies
    log_info "Installing Go dependencies..."
    go mod download

    # Build
    log_info "Building backend..."
    GOOS=linux GOARCH=amd64 GIN_MODE=release go build -o server main.go
    chmod +x server

    # Restart service
    log_info "Restarting backend service..."
    sudo systemctl restart projectup-backend

    # Check status
    sleep 2
    if sudo systemctl is-active --quiet projectup-backend; then
        log_info "Backend deployed and running successfully"
    else
        log_error "Backend failed to start. Check logs with: sudo journalctl -u projectup-backend -n 50"
        exit 1
    fi
}

# Deploy Frontend
deploy_frontend() {
    log_info "Deploying Frontend..."

    cd "$FRONTEND_DIR"

    # Install dependencies
    log_info "Installing npm dependencies..."
    npm install

    # Build
    log_info "Building frontend..."
    npm run build

    # Reload Nginx
    log_info "Reloading Nginx..."
    sudo nginx -t && sudo systemctl reload nginx

    log_info "Frontend deployed successfully"
}

# Deploy AI Agent
deploy_ai_agent() {
    log_info "Deploying AI Agent..."

    cd "$AI_AGENT_DIR"

    # Activate virtual environment
    source venv/bin/activate

    # Install dependencies
    log_info "Installing Python dependencies..."
    pip install -r requirements.txt --upgrade

    # Restart service
    log_info "Restarting AI Agent service..."
    sudo systemctl restart projectup-ai-agent

    # Check status
    sleep 2
    if sudo systemctl is-active --quiet projectup-ai-agent; then
        log_info "AI Agent deployed and running successfully"
    else
        log_error "AI Agent failed to start. Check logs with: sudo journalctl -u projectup-ai-agent -n 50"
        exit 1
    fi
}

# Deploy all components
deploy_all() {
    log_info "Deploying all components..."
    pull_code
    deploy_backend
    deploy_frontend
    deploy_ai_agent
    log_info "All components deployed successfully!"
}

# Health check
health_check() {
    log_info "Running health checks..."

    # Check backend
    if curl -f -s https://api.projectup.me/health > /dev/null; then
        log_info "✓ Backend is healthy"
    else
        log_error "✗ Backend health check failed"
    fi

    # Check AI Agent
    if curl -f -s https://ai.projectup.me/health > /dev/null; then
        log_info "✓ AI Agent is healthy"
    else
        log_error "✗ AI Agent health check failed"
    fi

    # Check frontend
    if curl -f -s https://projectup.me > /dev/null; then
        log_info "✓ Frontend is accessible"
    else
        log_error "✗ Frontend is not accessible"
    fi
}

# Main script
main() {
    check_user

    COMPONENT="${1:-all}"

    case "$COMPONENT" in
        all)
            deploy_all
            ;;
        frontend)
            pull_code
            deploy_frontend
            ;;
        backend)
            pull_code
            deploy_backend
            ;;
        ai-agent)
            pull_code
            deploy_ai_agent
            ;;
        health)
            health_check
            ;;
        *)
            log_error "Invalid component: $COMPONENT"
            echo "Usage: $0 [all|frontend|backend|ai-agent|health]"
            exit 1
            ;;
    esac

    log_info "Deployment completed!"
}

main "$@"
