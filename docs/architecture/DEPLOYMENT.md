# ProjectUp EC2 Deployment Guide

This guide provides step-by-step instructions for deploying the ProjectUp platform (Frontend, Backend, and AI Agent) on AWS EC2.

## Prerequisites

- AWS EC2 instance (Ubuntu 22.04 LTS recommended)
- Domain name configured (projectup.me)
- SSL certificates (Let's Encrypt)
- SSH access to EC2 instance

## Architecture

- **Frontend**: React/Vite app served via Nginx (port 80/443)
- **Backend**: Go API service (port 8080)
- **AI Agent**: Python FastAPI service (port 8888)
- **Database**: AWS RDS PostgreSQL (already configured)
- **Storage**: AWS S3 (already configured)

## EC2 Instance Requirements

- **Type**: t3.medium or larger (2 vCPU, 4GB RAM minimum)
- **Storage**: 30GB+ SSD
- **Security Group**:
  - Port 22 (SSH)
  - Port 80 (HTTP)
  - Port 443 (HTTPS)
  - Port 8080 (Backend API - internal)
  - Port 8888 (AI Agent - internal)

## Step 1: Initial Server Setup

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y git curl wget unzip build-essential

# Install Node.js 20.x (for frontend)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Go 1.21+ (for backend)
wget https://go.dev/dl/go1.21.5.linux-amd64.tar.gz
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc

# Install Python 3.11+ (for AI agent)
sudo apt install -y python3.11 python3.11-venv python3-pip

# Install Nginx
sudo apt install -y nginx

# Install PM2 for process management
sudo npm install -g pm2
```

## Step 2: Clone Repository

```bash
# Create application directory
sudo mkdir -p /opt/projectup
sudo chown $USER:$USER /opt/projectup
cd /opt/projectup

# Clone repository
git clone https://github.com/yourusername/ProjectUp.git .
```

## Step 3: Configure Environment Files

### Backend Environment
Create `/opt/projectup/backend/.env.production`:

```env
APP_MODE=production
BASE_URL=https://projectup.me
PORT=8080
JWT_SECRET=<jwt_secret>
REFRESH_SECRET=<refresh_secret>
DOMAIN=projectup.me

# AWS RDS Config
PG_USER=postgres
PG_PASSWORD=<pg_password>
PG_HOST=<pg_host>
PG_DATABASE=projectup
PG_PORT=5432

# AWS S3 Config
AWS_ACCESS_KEY_ID=<aws_access_key_id>
AWS_SECRET_ACCESS_KEY=<aws_secret_access_key>
AWS_REGION=us-west-1
AWS_BUCKET_NAME=projectup

# Email Config
FROM_EMAIL=support@projectup.me
EMAIL_PASSWORD=<email_password>
AWS_EMAIL_REGION=us-west-1

# Mailjet config
MAILJET_API_KEY=<mailjet_api_key>
MAILJET_SECRET_KEY=<mailjet_secret_key>
MAILJET_SMTP_SERVER=in-v3.mailjet.com
MAILJET_SMTP_PORT=587

# Mailgun config
MAILGUN_API_KEY=<mailjet_api_key>
MAILGUN_SECRET=<mailjet_secret_key>
MAILGUN_DOMAIN=projectup.me

# OAuth2 Credentials
GOOGLE_CLIENT_ID=816962010062-9sphuohpsufq31f6dvknbu6hkufe963e.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<google_client_secret>
FACEBOOK_CLIENT_ID=your_facebook_client_id
FACEBOOK_CLIENT_SECRET=<facebook_client_secret>
DISCORD_CLIENT_ID=1356033832545026058
DISCORD_CLIENT_SECRET=<discord_client_secret>

# Stripe
STRIPE_SECRET_KEY=<stripe_secret_key>
STRIPE_WEBHOOK_SECRET=

# Stripe Product IDs
STRIPE_PRODUCT_BASIC=prod_SzIOBXKq1JiBxN
STRIPE_PRODUCT_PRO=prod_SzIPO25PSJhgS9
STRIPE_PRODUCT_TEAM=prod_SzIQxeVxSmNgH2
STRIPE_PRODUCT_ENTERPRISE=prod_SzIRbCGqPNE26p
```

### Frontend Environment
Create `/opt/projectup/frontend/.env.production`:

```env
# API URLs
VITE_API_URL=https://api.projectup.me
VITE_BACKEND_URL=https://api.projectup.me

# AI Agent URLs
VITE_AI_AGENT_URL=https://ai.projectup.me
VITE_AI_AGENT_BASE_URL=https://ai.projectup.me
VITE_AI_AGENT_WS_URL=wss://ai.projectup.me

# Other configurations
VITE_APP_NAME=ProjectUp

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=<vite_stripe_publishable_key>
```

### AI Agent Environment
Create `/opt/projectup/ai-agent/.env.production`:

```env
# Vertex AI Configuration
GOOGLE_APPLICATION_CREDENTIALS=/opt/projectup/ai-agent/config/project-up66-2196e9ef2d8b.json
GOOGLE_CLOUD_PROJECT=project-up66
GOOGLE_CLOUD_LOCATION=us-central1
GCP_PROJECT_ID=project-up66
GCP_REGION=us-central1
GCP_LOCATION=us-central1
VERTEX_AI_MODEL=gemini-2.5-pro
DEFAULT_LLM_PROVIDER=vertex_ai
DEFAULT_LLM_MODEL=gemini-2.5-pro
VERTEX_AI_TEMPERATURE=0.7
VERTEX_AI_MAX_OUTPUT_TOKENS=8192

# Other Configuration
APP_MODE=production
BASE_URL=https://projectup.me
PORT=8888
JWT_SECRET=<jwt_secret>
REFRESH_SECRET=<refresh_secret>
DOMAIN=projectup.me

# Database
PG_USER=postgres
PG_PASSWORD=<pg_password>
PG_HOST=<pg_host>
PG_DATABASE=projectup
PG_PORT=5432

# AWS
AWS_ACCESS_KEY_ID=<aws_access_key_id>
AWS_SECRET_ACCESS_KEY=<aws_secret_access_key>
AWS_REGION=us-east-2
AWS_BUCKET_NAME=projectup-dev

# Email
FROM_EMAIL=support@projectup.me
EMAIL_PASSWORD=<email_password>
AWS_EMAIL_REGION=us-west-1

MAILJET_API_KEY=<mailjet_api_key>
MAILJET_SECRET_KEY=<mailjet_secret_key>
MAILJET_SMTP_SERVER=in-v3.mailjet.com
MAILJET_SMTP_PORT=587

MAILGUN_API_KEY=<mailjet_api_key>
MAILGUN_SECRET=<mailjet_secret_key>
MAILGUN_DOMAIN=projectup.me

# OAuth2
GOOGLE_CLIENT_ID=816962010062-9sphuohpsufq31f6dvknbu6hkufe963e.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<google_client_secret>
DISCORD_CLIENT_ID=1356033832545026058
DISCORD_CLIENT_SECRET=<discord_client_secret>
```

## Step 4: Build Applications

### Backend
```bash
cd /opt/projectup/backend
go mod download
GOOS=linux GOARCH=amd64 GIN_MODE=release go build -o server main.go
chmod +x server
```

### Frontend
```bash
cd /opt/projectup/frontend
npm install
npm run build
```

### AI Agent
```bash
cd /opt/projectup/ai-agent
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Upload GCP credentials
# Upload project-up66-2196e9ef2d8b.json to /opt/projectup/ai-agent/config/
```

## Step 5: Create Systemd Services

See the deployment/systemd directory for service files:
- `backend.service`
- `ai-agent.service`

## Step 6: Configure Nginx

See the deployment/nginx directory for configuration files.

## Step 7: Setup SSL with Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificates
sudo certbot --nginx -d projectup.me -d www.projectup.me -d api.projectup.me -d ai.projectup.me

# Auto-renewal is setup automatically
```

## Step 8: Start Services

```bash
# Enable and start backend
sudo systemctl enable projectup-backend
sudo systemctl start projectup-backend
sudo systemctl status projectup-backend

# Enable and start AI agent
sudo systemctl enable projectup-ai-agent
sudo systemctl start projectup-ai-agent
sudo systemctl status projectup-ai-agent

# Restart Nginx
sudo systemctl restart nginx
```

## Step 9: Verify Deployment

```bash
# Check backend
curl https://api.projectup.me/health

# Check AI agent
curl https://ai.projectup.me/health

# Check frontend
curl https://projectup.me
```

## Monitoring and Logs

```bash
# Backend logs
sudo journalctl -u projectup-backend -f

# AI Agent logs
sudo journalctl -u projectup-ai-agent -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Deployment Updates

For future updates, use the deployment script:
```bash
cd /opt/projectup
./deployment/scripts/deploy.sh
```

## Troubleshooting

### Backend won't start
- Check logs: `sudo journalctl -u projectup-backend -n 50`
- Verify database connection: `psql -h <pg_host> -U postgres -d projectup`
- Check port availability: `sudo netstat -tulpn | grep 8080`

### AI Agent won't start
- Check logs: `sudo journalctl -u projectup-ai-agent -n 50`
- Verify GCP credentials exist: `ls -la /opt/projectup/ai-agent/config/`
- Test Python environment: `source /opt/projectup/ai-agent/venv/bin/activate && python --version`

### Frontend not loading
- Check Nginx config: `sudo nginx -t`
- Verify build files: `ls -la /opt/projectup/frontend/dist`
- Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`

## Security Best Practices

1. **Firewall**: Use UFW to restrict access
2. **Regular Updates**: Keep system and dependencies updated
3. **Backups**: Regular database backups
4. **Monitoring**: Setup CloudWatch or similar monitoring
5. **Secrets**: Rotate secrets regularly
6. **SSL**: Keep certificates updated

## DNS Configuration

Point your domain records to the EC2 instance:
```
A     projectup.me          -> EC2_PUBLIC_IP
A     www.projectup.me      -> EC2_PUBLIC_IP
A     api.projectup.me      -> EC2_PUBLIC_IP
A     ai.projectup.me       -> EC2_PUBLIC_IP
```
