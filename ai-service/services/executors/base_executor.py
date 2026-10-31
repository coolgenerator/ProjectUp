"""
Base Action Executor

Abstract base class for all action executors.
"""

import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
import httpx

from models.entities.intent import ActionExecutionResult, ActionType

logger = logging.getLogger(__name__)


class BaseExecutor(ABC):
    """
    Abstract base class for action executors.

    Each executor handles one type of action (e.g., creating milestones, breaking down tasks).
    """

    def __init__(
        self,
        backend_url: str = "http://localhost:8080",
        ai_agent_url: str = "http://localhost:8000"
    ):
        """
        Initialize executor with service URLs.

        Args:
            backend_url: Backend API URL
            ai_agent_url: AI Agent API URL
        """
        self.backend_url = backend_url
        self.ai_agent_url = ai_agent_url

    @abstractmethod
    async def execute(
        self,
        parameters: Dict[str, Any],
        context: Dict[str, Any]
    ) -> ActionExecutionResult:
        """
        Execute the action with given parameters and context.

        Args:
            parameters: Action-specific parameters from intent detection
            context: Execution context (node_id, project_id, session_id, user_id)

        Returns:
            ActionExecutionResult with created nodes, dependencies, and status
        """
        pass

    async def create_node(
        self,
        session_id: str,
        title: str,
        description: str = "",
        metadata: Optional[Dict[str, Any]] = None,
        parent_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a node in the tree via AI Agent API.

        Args:
            session_id: Tree session ID
            title: Node title
            description: Node description
            metadata: Additional metadata (JSONB)
            parent_id: Parent node ID (for hierarchy)

        Returns:
            Created node data
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                payload = {
                    "session_id": session_id,
                    "title": title,
                    "description": description,
                    "metadata": metadata or {},
                }

                if parent_id:
                    payload["parent_id"] = parent_id

                response = await client.post(
                    f"{self.ai_agent_url}/ai-api/tree-sessions/nodes",
                    json=payload
                )
                response.raise_for_status()

                result = response.json()
                if result.get("success"):
                    return result.get("node", {})
                else:
                    raise Exception(f"Failed to create node: {result.get('message')}")

        except Exception as e:
            logger.error(f"Error creating node: {e}")
            raise

    async def create_dependency(
        self,
        source_node_id: str,
        target_node_id: str,
        dependency_type: str = "blocks",
        description: str = "",
        auto_created: bool = True
    ) -> Dict[str, Any]:
        """
        Create a dependency between two nodes.

        Args:
            source_node_id: Source node ID
            target_node_id: Target node ID
            dependency_type: Type of dependency (blocks, requires, relates_to)
            description: Dependency description
            auto_created: Mark as AI-created

        Returns:
            Created dependency data
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                payload = {
                    "source_node_id": source_node_id,
                    "target_node_id": target_node_id,
                    "dependency_type": dependency_type,
                    "description": description,
                    "auto_created": auto_created
                }

                # Note: This endpoint will be created in Phase 2
                response = await client.post(
                    f"{self.ai_agent_url}/ai-api/dependencies",
                    json=payload
                )
                response.raise_for_status()

                result = response.json()
                if result.get("success"):
                    return result.get("dependency", {})
                else:
                    raise Exception(f"Failed to create dependency: {result.get('message')}")

        except Exception as e:
            logger.error(f"Error creating dependency: {e}")
            # Don't fail execution if dependency creation fails
            return {}

    async def update_node_metadata(
        self,
        node_id: str,
        metadata: Dict[str, Any]
    ) -> bool:
        """
        Update node metadata (JSONB field).

        Args:
            node_id: Node ID to update
            metadata: Metadata to merge/update

        Returns:
            Success status
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.patch(
                    f"{self.ai_agent_url}/ai-api/tree-sessions/nodes/{node_id}/metadata",
                    json={"metadata": metadata}
                )
                response.raise_for_status()
                return True

        except Exception as e:
            logger.error(f"Error updating node metadata: {e}")
            return False
