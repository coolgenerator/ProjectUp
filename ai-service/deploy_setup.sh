#!/bin/bash
# AI Service Deployment Setup Script
set -e
echo "=== AI Service Deployment Setup ==="
SERVICE_USER="ubuntu"
SERVICE_HOME="/home/$SERVICE_USER"
DEPLOY_PATH="$SERVICE_HOME/ai-services"
VENV_PATH="$SERVICE_HOME/venv"
SERVICE_NAME="ai-services"
LOG_DIR="/var/log"

echo "1. Creating virtual environment..."
if [ ! -d "$VENV_PATH" ]; then
    python3 -m venv "$VENV_PATH"
fi

echo "2. Installing dependencies..."
source "$VENV_PATH/bin/activate"
python -m pip install --upgrade pip
cd "$DEPLOY_PATH"
pip install -r requirements.txt

echo "3. Setting up systemd service..."
sudo cp "$DEPLOY_PATH/ai-services.service" "/etc/systemd/system/$SERVICE_NAME.service"
sudo systemctl daemon-reload

echo "4. Setting up logs..."
sudo touch "$LOG_DIR/ai-services.log" "$LOG_DIR/ai-services-error.log"
sudo chown "$SERVICE_USER:$SERVICE_USER" "$LOG_DIR/ai-services"*.log
sudo chmod 644 "$LOG_DIR/ai-services"*.log

echo "5. Setting permissions..."
sudo chown -R "$SERVICE_USER:$SERVICE_USER" "$DEPLOY_PATH"
sudo chown -R "$SERVICE_USER:$SERVICE_USER" "$VENV_PATH"

echo "6. Starting service..."
sudo systemctl enable "$SERVICE_NAME"
sudo systemctl restart "$SERVICE_NAME"
sleep 2
sudo systemctl status "$SERVICE_NAME" --no-pager

echo "=== Setup Complete ==="
