"""
Intent Detection Routes

API endpoints for AI-powered intent detection and action execution.
"""

import logging
import time
import json
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from models.requests.intent_requests import (
    DetectIntentsRequest,
    ExecuteActionRequest,
    BatchExecuteActionsRequest
)
from models.responses.intent_responses import (
    DetectIntentsResponse,
    ExecuteActionResponse,
    BatchExecuteActionsResponse
)
from models.entities.intent import IntentDetectionContext
from services.intent_detector import get_intent_detector
from services.executors.executor_manager import get_executor_manager
from prompts.extraction_prompts import ExtractionPrompts
from core.llm_adapter import get_llm_adapter
from database.session import get_session
from sqlalchemy.orm import Session
from models.database.node_chat_models import NodeChatSession
import uuid

logger = logging.getLogger(__name__)


def load_chat_conversation(chat_session_id: str, db: Session) -> Optional[str]:
    """Load chat conversation messages for context

    Args:
        chat_session_id: UUID of the chat session
        db: Database session

    Returns:
        Formatted conversation string or None if not found
    """
    try:
        session_uuid = uuid.UUID(chat_session_id)
        session = db.query(NodeChatSession).filter(
            NodeChatSession.id == session_uuid
        ).first()

        if not session or not session.messages:
            return None

        # Format messages as conversation
        conversation_lines = []
        for msg in session.messages:
            role = msg.get('role', 'unknown')
            content = msg.get('content', '')
            if role == 'user':
                conversation_lines.append(f"User: {content}")
            elif role == 'assistant':
                conversation_lines.append(f"AI: {content}")

        return "\n\n".join(conversation_lines)
    except Exception as e:
        logger.error(f"Error loading chat conversation: {e}")
        return None


# Request models for extraction endpoints
class NodeContentRequest(BaseModel):
    """Common request model for node content extraction"""
    node_id: str
    node_content: Dict[str, Optional[str]]  # {title, description, conclusion}
    chat_session_id: Optional[str] = None  # Optional: Include chat conversation for richer context

router = APIRouter(prefix="/ai-api/intents", tags=["intents"])


@router.post(
    "/detect",
    response_model=DetectIntentsResponse,
    summary="Detect Actionable Intents",
    description="""
    Analyze a chat message to detect actionable project management intents.

    Returns suggested actions like:
    - Creating milestones from mentioned deadlines
    - Breaking down complex tasks into subtasks
    - Generating learning plans from "how to" questions
    - Extracting action items from discussions
    - Creating dependencies when blockers mentioned
    - Capturing brainstorming ideas

    The AI analyzes the message in context of:
    - Current node being discussed
    - Recent conversation history
    - Existing project structure

    Each detected intent includes:
    - Confidence score (0-1)
    - Suggested parameters (extracted from message)
    - Preview text for UI display
    - Priority level (1-3)

    Only intents with confidence >= 0.6 are returned.
    """
)
async def detect_intents(request: DetectIntentsRequest) -> DetectIntentsResponse:
    """
    Detect actionable intents from a chat message.

    This is the core AI-powered intent detection endpoint.
    Call this when:
    - User sends a message in node chat
    - You want real-time action suggestions
    - After every few messages to check for accumulated intents
    """
    try:
        start_time = time.time()

        # Build detection context
        context = IntentDetectionContext(
            node_id=request.node_id,
            node_title=request.node_title,
            node_description=request.node_description,
            message=request.message,
            conversation_history=request.conversation_history,
            project_id=request.project_id,
            session_id=request.session_id,
            existing_nodes_count=request.existing_nodes_count
        )

        # Detect intents
        detector = get_intent_detector()
        intents = await detector.detect_intents(context)

        processing_time = (time.time() - start_time) * 1000  # ms

        return DetectIntentsResponse(
            success=True,
            intents=intents,
            message=f"Detected {len(intents)} actionable intent(s)" if intents else "No clear intents detected",
            processing_time_ms=processing_time
        )

    except Exception as e:
        logger.error(f"Error in detect_intents: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Intent detection failed: {str(e)}"
        )


@router.post(
    "/execute",
    response_model=ExecuteActionResponse,
    summary="Execute Suggested Action",
    description="""
    Execute a single suggested action (from detected intent).

    This endpoint:
    1. Routes the action to the appropriate executor
    2. Creates nodes, dependencies, or other resources
    3. Marks created items as auto-created for tracking
    4. Returns execution results

    All created nodes will have metadata:
    - auto_created: true
    - created_from_chat: true
    - Additional action-specific metadata

    The execution is atomic - either all resources are created or none.
    """
)
async def execute_action(request: ExecuteActionRequest) -> ExecuteActionResponse:
    """
    Execute a suggested action.

    Call this when:
    - User accepts a suggestion
    - User clicks "Create" on an intent card
    - Batch executing multiple selected actions
    """
    try:
        # Build execution context
        context = {
            "node_id": request.node_id,
            "project_id": request.project_id,
            "session_id": request.session_id,
            "user_id": request.user_id
        }

        # Merge user modifications if provided
        parameters = {**request.parameters}
        if request.custom_modifications:
            parameters.update(request.custom_modifications)

        # Execute via executor manager
        manager = get_executor_manager()
        result = await manager.execute_action(
            action_type=request.action_type,
            parameters=parameters,
            context=context
        )

        return ExecuteActionResponse(
            success=result.success,
            result=result if result.success else None,
            error=result.error if not result.success else None
        )

    except Exception as e:
        logger.error(f"Error in execute_action: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Action execution failed: {str(e)}"
        )


@router.post(
    "/execute-batch",
    response_model=BatchExecuteActionsResponse,
    summary="Execute Multiple Actions",
    description="""
    Execute multiple suggested actions in a single request.

    Useful when user:
    - Selects multiple suggestions via checkboxes
    - Clicks "Accept all" on intent suggestions
    - Wants to execute related actions together

    Actions are executed in the specified order (or default order if not provided).
    If one action fails, subsequent actions are still attempted.

    Returns:
    - Individual results for each action
    - Summary statistics (total nodes created, etc.)
    - List of any errors encountered
    """
)
async def execute_batch(request: BatchExecuteActionsRequest) -> BatchExecuteActionsResponse:
    """
    Execute multiple actions in batch.

    More efficient than individual execute calls when user accepts multiple suggestions.
    """
    try:
        manager = get_executor_manager()
        results = []
        errors = []
        total_nodes = 0
        total_deps = 0

        # Determine execution order
        actions = request.actions
        if request.execute_order:
            actions = [request.actions[i] for i in request.execute_order if i < len(request.actions)]

        # Execute each action
        for action_request in actions:
            try:
                context = {
                    "node_id": action_request.node_id,
                    "project_id": action_request.project_id,
                    "session_id": action_request.session_id,
                    "user_id": action_request.user_id
                }

                parameters = {**action_request.parameters}
                if action_request.custom_modifications:
                    parameters.update(action_request.custom_modifications)

                result = await manager.execute_action(
                    action_type=action_request.action_type,
                    parameters=parameters,
                    context=context
                )

                results.append(result)

                if result.success:
                    total_nodes += len(result.created_nodes)
                    total_deps += len(result.created_dependencies)
                else:
                    errors.append(f"{action_request.action_type.value}: {result.error}")

            except Exception as e:
                logger.error(f"Error executing action in batch: {e}")
                errors.append(f"{action_request.action_type.value}: {str(e)}")

        all_success = len(errors) == 0

        return BatchExecuteActionsResponse(
            success=all_success,
            results=results,
            total_nodes_created=total_nodes,
            total_dependencies_created=total_deps,
            errors=errors
        )

    except Exception as e:
        logger.error(f"Error in execute_batch: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Batch execution failed: {str(e)}"
        )


@router.get(
    "/health",
    summary="Intent Service Health Check",
    description="Check if the intent detection service is operational"
)
async def health_check():
    """Health check for intent detection service"""
    try:
        # Verify detector and manager are available
        detector = get_intent_detector()
        manager = get_executor_manager()

        return {
            "status": "healthy",
            "service": "intent-detection",
            "detector_ready": detector is not None,
            "executor_manager_ready": manager is not None,
            "available_executors": len(manager.executors) if manager else 0
        }
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "error": str(e)
            }
        )


@router.post(
    "/extract-tasks",
    summary="Extract Tasks from Node Content",
    description="""
    Extract actionable tasks from idea tree node content using AI.

    Analyzes node title, description, and optional conclusion to identify:
    - Specific, actionable tasks
    - Task types (action, learning, research, development)
    - Priority levels (1-5)
    - Estimated hours if mentioned

    Returns structured JSON array of extracted tasks or empty array if none found.
    """
)
async def extract_tasks(request: NodeContentRequest, db: Session = Depends(get_session)) -> Dict[str, Any]:
    """Extract actionable tasks from node content"""
    try:
        # Extract node content
        title = request.node_content.get("title", "")
        description = request.node_content.get("description", "")
        conclusion = request.node_content.get("conclusion")

        # Load chat conversation if session ID provided
        conversation = None
        if request.chat_session_id:
            conversation = load_chat_conversation(request.chat_session_id, db)
            logger.info(f"Loaded chat conversation for task extraction (session: {request.chat_session_id})")

        # Generate extraction prompt with optional conversation context
        prompt = ExtractionPrompts.get_task_extraction_prompt(
            node_title=title,
            node_description=description,
            conclusion=conclusion,
            conversation=conversation  # Pass conversation for richer context
        )

        # Call LLM
        llm_adapter = get_llm_adapter()
        response = await llm_adapter.generate(prompt)

        # Parse JSON response (handle markdown code fences)
        try:
            # Remove markdown code fences if present
            cleaned_response = response.strip()
            if cleaned_response.startswith("```json"):
                cleaned_response = cleaned_response[7:]  # Remove ```json
            if cleaned_response.startswith("```"):
                cleaned_response = cleaned_response[3:]  # Remove ```
            if cleaned_response.endswith("```"):
                cleaned_response = cleaned_response[:-3]  # Remove trailing ```
            cleaned_response = cleaned_response.strip()

            tasks = json.loads(cleaned_response)
            if not isinstance(tasks, list):
                tasks = []
        except json.JSONDecodeError:
            logger.error(f"Failed to parse LLM response as JSON: {response}")
            tasks = []

        return {
            "success": True,
            "node_id": request.node_id,
            "tasks": tasks,
            "count": len(tasks)
        }

    except Exception as e:
        logger.error(f"Error extracting tasks: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Task extraction failed: {str(e)}"
        )


@router.post(
    "/extract-milestones",
    summary="Extract Milestones from Node Content",
    description="""
    Extract project milestones from idea tree node content using AI.

    Analyzes node content to identify:
    - Key milestones and major achievements
    - Success criteria for each milestone
    - Priority levels (1-5)
    - Target dates if mentioned

    Returns structured JSON array of extracted milestones or empty array if none found.
    """
)
async def extract_milestones(request: NodeContentRequest, db: Session = Depends(get_session)) -> Dict[str, Any]:
    """Extract milestones from node content"""
    try:
        # Extract node content
        title = request.node_content.get("title", "")
        description = request.node_content.get("description", "")
        conclusion = request.node_content.get("conclusion")

        # Load chat conversation if session ID provided
        conversation = None
        if request.chat_session_id:
            conversation = load_chat_conversation(request.chat_session_id, db)
            logger.info(f"Loaded chat conversation for milestone extraction (session: {request.chat_session_id})")

        # Generate extraction prompt with optional conversation context
        prompt = ExtractionPrompts.get_milestone_extraction_prompt(
            node_title=title,
            node_description=description,
            conclusion=conclusion,
            conversation=conversation  # Pass conversation for richer context
        )

        # Call LLM
        llm_adapter = get_llm_adapter()
        response = await llm_adapter.generate(prompt)

        # Parse JSON response (handle markdown code fences)
        try:
            # Remove markdown code fences if present
            cleaned_response = response.strip()
            if cleaned_response.startswith("```json"):
                cleaned_response = cleaned_response[7:]
            if cleaned_response.startswith("```"):
                cleaned_response = cleaned_response[3:]
            if cleaned_response.endswith("```"):
                cleaned_response = cleaned_response[:-3]
            cleaned_response = cleaned_response.strip()

            milestones = json.loads(cleaned_response)
            if not isinstance(milestones, list):
                milestones = []
        except json.JSONDecodeError:
            logger.error(f"Failed to parse LLM response as JSON: {response}")
            milestones = []

        return {
            "success": True,
            "node_id": request.node_id,
            "milestones": milestones,
            "count": len(milestones)
        }

    except Exception as e:
        logger.error(f"Error extracting milestones: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Milestone extraction failed: {str(e)}"
        )


@router.post(
    "/extract-resources",
    summary="Extract Resources from Node Content",
    description="""
    Extract resource URLs and references from idea tree node content using AI.

    Analyzes node content to identify:
    - URLs and resource links
    - Resource categories (documentation, tutorial, article, video, tool, library, other)
    - Descriptions of each resource

    Only extracts resources that are explicitly mentioned with valid URLs.
    Returns structured JSON array of extracted resources or empty array if none found.
    """
)
async def extract_resources(request: NodeContentRequest, db: Session = Depends(get_session)) -> Dict[str, Any]:
    """Extract resource URLs from node content"""
    try:
        # Extract node content
        title = request.node_content.get("title", "")
        description = request.node_content.get("description", "")
        conclusion = request.node_content.get("conclusion")

        # Load chat conversation if session ID provided
        conversation = None
        if request.chat_session_id:
            conversation = load_chat_conversation(request.chat_session_id, db)
            logger.info(f"Loaded chat conversation for resource extraction (session: {request.chat_session_id})")

        # Generate extraction prompt with optional conversation context
        prompt = ExtractionPrompts.get_resource_extraction_prompt(
            node_title=title,
            node_description=description,
            conclusion=conclusion,
            conversation=conversation  # Pass conversation for richer context
        )

        # Call LLM
        llm_adapter = get_llm_adapter()
        response = await llm_adapter.generate(prompt)

        # Parse JSON response (handle markdown code fences)
        try:
            # Remove markdown code fences if present
            cleaned_response = response.strip()
            if cleaned_response.startswith("```json"):
                cleaned_response = cleaned_response[7:]
            if cleaned_response.startswith("```"):
                cleaned_response = cleaned_response[3:]
            if cleaned_response.endswith("```"):
                cleaned_response = cleaned_response[:-3]
            cleaned_response = cleaned_response.strip()

            resources = json.loads(cleaned_response)
            if not isinstance(resources, list):
                resources = []
        except json.JSONDecodeError:
            logger.error(f"Failed to parse LLM response as JSON: {response}")
            resources = []

        return {
            "success": True,
            "node_id": request.node_id,
            "resources": resources,
            "count": len(resources)
        }

    except Exception as e:
        logger.error(f"Error extracting resources: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Resource extraction failed: {str(e)}"
        )
