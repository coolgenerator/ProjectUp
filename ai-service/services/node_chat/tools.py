"""
Function Calling Tools for Node Chat
Defines available tools that the AI can use during conversations
"""

from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
import logging

# Import existing services
from services.task_service import TaskService
from services.course.course_generation_service import CourseGenerationService
from models.database.task import Task

logger = logging.getLogger(__name__)

# Tool definitions for LLM function calling
NODE_CHAT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "create_child_nodes",
            "description": "Create multiple child nodes under the current node to break down concepts, add sub-ideas, or organize information hierarchically",
            "parameters": {
                "type": "object",
                "properties": {
                    "nodes": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "title": {
                                    "type": "string",
                                    "description": "Clear, concise title for the new node (3-8 words)"
                                },
                                "description": {
                                    "type": "string",
                                    "description": "Detailed description explaining what this node is about"
                                },
                                "icon": {
                                    "type": "string",
                                    "description": "Icon identifier (lightbulb, rocket, brain, target, star, fire, sparkles, chart, tree)",
                                    "enum": ["lightbulb", "rocket", "brain", "target", "star", "fire", "sparkles", "chart", "tree"]
                                },
                                "tags": {
                                    "type": "array",
                                    "items": {"type": "string"},
                                    "description": "Relevant tags for categorization"
                                }
                            },
                            "required": ["title", "description"]
                        },
                        "description": "List of child nodes to create"
                    }
                },
                "required": ["nodes"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_current_node",
            "description": "Update the current node's title, description, or summary based on the conversation",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "New title for the node (optional)"
                    },
                    "description": {
                        "type": "string",
                        "description": "Updated description (optional)"
                    },
                    "summary": {
                        "type": "string",
                        "description": "One-sentence summary of the node (optional)"
                    },
                    "tags": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Updated tags (optional)"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_action_items",
            "description": "Create actionable tasks or action items based on the discussion",
            "parameters": {
                "type": "object",
                "properties": {
                    "items": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "title": {"type": "string", "description": "Task title"},
                                "description": {"type": "string", "description": "Task details"},
                                "priority": {"type": "string", "enum": ["low", "medium", "high"], "description": "Task priority"}
                            },
                            "required": ["title"]
                        },
                        "description": "List of action items to create"
                    }
                },
                "required": ["items"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "suggest_related_nodes",
            "description": "Suggest connections to other existing nodes in the tree that are related to the current discussion",
            "parameters": {
                "type": "object",
                "properties": {
                    "node_titles": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of node titles to connect with"
                    },
                    "relationship_type": {
                        "type": "string",
                        "description": "Type of relationship (prerequisite, related, blocks, depends-on)",
                        "enum": ["prerequisite", "related", "blocks", "depends-on"]
                    },
                    "reason": {
                        "type": "string",
                        "description": "Brief explanation of why these nodes should be connected"
                    }
                },
                "required": ["node_titles", "relationship_type"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "add_learning_resource",
            "description": "Add a learning resource, documentation link, or reference material relevant to the discussion",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "Resource title"
                    },
                    "url": {
                        "type": "string",
                        "description": "URL to the resource"
                    },
                    "resource_type": {
                        "type": "string",
                        "description": "Type of resource",
                        "enum": ["documentation", "tutorial", "video", "article", "book", "tool", "library"]
                    },
                    "description": {
                        "type": "string",
                        "description": "Why this resource is relevant"
                    }
                },
                "required": ["title", "url", "resource_type"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_learning_path",
            "description": "Create a structured learning path or course outline based on the discussion topic",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "Learning path title"
                    },
                    "description": {
                        "type": "string",
                        "description": "Overview of what this learning path covers"
                    },
                    "modules": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "title": {"type": "string"},
                                "topics": {"type": "array", "items": {"type": "string"}}
                            }
                        },
                        "description": "List of learning modules"
                    },
                    "difficulty": {
                        "type": "string",
                        "enum": ["beginner", "intermediate", "advanced"],
                        "description": "Difficulty level"
                    }
                },
                "required": ["title", "description", "modules"]
            }
        }
    }
]


class ToolExecutor:
    """Executes tool calls from the LLM"""

    def __init__(self, db: Session, node_id: str, project_id: str, user_id: int):
        self.db = db
        self.node_id = node_id
        self.project_id = project_id
        self.user_id = user_id

    async def execute_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a tool call and return the result"""
        try:
            if tool_name == "create_child_nodes":
                return await self._create_child_nodes(arguments)
            elif tool_name == "update_current_node":
                return await self._update_current_node(arguments)
            elif tool_name == "create_action_items":
                return await self._create_action_items(arguments)
            elif tool_name == "suggest_related_nodes":
                return await self._suggest_related_nodes(arguments)
            elif tool_name == "add_learning_resource":
                return await self._add_learning_resource(arguments)
            elif tool_name == "create_learning_path":
                return await self._create_learning_path(arguments)
            else:
                return {
                    "success": False,
                    "error": f"Unknown tool: {tool_name}"
                }
        except Exception as e:
            logger.error(f"Error executing tool {tool_name}: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def _create_child_nodes(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare child nodes for review (does not create immediately)"""
        from models.database.tree_models import IdeaNode

        try:
            # Validate parent node exists (exclude soft-deleted nodes)
            parent_node = self.db.query(IdeaNode).filter(
                IdeaNode.id == uuid.UUID(self.node_id),
                IdeaNode.deleted_at.is_(None)
            ).first()

            if not parent_node:
                logger.warning(f"Parent node not found: {self.node_id}")
                return {"success": False, "error": "Parent node not found"}

            # Don't create immediately - return for review instead
            # This allows frontend to show a modal for user approval/editing
            suggested_nodes = []
            for node_data in args["nodes"]:
                suggested_nodes.append({
                    "title": node_data["title"],
                    "description": node_data.get("description", ""),
                    "icon": node_data.get("icon", "lightbulb"),
                    "tags": node_data.get("tags", []),
                    "parent_id": self.node_id,
                    "ai_generated": True
                })

            return {
                "success": True,
                "action": "review_nodes",  # Signal for frontend to show review modal
                "nodes": suggested_nodes,
                "count": len(suggested_nodes),
                "message": f"Prepared {len(suggested_nodes)} child nodes for review"
            }

        except Exception as e:
            logger.error(f"Error preparing child nodes: {e}")
            return {"success": False, "error": str(e)}

    async def _update_current_node(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Update the current node"""
        from models.database.tree_models import IdeaNode

        try:
            node = self.db.query(IdeaNode).filter(
                IdeaNode.id == uuid.UUID(self.node_id),
                IdeaNode.deleted_at.is_(None)
            ).first()

            if not node:
                return {"success": False, "error": "Node not found"}

            updates = []
            if "title" in args and args["title"]:
                node.title = args["title"]
                updates.append("title")

            if "description" in args and args["description"]:
                node.description = args["description"]
                updates.append("description")

            if "summary" in args and args["summary"]:
                if not node.node_metadata:
                    node.node_metadata = {}
                node.node_metadata["summary"] = args["summary"]
                updates.append("summary")

            if "tags" in args and args["tags"]:
                node.tags = args["tags"]
                updates.append("tags")

            self.db.commit()

            return {
                "success": True,
                "updates": updates,
                "message": f"Updated node: {', '.join(updates)}"
            }

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating node: {e}")
            return {"success": False, "error": str(e)}

    async def _create_action_items(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare action items for review (does not create them immediately)"""
        from models.database.tree_models import IdeaNode

        try:
            node = self.db.query(IdeaNode).filter(
                IdeaNode.id == uuid.UUID(self.node_id),
                IdeaNode.deleted_at.is_(None)
            ).first()

            if not node:
                return {"success": False, "error": "Node not found"}

            # Priority mapping for frontend
            priority_map = {"low": 1, "medium": 3, "high": 5}

            # Format tasks for review modal
            suggested_tasks = []
            for item in args["items"]:
                suggested_tasks.append({
                    "title": item["title"],
                    "description": item.get("description", ""),
                    "task_type": "action",
                    "priority": priority_map.get(item.get("priority", "medium"), 3),
                    "tags": ["ai-generated", "from-chat"]
                })

            return {
                "success": True,
                "action": "review_tasks",  # Signal to frontend to show review modal
                "count": len(suggested_tasks),
                "tasks": suggested_tasks,
                "message": f"Prepared {len(suggested_tasks)} action items for review"
            }

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating action items: {e}")
            return {"success": False, "error": str(e)}

    async def _suggest_related_nodes(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Suggest connections to related nodes"""
        # For now, just return the suggestion
        # TODO: Actually create connections in the graph
        return {
            "success": True,
            "suggestions": args["node_titles"],
            "relationship": args["relationship_type"],
            "reason": args.get("reason", ""),
            "message": f"Suggested connecting to {len(args['node_titles'])} related nodes"
        }

    async def _add_learning_resource(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Add a learning resource using TaskService"""
        from models.database.tree_models import IdeaNode

        try:
            node = self.db.query(IdeaNode).filter(
                IdeaNode.id == uuid.UUID(self.node_id),
                IdeaNode.deleted_at.is_(None)
            ).first()

            if not node:
                return {"success": False, "error": "Node not found"}

            # Create a learning task with the resource
            task_service = TaskService(self.db)

            # Estimate time based on resource type
            time_estimates = {
                "video": 60,
                "article": 30,
                "tutorial": 120,
                "documentation": 45,
                "book": 600,
                "tool": 90,
                "library": 90
            }

            estimated_minutes = time_estimates.get(args["resource_type"], 60)

            # Create a learning task
            task = task_service.create_task(
                project_id=self.project_id,
                title=f"Learn: {args['title']}",
                description=args.get("description", f"Study the {args['resource_type']}: {args['title']}"),
                task_type="learning",
                status="todo",
                priority=3,
                progress=0,
                idea_node_id=self.node_id,
                estimated_hours=estimated_minutes / 60,
                created_by=str(self.user_id),
                tags=["learning-resource", args["resource_type"], "ai-generated"],
                learning_metadata={
                    "resource_url": args["url"],
                    "resource_type": args["resource_type"],
                    "estimated_time_minutes": estimated_minutes
                }
            )

            # Also add to node metadata for quick reference
            if not node.node_metadata:
                node.node_metadata = {}

            if "resources" not in node.node_metadata:
                node.node_metadata["resources"] = []

            node.node_metadata["resources"].append({
                "id": task.id,
                "title": args["title"],
                "url": args["url"],
                "type": args["resource_type"],
                "description": args.get("description", ""),
                "added_at": datetime.utcnow().isoformat()
            })

            self.db.commit()

            return {
                "success": True,
                "task_id": task.id,
                "resource_title": args["title"],
                "message": f"Added learning resource: {args['title']} as a learning task"
            }

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error adding resource: {e}")
            return {"success": False, "error": str(e)}

    async def _create_learning_path(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Create a learning path using CourseGenerationService"""
        from models.database.tree_models import IdeaNode

        try:
            node = self.db.query(IdeaNode).filter(
                IdeaNode.id == uuid.UUID(self.node_id),
                IdeaNode.deleted_at.is_(None)
            ).first()

            if not node:
                return {"success": False, "error": "Node not found"}

            # Extract learning goals from modules
            goals = []
            for module in args["modules"]:
                module_title = module.get("title", "")
                if module_title:
                    goals.append(f"Master {module_title}")

            # Calculate duration based on module count
            estimated_weeks = max(len(args["modules"]), 4)

            # Use CourseGenerationService
            course_service = CourseGenerationService()

            result = await course_service.start_course_generation(
                db=self.db,
                user_id=str(self.user_id),
                topic=args["title"],
                goals=goals if goals else ["Complete the learning path"],
                user_experience="From AI chat discussion",
                user_skills=[],
                interests=[],
                preferences={"source": "ai-chat", "node_id": self.node_id},
                estimated_weeks=estimated_weeks,
                time_commitment=10,
                difficulty=args.get("difficulty", "intermediate"),
                preferred_learning_style="mixed"
            )

            # Store reference in node metadata
            if not node.node_metadata:
                node.node_metadata = {}

            node.node_metadata["learning_path"] = {
                "course_request_id": result["request_id"],
                "title": args["title"],
                "description": args["description"],
                "modules": args["modules"],
                "difficulty": args.get("difficulty", "intermediate"),
                "created_at": datetime.utcnow().isoformat()
            }

            self.db.commit()

            return {
                "success": True,
                "course_request_id": result["request_id"],
                "path_title": args["title"],
                "module_count": len(args["modules"]),
                "message": f"Started course generation: {args['title']} with {len(args['modules'])} modules. Check course status at /courses/{result['request_id']}/status"
            }

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating learning path: {e}")
            return {"success": False, "error": str(e)}
