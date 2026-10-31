"""
Mention Service - Semantic search and material aggregation for @ mentions

Provides:
1. Semantic search across project materials using embeddings
2. Aggregated view of all mentionable materials (nodes, papers, resources, courses)
3. Context-aware suggestions based on current conversation
"""

import logging
from typing import List, Dict, Any, Optional
import httpx
from datetime import datetime

logger = logging.getLogger(__name__)


class MentionService:
    """Service for handling @ mention search and suggestions"""

    def __init__(self, backend_url: str = "http://localhost:8080", ai_agent_url: str = "http://localhost:8000"):
        self.backend_url = backend_url
        self.ai_agent_url = ai_agent_url

    async def get_all_mentionable_materials(
        self,
        project_id: str,
        user_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Fetch all mentionable materials for a project

        Returns a structured dict with:
        - nodes: List of all nodes across all trees
        - papers: List of research papers (PDF only)
        - resources: List of resources (links and files)
        - courses: List of courses
        """
        materials = {
            "nodes": [],
            "papers": [],
            "resources": [],
            "courses": [],
            "total_count": 0
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # 1. Fetch all nodes from all trees
                try:
                    nodes_response = await client.get(
                        f"{self.ai_agent_url}/ai-api/projects/{project_id}/idea-tree/nodes"
                    )
                    if nodes_response.status_code == 200:
                        nodes_data = nodes_response.json()
                        all_nodes = nodes_data.get("nodes", [])

                        # Fetch tree session names for context
                        sessions_response = await client.get(
                            f"{self.ai_agent_url}/ai-api/projects/{project_id}/tree-sessions/summary"
                        )
                        session_names = {}
                        if sessions_response.status_code == 200:
                            sessions_data = sessions_response.json()
                            sessions = sessions_data.get("sessions", [])
                            session_names = {s["id"]: s["name"] for s in sessions}

                        # Add nodes with tree context
                        for node in all_nodes:
                            tree_name = session_names.get(node.get("session_id"), "Unknown Tree")
                            materials["nodes"].append({
                                "id": node.get("id"),
                                "title": node.get("title"),
                                "description": node.get("description", ""),
                                "type": "node",
                                "metadata": {
                                    **node,
                                    "treeName": tree_name,
                                    "sessionId": node.get("session_id")
                                }
                            })
                except Exception as e:
                    logger.error(f"Error fetching nodes: {e}")

                # 2. Fetch research papers (PDF only)
                try:
                    papers_response = await client.get(
                        f"{self.backend_url}/api/papers",
                        params={"project_id": project_id}
                    )
                    if papers_response.status_code == 200:
                        papers_data = papers_response.json()
                        papers = papers_data.get("data", [])

                        # Filter to only papers with PDFs
                        for paper in papers:
                            if paper.get("file_url"):  # Only papers with file_url (PDF)
                                materials["papers"].append({
                                    "id": str(paper.get("id")),
                                    "title": paper.get("title"),
                                    "description": paper.get("abstract", ""),
                                    "type": "paper",
                                    "metadata": {
                                        "authors": paper.get("authors"),
                                        "year": paper.get("year"),
                                        "venue": paper.get("venue"),
                                        "doi": paper.get("doi"),
                                        "arxiv_id": paper.get("arxiv_id"),
                                        "file_url": paper.get("file_url")
                                    }
                                })
                except Exception as e:
                    logger.error(f"Error fetching papers: {e}")

                # 3. Fetch resources
                try:
                    resources_response = await client.get(
                        f"{self.backend_url}/api/resources",
                        params={"project_id": project_id}
                    )
                    if resources_response.status_code == 200:
                        resources_data = resources_response.json()
                        resources = resources_data.get("data", [])

                        for resource in resources:
                            materials["resources"].append({
                                "id": str(resource.get("id")),
                                "title": resource.get("title"),
                                "description": resource.get("description", ""),
                                "type": "resource",
                                "subType": resource.get("type"),  # 'link' or 'file'
                                "metadata": {
                                    "url": resource.get("url"),
                                    "file_name": resource.get("file_name"),
                                    "tags": resource.get("tags", [])
                                }
                            })
                except Exception as e:
                    logger.error(f"Error fetching resources: {e}")

                # 4. Fetch courses (placeholder for future implementation)
                try:
                    courses_response = await client.get(
                        f"{self.ai_agent_url}/ai-api/courses",
                        params={"project_id": project_id}
                    )
                    if courses_response.status_code == 200:
                        courses_data = courses_response.json()
                        courses = courses_data.get("courses", [])

                        for course in courses:
                            materials["courses"].append({
                                "id": str(course.get("id")),
                                "title": course.get("title"),
                                "description": course.get("description", ""),
                                "type": "course",
                                "metadata": course
                            })
                except Exception as e:
                    logger.debug(f"Courses not available: {e}")

        except Exception as e:
            logger.error(f"Error fetching mentionable materials: {e}")

        # Calculate total count
        materials["total_count"] = (
            len(materials["nodes"]) +
            len(materials["papers"]) +
            len(materials["resources"]) +
            len(materials["courses"])
        )

        return materials

    async def semantic_search(
        self,
        query: str,
        project_id: str,
        limit: int = 5,
        context: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Perform semantic search across project materials

        Args:
            query: Search query (typically node context + recent messages)
            project_id: Project ID to search within
            limit: Maximum number of results
            context: Additional context (node_id, conversation history, etc.)

        Returns:
            List of relevant materials with similarity scores
        """
        try:
            # TODO: Implement actual vector embedding search
            # For now, return keyword-based search as fallback

            # Get all materials
            materials = await self.get_all_mentionable_materials(project_id)

            # Simple keyword matching (placeholder for vector search)
            query_lower = query.lower()
            results = []

            # Search across all material types
            for material_list in [materials["nodes"], materials["papers"], materials["resources"], materials["courses"]]:
                for material in material_list:
                    score = 0.0

                    # Calculate simple relevance score
                    if query_lower in material["title"].lower():
                        score += 0.5
                    if material.get("description") and query_lower in material["description"].lower():
                        score += 0.3

                    # Check metadata (authors for papers, etc.)
                    if material["type"] == "paper" and material["metadata"].get("authors"):
                        if query_lower in material["metadata"]["authors"].lower():
                            score += 0.2

                    if score > 0:
                        results.append({
                            **material,
                            "relevance_score": score
                        })

            # Sort by relevance and limit
            results.sort(key=lambda x: x["relevance_score"], reverse=True)
            return results[:limit]

        except Exception as e:
            logger.error(f"Error in semantic search: {e}")
            return []

    async def get_context_aware_suggestions(
        self,
        node_id: str,
        node_title: str,
        node_description: str,
        recent_messages: List[str],
        project_id: str,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Get AI-powered suggestions based on current context

        Args:
            node_id: Current node ID
            node_title: Current node title
            node_description: Current node description
            recent_messages: Recent chat messages (last 3-5)
            project_id: Project ID
            limit: Maximum number of suggestions

        Returns:
            List of suggested materials with relevance scores
        """
        # Build context query from node and messages
        context_parts = [node_title, node_description] + recent_messages
        query = " ".join(filter(None, context_parts))

        # Perform semantic search with context
        suggestions = await self.semantic_search(
            query=query,
            project_id=project_id,
            limit=limit,
            context={"node_id": node_id}
        )

        return suggestions


# Singleton instance
_mention_service = None


def get_mention_service() -> MentionService:
    """Get or create mention service instance"""
    global _mention_service
    if _mention_service is None:
        _mention_service = MentionService()
    return _mention_service
