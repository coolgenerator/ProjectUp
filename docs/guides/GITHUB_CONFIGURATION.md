# GitHub Secrets and Variables Configuration

Complete list of all secrets and variables needed for Backend and Frontend repositories based on `.env` files.

---

## BACKEND Configuration

### GitHub Secrets (Sensitive Data)

| Secret Name | Value from .env | Description |
|------------|-----------------|-------------|
| `JWT_SECRET` | `<jwt_secret>` | JWT access token signing key |
| `REFRESH_SECRET` | `<refresh_secret>` | JWT refresh token signing key |
| `PG_PASSWORD` | `<pg_password>` | PostgreSQL database password |
| `AWS_ACCESS_KEY_ID` | `<aws_access_key_id>` | AWS access key for S3/RDS |
| `AWS_SECRET_ACCESS_KEY` | `<aws_secret_access_key>` | AWS secret access key |
| `EMAIL_PASSWORD` | `<email_password>` | Email password for AWS SES |
| `MAILJET_API_KEY` | `<mailjet_api_key>` | Mailjet API key |
| `MAILJET_SECRET_KEY` | `<mailjet_secret_key>` | Mailjet secret key |
| `MAILGUN_API_KEY` | `<mailjet_api_key>` | Mailgun API key |
| `MAILGUN_SECRET` | `<mailjet_secret_key>` | Mailgun secret |
| `GOOGLE_CLIENT_ID` | `816962010062-9sphuohpsufq31f6dvknbu6hkufe963e.apps.googleusercontent.com` | Google OAuth2 client ID |
| `GOOGLE_CLIENT_SECRET` | `<google_client_secret>` | Google OAuth2 client secret |
| `FACEBOOK_CLIENT_ID` | `your_facebook_client_id` | Facebook OAuth2 client ID |
| `FACEBOOK_CLIENT_SECRET` | `<facebook_client_secret>` | Facebook OAuth2 client secret |
| `DISCORD_CLIENT_ID` | `1356033832545026058` | Discord OAuth2 client ID |
| `DISCORD_CLIENT_SECRET` | `<discord_client_secret>` | Discord OAuth2 client secret |
| `STRIPE_SECRET_KEY` | `<stripe_secret_key>` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | *(empty in .env)* | Stripe webhook secret |

### GitHub Variables (Non-Sensitive Configuration)

| Variable Name | Value from .env | Description |
|--------------|-----------------|-------------|
| `APP_MODE` | `development` or `production` | Application mode |
| `BASE_URL` | `http://localhost:5173` or `https://projectup.me` | Frontend base URL |
| `PORT` | `8080` | Server port |
| `DOMAIN` | `localhost` or `projectup.me` | Application domain |
| `PG_USER` | `postgres` | PostgreSQL username |
| `PG_HOST` | `<pg_host>` | PostgreSQL host |
| `PG_DATABASE` | `projectup` | PostgreSQL database name |
| `PG_PORT` | `5432` | PostgreSQL port |
| `AWS_REGION` | `us-west-1` | AWS region |
| `AWS_BUCKET_NAME` | `projectup` | S3 bucket name |
| `AWS_RABBITMQ_URL` | *(empty in .env)* | AWS RabbitMQ URL |
| `FROM_EMAIL` | `support@projectup.me` | Sender email address |
| `AWS_EMAIL_REGION` | `us-west-1` | AWS SES region |
| `MAILJET_SMTP_SERVER` | `in-v3.mailjet.com` | Mailjet SMTP server |
| `MAILJET_SMTP_PORT` | `587` | Mailjet SMTP port |
| `MAILGUN_DOMAIN` | `projectup.me` | Mailgun domain |
| `STRIPE_PRODUCT_BASIC` | `prod_SzIOBXKq1JiBxN` | Stripe Basic product ID |
| `STRIPE_PRODUCT_PRO` | `prod_SzIPO25PSJhgS9` | Stripe Pro product ID |
| `STRIPE_PRODUCT_TEAM` | `prod_SzIQxeVxSmNgH2` | Stripe Team product ID |
| `STRIPE_PRODUCT_ENTERPRISE` | `prod_SzIRbCGqPNE26p` | Stripe Enterprise product ID |

### Additional Deployment Secrets (Not in .env)

| Secret Name | Description |
|------------|-------------|
| `EC2_SSH_PRIVATE_KEY` | SSH private key for EC2 deployment |
| `EC2_HOST` | EC2 instance hostname |
| `EC2_USER` | EC2 SSH username |
| `ECR_REPOSITORY` | ECR repository name (if using ECS) |
| `ECS_SERVICE` | ECS service name (if using ECS) |
| `ECS_CLUSTER` | ECS cluster name (if using ECS) |

---

## FRONTEND Configuration

### GitHub Secrets (Sensitive Data)

| Secret Name | Value from .env | Description |
|------------|-----------------|-------------|
| `VITE_GOOGLE_MAPS_API_KEY` | *(empty in .env)* | Google Maps API key (optional) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `<vite_stripe_publishable_key>` | Stripe publishable key |

### GitHub Variables (Non-Sensitive Configuration)

| Variable Name | Value from .env | Description |
|--------------|-----------------|-------------|
| `VITE_API_URL` | `http://localhost:8080` or `https://api.projectup.me` | Backend API URL |
| `VITE_AI_SERVICE_URL` | `http://localhost:8888` or `https://ai.projectup.me` | AI Service URL |
| `VITE_AI_SERVICE_WS_URL` | `ws://localhost:8888` or `wss://ai.projectup.me` | AI Service WebSocket URL |
| `VITE_APP_NAME` | `ProjectUp` | Application name |

### Additional Deployment Secrets (Not in .env)

For AWS S3 + CloudFront:
| Secret Name | Description |
|------------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS access key for S3 deployment |
| `AWS_SECRET_ACCESS_KEY` | AWS secret access key |
| `AWS_REGION` | AWS region |
| `S3_BUCKET_NAME` | S3 bucket for frontend hosting |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront distribution ID (optional) |

For EC2 Deployment:
| Secret Name | Description |
|------------|-------------|
| `EC2_SSH_PRIVATE_KEY` | SSH private key for EC2 deployment |
| `EC2_HOST` | EC2 instance hostname |
| `EC2_USER` | EC2 SSH username |

For Vercel:
| Secret Name | Description |
|------------|-------------|
| `VERCEL_TOKEN` | Vercel authentication token |
| `VERCEL_ORG_ID` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |

For Netlify:
| Secret Name | Description |
|------------|-------------|
| `NETLIFY_AUTH_TOKEN` | Netlify authentication token |
| `NETLIFY_SITE_ID` | Netlify site ID |

---

## Quick Reference Summary

### Backend
- **17 Secrets** (JWT, passwords, API keys, OAuth credentials)
- **18 Variables** (ports, URLs, product IDs)
- **3-6 Deployment Secrets** (depends on deployment method)

### Frontend
- **2 Secrets** (Google Maps, Stripe publishable key)
- **4 Variables** (API URLs, app name)
- **2-6 Deployment Secrets** (depends on deployment method)

---

## How to Add in GitHub

1. Go to your repository → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret** for secrets
3. Click **Variables** tab → **New repository variable** for variables
4. For environment-specific configs, use **Environments** → Create environment → Add secrets/variables

---

## Important Notes

1. **Production vs Development**: Update URLs and API keys for production environment
2. **Stripe Keys**: Use `sk_live_...` and `pk_live_...` for production
3. **Database Credentials**: Consider using separate production database
4. **OAuth Credentials**: May need separate production OAuth apps
5. **Never commit** these values directly to your repository
