# Environment Variable Configuration

## Overview
The frontend uses different URL patterns for development and production environments. Nginx handles the routing in production.

## Development Environment

```env
VITE_API_URL=http://localhost:8080
VITE_AI_SERVICE_URL=http://localhost:8888
VITE_WS_URL=ws://localhost:8080
VITE_AI_SERVICE_WS_URL=ws://localhost:8888
```

### How it works in development:
- Backend runs on port 8080 with routes like `/api/...`
- AI service runs on port 8888 with routes like `/ai-api/...`
- Code adds prefixes: `${API_BASE_URL}/api/...` → `http://localhost:8080/api/...`
- Code adds prefixes: `${AI_AGENT_URL}/ai-api/...` → `http://localhost:8888/ai-api/...`

## Production Environment

```env
VITE_API_URL=https://projectup.me
VITE_AI_SERVICE_URL=https://projectup.me
VITE_WS_URL=wss://projectup.me
VITE_AI_SERVICE_WS_URL=wss://projectup.me
```

### How it works in production:
- All services are behind `https://projectup.me`
- Nginx proxies:
  - `/api/*` → backend (port 8080)
  - `/ai-api/*` → AI service (port 8888)
  - `/ws` → backend websocket (port 8080)
  - `/ai-ws/*` → AI service websocket (port 8888)
- Code adds prefixes: `${API_BASE_URL}/api/...` → `https://projectup.me/api/...`
- Code adds prefixes: `${AI_AGENT_URL}/ai-api/...` → `https://projectup.me/ai-api/...`
- Nginx routes the request to the correct service

## Important Rules

1. **Environment variables should NEVER include the path prefixes** (`/api`, `/ai-api`, `/ws`, `/ai-ws`)
2. **Code should ALWAYS add the appropriate prefix** when making requests
3. **Backend endpoints use**: `${API_BASE_URL}/api/...`
4. **AI service endpoints use**: `${AI_AGENT_URL}/ai-api/...`
5. **Backend WebSocket uses**: `${WS_BASE_URL}/ws`
6. **AI service WebSocket uses**: `${AI_WS_URL}/ai-ws/...`

## Nginx Configuration Reference

```nginx
# Backend API
location /api/ {
    proxy_pass http://backend:8080/api/;
    # ... proxy headers
}

# AI Service API
location /ai-api/ {
    proxy_pass http://ai-service:8888/ai-api/;
    # ... proxy headers
}

# Backend WebSocket
location /ws {
    proxy_pass http://backend:8080/ws;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    # ... other websocket headers
}

# AI Service WebSocket
location /ai-ws/ {
    proxy_pass http://ai-service:8888/ai-ws/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    # ... other websocket headers
}
```

## Common Mistakes to Avoid

❌ **WRONG** - Including prefixes in environment variables:
```env
VITE_API_URL=https://projectup.me/api
VITE_AI_SERVICE_URL=https://projectup.me/ai-api
```
This causes duplicate prefixes: `https://projectup.me/api/api/...`

✅ **CORRECT** - Base URLs only:
```env
VITE_API_URL=https://projectup.me
VITE_AI_SERVICE_URL=https://projectup.me
```
Code adds prefixes: `https://projectup.me/api/...`
