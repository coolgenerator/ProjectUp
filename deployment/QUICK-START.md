# Quick Start Deployment Guide

## Prerequisites
- AWS EC2 instance (Ubuntu 22.04 LTS, t3.medium or larger)
- Domain name pointing to EC2 IP (projectup.me)
- SSH access to the server

## Step-by-Step Deployment

### 1. Connect to EC2
```bash
ssh ubuntu@your-ec2-ip
```

### 2. Run Initial Setup (as root)
```bash
# Download and run the initial setup script
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/yourusername/ProjectUp/main/deployment/scripts/initial-setup.sh)"
```

Or manually:
```bash
# Upload the script to the server
scp deployment/scripts/initial-setup.sh ubuntu@your-ec2-ip:~/

# Run it
sudo ./initial-setup.sh
```

### 3. Clone Repository
```bash
# Switch to ubuntu user if needed
su - ubuntu

# Clone the repository
cd /opt/projectup
git clone https://github.com/yourusername/ProjectUp.git .
```

### 4. Create Environment Files

Create three environment files with production settings:

- `/opt/projectup/backend/.env.production` (copy from backend/.env and update)
- `/opt/projectup/frontend/.env.production` (use template below)
- `/opt/projectup/ai-agent/.env.production` (copy from ai-agent/.env and update)

**Frontend .env.production:**
```env
VITE_API_URL=https://api.projectup.me
VITE_BACKEND_URL=https://api.projectup.me
VITE_AI_AGENT_URL=https://ai.projectup.me
VITE_AI_AGENT_BASE_URL=https://ai.projectup.me
VITE_AI_AGENT_WS_URL=wss://ai.projectup.me
VITE_APP_NAME=ProjectUp
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

### 5. Upload GCP Credentials
```bash
# From your local machine
scp ai-agent/config/project-up66-2196e9ef2d8b.json ubuntu@your-ec2-ip:/opt/projectup/ai-agent/config/
```

### 6. Install Systemd Services
```bash
sudo cp deployment/systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload
```

### 7. Configure Nginx
```bash
# Copy Nginx configuration
sudo cp deployment/nginx/projectup.conf /etc/nginx/sites-available/

# Enable the site
sudo ln -s /etc/nginx/sites-available/projectup.conf /etc/nginx/sites-enabled/

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t
```

### 8. Get SSL Certificates
```bash
sudo certbot --nginx -d projectup.me -d www.projectup.me -d api.projectup.me -d ai.projectup.me
```

### 9. Build and Deploy
```bash
cd /opt/projectup

# Make scripts executable
chmod +x deployment/scripts/*.sh

# Deploy all services
./deployment/scripts/deploy.sh all
```

### 10. Enable and Start Services
```bash
# Enable services to start on boot
sudo systemctl enable projectup-backend
sudo systemctl enable projectup-ai-agent

# Start services
sudo systemctl start projectup-backend
sudo systemctl start projectup-ai-agent

# Restart Nginx
sudo systemctl restart nginx
```

### 11. Verify Deployment
```bash
# Check service status
sudo systemctl status projectup-backend
sudo systemctl status projectup-ai-agent
sudo systemctl status nginx

# Run health check
./deployment/scripts/deploy.sh health

# Or manually check endpoints
curl https://api.projectup.me/health
curl https://ai.projectup.me/health
curl https://projectup.me
```

## DNS Configuration

Make sure your DNS records point to your EC2 instance:

```
Type    Name                Value
A       projectup.me        <EC2-PUBLIC-IP>
A       www                 <EC2-PUBLIC-IP>
A       api                 <EC2-PUBLIC-IP>
A       ai                  <EC2-PUBLIC-IP>
```

## Updating the Application

To deploy updates:

```bash
cd /opt/projectup
./deployment/scripts/deploy.sh all
```

Or deploy specific components:

```bash
./deployment/scripts/deploy.sh frontend
./deployment/scripts/deploy.sh backend
./deployment/scripts/deploy.sh ai-agent
```

## Viewing Logs

```bash
# Backend logs
sudo journalctl -u projectup-backend -f

# AI Agent logs
sudo journalctl -u projectup-ai-agent -f

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

## Creating Backups

```bash
cd /opt/projectup
./deployment/scripts/backup.sh
```

Backups are stored in `/opt/projectup/backups/`

## Troubleshooting

### Services won't start
```bash
# Check logs
sudo journalctl -u projectup-backend -n 100
sudo journalctl -u projectup-ai-agent -n 100

# Check if ports are in use
sudo netstat -tulpn | grep -E '8080|8888|80|443'
```

### SSL Certificate Issues
```bash
# Renew certificates manually
sudo certbot renew

# Test renewal process
sudo certbot renew --dry-run
```

### Nginx Issues
```bash
# Test configuration
sudo nginx -t

# Reload configuration
sudo nginx -s reload

# Restart Nginx
sudo systemctl restart nginx
```

## Security Checklist

- [ ] Firewall enabled (UFW)
- [ ] Only necessary ports open (22, 80, 443)
- [ ] SSL certificates installed
- [ ] Environment files have correct permissions (600)
- [ ] Regular backups scheduled
- [ ] System updates automated

## Monitoring

Set up CloudWatch or similar monitoring for:
- CPU usage
- Memory usage
- Disk space
- Application logs
- Service health checks

## Support

For issues or questions, refer to the main DEPLOYMENT.md file or check application logs.
