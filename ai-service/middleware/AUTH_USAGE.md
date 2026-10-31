# Authentication and Authorization Usage Guide

## Overview

The AI Agent authentication system mirrors the backend Go authentication, providing:
- JWT token validation
- Role-based access control (RBAC)
- Permission-based authorization
- Token generation and refresh
- WebSocket/SSE authentication support

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AuthMiddleware                        │
│  - Validates JWT tokens                                  │
│  - Extracts user context                                 │
│  - Supports Bearer tokens and query parameters          │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   SignedDetails                          │
│  - ID: User ID                                          │
│  - SID: Profile Short ID                                │
│  - exp: Token expiration                                │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│               Permission System                          │
│  - UserRole: ADMIN, MODERATOR, USER                     │
│  - Permission: Fine-grained permissions                  │
│  - ROLE_PERMISSIONS: Role to permission mapping         │
└─────────────────────────────────────────────────────────┘
```

## Token Structure

Tokens match the backend JWT structure:

```python
{
    "ID": 123,           # User ID
    "SID": "USR12345",   # Profile Short ID
    "exp": 1234567890    # Expiration timestamp
}
```

## Basic Usage

### 1. Requiring Authentication

Use the `get_current_user` dependency to require authentication:

```python
from fastapi import APIRouter, Depends
from middleware import get_current_user, SignedDetails

router = APIRouter()

@router.get("/protected")
async def protected_route(user: SignedDetails = Depends(get_current_user)):
    """Route requires authentication"""
    return {
        "message": "You are authenticated",
        "user_id": user.ID,
        "profile_sid": user.SID
    }
```

### 2. Optional Authentication

Use `get_optional_user` for routes that work with or without auth:

```python
from middleware import get_optional_user

@router.get("/public-or-private")
async def flexible_route(user: SignedDetails | None = Depends(get_optional_user)):
    """Route works with or without authentication"""
    if user:
        return {"message": f"Hello user {user.ID}"}
    else:
        return {"message": "Hello guest"}
```

### 3. Getting User ID Only

Use `get_current_user_id` when you only need the user ID:

```python
from middleware import get_current_user_id

@router.post("/create-resource")
async def create_resource(
    data: dict,
    user_id: int = Depends(get_current_user_id)
):
    """Create resource for the authenticated user"""
    return {"created_by": user_id, "data": data}
```

## Role-Based Access Control

### User Roles

```python
class UserRole(str, Enum):
    USER = "USER"           # Regular user
    MODERATOR = "MODERATOR" # Moderator with elevated permissions
    ADMIN = "ADMIN"         # Administrator with full access
```

### Requiring Specific Role

```python
from middleware import require_role, UserRole

@router.post("/admin/settings")
async def admin_settings(user: SignedDetails = Depends(require_role(UserRole.ADMIN))):
    """Only admins can access"""
    return {"message": "Admin settings updated"}
```

### Requiring Any of Multiple Roles

```python
from middleware import require_any_role

@router.post("/moderate")
async def moderate_content(
    user: SignedDetails = Depends(require_any_role([UserRole.ADMIN, UserRole.MODERATOR]))
):
    """Admins or moderators can access"""
    return {"message": "Content moderated"}
```

### Using Shorthand Dependencies

```python
from middleware import require_admin, require_moderator

@router.delete("/user/{user_id}")
async def delete_user(
    user_id: int,
    admin: SignedDetails = Depends(require_admin)
):
    """Admin-only route"""
    return {"message": f"User {user_id} deleted"}

@router.put("/post/{post_id}/flag")
async def flag_post(
    post_id: int,
    moderator: SignedDetails = Depends(require_moderator)
):
    """Moderator or admin can access"""
    return {"message": f"Post {post_id} flagged"}
```

## Permission-Based Access Control

### Available Permissions

```python
class Permission(str, Enum):
    # General
    READ = "read"
    WRITE = "write"
    DELETE = "delete"

    # Admin
    ADMIN_ACCESS = "admin_access"
    USER_MANAGEMENT = "user_management"
    SYSTEM_CONFIG = "system_config"

    # Agent
    AGENT_CREATE = "agent_create"
    AGENT_MODIFY = "agent_modify"
    AGENT_DELETE = "agent_delete"

    # Project
    PROJECT_CREATE = "project_create"
    PROJECT_MODIFY = "project_modify"
    PROJECT_DELETE = "project_delete"

    # Workflow
    WORKFLOW_EXECUTE = "workflow_execute"
    WORKFLOW_CREATE = "workflow_create"
    WORKFLOW_MODIFY = "workflow_modify"
```

### Requiring Specific Permission

```python
from middleware import require_permission, Permission

@router.delete("/agent/{agent_id}")
async def delete_agent(
    agent_id: str,
    user: SignedDetails = Depends(require_permission(Permission.AGENT_DELETE))
):
    """Requires AGENT_DELETE permission"""
    return {"message": f"Agent {agent_id} deleted"}
```

### Requiring Any Permission

```python
from middleware import require_any_permission

@router.put("/project/{project_id}")
async def update_project(
    project_id: str,
    user: SignedDetails = Depends(require_any_permission([
        Permission.PROJECT_MODIFY,
        Permission.ADMIN_ACCESS
    ]))
):
    """Requires PROJECT_MODIFY OR ADMIN_ACCESS"""
    return {"message": "Project updated"}
```

### Requiring All Permissions

```python
from middleware import require_all_permissions

@router.post("/system/critical-operation")
async def critical_operation(
    user: SignedDetails = Depends(require_all_permissions([
        Permission.ADMIN_ACCESS,
        Permission.SYSTEM_CONFIG
    ]))
):
    """Requires BOTH ADMIN_ACCESS AND SYSTEM_CONFIG"""
    return {"message": "Critical operation performed"}
```

## Programmatic Permission Checking

### Check if Role Has Permission

```python
from middleware import has_permission, UserRole, Permission

# Check single permission
if has_permission(UserRole.USER, Permission.AGENT_CREATE):
    print("Users can create agents")

# Check any permission
from middleware import has_any_permission

if has_any_permission(UserRole.MODERATOR, [Permission.PROJECT_MODIFY, Permission.ADMIN_ACCESS]):
    print("Moderator has at least one of these permissions")

# Check all permissions
from middleware import has_all_permissions

if has_all_permissions(UserRole.ADMIN, [Permission.ADMIN_ACCESS, Permission.USER_MANAGEMENT]):
    print("Admin has all these permissions")
```

## WebSocket and SSE Authentication

The middleware supports token authentication via query parameters for WebSocket and SSE:

```python
from fastapi import WebSocket, WebSocketDisconnect
from middleware import validate_token

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    # Token will be automatically validated by AuthMiddleware
    # if passed as ?token=xxx in the WebSocket URL

    try:
        # Access user from connection state
        user_id = websocket.state.user_id

        while True:
            data = await websocket.receive_json()
            # Handle message for authenticated user
            await websocket.send_json({"user_id": user_id, "echo": data})
    except WebSocketDisconnect:
        pass
```

**Client-side example:**
```javascript
// WebSocket with authentication
const token = "your-jwt-token";
const ws = new WebSocket(`ws://localhost:8888/ws?token=${token}`);

// SSE with authentication
const eventSource = new EventSource(`http://localhost:8888/stream?token=${token}`);
```

## Token Generation

Generate tokens for users (typically in login/signup routes):

```python
from middleware import generate_tokens

@router.post("/login")
async def login(credentials: LoginCredentials):
    # Validate credentials...
    user_id = 123
    profile_sid = "USR12345"

    # Generate tokens
    access_token, refresh_token = generate_tokens(user_id, profile_sid)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "Bearer"
    }
```

## Token Validation

Manually validate tokens when needed:

```python
from middleware import validate_token
from jwt import InvalidTokenError, ExpiredSignatureError

try:
    claims = validate_token(token_string)
    user_id = claims.ID
    profile_sid = claims.SID
except ExpiredSignatureError:
    # Token expired
    pass
except InvalidTokenError:
    # Invalid token
    pass
```

## Request State Access

Access user info from request state (set by middleware):

```python
from middleware import get_user_from_request

@router.get("/current-user")
async def current_user_info(request: Request):
    """Get user from request state"""
    user = get_user_from_request(request)

    if user:
        return {
            "authenticated": True,
            "user_id": user.ID,
            "profile_sid": user.SID
        }
    else:
        return {"authenticated": False}
```

## Complete Example: Protected Agent Routes

```python
from fastapi import APIRouter, Depends, HTTPException, status
from middleware import (
    get_current_user,
    require_permission,
    require_admin,
    SignedDetails,
    Permission,
)

router = APIRouter(prefix="/api/v2/agents", tags=["agents"])


@router.get("/")
async def list_agents(user: SignedDetails = Depends(get_current_user)):
    """List agents - requires authentication"""
    return {
        "agents": [],
        "user_id": user.ID
    }


@router.post("/")
async def create_agent(
    agent_data: dict,
    user: SignedDetails = Depends(require_permission(Permission.AGENT_CREATE))
):
    """Create agent - requires AGENT_CREATE permission"""
    return {
        "message": "Agent created",
        "created_by": user.ID,
        "data": agent_data
    }


@router.put("/{agent_id}")
async def update_agent(
    agent_id: str,
    agent_data: dict,
    user: SignedDetails = Depends(require_permission(Permission.AGENT_MODIFY))
):
    """Update agent - requires AGENT_MODIFY permission"""
    return {
        "message": f"Agent {agent_id} updated",
        "updated_by": user.ID
    }


@router.delete("/{agent_id}")
async def delete_agent(
    agent_id: str,
    user: SignedDetails = Depends(require_permission(Permission.AGENT_DELETE))
):
    """Delete agent - requires AGENT_DELETE permission"""
    return {
        "message": f"Agent {agent_id} deleted",
        "deleted_by": user.ID
    }


@router.post("/system/reload")
async def reload_agents(admin: SignedDetails = Depends(require_admin)):
    """Reload agents - admin only"""
    return {
        "message": "Agents reloaded",
        "by_admin": admin.ID
    }
```

## Environment Variables

Required environment variables:

```bash
# JWT Secret (checks SECRET_KEY first, then JWT_SECRET)
SECRET_KEY=your-secret-key-here
# or
JWT_SECRET=your-secret-key-here

# Optional: JWT Algorithm (defaults to HS256)
JWT_ALGORITHM=HS256
```

## Role Permissions Matrix

| Permission | USER | MODERATOR | ADMIN |
|-----------|------|-----------|-------|
| READ | ✅ | ✅ | ✅ |
| WRITE | ✅ | ✅ | ✅ |
| DELETE | ❌ | ✅ | ✅ |
| ADMIN_ACCESS | ❌ | ❌ | ✅ |
| USER_MANAGEMENT | ❌ | ❌ | ✅ |
| SYSTEM_CONFIG | ❌ | ❌ | ✅ |
| AGENT_CREATE | ✅ | ✅ | ✅ |
| AGENT_MODIFY | ❌ | ✅ | ✅ |
| AGENT_DELETE | ❌ | ❌ | ✅ |
| PROJECT_CREATE | ✅ | ✅ | ✅ |
| PROJECT_MODIFY | ❌ | ✅ | ✅ |
| PROJECT_DELETE | ❌ | ❌ | ✅ |
| WORKFLOW_EXECUTE | ✅ | ✅ | ✅ |
| WORKFLOW_CREATE | ❌ | ✅ | ✅ |
| WORKFLOW_MODIFY | ❌ | ✅ | ✅ |

## Testing

### Test with curl

```bash
# Login to get token
TOKEN=$(curl -X POST http://localhost:8888/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' \
  | jq -r '.access_token')

# Use token in authenticated request
curl http://localhost:8888/api/v2/agents \
  -H "Authorization: Bearer $TOKEN"

# WebSocket with token
wscat -c "ws://localhost:8888/ws?token=$TOKEN"
```

### Test with Python requests

```python
import requests

# Login
response = requests.post(
    "http://localhost:8888/api/v1/auth/login",
    json={"email": "user@example.com", "password": "password"}
)
token = response.json()["access_token"]

# Authenticated request
headers = {"Authorization": f"Bearer {token}"}
response = requests.get(
    "http://localhost:8888/api/v2/agents",
    headers=headers
)
print(response.json())
```

## Best Practices

1. **Always use dependencies**: Use `Depends(get_current_user)` instead of manually parsing tokens
2. **Principle of least privilege**: Use the most restrictive permission/role requirement
3. **Combine with resource ownership**: Check if user owns resource in addition to permissions
4. **Fail securely**: Default to denying access if unsure
5. **Log access attempts**: Use logging middleware to track authentication failures
6. **Token expiration**: Implement token refresh mechanism
7. **Secure token storage**: Never log or expose tokens in responses

## Migration from Backend

The Python implementation matches the Go backend:

| Go | Python |
|----|--------|
| `helper.SignedDetails` | `middleware.SignedDetails` |
| `helper.ValidateToken()` | `validate_token()` |
| `helper.GenerateTokens()` | `generate_tokens()` |
| `middleware.Authenticate()` | `AuthMiddleware` |
| `c.Set("userID", userID)` | `request.state.user_id = user_id` |
| `c.Get("userID")` | `request.state.user_id` |

Tokens generated by the backend can be validated by the Python service and vice versa, as long as they share the same `SECRET_KEY`.
