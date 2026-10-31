"""
API Routes for Node Version Control
Provides endpoints for branching version control operations
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
import logging

from database.session import get_session
from services.node_version_service import NodeVersionService
from models.requests.version_requests import (
    CreateVersionRequest,
    CreateBranchRequest,
    MultiOptionRequest,
    AdoptVersionRequest,
    CompareVersionsRequest,
    ArchiveBranchRequest,
)
from models.responses.version_responses import (
    VersionResponse,
    BranchResponse,
    VersionTreeResponse,
    VersionComparisonResponse,
    BranchListResponse,
    VersionListResponse,
    AdoptVersionResponse,
    CreateMultiOptionResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai-api/versions", tags=["versions"])


# === Version Management Endpoints ===

@router.post("/create", response_model=VersionResponse)
async def create_version(
    request: CreateVersionRequest,
    user_id: int = Query(..., description="User ID creating the version"),
    db: Session = Depends(get_session)
):
    """
    Create a new version in a branch

    This endpoint creates a new version within the specified branch.
    If no branch is specified, defaults to 'main'.
    """
    try:
        service = NodeVersionService(db)

        version = service.create_version_in_branch(
            node_id=request.node_id,
            branch_name=request.branch_name,
            title=request.title,
            summary=request.summary,
            content=request.content,
            user_id=user_id,
            chat_session_id=None,  # Can be added later
            change_description=request.change_description,
            parent_version_id=request.parent_version_id,
            changed_fields=request.changed_fields
        )

        return VersionResponse(**version.to_dict())

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating version: {e}")
        raise HTTPException(status_code=500, detail="Failed to create version")


@router.post("/branches/create", response_model=BranchResponse)
async def create_branch(
    request: CreateBranchRequest,
    user_id: int = Query(..., description="User ID creating the branch"),
    chat_session_id: Optional[UUID] = Query(None, description="Chat session ID"),
    db: Session = Depends(get_session)
):
    """
    Create a new exploration branch

    Creates a new branch for exploring alternative approaches.
    """
    try:
        service = NodeVersionService(db)

        branch = service.create_branch_from_chat(
            node_id=request.node_id,
            branch_name=request.branch_name,
            display_name=request.display_name,
            prompt=request.prompt,
            chat_session_id=chat_session_id or UUID('00000000-0000-0000-0000-000000000000'),
            user_id=user_id,
            parent_version_id=request.parent_version_id
        )

        return BranchResponse(**branch.to_dict())

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating branch: {e}")
        raise HTTPException(status_code=500, detail="Failed to create branch")


@router.post("/multi-option/create", response_model=CreateMultiOptionResponse)
async def create_multi_option_branches(
    request: MultiOptionRequest,
    user_id: int = Query(..., description="User ID creating the options"),
    db: Session = Depends(get_session)
):
    """
    Create multiple option branches from chat

    This is typically used when AI generates multiple alternatives (Option A, Option B, etc.)
    """
    try:
        service = NodeVersionService(db)

        versions = service.create_multi_option_branches(
            node_id=request.node_id,
            chat_session_id=request.chat_session_id,
            options=request.options,
            user_id=user_id
        )

        # Get created branches
        from models.database.node_version_models import ChatBranch
        branch_names = [opt['branch_name'] for opt in request.options]
        branches = []
        for branch_name in branch_names:
            branch = db.query(ChatBranch).filter(
                ChatBranch.node_id == request.node_id,
                ChatBranch.branch_name == branch_name
            ).first()
            if branch:
                branches.append(BranchResponse(**branch.to_dict()))

        return CreateMultiOptionResponse(
            versions=[VersionResponse(**v.to_dict()) for v in versions],
            branches=branches,
            total_created=len(versions)
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating multi-option branches: {e}")
        raise HTTPException(status_code=500, detail="Failed to create options")


@router.post("/adopt", response_model=AdoptVersionResponse)
async def adopt_version(
    request: AdoptVersionRequest,
    user_id: int = Query(..., description="User ID adopting the version"),
    db: Session = Depends(get_session)
):
    """
    Adopt a version from one branch into another (typically into main)

    This merges the selected version into the target branch and optionally archives
    other branches.
    """
    try:
        service = NodeVersionService(db)

        # Get source version to track where it came from
        from models.database.node_version_models import NodeVersion
        source_version = db.query(NodeVersion).get(request.version_id)
        if not source_version:
            raise HTTPException(status_code=404, detail="Source version not found")

        # Adopt version
        new_version = service.adopt_version(
            node_id=request.node_id,
            version_id=request.version_id,
            target_branch=request.target_branch,
            user_id=user_id
        )

        # Get branches that were archived (if adopting to main)
        archived_branches = []
        if request.target_branch == 'main':
            from models.database.node_version_models import ChatBranch
            merged_branches = db.query(ChatBranch).filter(
                ChatBranch.node_id == request.node_id,
                ChatBranch.is_merged == True
            ).all()
            archived_branches = [b.branch_name for b in merged_branches
                                if b.branch_name != source_version.branch_name]

        return AdoptVersionResponse(
            new_version=VersionResponse(**new_version.to_dict()),
            adopted_from=source_version.full_version,
            target_branch=request.target_branch,
            archived_branches=archived_branches
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error adopting version: {e}")
        raise HTTPException(status_code=500, detail="Failed to adopt version")


# === Query Endpoints ===

@router.get("/node/{node_id}/current", response_model=Optional[VersionResponse])
async def get_current_version(
    node_id: UUID,
    branch: str = Query(default="main", description="Branch name"),
    db: Session = Depends(get_session)
):
    """
    Get the current version of a node in a specific branch
    Returns None if no version exists yet
    """
    try:
        service = NodeVersionService(db)
        version = service.get_current_version(node_id, branch)

        if not version:
            return None  # Return None instead of raising 404

        return VersionResponse(**version.to_dict())

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting current version: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get current version: {str(e)}")


@router.get("/node/{node_id}/tree", response_model=VersionTreeResponse)
async def get_version_tree(
    node_id: UUID,
    db: Session = Depends(get_session)
):
    """
    Get complete version tree for a node

    Returns all branches and the tree structure showing parent-child relationships.
    """
    try:
        service = NodeVersionService(db)
        tree = service.get_version_tree(node_id)

        # Convert to response format
        branches_response = {}
        for branch_name, versions in tree['branches'].items():
            branches_response[branch_name] = [
                VersionResponse(**v) for v in versions
            ]

        # Tree nodes
        tree_response = {}
        for full_version, node_data in tree['tree'].items():
            from models.responses.version_responses import VersionTreeNode
            tree_response[full_version] = VersionTreeNode(
                version=VersionResponse(**node_data['version']),
                children=node_data['children']
            )

        return VersionTreeResponse(
            branches=branches_response,
            tree=tree_response
        )

    except Exception as e:
        logger.error(f"Error getting version tree: {e}")
        raise HTTPException(status_code=500, detail="Failed to get version tree")


@router.get("/node/{node_id}/branches", response_model=BranchListResponse)
async def get_branches(
    node_id: UUID,
    active_only: bool = Query(default=True, description="Only return active branches"),
    db: Session = Depends(get_session)
):
    """
    Get all branches for a node
    """
    try:
        service = NodeVersionService(db)
        branches = service.get_branches(node_id, active_only=active_only)

        return BranchListResponse(
            branches=[BranchResponse(**b.to_dict()) for b in branches],
            total=len(branches)
        )

    except Exception as e:
        logger.error(f"Error getting branches: {e}")
        raise HTTPException(status_code=500, detail="Failed to get branches")


@router.get("/node/{node_id}/versions", response_model=VersionListResponse)
async def get_versions(
    node_id: UUID,
    branch: Optional[str] = Query(None, description="Filter by branch name"),
    limit: int = Query(default=50, description="Maximum versions to return"),
    db: Session = Depends(get_session)
):
    """
    Get versions for a node, optionally filtered by branch
    """
    try:
        from models.database.node_version_models import NodeVersion

        query = db.query(NodeVersion).filter(NodeVersion.node_id == node_id)

        if branch:
            query = query.filter(NodeVersion.branch_name == branch)

        query = query.order_by(NodeVersion.created_at.desc()).limit(limit)
        versions = query.all()

        # Get current version
        service = NodeVersionService(db)
        current = service.get_current_version(node_id, branch or 'main')

        return VersionListResponse(
            versions=[VersionResponse(**v.to_dict()) for v in versions],
            total=len(versions),
            current_version=VersionResponse(**current.to_dict()) if current else None
        )

    except Exception as e:
        logger.error(f"Error getting versions: {e}")
        raise HTTPException(status_code=500, detail="Failed to get versions")


@router.post("/compare", response_model=VersionComparisonResponse)
async def compare_versions(
    request: CompareVersionsRequest,
    db: Session = Depends(get_session)
):
    """
    Compare two versions and return diff information
    """
    try:
        service = NodeVersionService(db)
        comparison = service.compare_versions(
            request.version_a_id,
            request.version_b_id
        )

        if not comparison:
            raise HTTPException(status_code=404, detail="One or both versions not found")

        from models.responses.version_responses import VersionDiffStats

        return VersionComparisonResponse(
            version_a=VersionResponse(**comparison['version_a']),
            version_b=VersionResponse(**comparison['version_b']),
            title_changed=comparison['title_changed'],
            summary_diff=VersionDiffStats(**comparison['summary_diff']),
            content_diff=VersionDiffStats(**comparison['content_diff']),
            tags_changed=comparison['tags_changed']
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error comparing versions: {e}")
        raise HTTPException(status_code=500, detail="Failed to compare versions")


@router.post("/branches/archive", response_model=BranchResponse)
async def archive_branch(
    request: ArchiveBranchRequest,
    db: Session = Depends(get_session)
):
    """
    Archive a branch and its versions

    Archived branches are hidden from active views but preserved for history.
    """
    try:
        service = NodeVersionService(db)
        service.archive_branch(request.node_id, request.branch_name)

        # Get archived branch
        from models.database.node_version_models import ChatBranch
        branch = db.query(ChatBranch).filter(
            ChatBranch.node_id == request.node_id,
            ChatBranch.branch_name == request.branch_name
        ).first()

        if not branch:
            raise HTTPException(status_code=404, detail="Branch not found")

        return BranchResponse(**branch.to_dict())

    except Exception as e:
        logger.error(f"Error archiving branch: {e}")
        raise HTTPException(status_code=500, detail="Failed to archive branch")


@router.get("/version/{version_id}", response_model=VersionResponse)
async def get_version_by_id(
    version_id: UUID,
    db: Session = Depends(get_session)
):
    """
    Get a specific version by ID
    """
    try:
        from models.database.node_version_models import NodeVersion
        version = db.query(NodeVersion).get(version_id)

        if not version:
            raise HTTPException(status_code=404, detail="Version not found")

        return VersionResponse(**version.to_dict())

    except Exception as e:
        logger.error(f"Error getting version: {e}")
        raise HTTPException(status_code=500, detail="Failed to get version")
