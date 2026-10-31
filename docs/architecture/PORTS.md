# ProjectUp Port Configuration

This document outlines the port usage for all ProjectUp services to avoid conflicts.

## Service Ports

| Service | Port | Description | Container Internal Port |
|---------|------|-------------|------------------------|
| Frontend (React) | 3000 | Web UI | 3000 |
| AI Agent (FastAPI) | 8000 | AI/ML Service API | 8000 |
| Backend (Go/Gin) | 8080 | Main REST API | 8080 |
| SearXNG | 8888 | Search Engine | 8080 |
| PostgreSQL | 5432 | Database | 5432 |
| Redis | 6379 | Cache (optional) | 6379 |

## Port Conflict Resolution

If you have conflicts with these ports, you can change them:

### Frontend
```bash
# In frontend/.env
PORT=3001
```

### Backend
```bash
# When running backend
PORT=8081 go run main.go
```

### AI Agent
```bash
# In ai-agent
uvicorn main:app --port 8001
```

### SearXNG
```bash
# In docker-compose
docker run -p 9999:8080 searxng/searxng
export SEARXNG_URL=http://localhost:9999
```

## Docker Network

When running in Docker Compose, services communicate using internal ports:
- Frontend → Backend: `http://backend:8080`
- Backend → AI Agent: `http://ai-agent:8000`
- AI Agent → SearXNG: `http://searxng:8080`

External access uses the mapped ports (3000, 8000, 8080, 8888).

## Development vs Production

### Development (Local)
- All services run on localhost with different ports
- Direct port access for debugging
- Hot reload enabled

### Production (Docker)
- Services communicate via Docker network
- Only necessary ports exposed
- Reverse proxy (nginx) recommended for single entry point

### Production with Reverse Proxy

```nginx
server {
    listen 80;
    server_name projectup.example.com;

    location / {
        proxy_pass http://frontend:3000;
    }

    location /api/ {
        proxy_pass http://backend:8080/api/;
    }

    location /ai/ {
        proxy_pass http://ai-agent:8000/;
    }

    location /search/ {
        proxy_pass http://searxng:8080/;
    }
}
```

## Testing Ports

Check if a port is in use:
```bash
# macOS/Linux
lsof -i :8888

# Check all ProjectUp ports
for port in 3000 8000 8080 8888 5432 6379; do
    echo "Port $port:"
    lsof -i :$port | head -2
done
```

## Troubleshooting

### Port Already in Use

If you get "address already in use" error:

1. Find the process using the port:
```bash
lsof -i :8888
```

2. Kill the process:
```bash
kill -9 <PID>
```

3. Or use a different port as shown above.

### Docker Port Conflicts

If Docker ports conflict:
```bash
# Stop all ProjectUp containers
docker-compose down

# Remove any orphaned containers
docker container prune

# Restart with fresh ports
docker-compose up -d
```

## Security Notes

- Never expose database ports (5432, 6379) to the internet
- Use firewall rules to restrict access
- In production, only expose port 80/443 through reverse proxy
- SearXNG (8888) should only be accessible internally or with authentication