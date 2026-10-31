# Authentication & Redirect Flow Guide

This guide explains how the authentication and redirect system works in ProjectUp, including how to protect routes and handle shared resources.

## Table of Contents

1. [Overview](#overview)
2. [Frontend Implementation](#frontend-implementation)
3. [Backend Implementation](#backend-implementation)
4. [Usage Examples](#usage-examples)
5. [Flow Diagrams](#flow-diagrams)

## Overview

When users try to access protected resources (projects, posts, courses, etc.) without being authenticated, the system:

1. **Captures the requested URL** with all query parameters
2. **Redirects to login** with the original URL as a `redirect` parameter
3. **After successful login**, navigates back to the originally requested URL

This ensures users can access shared links even if they're not logged in - they just need to log in first.

## Frontend Implementation

### 1. Protected Route Component

Use the `ProtectedRoute` component to wrap any route that requires authentication:

```tsx
import ProtectedRoute from '@/components/auth/ProtectedRoute';

// In your router configuration
<Route
  path="/project/:shortId"
  element={
    <ProtectedRoute>
      <ProjectPage />
    </ProtectedRoute>
  }
/>
```

**How it works:**
- Checks if user is authenticated
- If not, redirects to `/login?redirect={encoded-current-path}`
- Preserves all query parameters from the original URL

**File:** `frontend/src/components/auth/ProtectedRoute.tsx`

### 2. withAuth HOC (Higher-Order Component)

Alternative approach using a HOC for component-level protection:

```tsx
import withAuth from '@/hooks/withAuth';

const MyProtectedComponent = () => {
  return <div>Protected content</div>;
};

export default withAuth(MyProtectedComponent);
```

**How it works:**
- Wraps your component and checks authentication
- Automatically handles token refresh if needed
- Redirects to login with current path if not authenticated
- Shows loading state while checking auth

**File:** `frontend/src/hooks/withAuth.tsx`

### 3. Login Component

The login component automatically handles the redirect parameter:

```tsx
// After successful login (lines 112-123 in Login.tsx)
const urlParams = new URLSearchParams(window.location.search);
const redirectPath = urlParams.get('redirect');
const decodedRedirectPath = redirectPath ? decodeURIComponent(redirectPath) : null;

if (decodedRedirectPath) {
  navigate(decodedRedirectPath);
} else {
  navigate('/home');
}
```

**Features:**
- Decodes the URI-encoded redirect path
- Navigates to the original URL after login
- Falls back to `/home` if no redirect parameter
- Checks profile completion and may redirect to `/edit-profile`

**File:** `frontend/src/routes/login/Login.tsx`

### 4. OAuth Flow

OAuth authentication also preserves the redirect parameter:

```tsx
// When initiating OAuth (in Login.tsx)
const handleOAuthLogin = (provider: string) => {
  const urlParams = new URLSearchParams(window.location.search);
  const redirectPath = urlParams.get('redirect');

  // Store in sessionStorage for OAuth callback
  if (redirectPath) {
    sessionStorage.setItem('oauth_redirect', redirectPath);
  }

  window.location.href = `${API_BASE_URL}/api/auth/${provider}`;
};

// In OAuth callback (OAuthCallback.tsx)
const storedRedirect = sessionStorage.getItem('oauth_redirect');
if (storedRedirect) {
  sessionStorage.removeItem('oauth_redirect');
  navigate(decodeURIComponent(storedRedirect));
}
```

**Files:**
- `frontend/src/routes/login/Login.tsx`
- `frontend/src/components/auth/OAuthCallback.tsx`

## Backend Implementation

### 1. Authentication Middleware

The backend provides two authentication middleware options:

#### Required Authentication
```go
router.GET("/api/projects/:sid", middleware.Authenticate(), controller.GetProject)
```

Returns `401 Unauthorized` if no valid token is present.

#### Optional Authentication
```go
router.GET("/api/learning/public-courses", middleware.OptionalAuthenticate(), controller.GetPublicCourses)
```

Continues without error if no token is present, but sets `userID` in context if token is valid.

**File:** `backend/middleware/authMiddleware.go`

### 2. Permission Checking Middleware

New permission middleware for granular access control:

```go
import (
    "projectup/middleware"
    "projectup/helper"
)

// Check if user has access (returns 401 if not authenticated)
router.GET(
    "/api/projects/:sid/share/:token",
    middleware.CheckResourceAccess(helper.ResourceProject, false),
    controller.GetSharedProject,
)

// Optional authentication (allows public access)
router.GET(
    "/api/learning/path/:topicId",
    middleware.CheckResourceAccess(helper.ResourceCourse, true),
    controller.GetLearningPath,
)
```

**File:** `backend/middleware/permissionMiddleware.go`

### 3. Permission Helper Functions

Use the permission helper for manual permission checks:

```go
import "projectup/helper"

func (c *Controller) GetProject(ctx *gin.Context) {
    // Get user ID from context
    userID, exists := helper.GetUserIDFromContext(ctx)
    if !exists {
        ctx.JSON(http.StatusUnauthorized, gin.H{
            "error": "Authentication required",
        })
        return
    }

    // Check if user has permission
    hasPermission, statusCode, err := helper.CheckResourcePermission(
        userID,
        projectID,
        projectChecker, // implements PermissionChecker interface
        false, // requireOwnership
    )

    if !hasPermission {
        helper.SendPermissionError(ctx, statusCode, err.Error())
        return
    }

    // User has permission, proceed...
}
```

**File:** `backend/helper/permissionHelper.go`

### 4. Implementing PermissionChecker Interface

Create a checker for your resource type:

```go
type ProjectPermissionChecker struct {
    repo *ProjectRepository
}

func (p *ProjectPermissionChecker) IsOwner(userID int, resourceID interface{}) (bool, error) {
    projectID := resourceID.(int)
    project, err := p.repo.GetProjectByID(projectID)
    if err != nil {
        return false, err
    }
    return project.OwnerID == userID, nil
}

func (p *ProjectPermissionChecker) IsMember(userID int, resourceID interface{}) (bool, error) {
    projectID := resourceID.(int)
    return p.repo.IsProjectMember(userID, projectID)
}

func (p *ProjectPermissionChecker) CanView(userID int, resourceID interface{}) (bool, error) {
    // Check if user can view the resource
    // This might check project membership or public status
    isOwner, _ := p.IsOwner(userID, resourceID)
    if isOwner {
        return true, nil
    }

    isMember, _ := p.IsMember(userID, resourceID)
    if isMember {
        return true, nil
    }

    // Check if project is public
    projectID := resourceID.(int)
    project, err := p.repo.GetProjectByID(projectID)
    if err != nil {
        return false, err
    }

    return project.IsPublic, nil
}

// Implement other methods...
```

## Usage Examples

### Example 1: Protecting a Project Page

**Frontend Route:**
```tsx
<Route
  path="/project/:shortId/dashboard"
  element={
    <ProtectedRoute>
      <ProjectDashboard />
    </ProtectedRoute>
  }
/>
```

**Backend Route:**
```go
router.GET(
    "/api/projects/:sid/details",
    middleware.Authenticate(),
    projectController.GetProjectDetails,
)
```

**Controller:**
```go
func (pc *ProjectController) GetProjectDetails(c *gin.Context) {
    shortID := c.Param("sid")
    userID, _ := helper.GetUserIDFromContext(c)

    // Get project
    project, err := pc.service.GetProjectByShortID(shortID)
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
        return
    }

    // Check permission
    checker := &ProjectPermissionChecker{repo: pc.repo}
    hasPermission, statusCode, err := helper.CheckResourcePermission(
        userID,
        project.ID,
        checker,
        false, // don't require ownership
    )

    if !hasPermission {
        helper.SendPermissionError(c, statusCode, err.Error())
        return
    }

    c.JSON(http.StatusOK, project)
}
```

### Example 2: Shared Resource with Optional Auth

**Frontend Route:**
```tsx
// Public access allowed, but shows different content for authenticated users
<Route path="/post/:shortId" element={<PostPage />} />
```

**Backend Route:**
```go
router.GET(
    "/api/content/post/:shortId",
    middleware.OptionalAuthenticate(),
    postController.GetPost,
)
```

**Controller:**
```go
func (pc *PostController) GetPost(c *gin.Context) {
    shortID := c.Param("shortId")

    // Get the post
    post, err := pc.service.GetPostByShortID(shortID)
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Post not found"})
        return
    }

    // Check if post is public
    if !post.IsPublic {
        // If not public, require authentication
        userID, exists := helper.GetUserIDFromContext(c)
        if !exists {
            c.JSON(http.StatusUnauthorized, gin.H{
                "error": "This post is private. Please log in to view.",
            })
            return
        }

        // Check if user has access
        checker := &PostPermissionChecker{repo: pc.repo}
        hasPermission, statusCode, err := helper.CheckResourcePermission(
            userID,
            post.ID,
            checker,
            false,
        )

        if !hasPermission {
            helper.SendPermissionError(c, statusCode, err.Error())
            return
        }
    }

    // Return post (with different fields based on auth status if needed)
    c.JSON(http.StatusOK, post)
}
```

### Example 3: Sharing a Private Project

**User Flow:**
1. User receives link: `https://projectup.com/project/abc123/dashboard`
2. User is not logged in
3. Frontend `ProtectedRoute` redirects to: `/login?redirect=%2Fproject%2Fabc123%2Fdashboard`
4. User logs in
5. Login component decodes redirect and navigates to `/project/abc123/dashboard`
6. Backend checks if user has permission to view the project
7. If yes, displays project; if no, returns 403 Forbidden

**Backend Share Token Flow:**
```go
// Create share token
router.POST(
    "/api/projects/:sid/share",
    middleware.Authenticate(),
    projectController.CreateShareToken,
)

// Access via share token
router.GET(
    "/api/projects/share/:token",
    middleware.CheckResourceAccess(helper.ResourceProject, true),
    projectController.GetSharedProject,
)
```

**Share Token Controller:**
```go
func (pc *ProjectController) GetSharedProject(c *gin.Context) {
    shareToken := c.Param("token")

    // Verify share token
    share, err := pc.service.GetShareByToken(shareToken)
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Invalid share link"})
        return
    }

    // Check if share token is expired
    if share.ExpiresAt.Before(time.Now()) {
        c.JSON(http.StatusGone, gin.H{"error": "Share link has expired"})
        return
    }

    // Get the project
    project, err := pc.service.GetProjectByID(share.ProjectID)
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
        return
    }

    // Optional: Track share access
    userID, _ := helper.GetUserIDFromContext(c)
    pc.service.TrackShareAccess(share.ID, userID)

    c.JSON(http.StatusOK, project)
}
```

## Flow Diagrams

### Basic Authentication Flow

```
User visits /project/abc123
         ↓
Is user authenticated?
         ↓                ↓
        NO               YES
         ↓                ↓
Redirect to:         Display
/login?redirect=     project
%2Fproject%2Fabc123
         ↓
User logs in
         ↓
Navigate to
/project/abc123
         ↓
Backend checks
permissions
         ↓                ↓
    Has access      No access
         ↓                ↓
    Display          Return 403
    project          Forbidden
```

### OAuth Authentication Flow with Redirect

```
User visits /learning/course-123
         ↓
Not authenticated
         ↓
Redirect to /login?redirect=%2Flearning%2Fcourse-123
         ↓
User clicks "Login with Google"
         ↓
Store redirect in sessionStorage
         ↓
Redirect to Google OAuth
         ↓
User authorizes
         ↓
Callback to /auth/google/callback
         ↓
Retrieve redirect from sessionStorage
         ↓
Complete login, navigate to /learning/course-123
```

### Permission Checking Flow

```
API Request to /api/projects/123
         ↓
Authenticate middleware
         ↓
Extract userID from token
         ↓
Get project from database
         ↓
Check permissions:
1. Is user owner?
2. Is user member?
3. Is project public?
         ↓                ↓
    Has access      No access
         ↓                ↓
    Return           Return 401 or 403
    project          with error message
         ↓
    Frontend receives 401
         ↓
    Redirect to login with
    current path as redirect param
```

## HTTP Status Codes

The system uses specific HTTP status codes to communicate different auth states:

- **200 OK**: User has permission, request successful
- **401 Unauthorized**: User is not authenticated (triggers redirect to login)
- **403 Forbidden**: User is authenticated but lacks permission
- **404 Not Found**: Resource doesn't exist
- **410 Gone**: Resource existed but is no longer available (e.g., expired share link)

Frontend should handle these appropriately:
- **401**: Redirect to login with current path
- **403**: Show "Access Denied" message
- **404**: Show "Not Found" page

## Best Practices

1. **Always use ProtectedRoute or withAuth** for frontend routes requiring authentication
2. **Use OptionalAuthenticate** for public resources that show different content for logged-in users
3. **Check permissions in backend** even if frontend restricts access
4. **Return 401 for auth required**, 403 for insufficient permissions
5. **Use share tokens** for temporary access to private resources
6. **Track share access** for analytics and security
7. **Set expiration dates** on share tokens
8. **Validate redirect URLs** to prevent open redirect vulnerabilities

## Security Considerations

### Frontend
- Always encode redirect URLs with `encodeURIComponent()`
- Validate redirect URLs before navigation (should be internal paths only)
- Clear sensitive data from sessionStorage after use

### Backend
- Never trust client-side permission checks alone
- Always validate JWT tokens server-side
- Implement rate limiting on auth endpoints
- Log failed permission checks for security monitoring
- Use HTTPS for all authentication requests
- Implement CSRF protection for state-changing operations

## Troubleshooting

### Redirect Loop
**Problem**: User keeps getting redirected back to login
**Solution**: Check that tokens are being stored correctly in Redux and localStorage

### OAuth Redirect Lost
**Problem**: After OAuth login, user goes to home instead of original URL
**Solution**: Check that `oauth_redirect` is being stored/retrieved from sessionStorage correctly

### 403 Forbidden on Public Resource
**Problem**: Public resource returns 403 even though it should be accessible
**Solution**: Ensure `OptionalAuthenticate` is used instead of `Authenticate` middleware

### Token Expired During Session
**Problem**: User gets logged out unexpectedly
**Solution**: Check that token refresh is working in `fetchWithAuth.tsx`

## Additional Resources

- **Frontend Auth Files:**
  - `frontend/src/components/auth/ProtectedRoute.tsx`
  - `frontend/src/hooks/withAuth.tsx`
  - `frontend/src/hooks/fetchWithAuth.tsx`
  - `frontend/src/routes/login/Login.tsx`
  - `frontend/src/components/auth/OAuthCallback.tsx`

- **Backend Auth Files:**
  - `backend/middleware/authMiddleware.go`
  - `backend/middleware/permissionMiddleware.go`
  - `backend/helper/authHelper.go`
  - `backend/helper/permissionHelper.go`
  - `backend/helper/token.go`

- **Architecture Documentation:**
  - `CLAUDE.md` - Main architecture overview
  - `backend/README.md` - Backend-specific docs
  - `frontend/README.md` - Frontend-specific docs
