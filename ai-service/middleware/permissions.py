"""
Permissions and Role-Based Access Control

Provides role and permission checking for authenticated users.
"""

from enum import Enum
from typing import List, Optional
from fastapi import HTTPException, status, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from middleware.auth import SignedDetails, get_current_user


class UserRole(str, Enum):
    """User roles matching backend user types"""
    USER = "USER"
    ADMIN = "ADMIN"
    MODERATOR = "MODERATOR"


class Permission(str, Enum):
    """System permissions"""
    # General permissions
    READ = "read"
    WRITE = "write"
    DELETE = "delete"

    # Admin permissions
    ADMIN_ACCESS = "admin_access"
    USER_MANAGEMENT = "user_management"
    SYSTEM_CONFIG = "system_config"

    # Agent permissions
    AGENT_CREATE = "agent_create"
    AGENT_MODIFY = "agent_modify"
    AGENT_DELETE = "agent_delete"

    # Project permissions
    PROJECT_CREATE = "project_create"
    PROJECT_MODIFY = "project_modify"
    PROJECT_DELETE = "project_delete"

    # Workflow permissions
    WORKFLOW_EXECUTE = "workflow_execute"
    WORKFLOW_CREATE = "workflow_create"
    WORKFLOW_MODIFY = "workflow_modify"


# Role to permissions mapping
ROLE_PERMISSIONS = {
    UserRole.ADMIN: [
        # Admins have all permissions
        Permission.READ,
        Permission.WRITE,
        Permission.DELETE,
        Permission.ADMIN_ACCESS,
        Permission.USER_MANAGEMENT,
        Permission.SYSTEM_CONFIG,
        Permission.AGENT_CREATE,
        Permission.AGENT_MODIFY,
        Permission.AGENT_DELETE,
        Permission.PROJECT_CREATE,
        Permission.PROJECT_MODIFY,
        Permission.PROJECT_DELETE,
        Permission.WORKFLOW_EXECUTE,
        Permission.WORKFLOW_CREATE,
        Permission.WORKFLOW_MODIFY,
    ],
    UserRole.MODERATOR: [
        # Moderators have most permissions except admin-specific ones
        Permission.READ,
        Permission.WRITE,
        Permission.DELETE,
        Permission.AGENT_CREATE,
        Permission.AGENT_MODIFY,
        Permission.PROJECT_CREATE,
        Permission.PROJECT_MODIFY,
        Permission.WORKFLOW_EXECUTE,
        Permission.WORKFLOW_CREATE,
        Permission.WORKFLOW_MODIFY,
    ],
    UserRole.USER: [
        # Regular users have basic permissions
        Permission.READ,
        Permission.WRITE,
        Permission.AGENT_CREATE,
        Permission.PROJECT_CREATE,
        Permission.WORKFLOW_EXECUTE,
    ],
}


async def get_user_role(user_id: int, db: Optional[AsyncSession] = None) -> UserRole:
    """
    Get user role from database.

    Args:
        user_id: User ID
        db: Database session (optional)

    Returns:
        UserRole: User's role

    Note:
        If db is not provided, this will default to USER role.
        In production, implement database lookup.
    """
    if not db:
        # Default to USER role if no database connection
        # TODO: Implement proper database lookup
        return UserRole.USER

    # TODO: Implement database query to get user type
    # Example:
    # result = await db.execute(
    #     select(User.user_type).where(User.id == user_id)
    # )
    # user_type = result.scalar_one_or_none()
    # return UserRole(user_type) if user_type else UserRole.USER

    return UserRole.USER


def has_permission(role: UserRole, permission: Permission) -> bool:
    """
    Check if a role has a specific permission.

    Args:
        role: User role
        permission: Required permission

    Returns:
        bool: True if role has the permission
    """
    return permission in ROLE_PERMISSIONS.get(role, [])


def has_any_permission(role: UserRole, permissions: List[Permission]) -> bool:
    """
    Check if a role has any of the specified permissions.

    Args:
        role: User role
        permissions: List of permissions

    Returns:
        bool: True if role has at least one permission
    """
    role_perms = ROLE_PERMISSIONS.get(role, [])
    return any(perm in role_perms for perm in permissions)


def has_all_permissions(role: UserRole, permissions: List[Permission]) -> bool:
    """
    Check if a role has all of the specified permissions.

    Args:
        role: User role
        permissions: List of permissions

    Returns:
        bool: True if role has all permissions
    """
    role_perms = ROLE_PERMISSIONS.get(role, [])
    return all(perm in role_perms for perm in permissions)


# FastAPI Dependencies


def require_role(required_role: UserRole):
    """
    Create a dependency that requires a specific role.

    Args:
        required_role: Required role

    Returns:
        Callable: Dependency function

    Example:
        @router.post("/admin/action")
        async def admin_action(user: SignedDetails = Depends(require_role(UserRole.ADMIN))):
            return {"message": "Admin action performed"}
    """
    async def role_checker(
        user: SignedDetails = Depends(get_current_user),
        db: Optional[AsyncSession] = None
    ) -> SignedDetails:
        user_role = await get_user_role(user.ID, db)

        if user_role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required role: {required_role.value}"
            )

        return user

    return role_checker


def require_any_role(required_roles: List[UserRole]):
    """
    Create a dependency that requires any of the specified roles.

    Args:
        required_roles: List of acceptable roles

    Returns:
        Callable: Dependency function

    Example:
        @router.post("/moderator/action")
        async def mod_action(
            user: SignedDetails = Depends(require_any_role([UserRole.ADMIN, UserRole.MODERATOR]))
        ):
            return {"message": "Moderator action performed"}
    """
    async def role_checker(
        user: SignedDetails = Depends(get_current_user),
        db: Optional[AsyncSession] = None
    ) -> SignedDetails:
        user_role = await get_user_role(user.ID, db)

        if user_role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required roles: {', '.join(r.value for r in required_roles)}"
            )

        return user

    return role_checker


def require_permission(required_permission: Permission):
    """
    Create a dependency that requires a specific permission.

    Args:
        required_permission: Required permission

    Returns:
        Callable: Dependency function

    Example:
        @router.delete("/agent/{agent_id}")
        async def delete_agent(
            agent_id: str,
            user: SignedDetails = Depends(require_permission(Permission.AGENT_DELETE))
        ):
            return {"message": "Agent deleted"}
    """
    async def permission_checker(
        user: SignedDetails = Depends(get_current_user),
        db: Optional[AsyncSession] = None
    ) -> SignedDetails:
        user_role = await get_user_role(user.ID, db)

        if not has_permission(user_role, required_permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required permission: {required_permission.value}"
            )

        return user

    return permission_checker


def require_any_permission(required_permissions: List[Permission]):
    """
    Create a dependency that requires any of the specified permissions.

    Args:
        required_permissions: List of acceptable permissions

    Returns:
        Callable: Dependency function

    Example:
        @router.put("/project/{project_id}")
        async def update_project(
            project_id: str,
            user: SignedDetails = Depends(require_any_permission([
                Permission.PROJECT_MODIFY,
                Permission.ADMIN_ACCESS
            ]))
        ):
            return {"message": "Project updated"}
    """
    async def permission_checker(
        user: SignedDetails = Depends(get_current_user),
        db: Optional[AsyncSession] = None
    ) -> SignedDetails:
        user_role = await get_user_role(user.ID, db)

        if not has_any_permission(user_role, required_permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required permissions: {', '.join(p.value for p in required_permissions)}"
            )

        return user

    return permission_checker


def require_all_permissions(required_permissions: List[Permission]):
    """
    Create a dependency that requires all of the specified permissions.

    Args:
        required_permissions: List of required permissions

    Returns:
        Callable: Dependency function
    """
    async def permission_checker(
        user: SignedDetails = Depends(get_current_user),
        db: Optional[AsyncSession] = None
    ) -> SignedDetails:
        user_role = await get_user_role(user.ID, db)

        if not has_all_permissions(user_role, required_permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required all permissions: {', '.join(p.value for p in required_permissions)}"
            )

        return user

    return permission_checker


# Shorthand dependencies for common cases

require_admin = require_role(UserRole.ADMIN)
require_moderator = require_any_role([UserRole.ADMIN, UserRole.MODERATOR])
