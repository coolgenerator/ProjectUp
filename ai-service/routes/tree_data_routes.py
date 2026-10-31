"""
Tree Data Management routes for the AI Agent API.
Provides CRUD endpoints for tree sessions and nodes with PostgreSQL persistence.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func
import logging
import uuid
from datetime import datetime
import os

from database.connection import get_db
from models.database.tree_models import IdeaForest, IdeaTree, IdeaNode, NodeConnection

logger = logging.getLogger(__name__)

# Import AI services
from services.llm.vertex_ai_service import vertex_ai_service

# Import tree service
from services.tree import TreeService


class LLMServiceAdapter:
    """Adapter to make VertexAIService compatible with TreeService expectations"""

    def __init__(self, vertex_service):
        self.vertex_service = vertex_service

    async def generate(self, prompt: str, system_prompt: str = None, max_tokens: int = 1000, temperature: float = 0.7):
        """Generate text using Vertex AI"""
        text = await self.vertex_service.generate_text(
            prompt=prompt,
            system_prompt=system_prompt,
            max_tokens=max_tokens,
            temperature=temperature
        )
        return {"content": text}

# Initialize service
tree_service = TreeService()

router = APIRouter(prefix="/ai-api", tags=["tree-data"])

# Pydantic models for request/response
from models.requests.tree_data_requests import (
    IdeaForestCreate,
    IdeaTreeCreate,
    IdeaNodeCreate,
    IdeaTreeQuery,
)
from models.responses.tree_data_responses import (
    IdeaForestResponse,
    IdeaTreeResponse,
    IdeaNodeResponse,
)

# Idea Forests CRUD

@router.get("/projects/{project_sid}/idea-forest", response_model=IdeaForestResponse)
async def get_or_create_idea_forest(project_sid: str, db: Session = Depends(get_db)):
    """Get or create an idea forest for a project (one forest per project)."""
    try:
        # Try to find existing forest
        forest = db.query(IdeaForest).filter(
            IdeaForest.project_sid == project_sid,
            IdeaForest.deleted_at.is_(None)
        ).first()

        # Create forest if it doesn't exist
        if not forest:
            forest = IdeaForest(
                project_sid=project_sid,
                name=f"Idea Forest for {project_sid}",
                description="Collection of idea trees for this project",
                created_by=1,  # TODO: Get from auth context
                trees_count=0,
                total_nodes_count=0
            )
            db.add(forest)
            db.commit()
            db.refresh(forest)

        return IdeaForestResponse(**forest.to_dict())
    except Exception as e:
        db.rollback()
        logger.error(f"Error getting/creating idea forest: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/idea-forests/{forest_id}", response_model=IdeaForestResponse)
async def get_idea_forest(forest_id: str, db: Session = Depends(get_db)):
    """Get an idea forest by ID."""
    try:
        forest = db.query(IdeaForest).filter(
            IdeaForest.id == uuid.UUID(forest_id),
            IdeaForest.deleted_at.is_(None)
        ).first()

        if not forest:
            raise HTTPException(status_code=404, detail="Idea forest not found")

        return IdeaForestResponse(**forest.to_dict())
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid forest ID format")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching idea forest: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/idea-forests", response_model=IdeaForestResponse)
async def create_idea_forest(forest_data: IdeaForestCreate, db: Session = Depends(get_db)):
    """Create a new idea forest."""
    try:
        # Check if forest already exists for this project
        existing_forest = db.query(IdeaForest).filter(
            IdeaForest.project_sid == forest_data.project_sid,
            IdeaForest.deleted_at.is_(None)
        ).first()

        if existing_forest:
            raise HTTPException(
                status_code=400,
                detail="Idea forest already exists for this project"
            )

        new_forest = IdeaForest(
            project_sid=forest_data.project_sid,
            name=forest_data.name,
            description=forest_data.description,
            created_by=1,  # TODO: Get from auth context
            trees_count=0,
            total_nodes_count=0
        )

        db.add(new_forest)
        db.commit()
        db.refresh(new_forest)

        return IdeaForestResponse(**new_forest.to_dict())
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating idea forest: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Idea Trees CRUD

@router.post("/tree-sessions", response_model=IdeaTreeResponse)
async def create_idea_tree(idea_tree_data: IdeaTreeCreate, db: Session = Depends(get_db)):
    """
    Create a new tree session with database persistence.

    Creates both a forest (if needed) and a tree record in the database.
    Each project has one forest which contains multiple trees.
    """
    try:
        from models.database.tree_models import IdeaForest, IdeaTree

        # Step 1: Get or create forest for this project
        forest = db.query(IdeaForest).filter(
            IdeaForest.project_sid == idea_tree_data.project_sid,
            IdeaForest.deleted_at.is_(None)
        ).first()

        if not forest:
            # Create a new forest for this project
            forest = IdeaForest(
                project_sid=idea_tree_data.project_sid,
                name=f"{idea_tree_data.project_sid} Idea Forest",
                description="Project idea forest",
                created_by=1  # TODO: Get from auth
            )
            db.add(forest)
            db.flush()  # Get forest.id before creating tree
            logger.info(f"Created new forest for project {idea_tree_data.project_sid}")

        # Step 2: Create the tree session
        new_tree = IdeaTree(
            forest_id=forest.id,
            project_sid=idea_tree_data.project_sid,
            name=idea_tree_data.name,
            description=idea_tree_data.description or "",
            color=idea_tree_data.color or "#3B82F6",
            icon=idea_tree_data.icon or "lightbulb",
            purpose=idea_tree_data.purpose or "",
            is_active=True,
            is_default=False,
            nodes_count=0,
            connections_count=0,
            completion_rate=0.0,
            created_by=1  # TODO: Get from auth
        )

        db.add(new_tree)
        db.commit()
        db.refresh(new_tree)

        logger.info(f"Created new tree session: {new_tree.id} in forest {forest.id}")

        # Step 3: Return the created tree
        return IdeaTreeResponse(
            id=str(new_tree.id),
            forest_id=str(new_tree.forest_id),
            project_sid=new_tree.project_sid,
            name=new_tree.name,
            description=new_tree.description or "",
            color=new_tree.color or "#3B82F6",
            icon=new_tree.icon or "lightbulb",
            purpose=new_tree.purpose or "",
            is_active=new_tree.is_active,
            is_default=new_tree.is_default,
            nodes_count=new_tree.nodes_count,
            connections_count=new_tree.connections_count,
            completion_rate=new_tree.completion_rate,
            created_at=new_tree.created_at.isoformat() if new_tree.created_at else datetime.utcnow().isoformat(),
            updated_at=new_tree.updated_at.isoformat() if new_tree.updated_at else datetime.utcnow().isoformat()
        )

    except Exception as e:
        db.rollback()
        logger.error(f"Error creating tree session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tree-sessions/{idea_tree_id}", response_model=IdeaTreeResponse)
async def get_idea_tree(idea_tree_id: str, db: Session = Depends(get_db)):
    """
    Get tree session details from database.

    Fetches the tree record from idea_trees table.
    """
    try:
        from models.database.tree_models import IdeaTree

        tree_id = uuid.UUID(idea_tree_id)

        # Query the tree from database
        tree = db.query(IdeaTree).filter(
            IdeaTree.id == tree_id,
            IdeaTree.deleted_at.is_(None)
        ).first()

        if not tree:
            raise HTTPException(status_code=404, detail="Tree session not found")

        # Return the tree data
        return IdeaTreeResponse(
            id=str(tree.id),
            forest_id=str(tree.forest_id),
            project_sid=tree.project_sid,
            name=tree.name,
            description=tree.description or "",
            color=tree.color or "#3B82F6",
            icon=tree.icon or "lightbulb",
            purpose=tree.purpose or "",
            is_active=tree.is_active,
            is_default=tree.is_default,
            nodes_count=tree.nodes_count,
            connections_count=tree.connections_count,
            completion_rate=tree.completion_rate,
            created_at=tree.created_at.isoformat() if tree.created_at else datetime.utcnow().isoformat(),
            updated_at=tree.updated_at.isoformat() if tree.updated_at else datetime.utcnow().isoformat()
        )

    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid tree ID format")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching tree session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/tree-sessions/{idea_tree_id}", response_model=IdeaTreeResponse)
async def update_idea_tree(idea_tree_id: str, updates: Dict[str, Any], db: Session = Depends(get_db)):
    """Update an idea tree."""
    try:
        idea_tree = db.query(IdeaTree).filter(
            IdeaTree.id == uuid.UUID(idea_tree_id),
            IdeaTree.deleted_at.is_(None)
        ).first()

        if not idea_tree:
            raise HTTPException(status_code=404, detail="Idea tree not found")

        # Update allowed fields
        for key, value in updates.items():
            if hasattr(idea_tree, key) and key not in ['id', 'created_at', 'created_by']:
                setattr(idea_tree, key, value)

        idea_tree.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(idea_tree)

        return IdeaTreeResponse(**idea_tree.to_dict())
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid idea tree ID format")
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating idea tree: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/tree-sessions/{idea_tree_id}")
async def delete_idea_tree(idea_tree_id: str, db: Session = Depends(get_db)):
    """Delete an idea tree (soft delete)."""
    try:
        idea_tree = db.query(IdeaTree).filter(
            IdeaTree.id == uuid.UUID(idea_tree_id),
            IdeaTree.deleted_at.is_(None)
        ).first()

        if not idea_tree:
            raise HTTPException(status_code=404, detail="Idea tree not found")

        idea_tree.deleted_at = datetime.utcnow()
        db.commit()

        return {"message": "Idea tree deleted successfully"}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid idea tree ID format")
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting idea tree: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/projects/{project_sid}/tree-sessions/summary")
async def get_project_idea_trees_summary(project_sid: str, db: Session = Depends(get_db)):
    """
    Get summary of all tree sessions for a project from database.

    Returns:
    - Tree sessions from idea_trees table
    - Count of legacy nodes (nodes without session_id assigned)
    """
    try:
        from models.database.tree_models import IdeaTree

        # 1. Query all trees for this project from database
        trees = db.query(IdeaTree).filter(
            IdeaTree.project_sid == project_sid,
            IdeaTree.deleted_at.is_(None)
        ).all()

        # 2. Count legacy nodes (without session_id)
        legacy_nodes_count = db.query(func.count(IdeaNode.id)).filter(
            IdeaNode.project_sid == project_sid,
            IdeaNode.deleted_at.is_(None),
            IdeaNode.session_id.is_(None)
        ).scalar() or 0

        # 3. Build session list from database trees
        sessions_data = []
        total_nodes = legacy_nodes_count

        for tree in trees:
            session_dict = {
                'id': str(tree.id),
                'forest_id': str(tree.forest_id),
                'project_sid': tree.project_sid,
                'name': tree.name,
                'description': tree.description,
                'color': tree.color,
                'icon': tree.icon,
                'nodes_count': tree.nodes_count,
                'connections_count': tree.connections_count,
                'is_active': tree.is_active,
                'is_default': tree.is_default,
                'created_at': tree.created_at.isoformat() if tree.created_at else None,
                'updated_at': tree.updated_at.isoformat() if tree.updated_at else None
            }
            sessions_data.append(session_dict)
            total_nodes += tree.nodes_count

        return {
            "sessions": sessions_data,
            "connections": [],
            "total_sessions": len(sessions_data),
            "total_nodes": total_nodes,
            "legacy_nodes": legacy_nodes_count,  # Nodes without session_id
            "total_connections": 0
        }
    except Exception as e:
        logger.error(f"Error fetching project tree sessions summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Idea Nodes CRUD

@router.post("/projects/{project_sid}/idea-tree/nodes", response_model=IdeaNodeResponse)
async def create_idea_node(project_sid: str, node_data: IdeaNodeCreate, db: Session = Depends(get_db)):
    """Create a new idea tree node. If initial_chat_prompt is provided, automatically creates chat session and sends first message."""
    try:
        # Calculate position if not provided
        position = node_data.position
        if not position and node_data.parent_id:
            # If node has a parent but no position, calculate position below parent
            parent = db.query(IdeaNode).filter(
                IdeaNode.id == uuid.UUID(node_data.parent_id),
                IdeaNode.deleted_at.is_(None)
            ).first()

            if parent and parent.position:
                # Count existing children to offset horizontally
                sibling_count = db.query(func.count(IdeaNode.id)).filter(
                    IdeaNode.parent_id == parent.id,
                    IdeaNode.deleted_at.is_(None)
                ).scalar() or 0

                # Position child below parent with horizontal offset based on sibling count
                parent_x = parent.position.get('x', 0)
                parent_y = parent.position.get('y', 0)
                position = {
                    "x": parent_x + (sibling_count * 330) - (sibling_count * 330) / 2,
                    "y": parent_y + 250  # 250px below parent
                }
                logger.info(f"Calculated position for child node: {position} (parent at {parent.position}, {sibling_count} siblings)")
            else:
                position = {"x": 0, "y": 0}
        elif not position:
            # No parent and no position - default to origin
            position = {"x": 0, "y": 0}

        new_node = IdeaNode(
            project_sid=project_sid,
            session_id=uuid.UUID(node_data.session_id) if node_data.session_id else None,
            parent_id=uuid.UUID(node_data.parent_id) if node_data.parent_id else None,
            title=node_data.title or "New Node",
            description=node_data.description or "",
            position=position,
            is_root=node_data.is_root if node_data.is_root is not None else (node_data.parent_id is None),
            color=node_data.color,
            icon=node_data.icon,
            expanded=True,
            created_by=node_data.user_id or 1  # Use provided user_id or default to 1
        )

        db.add(new_node)
        db.commit()
        db.refresh(new_node)

        # Update parent's child count if applicable
        if new_node.parent_id:
            parent = db.query(IdeaNode).filter(IdeaNode.id == new_node.parent_id).first()
            if parent:
                parent.sub_ideas_count = db.query(func.count(IdeaNode.id)).filter(
                    IdeaNode.parent_id == parent.id,
                    IdeaNode.deleted_at.is_(None)
                ).scalar()
                db.commit()

        # Update tree's node count if node belongs to a tree session
        if new_node.session_id:
            from models.database.tree_models import IdeaTree
            tree = db.query(IdeaTree).filter(
                IdeaTree.id == new_node.session_id,
                IdeaTree.deleted_at.is_(None)
            ).first()
            if tree:
                tree.nodes_count = db.query(func.count(IdeaNode.id)).filter(
                    IdeaNode.session_id == tree.id,
                    IdeaNode.deleted_at.is_(None)
                ).scalar()
                db.commit()
                logger.info(f"Updated tree {tree.id} node count to {tree.nodes_count}")

        # If initial chat prompt provided, store it in metadata for frontend to handle
        # Frontend will trigger the chat after node is created and visible
        if node_data.initial_chat_prompt and node_data.initial_chat_prompt.strip():
            logger.info(f"Node {new_node.id} created with initial chat prompt, frontend will handle chat initiation")
            new_node.node_metadata = new_node.node_metadata or {}
            new_node.node_metadata['initial_chat_prompt'] = node_data.initial_chat_prompt
            new_node.node_metadata['chat_prompt_pending'] = True
            db.commit()
            db.refresh(new_node)

        return IdeaNodeResponse(**new_node.to_dict())
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating idea node: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/projects/{project_sid}/idea-tree")
async def get_project_idea_tree(
    project_sid: str,
    session_id: Optional[str] = None,
    limit: Optional[int] = None,
    offset: int = 0,
    load_all: bool = False,
    db: Session = Depends(get_db)
):
    """
    Get nodes for a project's idea tree with optional pagination.

    Args:
        project_sid: Project short ID
        session_id: Optional tree session ID to filter nodes
        limit: Maximum number of nodes to return (default: all nodes for backward compatibility)
        offset: Number of nodes to skip (default: 0)
        load_all: Force loading all nodes without pagination (default: false)

    Returns:
        Nodes with pagination metadata
    """
    try:
        query = db.query(IdeaNode).filter(
            IdeaNode.project_sid == project_sid,
            IdeaNode.deleted_at.is_(None)
        )

        # Filter by session_id if provided
        if session_id:
            query = query.filter(IdeaNode.session_id == uuid.UUID(session_id))

        # Get total count for pagination
        total_count = query.count()

        # Apply pagination if limit is specified (not load_all mode)
        if limit is not None and not load_all:
            query = query.offset(offset).limit(limit)

        nodes = query.all()
        nodes_data = [node.to_dict() for node in nodes]

        return {
            "nodes": nodes_data,
            "total_nodes": total_count,
            "returned_nodes": len(nodes_data),
            "offset": offset,
            "limit": limit,
            "has_more": (offset + len(nodes_data)) < total_count if limit else False,
            "session_id": session_id,
            "connections": [],  # TODO: Implement node connections
            "threads": []  # TODO: Implement threads
        }
    except ValueError as e:
        logger.error(f"Invalid session_id format: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid session_id: {str(e)}")
    except Exception as e:
        logger.error(f"Error fetching project idea tree: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/idea-tree/nodes/{node_id}", response_model=IdeaNodeResponse)
async def update_idea_node(node_id: str, updates: Dict[str, Any], db: Session = Depends(get_db)):
    """Update an idea tree node."""
    try:
        logger.info(f"Updating node {node_id} with updates: {updates}")

        node = db.query(IdeaNode).filter(
            IdeaNode.id == uuid.UUID(node_id),
            IdeaNode.deleted_at.is_(None)
        ).first()

        if not node:
            raise HTTPException(status_code=404, detail="Node not found")

        # Update allowed fields
        for key, value in updates.items():
            # Special handling for metadata field (mapped to node_metadata in model)
            if key == 'metadata':
                node.node_metadata = value
            elif hasattr(node, key) and key not in ['id', 'created_at', 'created_by']:
                setattr(node, key, value)

        node.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(node)

        return IdeaNodeResponse(**node.to_dict())
    except ValueError as e:
        logger.error(f"ValueError updating node {node_id}: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid node ID format: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating idea node {node_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/idea-tree/nodes/{node_id}")
async def delete_idea_node(node_id: str, db: Session = Depends(get_db)):
    """Delete an idea tree node (soft delete)."""
    try:
        node = db.query(IdeaNode).filter(
            IdeaNode.id == uuid.UUID(node_id),
            IdeaNode.deleted_at.is_(None)
        ).first()

        if not node:
            raise HTTPException(status_code=404, detail="Node not found")

        # Store parent_id before deletion to update parent's children count
        parent_id = node.parent_id

        # Soft delete the node and all its children recursively
        def soft_delete_recursive(node_id):
            children = db.query(IdeaNode).filter(
                IdeaNode.parent_id == node_id,
                IdeaNode.deleted_at.is_(None)
            ).all()

            for child in children:
                soft_delete_recursive(child.id)
                child.deleted_at = datetime.utcnow()

        soft_delete_recursive(node.id)
        node.deleted_at = datetime.utcnow()

        # Update parent's sub_ideas_count if this node has a parent
        if parent_id:
            parent = db.query(IdeaNode).filter(
                IdeaNode.id == parent_id,
                IdeaNode.deleted_at.is_(None)
            ).first()

            if parent:
                # Recalculate children count (excluding soft-deleted nodes)
                active_children_count = db.query(IdeaNode).filter(
                    IdeaNode.parent_id == parent_id,
                    IdeaNode.deleted_at.is_(None)
                ).count()

                parent.sub_ideas_count = active_children_count
                parent.updated_at = datetime.utcnow()
                logger.info(f"Updated parent node {parent_id} children count to {active_children_count}")

        db.commit()

        return {"message": "Node deleted successfully"}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid node ID format")
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting idea node: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# AI Query endpoint

@router.post("/idea-tree/query")
async def query_idea_tree(query: IdeaTreeQuery):
    """
    AI-powered query endpoint for idea tree.
    Generates content based on user prompts and context.
    """
    try:
        # Use the query or prompt field
        user_prompt = query.query or query.prompt or ""

        # Create LLM service adapter
        llm_service = LLMServiceAdapter(vertex_ai_service)

        # Use TreeService to process the query
        result = await tree_service.process_ai_query(
            query=user_prompt,
            query_type=query.query_type,
            context=query.context,
            llm_service=llm_service
        )

        return result

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error processing idea tree query: {e}")
        raise HTTPException(status_code=500, detail=str(e))
