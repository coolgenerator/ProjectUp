#!/bin/bash

##############################################################################
# ProjectUp Initial Setup Script for EC2
# Run this script once on a fresh EC2 instance
# Usage: ./initial-setup.sh
##############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "Please run this script as root or with sudo"
    exit 1
fi

log_info "Starting ProjectUp initial setup..."

# Update system
log_info "Updating system packages..."
apt update && apt upgrade -y

# Install essential tools
log_info "Installing essential tools..."
apt install -y git curl wget unzip build-essential software-properties-common

# Install Node.js 20.x
log_info "Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install Go 1.21+
log_info "Installing Go 1.21.5..."
wget https://go.dev/dl/go1.21.5.linux-amd64.tar.gz
rm -rf /usr/local/go
tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz
rm go1.21.5.linux-amd64.tar.gz

# Add Go to PATH for all users
cat >> /etc/profile.d/golang.sh <<EOF
export PATH=\$PATH:/usr/local/go/bin
export GOPATH=\$HOME/go
EOF

# Install Python 3.11
log_info "Installing Python 3.11..."
add-apt-repository -y ppa:deadsnakes/ppa
apt update
apt install -y python3.11 python3.11-venv python3.11-dev python3-pip

# Install Nginx
log_info "Installing Nginx..."
apt install -y nginx

# Install Certbot for SSL
log_info "Installing Certbot..."
apt install -y certbot python3-certbot-nginx

# Configure firewall
log_info "Configuring UFW firewall..."
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw reload

# Create application directory
log_info "Creating application directory..."
mkdir -p /opt/projectup
chown ubuntu:ubuntu /opt/projectup

# Create directory for environment files
mkdir -p /opt/projectup/{backend,frontend,ai-agent}

log_info "Basic setup completed!"
log_info ""
log_info "Next steps:"
log_info "1. Switch to ubuntu user: su - ubuntu"
log_info "2. Clone the repository: cd /opt/projectup && git clone <repo-url> ."
log_info "3. Create .env.production files in each service directory"
log_info "4. Run the deployment script: ./deployment/scripts/deploy.sh all"
log_info "5. Copy systemd service files: sudo cp deployment/systemd/*.service /etc/systemd/system/"
log_info "6. Copy Nginx config: sudo cp deployment/nginx/projectup.conf /etc/nginx/sites-available/"
log_info "7. Enable Nginx config: sudo ln -s /etc/nginx/sites-available/projectup.conf /etc/nginx/sites-enabled/"
log_info "8. Get SSL certificates: sudo certbot --nginx -d projectup.me -d www.projectup.me -d api.projectup.me -d ai.projectup.me"
log_info "9. Enable and start services"
