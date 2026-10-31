#!/bin/bash

##############################################################################
# ProjectUp Backup Script
# Creates backups of configuration files
# Usage: ./backup.sh
##############################################################################

set -e

BACKUP_DIR="/opt/projectup/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="projectup_backup_$DATE"

# Colors
GREEN='\033[0;32m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

# Create backup directory
mkdir -p "$BACKUP_DIR/$BACKUP_NAME"

log_info "Creating backup: $BACKUP_NAME"

# Backup environment files
log_info "Backing up environment files..."
cp /opt/projectup/backend/.env.production "$BACKUP_DIR/$BACKUP_NAME/backend.env" 2>/dev/null || true
cp /opt/projectup/frontend/.env.production "$BACKUP_DIR/$BACKUP_NAME/frontend.env" 2>/dev/null || true
cp /opt/projectup/ai-agent/.env.production "$BACKUP_DIR/$BACKUP_NAME/ai-agent.env" 2>/dev/null || true

# Backup GCP credentials
log_info "Backing up GCP credentials..."
cp -r /opt/projectup/ai-agent/config "$BACKUP_DIR/$BACKUP_NAME/" 2>/dev/null || true

# Backup nginx config
log_info "Backing up Nginx config..."
cp /etc/nginx/sites-available/projectup.conf "$BACKUP_DIR/$BACKUP_NAME/nginx.conf" 2>/dev/null || true

# Backup systemd services
log_info "Backing up systemd services..."
cp /etc/systemd/system/projectup-*.service "$BACKUP_DIR/$BACKUP_NAME/" 2>/dev/null || true

# Create archive
cd "$BACKUP_DIR"
tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"
rm -rf "$BACKUP_NAME"

log_info "Backup created: $BACKUP_DIR/${BACKUP_NAME}.tar.gz"

# Keep only last 7 backups
log_info "Cleaning old backups (keeping last 7)..."
ls -t "$BACKUP_DIR"/projectup_backup_*.tar.gz | tail -n +8 | xargs -r rm

log_info "Backup completed!"
