"""
API Routes for Node Chat Sessions and Versioning
Provides endpoints for chatting with nodes and managing content versions
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, model_validator
from datetime import datetime
import logging
import uuid
import json
import re
import asyncio

from database.session import get_session
from models.database.node_chat_models import NodeChatSession
from models.database.node_chat_message_models import NodeChatMessage
from models.database.node_version_models import NodeVersion
from core.llm_adapter import generate_chat
from services.llm.vertex_ai_service import vertex_ai_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai-api/node-chat", tags=["node-chat"])


# === Request/Response Models ===
from models.requests.node_chat_requests import (
    ChatMessageRequest,
    CreateBranchRequest,
    CreateVersionRequest,
    RestoreVersionRequest,
)
from models.responses.node_chat_responses import (
    ChatMessageResponse,
    SessionResponse,
    VersionResponse,
)

# === Services ===
from services.node_chat import (
    NodeChatService,
    SessionManager,
    NodeUpdateService,
    SummaryService,
    SuggestionService,
    NodeChatPermissionService
)
from services.node_chat.permission_service import (
    require_chat_access,
    require_send_permission,
    require_delete_permission
)


# === Helper Functions ===
# Note: Service is now initialized per-request with DB session for enhanced context
async def generate_ai_response(
    message: str,
    conversation_history: List[Dict],
    context: Dict[str, Any],
    node_id: str,
    project_id: str,
    db: Session
) -> Dict[str, Any]:
    """Generate AI response with conversation context"""
    # Initialize service with DB session for enhanced context building
    service = NodeChatService(db=db)

    return await service.generate_ai_response(
        message=message,
        conversation_history=conversation_history,
        context=context,
        node_id=node_id,
        project_id=project_id
    )


# === Chat Session Endpoints ===

@router.post("/send-message", response_model=ChatMessageResponse)
async def send_chat_message(
    request: ChatMessageRequest,
    db: Session = Depends(get_session)
):
    """
    Send a message in a node chat session (MULTI-USER SUPPORT)

    This endpoint:
    1. Gets or creates an active chat session for the node
    2. Checks if user has permission to send messages (EDITOR+ role)
    3. Generates AI response with full conversation context
    4. Stores the exchange with user_id attribution
    5. Returns AI response and optional conclusion
    """
    try:
        # Initialize services
        session_manager = SessionManager(db)
        node_update_service = NodeUpdateService(db)

        # Get or create session
        try:
            session = session_manager.get_or_create_session(
                node_id=request.node_id,
                project_id=request.project_id,
                user_id=request.user_id,
                context=request.context,
                session_id=request.session_id
            )
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))

        # MULTI-USER: Check if user has permission to send messages
        await require_send_permission(request.user_id, session, db)

        # Get conversation history
        messages = session.messages or []

        # Generate AI response with enhanced context
        ai_result = await generate_ai_response(
            message=request.message,
            conversation_history=messages,
            context=request.context,
            node_id=request.node_id,
            project_id=request.project_id,
            db=db
        )

        # Add messages to session (with user_id for multi-user attribution)
        session_manager.add_messages_to_session(
            session=session,
            user_message=request.message,
            ai_response=ai_result["response"],
            user_id=request.user_id
        )

        # Update conclusion and summary if provided
        session_manager.update_session_conclusion(
            session=session,
            conclusion=ai_result["conclusion"],
            summary=ai_result.get("summary")
        )

        db.commit()

        # Auto-update node on first message
        if ai_result.get("first_message_metadata"):
            node_update_service.auto_update_from_first_message(
                node_id=request.node_id,
                metadata=ai_result["first_message_metadata"]
            )

            # Also update tree if this is the first node
            tree_updated = node_update_service.auto_update_tree_from_first_node(
                node_id=request.node_id,
                metadata=ai_result["first_message_metadata"]
            )

            # Add tree_updated flag to metadata for frontend
            if tree_updated:
                ai_result["first_message_metadata"]["tree_updated"] = True

        return ChatMessageResponse(
            session_id=str(session.id),
            message=ai_result["response"],
            conclusion=ai_result["conclusion"],
            metadata={
                "message_count": session.message_count,
                "has_conclusion": session.conclusion is not None,
                "summary": ai_result.get("summary"),
                "tree_updated": ai_result.get("first_message_metadata", {}).get("tree_updated", False)
            }
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid UUID: {str(e)}")
    except Exception as e:
        logger.error(f"Error in send_chat_message: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/send-message-stream")
async def send_chat_message_stream(
    request: ChatMessageRequest,
    db: Session = Depends(get_session)
):
    """
    Send a message and get streaming AI response with tool calling support (MULTI-USER SUPPORT)

    Returns Server-Sent Events (SSE) stream
    """

    try:
        # Initialize services
        session_manager = SessionManager(db)

        # Get or create session
        try:
            session = session_manager.get_or_create_session(
                node_id=request.node_id,
                project_id=request.project_id,
                user_id=request.user_id,
                context=request.context,
                session_id=request.session_id
            )
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))

        # MULTI-USER: Check if user has permission to send messages
        await require_send_permission(request.user_id, session, db)

        # Commit the session if it was newly created
        db.commit()
        db.refresh(session)

        session_id = str(session.id)
        logger.info(f"Using session {session_id} for node {request.node_id}")

        # Get conversation history
        messages = list(session.messages or [])

        # Enable tools if user_id is provided
        enable_tools = request.user_id is not None

        # Build enhanced context
        from services.node_chat.context_builder import NodeChatContextBuilder
        from prompts.node_chat_prompts import NodeChatPrompts

        context_builder = NodeChatContextBuilder(db)
        prompts = NodeChatPrompts()

        try:
            enhanced_context = context_builder.build_context(
                node_id=request.node_id,
                project_id=request.project_id,
                fallback_context=request.context
            )
            formatted_context = context_builder.format_context_for_prompt(enhanced_context)
            system_context = prompts.get_system_prompt(enhanced_context, formatted_context=formatted_context)
        except Exception as e:
            logger.warning(f"Failed to build enhanced context, using fallback: {e}")
            # Fallback to basic context
            system_context = prompts.get_system_prompt(request.context)

        # Build messages for AI
        ai_messages = [{"role": "system", "content": system_context}]

        # Add conversation history (last 10 messages)
        for msg in messages[-10:]:
            ai_messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            })

        # Add current message
        ai_messages.append({"role": "user", "content": request.message})

        async def generate_stream():
            """Generate streaming response with tool calling support"""
            full_response = ""
            tool_calls_data = []
            tool_results_data = []
            step_counter = 1

            try:
                # Use NodeChatService with tool calling
                service = NodeChatService(db=db, user_id=request.user_id)

                # Emit initial reasoning step
                yield f"data: {json.dumps({'type': 'reasoning_step', 'step': step_counter, 'content': 'Analyzing your question and building context...'})}\n\n"
                step_counter += 1

                # Generate AI response with tools if enabled
                if enable_tools:
                    # Emit reasoning step before generation
                    yield f"data: {json.dumps({'type': 'reasoning_step', 'step': step_counter, 'content': 'Accessing project data (tasks, milestones, resources)...'})}\n\n"
                    step_counter += 1

                    result = await service.generate_ai_response_with_tools(
                        message=request.message,
                        conversation_history=messages,
                        context=request.context,
                        node_id=request.node_id,
                        project_id=request.project_id,
                        enable_tools=True
                    )
                    full_response = result["response"]
                    tool_calls_data = result.get("tool_calls", [])
                    tool_results_data = result.get("tool_results", [])
                    first_message_metadata = result.get("first_message_metadata")

                    # Emit reasoning step if tools were used
                    if tool_calls_data:
                        yield f"data: {json.dumps({'type': 'reasoning_step', 'step': step_counter, 'content': f'Calling {len(tool_calls_data)} tool(s) to gather information...'})}\n\n"
                        step_counter += 1

                    # Send tool calls as events
                    for tool_call in tool_calls_data:
                        if tool_call.get("type") == "function":
                            func = tool_call["function"]
                            yield f"data: {json.dumps({'type': 'tool_call', 'tool_name': func['name'], 'arguments': func['arguments']})}\n\n"

                    # Execute tools and send results
                    for tool_result in tool_results_data:
                        yield f"data: {json.dumps({'type': 'tool_result', 'tool_name': tool_result['tool_name'], 'result': tool_result['result']})}\n\n"

                    # Emit reasoning step before final response
                    if tool_results_data:
                        yield f"data: {json.dumps({'type': 'reasoning_step', 'step': step_counter, 'content': 'Processing results and formulating response...'})}\n\n"
                        step_counter += 1

                    # Stream the response (character by character for smooth effect)
                    chunk_size = 3  # Stream a few characters at a time
                    for i in range(0, len(full_response), chunk_size):
                        chunk = full_response[i:i+chunk_size]
                        yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"
                        await asyncio.sleep(0.01)  # Small delay for smooth streaming effect
                else:
                    # Fallback to regular streaming without tools
                    yield f"data: {json.dumps({'type': 'reasoning_step', 'step': step_counter, 'content': 'Generating response with AI model...'})}\n\n"
                    step_counter += 1

                    prompt_with_context = f"{system_context}\n\nConversation:\n"
                    for msg in ai_messages[1:]:
                        role_label = "Assistant" if msg["role"] == "assistant" else "User"
                        prompt_with_context += f"{role_label}: {msg['content']}\n"

                    # Stream the AI response
                    async for chunk in vertex_ai_service.generate_stream(
                        prompt=prompt_with_context,
                        temperature=0.7
                    ):
                        full_response += chunk
                        # Send chunk as SSE
                        yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"

                    first_message_metadata = None

                # After streaming completes, save messages to database with a new session
                from database.database import get_db
                db_manager = get_db()
                new_db = db_manager.SessionLocal()

                try:
                    # Get the session again with the new database session
                    db_session = new_db.query(NodeChatSession).filter(
                        NodeChatSession.id == uuid.UUID(session_id)
                    ).first()

                    if db_session:
                        # Get current messages and append new ones
                        current_messages = list(db_session.messages or [])

                        current_messages.append({
                            "role": "user",
                            "content": request.message,
                            "timestamp": datetime.utcnow().isoformat()
                        })

                        # Generate suggestions for the AI response
                        suggestions = []
                        try:
                            from services.node_chat.suggestion_service import SuggestionService
                            suggestion_service = SuggestionService()

                            suggestions = await suggestion_service.generate_suggestions(
                                node_title=request.context.get('node_title', ''),
                                node_description=request.context.get('node_description', ''),
                                message_content=full_response,
                                conversation_history=[
                                    {"role": m.get("role"), "content": m.get("content")}
                                    for m in current_messages[-5:]
                                ]
                            )
                            logger.info(f"Generated {len(suggestions)} suggestions for message")
                        except Exception as e:
                            logger.error(f"Error generating suggestions: {e}")
                            # Continue without suggestions if generation fails

                        current_messages.append({
                            "role": "assistant",
                            "content": full_response,
                            "timestamp": datetime.utcnow().isoformat(),
                            "suggestions": suggestions  # Store suggestions in message
                        })

                        # Update session
                        db_session.messages = current_messages
                        db_session.message_count = len(current_messages)
                        db_session.last_message_at = datetime.utcnow()

                        # Explicitly mark messages as modified for SQLAlchemy
                        flag_modified(db_session, "messages")

                        new_db.commit()

                        logger.info(f"Successfully saved {len(current_messages)} messages to session {session_id}")

                        # Stream suggestions event to frontend
                        if suggestions and len(suggestions) > 0:
                            yield f"data: {json.dumps({'type': 'suggestions', 'suggestions': suggestions})}\n\n"

                        # Auto-update node on first message
                        is_first_message = len(current_messages) == 2  # User message + AI response
                        if is_first_message and first_message_metadata:
                            # Use NodeUpdateService for auto-update
                            node_update_svc = NodeUpdateService(new_db)
                            success = node_update_svc.auto_update_from_first_message(
                                node_id=request.node_id,
                                metadata=first_message_metadata
                            )

                            # Also update tree if this is the first node
                            tree_updated = node_update_svc.auto_update_tree_from_first_node(
                                node_id=request.node_id,
                                metadata=first_message_metadata
                            )

                            # Add tree_updated flag to metadata
                            if tree_updated:
                                first_message_metadata["tree_updated"] = True

                            if success:
                                # Send metadata update event
                                yield f"data: {json.dumps({'type': 'node_updated', 'metadata': first_message_metadata})}\n\n"

                        # Send completion event
                        yield f"data: {json.dumps({'type': 'done', 'session_id': session_id, 'message_count': len(current_messages)})}\n\n"
                    else:
                        logger.error(f"Session {session_id} not found when trying to save messages")
                        yield f"data: {json.dumps({'type': 'error', 'message': 'Session not found'})}\n\n"

                finally:
                    new_db.close()

            except Exception as e:
                logger.error(f"Error in streaming: {e}", exc_info=True)
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid UUID: {str(e)}")
    except Exception as e:
        logger.error(f"Error in send_chat_message_stream: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/node/{node_id}/session", response_model=SessionResponse)
async def get_node_chat_session(
    node_id: str,
    db: Session = Depends(get_session)
):
    """Get the active chat session for a node"""
    try:
        node_uuid = uuid.UUID(node_id)

        session = db.query(NodeChatSession).filter(
            NodeChatSession.node_id == node_uuid,
            NodeChatSession.is_active == True
        ).first()

        if not session:
            raise HTTPException(status_code=404, detail="No active session found")

        return SessionResponse(
            id=str(session.id),
            node_id=str(session.node_id),
            project_id=session.project_id,
            title=session.title,
            is_active=session.is_active,
            message_count=session.message_count,
            conclusion=session.conclusion,
            created_at=session.created_at,
            updated_at=session.updated_at,
            last_message_at=session.last_message_at
        )

    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting chat session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def build_branch_tree(node_uuid: uuid.UUID, current_session_id: uuid.UUID, db: Session) -> Dict[int, Dict[str, Any]]:
    """
    Build branch tree structure for all sessions in a node

    Returns a dictionary mapping branch_point_index -> branch info:
    {
        0: {
            "branches": [
                {"id": "xxx", "name": "Version 1", "version_number": "1", ...},
                {"id": "yyy", "name": "Version 2", "version_number": "2", ...}
            ],
            "active_branch_id": "xxx"
        },
        2: {
            "branches": [
                {"id": "yyy", "name": "Version 2", "version_number": "2", ...},
                {"id": "zzz", "name": "Version 2.1", "version_number": "2.1", ...}
            ],
            "active_branch_id": "zzz"
        }
    }
    """
    # Get all sessions for this node
    all_sessions = db.query(NodeChatSession).filter(
        NodeChatSession.node_id == node_uuid,
        NodeChatSession.is_active == True
    ).all()

    # Get current session to determine active path
    current_session = db.query(NodeChatSession).filter(
        NodeChatSession.id == current_session_id
    ).first()

    if not current_session:
        return {}

    # Build a map of session_id -> session for quick lookup
    session_map = {str(s.id): s for s in all_sessions}

    # Group sessions by branch_point_index
    branch_tree: Dict[int, Dict[str, Any]] = {}

    for session in all_sessions:
        # Only include branches that have a parent (not root)
        if session.parent_session_id and session.branch_point_index is not None:
            branch_idx = session.branch_point_index

            if branch_idx not in branch_tree:
                branch_tree[branch_idx] = {
                    "branches": [],
                    "active_branch_id": None
                }

            # Add this branch
            branch_tree[branch_idx]["branches"].append({
                "id": str(session.id),
                "name": session.branch_display_name or f"Version {session.version_number}",
                "version_number": session.version_number,
                "parent_version_number": session.parent_version_number,
                "message_count": session.message_count or 0,
                "created_at": session.created_at.isoformat() if session.created_at else None
            })

    # For each branch point, add the parent branch as the first option
    for branch_idx in branch_tree.keys():
        branches_at_index = branch_tree[branch_idx]["branches"]

        if branches_at_index:
            # Get parent session ID from any branch at this index
            first_branch = branches_at_index[0]
            parent_session_id = None

            for session in all_sessions:
                if str(session.id) == first_branch["id"]:
                    parent_session_id = session.parent_session_id
                    break

            if parent_session_id:
                parent_session = session_map.get(str(parent_session_id))
                if parent_session:
                    # Prepend parent as first option
                    branch_tree[branch_idx]["branches"].insert(0, {
                        "id": str(parent_session.id),
                        "name": f"Version {parent_session.version_number or '1'}" + (" (Main)" if not parent_session.parent_session_id else ""),
                        "version_number": parent_session.version_number or "1",
                        "parent_version_number": parent_session.parent_version_number,
                        "message_count": parent_session.message_count or 0,
                        "created_at": parent_session.created_at.isoformat() if parent_session.created_at else None
                    })

    # Determine active branch at each index by tracing current session's ancestry
    def trace_ancestry(session_id: uuid.UUID) -> List[uuid.UUID]:
        """Trace ancestry from current session back to root"""
        ancestry = []
        current_id = session_id

        while current_id:
            ancestry.append(current_id)
            session = session_map.get(str(current_id))
            if session and session.parent_session_id:
                current_id = session.parent_session_id
            else:
                break

        return ancestry

    ancestry = trace_ancestry(current_session_id)

    # For each branch point, determine which branch in the ancestry is active
    for branch_idx in branch_tree.keys():
        # Find which branch at this index is in our ancestry
        for branch in branch_tree[branch_idx]["branches"]:
            branch_uuid = uuid.UUID(branch["id"])
            if branch_uuid in ancestry:
                branch_tree[branch_idx]["active_branch_id"] = branch["id"]
                break

    logger.info(f"[build_branch_tree] Built tree for node {node_uuid}: {len(branch_tree)} branch points")
    for idx, data in branch_tree.items():
        logger.info(f"  Index {idx}: {len(data['branches'])} branches, active={data['active_branch_id']}")

    return branch_tree


@router.get("/node/{node_id}/messages")
async def get_chat_messages(
    node_id: str,
    session_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_session)
):
    """
    Get messages from a chat session with pagination

    Args:
        node_id: UUID of the node
        session_id: Optional specific session ID (otherwise uses active session)
        limit: Maximum number of messages to return (default: 50)
        offset: Number of messages to skip (default: 0)

    If session_id is provided, loads that specific session.
    Otherwise, loads the default active session for the node.
    """
    try:
        node_uuid = uuid.UUID(node_id)

        # DEBUG: Log all active sessions for this node
        all_active_sessions = db.query(NodeChatSession).filter(
            NodeChatSession.node_id == node_uuid,
            NodeChatSession.is_active == True
        ).all()
        logger.info(f"[DEBUG] Node {node_id} has {len(all_active_sessions)} active sessions")
        for s in all_active_sessions:
            logger.info(f"  - Session {s.id}: {s.message_count} messages, branch={s.branch_name}, parent={s.parent_session_id}")

        if session_id:
            # Load specific session by ID
            session_uuid = uuid.UUID(session_id)
            session = db.query(NodeChatSession).filter(
                NodeChatSession.id == session_uuid
            ).first()

            if not session:
                raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

            # CRITICAL: Validate that this session belongs to the requested node
            if session.node_id != node_uuid:
                logger.warning(f"[SECURITY] Session {session_id} belongs to node {session.node_id}, not {node_id}. Returning empty messages.")
                return {
                    "messages": [],
                    "session_id": None,
                    "warning": "Session does not belong to this node"
                }

            logger.info(f"[DEBUG] Loading specific session {session_id} for node {node_id}")
        else:
            # Load default active session for the node
            session = db.query(NodeChatSession).filter(
                NodeChatSession.node_id == node_uuid,
                NodeChatSession.is_active == True
            ).first()

            if session:
                logger.info(f"[DEBUG] Loading default session {session.id} for node {node_id} (has {session.message_count} messages)")

        if not session:
            logger.info(f"[DEBUG] No active session found for node {node_id}, returning empty messages")
            return {"messages": [], "branch_tree": {}}

        summary = session.context.get("summary") if session.context else None

        # Build branch tree structure for this node
        branch_tree = build_branch_tree(node_uuid, session.id, db)

        # NEW: Load messages from message table with pagination
        session_manager = SessionManager(db)

        # Get paginated messages
        message_records = session_manager.get_session_messages(
            session_id=str(session.id),
            limit=limit,
            offset=offset,
            order_desc=False  # Oldest first for chronological order
        )

        # Convert to chat format
        messages = [msg.to_dict() for msg in message_records]

        # Get total message count for pagination info
        total_messages = session_manager.get_session_messages_count(str(session.id))

        # Fallback to legacy JSON column if no messages in new table (for backward compatibility)
        if not messages and session.messages:
            logger.info(f"Falling back to legacy messages JSON for session {session.id}")
            legacy_messages = session.messages or []
            # Apply pagination to legacy messages
            messages = legacy_messages[offset:offset+limit] if limit > 0 else legacy_messages
            total_messages = len(legacy_messages)

        return {
            "session_id": str(session.id),
            "messages": messages,
            "total_messages": total_messages,
            "has_more": (offset + len(messages)) < total_messages,
            "conclusion": session.conclusion,
            "summary": summary,
            "version_number": session.version_number,
            "branch_name": session.branch_name,
            "parent_session_id": str(session.parent_session_id) if session.parent_session_id else None,
            "branch_tree": branch_tree
        }

    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")
    except Exception as e:
        logger.error(f"Error getting messages: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/node/{node_id}/sessions")
async def get_node_sessions(
    node_id: str,
    db: Session = Depends(get_session)
):
    """
    Get all conversation sessions for a node (for conversation branching)

    Returns all active sessions with their branching information to reconstruct
    the conversation branch tree.
    """
    try:
        node_uuid = uuid.UUID(node_id)

        sessions = db.query(NodeChatSession).filter(
            NodeChatSession.node_id == node_uuid,
            NodeChatSession.is_active == True
        ).order_by(NodeChatSession.created_at).all()

        logger.info(f"[DEBUG] get_node_sessions for node {node_id}: found {len(sessions)} active sessions")

        return {
            "sessions": [
                {
                    "id": str(s.id),
                    "node_id": str(s.node_id),  # Add for debugging
                    "version_number": s.version_number,
                    "parent_version_number": s.parent_version_number,
                    "parent_session_id": str(s.parent_session_id) if s.parent_session_id else None,
                    "branch_name": s.branch_name,
                    "branch_display_name": s.branch_display_name,
                    "branch_point_index": s.branch_point_index,
                    "message_count": s.message_count,
                    "created_at": s.created_at.isoformat() if s.created_at else None,
                    "last_message_at": s.last_message_at.isoformat() if s.last_message_at else None
                }
                for s in sessions
            ]
        }

    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")
    except Exception as e:
        logger.error(f"Error getting node sessions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/debug/sessions/all")
async def debug_all_sessions(db: Session = Depends(get_session)):
    """
    DEBUG ENDPOINT: Get all active chat sessions across all nodes
    This helps diagnose session ownership issues
    """
    try:
        sessions = db.query(NodeChatSession).filter(
            NodeChatSession.is_active == True
        ).order_by(NodeChatSession.created_at.desc()).limit(50).all()

        return {
            "total_active_sessions": len(sessions),
            "sessions": [
                {
                    "session_id": str(s.id),
                    "node_id": str(s.node_id),
                    "project_id": s.project_id,
                    "branch_name": s.branch_name,
                    "parent_session_id": str(s.parent_session_id) if s.parent_session_id else None,
                    "message_count": s.message_count,
                    "created_at": s.created_at.isoformat() if s.created_at else None,
                    "last_message_at": s.last_message_at.isoformat() if s.last_message_at else None
                }
                for s in sessions
            ]
        }

    except Exception as e:
        logger.error(f"Error getting all sessions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sessions/create-branch")
async def create_conversation_branch(
    request: CreateBranchRequest,
    db: Session = Depends(get_session)
):
    """
    Create a new conversation branch from an existing session

    This allows exploring alternative conversation paths from a specific point.
    The new branch will copy all messages up to the branch point and start fresh from there.
    """
    try:
        # Validate parent session exists
        parent_session = db.query(NodeChatSession).filter(
            NodeChatSession.id == uuid.UUID(request.parent_session_id)
        ).first()

        if not parent_session:
            raise HTTPException(status_code=404, detail="Parent session not found")

        # Generate branch name
        # Find how many branches already exist from this parent
        existing_branches = db.query(NodeChatSession).filter(
            NodeChatSession.parent_session_id == uuid.UUID(request.parent_session_id)
        ).count()

        branch_name = f"branch-{existing_branches + 1}"

        # Create new branch session
        # NOTE: We only include initial_messages (up to branch point)
        # The modified_message will be sent separately via sendMessage to trigger AI generation
        new_session = NodeChatSession(
            node_id=parent_session.node_id,
            project_id=parent_session.project_id,
            parent_session_id=uuid.UUID(request.parent_session_id),
            branch_name=branch_name,
            branch_point_index=request.branch_point_index,
            branch_display_name=request.branch_display_name or f"Branch {existing_branches + 1}",
            version_number=request.version_number,
            parent_version_number=request.parent_version_number,
            title=parent_session.title,
            messages=request.initial_messages,  # Only messages up to branch point
            message_count=len(request.initial_messages),
            context=parent_session.context,
            created_by=parent_session.created_by,
            is_active=True
        )

        # Don't add modified_message here - it will be sent via sendMessage
        # This prevents duplicate user messages in the branch

        db.add(new_session)
        db.commit()
        db.refresh(new_session)

        logger.info(f"Created branch session {new_session.id} from parent {request.parent_session_id}")

        return {
            "session": new_session.to_dict(),
            "branch_name": branch_name,
            "parent_session_id": request.parent_session_id
        }

    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")
    except Exception as e:
        logger.error(f"Error creating branch: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/session/{session_id}/close")
async def close_chat_session(
    session_id: str,
    db: Session = Depends(get_session)
):
    """Close/deactivate a chat session"""
    try:
        session_uuid = uuid.UUID(session_id)

        session = db.query(NodeChatSession).filter(
            NodeChatSession.id == session_uuid
        ).first()

        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        session.is_active = False
        db.commit()

        return {"message": "Session closed successfully"}

    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")
    except Exception as e:
        logger.error(f"Error closing session: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


class UpdateBranchNameRequest(BaseModel):
    """Request to update branch display name"""
    display_name: str = Field(..., description="New display name for the branch")


@router.patch("/session/{session_id}/branch-name")
async def update_branch_display_name(
    session_id: str,
    request: UpdateBranchNameRequest,
    db: Session = Depends(get_session)
):
    """Update the user-facing branch display name"""
    try:
        session_uuid = uuid.UUID(session_id)

        session = db.query(NodeChatSession).filter(
            NodeChatSession.id == session_uuid
        ).first()

        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        session.branch_display_name = request.display_name
        db.commit()

        return {
            "message": "Branch display name updated",
            "session_id": session_id,
            "display_name": request.display_name
        }

    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")
    except Exception as e:
        logger.error(f"Error updating branch name: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# === AI-Powered Node Update Endpoint ===

class GenerateNodeSummaryRequest(BaseModel):
    """Request model for AI-generated node summary and description"""
    node_id: str = Field(..., description="Node UUID")
    project_id: str = Field(..., description="Project ID")
    conversation_history: Optional[List[Dict[str, str]]] = Field(default=None, description="Full conversation history [{role, content}]")
    current_title: str = Field(..., description="Current node title")
    current_description: str = Field(default="", description="Current node description")
    current_summary: str = Field(default="", description="Current node summary")
    chat_session_id: Optional[str] = Field(default=None, description="Chat session ID for tracking")
    user_id: int = Field(..., description="User ID")

    # Legacy field for backward compatibility
    message_content: Optional[str] = Field(default=None, description="Deprecated: use conversation_history instead")

    @model_validator(mode='after')
    def validate_content_source(self):
        """Ensure at least one content source is provided"""
        if not self.conversation_history and not self.message_content:
            raise ValueError("Either conversation_history or message_content must be provided")
        return self


@router.post("/generate-node-summary")
async def generate_node_summary(
    request: GenerateNodeSummaryRequest,
    db: Session = Depends(get_session)
):
    """
    Generate AI-powered summary, description, and tags for a node based on:
    - Full conversation history (all messages up to update point)
    - Current node title, description, and summary
    - Chat session ID for tracking

    Returns properly formatted summary (1-2 sentences), description (detailed), and tags (2-4 relevant categories)
    """
    try:
        # Use SummaryService to generate content
        summary_service = SummaryService()

        # Use conversation_history if provided, otherwise fall back to legacy message_content
        if request.conversation_history:
            result = await summary_service.generate_node_summary_from_conversation(
                conversation_history=request.conversation_history,
                current_title=request.current_title,
                current_description=request.current_description,
                current_summary=request.current_summary
            )
        else:
            # Legacy: single message content
            result = await summary_service.generate_node_summary(
                message_content=request.message_content or "",
                current_title=request.current_title,
                current_description=request.current_description,
                current_summary=request.current_summary
            )

        logger.info(f"Generated title, summary, description, and {len(result['tags'])} tags for node {request.node_id}")

        return {
            "success": True,
            "title": result.get("title", request.current_title),  # Fallback to current title if not generated
            "summary": result["summary"],
            "description": result["description"],
            "tags": result["tags"],
            "message": "Successfully generated node title, summary, description, and tags"
        }

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI response as JSON: {e}")
        raise HTTPException(status_code=500, detail="AI generated invalid response format")
    except ValueError as e:
        logger.error(f"Invalid AI response: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating node summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# === Smart Routing & Enhanced Context Endpoints ===

class RouteChatRequest(BaseModel):
    """Request model for route analysis"""
    query: str = Field(..., description="User's query/question")
    node_id: str = Field(..., description="Node UUID")
    project_id: str = Field(..., description="Project ID")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Additional context")
    conversation_history: Optional[List[Dict[str, str]]] = Field(default=None, description="Recent conversation")
    user_preference: str = Field(default="auto", description="User's mode preference: auto, quick, deep")


@router.post("/route-query")
async def route_chat_query(
    request: RouteChatRequest,
    db: Session = Depends(get_session)
):
    """
    Analyze query complexity and route to appropriate processing pipeline

    This endpoint:
    1. Builds comprehensive project context (tasks, resources, milestones)
    2. Analyzes query complexity using intent detection
    3. Routes to appropriate mode or offers user choice

    Returns:
        {
            "route": "simple" | "reflection" | "user_choice_required",
            "mode": "quick" | "deep",
            "analysis": {...intent analysis...},
            "options": [...] (if user choice needed),
            "enhanced_context": {...full project context...}
        }
    """
    try:
        # Import services
        from services.smart_router_service import SmartRouterService
        from services.node_chat.project_context_builder import ProjectContextBuilder

        # Build enhanced project context
        context_builder = ProjectContextBuilder(db)
        node_uuid = uuid.UUID(request.node_id)

        enhanced_context = await context_builder.build_full_context(
            node_id=node_uuid,
            project_id=request.project_id,
            include_tasks=True,
            include_resources=True,
            include_milestones=True,
            include_sibling_nodes=True,
            include_project_description=True
        )

        # Merge with provided context
        if request.context:
            enhanced_context.update(request.context)

        # Route query using smart router
        router_service = SmartRouterService()
        routing_result = await router_service.route_query(
            query=request.query,
            context=enhanced_context,
            conversation_history=request.conversation_history,
            user_preference=request.user_preference
        )

        # Add enhanced context to result
        routing_result["enhanced_context_summary"] = {
            "tasks_count": enhanced_context.get("statistics", {}).get("node_tasks_count", 0),
            "project_tasks": enhanced_context.get("statistics", {}).get("project_tasks_total", 0),
            "milestones": enhanced_context.get("statistics", {}).get("milestones_total", 0),
            "sibling_nodes": enhanced_context.get("statistics", {}).get("sibling_nodes", 0),
            "child_nodes": enhanced_context.get("statistics", {}).get("child_nodes", 0)
        }

        logger.info(f"Routed query to {routing_result['route']} mode")

        return routing_result

    except Exception as e:
        logger.error(f"Error in route_chat_query: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send-message-with-context")
async def send_message_with_enhanced_context(
    request: ChatMessageRequest,
    db: Session = Depends(get_session)
):
    """
    Send message with enhanced project context

    This endpoint streams responses while having access to:
    - Full project description
    - All project tasks (with node-specific highlighting)
    - All project milestones
    - All project resources
    - Sibling and child nodes for context

    The AI can reference and reason about any project data.
    """
    async def event_generator():
        try:
            # Build enhanced project context
            from services.node_chat.project_context_builder import ProjectContextBuilder

            context_builder = ProjectContextBuilder(db)
            node_uuid = uuid.UUID(request.node_id)

            # Build comprehensive context
            enhanced_context = await context_builder.build_full_context(
                node_id=node_uuid,
                project_id=request.project_id,
                include_tasks=True,
                include_resources=True,
                include_milestones=True,
                include_sibling_nodes=True,
                include_project_description=True
            )

            # Format context for prompt
            formatted_context = context_builder.format_context_for_prompt(enhanced_context)

            # Get or create session
            session_manager = SessionManager(db=db)
            session = session_manager.get_or_create_session(
                node_id=str(node_uuid),
                project_id=request.project_id,
                user_id=request.user_id,
                context=enhanced_context,
                session_id=request.session_id
            )

            # Get conversation history
            current_messages = session.messages or []

            # Add user message
            current_messages.append({
                "role": "user",
                "content": request.message,
                "timestamp": datetime.utcnow().isoformat()
            })

            # Send context info event
            yield f"data: {json.dumps({'type': 'context', 'summary': enhanced_context.get('statistics', {})})}\n\n"

            # Generate response with enhanced context
            full_response = ""

            logger.info(f"Generating response with enhanced project context (node: {request.node_id})")

            # Build prompt with enhanced context and conversation history
            prompt_with_context = f"""You are an AI assistant helping with project management and idea development.

# Project Context
{formatted_context}

# Conversation History
"""
            # Add conversation history
            for msg in current_messages[:-1]:  # Exclude the message we just added
                role_label = "Assistant" if msg["role"] == "assistant" else "User"
                prompt_with_context += f"{role_label}: {msg['content']}\n"

            # Add current message
            prompt_with_context += f"User: {request.message}\nAssistant:"

            # Stream AI response
            async for chunk in vertex_ai_service.generate_stream(
                prompt=prompt_with_context,
                temperature=0.7
            ):
                full_response += chunk
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"

            # Generate suggestions for the AI response
            suggestions = []
            try:
                from services.node_chat.suggestion_service import SuggestionService
                suggestion_service = SuggestionService()

                # Get node details from context
                node_title = enhanced_context.get('current_node', {}).get('title', '')
                node_description = enhanced_context.get('current_node', {}).get('description', '')

                suggestions = await suggestion_service.generate_suggestions(
                    node_title=node_title,
                    node_description=node_description,
                    message_content=full_response,
                    conversation_history=[
                        {"role": m.get("role"), "content": m.get("content")}
                        for m in current_messages[-5:]  # Last 5 messages for context
                    ]
                )
                logger.info(f"Generated {len(suggestions)} suggestions for message")
            except Exception as e:
                logger.error(f"Error generating suggestions: {e}")
                suggestions = []

            # Add assistant response to messages with suggestions
            current_messages.append({
                "role": "assistant",
                "content": full_response,
                "timestamp": datetime.utcnow().isoformat(),
                "suggestions": suggestions  # Include suggestions in saved message
            })

            # Update session
            session.messages = current_messages
            session.message_count = len(current_messages)
            session.last_message_at = datetime.utcnow()
            flag_modified(session, "messages")
            db.commit()

            # Stream suggestions to frontend
            if suggestions:
                yield f"data: {json.dumps({'type': 'suggestions', 'suggestions': suggestions})}\n\n"

            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            logger.error(f"Error in send_message_with_enhanced_context: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream"
    )


# === Version Management Endpoints ===

@router.post("/create-version", response_model=VersionResponse)
async def create_version_from_conclusion(
    request: CreateVersionRequest,
    db: Session = Depends(get_session)
):
    """
    Create a new version from the chat session's conclusion

    This will:
    1. Create a new version with the conclusion as description
    2. Mark it as the current version
    3. Mark all other versions as not current
    """
    try:
        session_uuid = uuid.UUID(request.session_id)

        # Get session
        session = db.query(NodeChatSession).filter(
            NodeChatSession.id == session_uuid
        ).first()

        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        if not session.conclusion:
            raise HTTPException(status_code=400, detail="Session has no conclusion yet")

        # Get next version number
        max_version = db.query(NodeVersion).filter(
            NodeVersion.node_id == session.node_id
        ).count()

        next_version = max_version + 1

        # Mark all existing versions as not current
        db.query(NodeVersion).filter(
            NodeVersion.node_id == session.node_id,
            NodeVersion.is_current == True
        ).update({"is_current": False})

        # Create new version
        version = NodeVersion(
            node_id=session.node_id,
            chat_session_id=session.id,
            version_number=next_version,
            is_current=True,
            title=session.context.get('node_title', 'Untitled'),
            description=session.conclusion,
            tags=session.context.get('tags', []),
            metadata=session.context,
            change_description="Updated from chat session refinement",
            change_type="chat_conclusion",
            created_by=request.user_id
        )

        db.add(version)
        db.commit()
        db.refresh(version)

        return VersionResponse(
            id=str(version.id),
            node_id=str(version.node_id),
            version_number=version.version_number,
            is_current=version.is_current,
            title=version.title,
            description=version.description,
            tags=version.tags,
            change_description=version.change_description,
            change_type=version.change_type,
            created_at=version.created_at,
            created_by=version.created_by
        )

    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")
    except Exception as e:
        logger.error(f"Error creating version: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/node/{node_id}/versions", response_model=List[VersionResponse])
async def get_node_versions(
    node_id: str,
    db: Session = Depends(get_session)
):
    """Get all versions for a node"""
    try:
        node_uuid = uuid.UUID(node_id)

        versions = db.query(NodeVersion).filter(
            NodeVersion.node_id == node_uuid
        ).order_by(NodeVersion.version_number.desc()).all()

        return [
            VersionResponse(
                id=str(v.id),
                node_id=str(v.node_id),
                version_number=v.version_number,
                is_current=v.is_current,
                title=v.title,
                description=v.description,
                tags=v.tags,
                change_description=v.change_description,
                change_type=v.change_type,
                created_at=v.created_at,
                created_by=v.created_by
            )
            for v in versions
        ]

    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")
    except Exception as e:
        logger.error(f"Error getting versions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/node/{node_id}/current-version", response_model=VersionResponse)
async def get_current_version(
    node_id: str,
    db: Session = Depends(get_session)
):
    """Get the current active version for a node"""
    try:
        node_uuid = uuid.UUID(node_id)

        version = db.query(NodeVersion).filter(
            NodeVersion.node_id == node_uuid,
            NodeVersion.is_current == True
        ).first()

        if not version:
            raise HTTPException(status_code=404, detail="No current version found")

        return VersionResponse(
            id=str(version.id),
            node_id=str(version.node_id),
            version_number=version.version_number,
            is_current=version.is_current,
            title=version.title,
            description=version.description,
            tags=version.tags,
            change_description=version.change_description,
            change_type=version.change_type,
            created_at=version.created_at,
            created_by=version.created_by
        )

    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting current version: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/restore-version")
async def restore_version(
    request: RestoreVersionRequest,
    db: Session = Depends(get_session)
):
    """Restore a previous version as the current version"""
    try:
        version_uuid = uuid.UUID(request.version_id)

        version = db.query(NodeVersion).filter(
            NodeVersion.id == version_uuid
        ).first()

        if not version:
            raise HTTPException(status_code=404, detail="Version not found")

        # Mark all versions as not current
        db.query(NodeVersion).filter(
            NodeVersion.node_id == version.node_id,
            NodeVersion.is_current == True
        ).update({"is_current": False})

        # Mark this version as current
        version.is_current = True
        db.commit()

        return {
            "message": "Version restored successfully",
            "version_number": version.version_number,
            "node_id": str(version.node_id)
        }

    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")
    except Exception as e:
        logger.error(f"Error restoring version: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/node/{node_id}/conclusion")
async def get_node_conclusion(
    node_id: str,
    db: Session = Depends(get_session)
):
    """
    Get the current conclusion for a node
    This is what should be displayed on the node in the tree canvas
    """
    try:
        node_uuid = uuid.UUID(node_id)

        # Try to get from active session first
        session = db.query(NodeChatSession).filter(
            NodeChatSession.node_id == node_uuid,
            NodeChatSession.is_active == True
        ).first()

        if session and session.conclusion:
            return {
                "node_id": node_id,
                "conclusion": session.conclusion,
                "source": "active_session",
                "updated_at": session.conclusion_updated_at
            }

        # Otherwise get from current version
        version = db.query(NodeVersion).filter(
            NodeVersion.node_id == node_uuid,
            NodeVersion.is_current == True
        ).first()

        if version:
            return {
                "node_id": node_id,
                "conclusion": version.description,
                "source": "current_version",
                "version_number": version.version_number,
                "updated_at": version.created_at
            }

        return {
            "node_id": node_id,
            "conclusion": None,
            "source": "none"
        }

    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")
    except Exception as e:
        logger.error(f"Error getting conclusion: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# === Generate Follow-up Suggestions ===

class GenerateSuggestionsRequest(BaseModel):
    node_id: str
    project_id: str
    message_content: str
    node_title: str
    node_description: str
    conversation_history: List[Dict[str, str]] = []
    session_id: Optional[str] = None  # Session ID to save suggestions to
    message_index: Optional[int] = None  # Message index to attach suggestions to


@router.post("/generate-suggestions")
async def generate_suggestions(
    request: GenerateSuggestionsRequest,
    db: Session = Depends(get_session)
):
    """Generate contextual follow-up suggestions after an AI message"""
    try:
        # Use SuggestionService to generate suggestions
        suggestion_service = SuggestionService()

        suggestions = await suggestion_service.generate_suggestions(
            node_title=request.node_title,
            node_description=request.node_description,
            message_content=request.message_content,
            conversation_history=request.conversation_history
        )

        # If session_id and message_index provided, save suggestions to database
        if request.session_id and request.message_index is not None:
            try:
                session_uuid = uuid.UUID(request.session_id)
                message = db.query(NodeChatMessage).filter(
                    NodeChatMessage.session_id == session_uuid,
                    NodeChatMessage.message_index == request.message_index
                ).first()

                if message:
                    message.suggestions = suggestions
                    db.commit()
                    logger.info(f"Saved {len(suggestions)} suggestions to message {request.message_index} in session {request.session_id}")
                else:
                    logger.warning(f"Message {request.message_index} not found in session {request.session_id}")
            except Exception as save_error:
                logger.error(f"Failed to save suggestions to database: {save_error}")
                # Don't fail the request if saving fails

        return {
            "success": True,
            "suggestions": suggestions
        }

    except Exception as e:
        logger.error(f"Error generating suggestions: {e}")
        return {
            "success": False,
            "suggestions": [],
            "error": str(e)
        }


# === Deep Analysis with ReAct ===

class ReActChatRequest(BaseModel):
    """Request for ReAct deep analysis"""
    node_id: str = Field(..., description="Node UUID")
    project_id: str = Field(..., description="Project UUID")
    user_id: int = Field(..., description="User ID")
    message: str = Field(..., min_length=1, description="User's question or request")
    session_id: Optional[str] = Field(None, description="Optional session ID to continue conversation")
    max_iterations: int = Field(5, ge=1, le=10, description="Maximum reasoning iterations (1-10)")
    enable_reflection: bool = Field(True, description="Whether to reflect on progress")


class ReActChatResponse(BaseModel):
    """Response from ReAct deep analysis"""
    session_id: str
    response: str
    reasoning_steps_formatted: str
    iterations: int
    tool_calls_count: int
    context_summary: Dict[str, Any]
    metadata: Dict[str, Any]


@router.post("/deep-analysis", response_model=ReActChatResponse)
async def deep_analysis_with_react(
    request: ReActChatRequest,
    db: Session = Depends(get_session)
):
    """
    Perform deep analysis using ReAct (Reason + Act) multi-step reasoning

    This endpoint provides:
    - Chain-of-thought reasoning with visible thinking process
    - Multi-step iterative analysis
    - Access to ALL project data (tasks, milestones, resources, nodes)
    - Tool calling within reasoning loops
    - Reflection on progress
    - Comprehensive final answer

    The AI will:
    1. Think step-by-step about the question
    2. Decide what information it needs
    3. Call tools to gather data
    4. Observe the results
    5. Reflect on progress
    6. Repeat until goal is achieved or max iterations reached
    7. Provide comprehensive final answer

    Use this endpoint when you need:
    - Deep project analysis
    - Complex problem-solving
    - Multi-step planning
    - Comprehensive research across project data
    """
    try:
        # Initialize services
        session_manager = SessionManager(db)

        # Get or create session
        try:
            session = session_manager.get_or_create_session(
                node_id=request.node_id,
                project_id=request.project_id,
                user_id=request.user_id,
                context={},  # Context will be built by ReAct engine
                session_id=request.session_id
            )
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))

        # Get conversation history
        messages = session.messages or []

        # Initialize NodeChatService with DB session and user ID
        chat_service = NodeChatService(db=db, user_id=request.user_id)

        # Run ReAct reasoning
        logger.info(f"Starting ReAct deep analysis for user {request.user_id}, node {request.node_id}")

        react_result = await chat_service.generate_ai_response_with_react(
            message=request.message,
            conversation_history=messages,
            node_id=request.node_id,
            project_id=request.project_id,
            max_iterations=request.max_iterations,
            enable_reflection=request.enable_reflection
        )

        # Add messages to session (with user_id for multi-user attribution)
        session_manager.add_messages_to_session(
            session=session,
            user_message=request.message,
            ai_response=react_result["response"],
            user_id=request.user_id
        )

        db.commit()

        logger.info(
            f"ReAct analysis completed: {react_result['iterations']} iterations, "
            f"{len(react_result['tool_calls'])} tools called"
        )

        return ReActChatResponse(
            session_id=str(session.id),
            response=react_result["response"],
            reasoning_steps_formatted=react_result["reasoning_steps_formatted"],
            iterations=react_result["iterations"],
            tool_calls_count=len(react_result["tool_calls"]),
            context_summary=react_result.get("context_used", {}),
            metadata={
                "message_count": session.message_count,
                "tool_calls": react_result["tool_calls"],
                "reasoning_steps": react_result["reasoning_steps"]
            }
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid UUID: {str(e)}")
    except Exception as e:
        logger.error(f"Error in deep_analysis_with_react: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


# ============================================================================
# MULTI-USER COLLABORATION ENDPOINTS
# ============================================================================

class AddParticipantRequest(BaseModel):
    """Request to add a participant to a chat session"""
    user_id: int = Field(..., description="User ID of requester")
    participant_id: int = Field(..., description="User ID to add as participant")


class RemoveParticipantRequest(BaseModel):
    """Request to remove a participant from a chat session"""
    user_id: int = Field(..., description="User ID of requester")


class ParticipantResponse(BaseModel):
    """Participant information"""
    user_id: int
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str  # owner, admin, editor, viewer


class ParticipantsListResponse(BaseModel):
    """List of chat participants"""
    session_id: str
    participants: List[ParticipantResponse]
    is_collaborative: bool


@router.get("/session/{session_id}/participants", response_model=ParticipantsListResponse)
async def get_session_participants(
    session_id: str,
    user_id: int,
    db: Session = Depends(get_session)
):
    """
    Get list of participants in a chat session

    Args:
        session_id: Chat session UUID
        user_id: User ID of requester

    Returns:
        List of participants with their roles
    """
    try:
        # Get session
        session = db.query(NodeChatSession).filter(
            NodeChatSession.id == uuid.UUID(session_id)
        ).first()

        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        # Check if user has access to this chat
        await require_chat_access(user_id, session, db)

        # Get participant list
        participant_ids = session.participant_user_ids or [session.created_by]

        # Fetch user info from backend for each participant
        permission_service = NodeChatPermissionService(db)
        participants = []

        for pid in participant_ids:
            # Get user's role in the project
            role = await permission_service.get_user_project_role(pid, session.project_id)

            participants.append(ParticipantResponse(
                user_id=pid,
                role=role or "viewer"
            ))

        return ParticipantsListResponse(
            session_id=session_id,
            participants=participants,
            is_collaborative=session.is_collaborative
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid UUID: {str(e)}")
    except Exception as e:
        logger.error(f"Error getting participants: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/session/{session_id}/participants/add")
async def add_participant(
    session_id: str,
    request: AddParticipantRequest,
    db: Session = Depends(get_session)
):
    """
    Add a participant to a chat session

    Requires ADMIN or OWNER role.

    Args:
        session_id: Chat session UUID
        request: Request with user_id and participant_id

    Returns:
        Success message
    """
    try:
        # Get session
        session = db.query(NodeChatSession).filter(
            NodeChatSession.id == uuid.UUID(session_id)
        ).first()

        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        # Add participant using permission service
        permission_service = NodeChatPermissionService(db)
        added = await permission_service.add_participant(
            user_id=request.user_id,
            session=session,
            new_participant_id=request.participant_id
        )

        if added:
            logger.info(f"User {request.user_id} added participant {request.participant_id} to session {session_id}")
            return {
                "success": True,
                "message": "Participant added successfully",
                "participant_id": request.participant_id
            }
        else:
            return {
                "success": False,
                "message": "Participant already exists",
                "participant_id": request.participant_id
            }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid UUID: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding participant: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/session/{session_id}/participants/{participant_id}")
async def remove_participant(
    session_id: str,
    participant_id: int,
    request: RemoveParticipantRequest,
    db: Session = Depends(get_session)
):
    """
    Remove a participant from a chat session

    Requires ADMIN or OWNER role.

    Args:
        session_id: Chat session UUID
        participant_id: User ID to remove
        request: Request with user_id of requester

    Returns:
        Success message
    """
    try:
        # Get session
        session = db.query(NodeChatSession).filter(
            NodeChatSession.id == uuid.UUID(session_id)
        ).first()

        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        # Remove participant using permission service
        permission_service = NodeChatPermissionService(db)
        removed = await permission_service.remove_participant(
            user_id=request.user_id,
            session=session,
            participant_id=participant_id
        )

        if removed:
            logger.info(f"User {request.user_id} removed participant {participant_id} from session {session_id}")
            return {
                "success": True,
                "message": "Participant removed successfully",
                "participant_id": participant_id
            }
        else:
            return {
                "success": False,
                "message": "Participant not found in session",
                "participant_id": participant_id
            }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid UUID: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing participant: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: str,
    user_id: int,
    db: Session = Depends(get_session)
):
    """
    Delete a message from a chat session

    Users can delete their own messages.
    ADMIN and OWNER can delete any message.

    Args:
        message_id: Message UUID
        user_id: User ID of requester

    Returns:
        Success message
    """
    try:
        # Get message
        message = db.query(NodeChatMessage).filter(
            NodeChatMessage.id == uuid.UUID(message_id)
        ).first()

        if not message:
            raise HTTPException(status_code=404, detail="Message not found")

        # Get session
        session = db.query(NodeChatSession).filter(
            NodeChatSession.id == message.session_id
        ).first()

        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        # Check if user can delete this message
        await require_delete_permission(user_id, message, session, db)

        # Delete the message
        db.delete(message)
        db.commit()

        logger.info(f"User {user_id} deleted message {message_id} from session {session.id}")

        return {
            "success": True,
            "message": "Message deleted successfully",
            "message_id": message_id
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid UUID: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting message: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
