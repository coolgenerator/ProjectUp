# ProjectUp - AI-Powered Project Collaboration Platform

A full-stack project collaboration platform with AI assistance, real-time features, and comprehensive project management capabilities.

## 🚀 Features

- **AI-Powered Assistance**: Integrated AI workflows for project planning, research, and content generation
- **Real-time Collaboration**: WebSocket-based live updates and notifications
- **Rich Content Editor**: EditorJS integration for dynamic content creation
- **Authentication & Security**: JWT-based auth with automatic token refresh
- **File Management**: AWS S3 integration for secure file storage
- **Caching Layer**: Redis caching for improved performance
- **Dark Mode Support**: Full dark mode across the application
- **Internationalization**: Multi-language support

## 🏗️ Architecture

```
ProjectUp/
├── backend/          # Go/Gin REST API
├── frontend/         # React/TypeScript SPA
├── ai-service/       # Python/FastAPI AI service
├── nginx/            # Nginx configuration
├── deployment/       # systemd, nginx and deploy scripts
├── docs/             # Project documentation (index: docs/README.md)
└── docker-compose.yml
```

## 🛠️ Tech Stack

### Backend
- **Language**: Go 1.21+
- **Framework**: Gin Web Framework
- **Database**: PostgreSQL (AWS RDS)
- **Cache**: Redis
- **ORM**: GORM
- **Storage**: AWS S3
- **Authentication**: JWT

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **State Management**: Redux Toolkit
- **UI Library**: Material-UI + Tailwind CSS
- **Editor**: EditorJS
- **Animations**: Framer Motion

### AI Service
- **Language**: Python 3.11+
- **Framework**: FastAPI
- **AI Workflow**: LangGraph
- **AI Providers**: OpenAI, Google Vertex AI

## 📋 Prerequisites

- Go 1.21 or higher
- Node.js 18 or higher
- Python 3.11 or higher
- PostgreSQL 15
- Redis 7
- Docker & Docker Compose (optional)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/ProjectUp.git
cd ProjectUp
```

### 2. Environment Setup

#### Backend Configuration
```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
```

#### Frontend Configuration
```bash
cd ../frontend
cp .env.example .env
# Edit .env with your configuration
```

#### AI Service Configuration
```bash
cd ../ai-service
cp .env.example .env
# Edit .env with your API keys
```

### 3. Install Dependencies

#### Backend
```bash
cd backend
go mod download
```

#### Frontend
```bash
cd frontend
npm install
```

#### AI Service
```bash
cd ai-service
pip install -r requirements.txt
```

### 4. Database Setup

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Run migrations
cd backend
go run migrate/migrate.go
```

### 5. Start Services

#### Backend (Terminal 1)
```bash
cd backend
go run main.go
# API runs on http://localhost:8080
# Swagger docs at http://localhost:8080/swagger/index.html
```

#### Frontend (Terminal 2)
```bash
cd frontend
npm run dev
# App runs on http://localhost:5173
```

#### AI Service (Terminal 3)
```bash
cd ai-service
python main.py serve --reload
# API runs on http://localhost:8000
# Docs at http://localhost:8000/docs
```

## 🐳 Docker Deployment

### Development
```bash
docker-compose up
```

### Full stack (with SearXNG)
```bash
docker-compose -f docker-compose.full.yml up
```

## 🔧 Configuration

### Environment Variables

See `.env.example` files in each directory for required environment variables.

Key configurations:
- **JWT_SECRET**: Secret key for JWT tokens
- **AWS_ACCESS_KEY_ID/SECRET**: AWS credentials for S3
- **REDIS_HOST/PORT**: Redis connection details
- **OPENAI_API_KEY**: OpenAI API key for AI features
- **Database URLs**: PostgreSQL connection strings

### Redis Cache

Redis is optional but recommended for production:
- Caches user sessions, project data, and API responses
- Automatic fallback if Redis is unavailable
- Configurable expiration times

### Nginx Setup

For production deployment with Nginx:
```bash
cp nginx/nginx.conf /etc/nginx/sites-available/projectup
ln -s /etc/nginx/sites-available/projectup /etc/nginx/sites-enabled/
nginx -s reload
```

## 📚 Documentation

Design notes, guides and architecture docs are in [`docs/`](./docs/README.md).

## 📝 API Documentation

- **Backend API**: http://localhost:8080/swagger/index.html
- **AI Service API**: http://localhost:8000/docs

## 🧪 Testing

### Backend Tests
```bash
cd backend
go test ./...
```

### Frontend Lint
```bash
cd frontend
npm run lint
```

### AI Service Tests
```bash
cd ai-service
pytest tests/
```

## 📦 Building for Production

### Backend
```bash
cd backend
GOOS=linux GOARCH=amd64 go build -o server main.go
```

### Frontend
```bash
cd frontend
npm run build
# Output in dist/ directory
```

## 🚀 Deployment

### AWS EC2 Deployment

1. **Instance Requirements**:
   - Minimum: t3.medium (2 vCPU, 4GB RAM)
   - Recommended: t3.large or higher for production

2. **Services Setup**:
   - PostgreSQL on RDS
   - Redis on ElastiCache
   - S3 for file storage
   - CloudFront for CDN

3. **SSL/TLS**:
   - Use Let's Encrypt with Certbot
   - Configure in Nginx

## 🔍 Monitoring

- **Application Logs**: Check `logs/` directory
- **Redis Monitoring**: `redis-cli monitor`
- **Database**: Use pgAdmin or DBeaver
- **Performance**: New Relic or DataDog integration

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Team

- Your Name - Full Stack Developer

## 🙏 Acknowledgments

- EditorJS for the rich text editor
- Material-UI for React components
- LangGraph for AI workflow orchestration

## 📞 Support

For support, email support@projectup.me or open an issue in the GitHub repository.

## 🔄 Recent Updates

- Added Redis caching layer for improved performance
- Implemented comprehensive dark mode support
- Enhanced AI workflow capabilities
- Improved WebSocket handling for real-time features
- Added Nginx configuration for production deployment