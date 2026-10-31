"""
Project SID to ID Resolver

The AI service and backend share the same PostgreSQL database.
This module resolves project short_ids (sids) to integer IDs by querying the projects table directly.
"""

from typing import Optional
import logging
from sqlalchemy import text
from database.connection import engine

logger = logging.getLogger(__name__)


def resolve_sid_to_id(sid: str) -> Optional[int]:
    """
    Resolve a project short_id (sid) to its integer ID.

    Queries the projects table in the shared database.

    Args:
        sid: Project short ID (UUID string like 'wAR2kotV')

    Returns:
        Integer project ID, or None if not found
    """
    try:
        with engine.connect() as conn:
            result = conn.execute(
                text("SELECT id FROM projects WHERE sid = :sid LIMIT 1"),
                {"sid": sid}
            )
            row = result.fetchone()

            if row:
                project_id = row[0]
                logger.debug(f"Resolved sid '{sid}' to id {project_id}")
                return int(project_id)
            else:
                logger.warning(f"No project found for sid '{sid}'")
                return None

    except Exception as e:
        logger.error(f"Error resolving sid '{sid}': {e}")
        return None


def resolve_sid_or_passthrough(project_id_or_sid: str) -> str:
    """
    Try to resolve a sid to id, or pass through if it's already an id.

    This function attempts to resolve the sid. If resolution fails,
    it assumes the input might already be an id and returns it as-is.

    Args:
        project_id_or_sid: Either a project sid or numeric id as string

    Returns:
        String representation of project id
    """
    # If it's already a number, return it
    if project_id_or_sid.isdigit():
        return project_id_or_sid

    # Try to resolve sid to id
    project_id = resolve_sid_to_id(project_id_or_sid)

    if project_id is not None:
        return str(project_id)

    # If resolution failed, return original (might be legacy data)
    logger.warning(f"Could not resolve '{project_id_or_sid}', using as-is")
    return project_id_or_sid
