# Middleware Documentation

This directory contains custom middleware for the AI Agent service.

## Components

### 1. Authentication (`auth.py`)

Complete JWT authentication system matching backend behavior:

- **Token Validation**: Validates JWT tokens from `Authorization` header or query parameters
- **User Context**: Sets user information in request state
- **Token Generation**: Creates access and refresh tokens
- **Dependencies**: Provides FastAPI dependencies for route protection

**Key Features:**
- ✅ Matches backend `authMiddleware.go` behavior
- ✅ Supports Bearer tokens and query parameters (for WebSocket/SSE)
- ✅ 24-hour access tokens, 30-day refresh tokens
- ✅ Compatible with backend-generated tokens

**Quick Start:**
```python
from middleware import get_current_user, SignedDetails

@router.get("/protected")
async def protected_route(user: SignedDetails = Depends(get_current_user)):
    return {"user_id": user.ID}
```

### 2. Permissions (`permissions.py`)

Role-based and permission-based access control:

- **Roles**: USER, MODERATOR, ADMIN
- **Permissions**: Fine-grained permissions for different operations
- **Dependencies**: FastAPI dependencies for route-level authorization

**Key Features:**
- ✅ Role-based access control (RBAC)
- ✅ Permission-based authorization
- ✅ Composable dependencies
- ✅ Programmatic permission checking

**Quick Start:**
```python
from middleware import require_admin, require_permission, Permission

@router.delete("/agent/{id}")
async def delete_agent(
    id: str,
    user: SignedDetails = Depends(require_permission(Permission.AGENT_DELETE))
):
    return {"deleted": id}

@router.post("/admin/reload")
async def reload_system(admin: SignedDetails = Depends(require_admin)):
    return {"reloaded": True}
```

### 3. Logging (`logging.py`)

Request/response logging with structured logs:

- Request ID tracking
- Duration measurement
- Error logging
- Configurable log levels

**Key Features:**
- ✅ Automatic request/response logging
- ✅ Performance metrics
- ✅ Error tracking
- ✅ Request ID propagation

### 4. Rate Limiting (`rate_limit.py`)

Rate limiting to prevent abuse:

- Per-user and per-IP rate limiting
- Configurable limits and periods
- In-memory storage (Redis-ready)
- Rate limit headers in responses

**Key Features:**
- ✅ Configurable rate limits
- ✅ Per-user and per-IP tracking
- ✅ Standard rate limit headers
- ✅ Automatic cleanup

**Configuration:**
```python
# In settings.py
RATE_LIMIT_ENABLED = True
RATE_LIMIT_REQUESTS = 100  # per period
RATE_LIMIT_PERIOD = 60     # seconds
```

### 5. Streaming (`streaming.py`)

Streaming-specific middleware:

- Connection management
- Timeout handling
- Streaming-specific headers

**Key Features:**
- ✅ Automatic timeout handling
- ✅ Connection cleanup
- ✅ SSE and WebSocket support

## Usage Examples

### Basic Authentication

```python
from fastapi import APIRouter, Depends
from middleware import get_current_user, SignedDetails

router = APIRouter()

@router.get("/me")
async def get_current_user_info(user: SignedDetails = Depends(get_current_user)):
    """Requires authentication"""
    return {
        "user_id": user.ID,
        "profile_sid": user.SID
    }
```

### Optional Authentication

```python
from middleware import get_optional_user

@router.get("/content/{id}")
async def get_content(
    id: str,
    user: SignedDetails | None = Depends(get_optional_user)
):
    """Works with or without authentication"""
    if user:
        # Authenticated user - show private content
        return {"id": id, "private": True, "user_id": user.ID}
    else:
        # Guest - show public content only
        return {"id": id, "private": False}
```

### Role-Based Access

```python
from middleware import require_role, require_moderator, UserRole

@router.post("/admin/users")
async def manage_users(user: SignedDetails = Depends(require_role(UserRole.ADMIN))):
    """Admin only"""
    return {"message": "User management"}

@router.put("/content/{id}/moderate")
async def moderate_content(
    id: str,
    moderator: SignedDetails = Depends(require_moderator)
):
    """Admin or moderator"""
    return {"moderated": id}
```

### Permission-Based Access

```python
from middleware import require_permission, Permission

@router.post("/agents")
async def create_agent(
    data: dict,
    user: SignedDetails = Depends(require_permission(Permission.AGENT_CREATE))
):
    """Requires AGENT_CREATE permission"""
    return {"created": True, "by": user.ID}
```

### Multiple Permissions

```python
from middleware import require_any_permission, require_all_permissions

@router.put("/project/{id}")
async def update_project(
    id: str,
    user: SignedDetails = Depends(require_any_permission([
        Permission.PROJECT_MODIFY,
        Permission.ADMIN_ACCESS
    ]))
):
    """Requires PROJECT_MODIFY OR ADMIN_ACCESS"""
    return {"updated": id}

@router.post("/system/config")
async def update_system_config(
    config: dict,
    user: SignedDetails = Depends(require_all_permissions([
        Permission.ADMIN_ACCESS,
        Permission.SYSTEM_CONFIG
    ]))
):
    """Requires BOTH permissions"""
    return {"configured": True}
```

### WebSocket Authentication

```python
from fastapi import WebSocket

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    # User is automatically authenticated by middleware
    # via ?token=xxx query parameter
    user_id = websocket.state.user_id

    try:
        while True:
            data = await websocket.receive_json()
            await websocket.send_json({
                "user_id": user_id,
                "echo": data
            })
    except WebSocketDisconnect:
        pass
```

**Client:**
```javascript
const token = "your-jwt-token";
const ws = new WebSocket(`ws://localhost:8888/ws?token=${token}`);
```

## Configuration

### Environment Variables

```bash
# JWT Authentication
SECRET_KEY=your-secret-key-here
JWT_SECRET=your-secret-key-here  # fallback
JWT_ALGORITHM=HS256

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_PERIOD=60

# Streaming
STREAMING_ENABLED=true
STREAMING_TIMEOUT=30

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=%(asctime)s - %(name)s - %(levelname)s - %(message)s
LOG_FILE=ai_agent.log
```

### Application Setup

```python
from fastapi import FastAPI
from middleware import (
    AuthMiddleware,
    LoggingMiddleware,
    RateLimitMiddleware,
    StreamingMiddleware,
)

app = FastAPI()

# Add middleware (order matters!)
app.add_middleware(LoggingMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(StreamingMiddleware)
# Note: AuthMiddleware should be added conditionally or use dependencies
```

## Public Routes

Routes that don't require authentication (configured in `AuthMiddleware`):

- `/health` - Health check
- `/` - Root endpoint
- `/docs` - API documentation
- `/redoc` - Alternative API docs
- `/openapi.json` - OpenAPI schema
- `/api/v1/auth/*` - Authentication endpoints
- `/api/v2/auth/*` - Authentication endpoints

## Token Format

Tokens are JWT with the following structure:

```json
{
  "ID": 123,         // User ID
  "SID": "USR12345", // Profile Short ID
  "exp": 1234567890  // Expiration timestamp
}
```

**Token Expiration:**
- Access Token: 24 hours
- Refresh Token: 30 days

## Permission Matrix

| Permission | USER | MODERATOR | ADMIN |
|-----------|------|-----------|-------|
| READ | ✅ | ✅ | ✅ |
| WRITE | ✅ | ✅ | ✅ |
| DELETE | ❌ | ✅ | ✅ |
| ADMIN_ACCESS | ❌ | ❌ | ✅ |
| AGENT_CREATE | ✅ | ✅ | ✅ |
| AGENT_MODIFY | ❌ | ✅ | ✅ |
| AGENT_DELETE | ❌ | ❌ | ✅ |
| PROJECT_CREATE | ✅ | ✅ | ✅ |
| PROJECT_MODIFY | ❌ | ✅ | ✅ |
| WORKFLOW_EXECUTE | ✅ | ✅ | ✅ |

## Testing

### Test Authentication

```bash
# Get token
TOKEN=$(curl -X POST http://localhost:8888/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' \
  | jq -r '.access_token')

# Use token
curl http://localhost:8888/api/v2/agents \
  -H "Authorization: Bearer $TOKEN"
```

### Test Rate Limiting

```bash
# Make multiple requests to test rate limit
for i in {1..110}; do
  curl http://localhost:8888/api/v2/agents \
    -H "Authorization: Bearer $TOKEN" \
    -v 2>&1 | grep -i "x-ratelimit"
done
```

## Detailed Documentation

- **[AUTH_USAGE.md](./AUTH_USAGE.md)** - Comprehensive authentication guide
- **Backend Compatibility**: Tokens are compatible with `backend/middleware/authMiddleware.go`

## Common Patterns

### Protecting All Routes in a Router

```python
from fastapi import APIRouter, Depends
from middleware import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])

# All routes in this router require authentication
@router.get("/agents")
async def list_agents():
    return {"agents": []}
```

### Custom Permission Check

```python
from middleware import get_current_user, has_permission, Permission, UserRole

async def check_custom_permission(user: SignedDetails = Depends(get_current_user)):
    # Get user role from database
    user_role = await get_user_role(user.ID)

    # Custom logic
    if not has_permission(user_role, Permission.AGENT_CREATE):
        raise HTTPException(403, "No permission")

    return user

@router.post("/agents")
async def create_agent(user: SignedDetails = Depends(check_custom_permission)):
    return {"created": True}
```

## Best Practices

1. ✅ Use dependencies for authentication/authorization
2. ✅ Use the most restrictive permission requirement
3. ✅ Combine role checks with resource ownership checks
4. ✅ Log authentication failures
5. ✅ Implement token refresh mechanism
6. ✅ Never expose tokens in logs or responses
7. ✅ Use environment variables for secrets
8. ✅ Share `SECRET_KEY` between backend and AI agent

## Troubleshooting

### Token Validation Fails

- Ensure `SECRET_KEY` or `JWT_SECRET` is set in environment
- Verify token is not expired
- Check token was generated with same secret key
- Ensure token format matches backend structure

### Rate Limit Reached

- Check `X-RateLimit-*` headers in response
- Increase limits in configuration if needed
- Implement token bucket or sliding window if needed

### Permission Denied

- Verify user role has required permission
- Check ROLE_PERMISSIONS mapping
- Ensure database user type is set correctly

## Security Considerations

- 🔒 Always use HTTPS in production
- 🔒 Rotate JWT secrets regularly
- 🔒 Implement token refresh mechanism
- 🔒 Set appropriate token expiration times
- 🔒 Log and monitor authentication failures
- 🔒 Rate limit authentication endpoints
- 🔒 Implement account lockout after failed attempts
- 🔒 Use secure random for token generation
