"""
API routes for Question Answering service.
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Query
from fastapi.responses import StreamingResponse
from typing import List, Optional, Dict, Any
import logging
import json
import asyncio
from datetime import datetime

from services.question_answering.qa_service import QuestionAnsweringService
from services.question_answering.prompts import PromptType as ServicePromptType
from models.requests.qa_requests import (
    QuestionRequest,
    QuestionResponse,
    BatchQuestionRequest,
    BatchQuestionResponse,
    ComparativeQuestionRequest,
    ComparativeQuestionResponse,
    ComparativeAnalysis,
    SourcedQuestionRequest,
    ConversationHistoryRequest,
    ConversationHistoryResponse,
    ConversationMessage,
    ClearSessionRequest,
    ClearSessionResponse,
    PromptListResponse,
    HealthCheckResponse,
    ErrorResponse,
    SourceDocument
)

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/ai-api/qa", tags=["Question Answering"])

# Initialize QA service (singleton)
qa_service = QuestionAnsweringService()


@router.post("/answer", response_model=QuestionResponse)
async def answer_question(request: QuestionRequest) -> QuestionResponse:
    """Answer a single question with specified parameters.
    
    Args:
        request: Question request with parameters
        
    Returns:
        Question response with answer
    """
    try:
        # Convert documents if provided
        documents = None
        if request.documents:
            from langchain_core.documents import Document
            documents = [
                Document(
                    page_content=doc.content,
                    metadata=doc.metadata or {}
                )
                for doc in request.documents
            ]
        
        # Call QA service
        result = await qa_service.answer_question(
            question=request.question,
            prompt_type=ServicePromptType(request.prompt_type.value),
            context=request.context,
            documents=documents,
            session_id=request.session_id,
            use_memory=request.use_memory,
            provider=request.provider.value,
            model=request.model,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            custom_prompt=request.custom_prompt
        )
        
        # Handle error in result
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        # Convert sources back if present
        sources = None
        if request.documents:
            sources = request.documents
        
        return QuestionResponse(
            answer=result["answer"],
            question=result["question"],
            prompt_type=result["prompt_type"],
            session_id=result.get("session_id"),
            timestamp=result["timestamp"],
            confidence=result.get("confidence"),
            sources=sources,
            metadata=result.get("metadata", {})
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error answering question: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/answer/stream")
async def answer_question_stream(request: QuestionRequest):
    """Stream answer to a question (for long responses).
    
    Args:
        request: Question request with parameters
        
    Returns:
        Streaming response
    """
    async def generate():
        try:
            # For now, return the full answer as a single chunk
            # In production, you'd implement actual streaming from LLM
            result = await qa_service.answer_question(
                question=request.question,
                prompt_type=ServicePromptType(request.prompt_type.value),
                context=request.context,
                session_id=request.session_id,
                use_memory=request.use_memory,
                provider=request.provider.value,
                model=request.model,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
                custom_prompt=request.custom_prompt
            )
            
            if "error" in result:
                yield f"data: {json.dumps({'error': result['error']})}\n\n"
            else:
                # Stream the answer in chunks
                answer = result["answer"]
                chunk_size = 50  # Characters per chunk
                
                for i in range(0, len(answer), chunk_size):
                    chunk = answer[i:i+chunk_size]
                    yield f"data: {json.dumps({'chunk': chunk})}\n\n"
                    await asyncio.sleep(0.01)  # Small delay for streaming effect
                
                # Send completion signal
                yield f"data: {json.dumps({'done': True, 'metadata': result.get('metadata', {})})}\n\n"
                
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@router.post("/answer/batch", response_model=BatchQuestionResponse)
async def answer_batch_questions(request: BatchQuestionRequest) -> BatchQuestionResponse:
    """Answer multiple questions in batch.
    
    Args:
        request: Batch question request
        
    Returns:
        Batch response with all answers
    """
    try:
        import time
        start_time = time.time()
        
        # Prepare questions for batch processing
        questions = []
        for item in request.questions:
            q_data = {
                "question": item.question,
                "prompt_type": ServicePromptType(item.prompt_type.value) if item.prompt_type else ServicePromptType.GENERAL,
                "context": item.context,
                "custom_prompt": item.custom_prompt,
                "metadata": item.metadata
            }
            
            # Add documents if provided
            if item.documents:
                from langchain_core.documents import Document
                q_data["documents"] = [
                    Document(
                        page_content=doc.content,
                        metadata=doc.metadata or {}
                    )
                    for doc in item.documents
                ]
            
            questions.append(q_data)
        
        # Process batch
        results = await qa_service.answer_batch(
            questions=questions,
            session_id=request.session_id,
            use_memory=request.use_memory,
            provider=request.provider.value,
            model=request.model,
            temperature=request.temperature,
            max_tokens=request.max_tokens
        )
        
        # Convert results to response format
        responses = []
        successful = 0
        failed = 0
        
        for i, result in enumerate(results):
            if "error" in result:
                failed += 1
                responses.append(QuestionResponse(
                    answer="",
                    question=request.questions[i].question,
                    prompt_type=request.questions[i].prompt_type.value if request.questions[i].prompt_type else "general",
                    timestamp=result.get("timestamp", datetime.utcnow().isoformat()),
                    metadata={},
                    error=result["error"]
                ))
            else:
                successful += 1
                responses.append(QuestionResponse(
                    answer=result["answer"],
                    question=result["question"],
                    prompt_type=result["prompt_type"],
                    session_id=result.get("session_id"),
                    timestamp=result["timestamp"],
                    confidence=result.get("confidence"),
                    metadata=result.get("metadata", {})
                ))
        
        processing_time = time.time() - start_time
        
        return BatchQuestionResponse(
            results=responses,
            total_questions=len(request.questions),
            successful=successful,
            failed=failed,
            processing_time=processing_time,
            parallel_processed=request.parallel
        )
        
    except Exception as e:
        logger.error(f"Error in batch processing: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/answer/comparative", response_model=ComparativeQuestionResponse)
async def answer_comparative_question(request: ComparativeQuestionRequest) -> ComparativeQuestionResponse:
    """Answer a comparative question analyzing multiple options.
    
    Args:
        request: Comparative question request
        
    Returns:
        Comparative analysis response
    """
    try:
        result = await qa_service.answer_comparative(
            question=request.question,
            options=request.options,
            criteria=request.criteria,
            session_id=request.session_id,
            provider=request.provider.value,
            model=request.model,
            temperature=request.temperature,
            max_tokens=request.max_tokens
        )
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        # Parse the answer to extract structured comparison
        # This is a simplified extraction - in production, you might use
        # more sophisticated parsing or have the LLM return structured data
        comparison_data = result.get("comparison", {})
        
        comparison = ComparativeAnalysis(
            options=comparison_data.get("options", request.options),
            criteria=comparison_data.get("criteria", request.criteria or []),
            similarities=[],  # Would be extracted from answer
            differences=[],   # Would be extracted from answer
            recommendation=None,  # Would be extracted from answer
            option_scores=None
        )
        
        return ComparativeQuestionResponse(
            answer=result["answer"],
            question=result["question"],
            comparison=comparison,
            session_id=result.get("session_id"),
            timestamp=result["timestamp"],
            metadata=result.get("metadata", {})
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in comparative analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/answer/with-sources", response_model=QuestionResponse)
async def answer_with_sources(request: SourcedQuestionRequest) -> QuestionResponse:
    """Answer question using provided sources.
    
    Args:
        request: Question request with sources
        
    Returns:
        Answer with source citations
    """
    try:
        # Convert sources to format expected by service
        sources = [
            {
                "content": src.content,
                "metadata": src.metadata or {},
                "source": src.source
            }
            for src in request.sources
        ]
        
        result = await qa_service.answer_with_sources(
            question=request.question,
            sources=sources,
            prompt_type=ServicePromptType(request.prompt_type.value),
            session_id=request.session_id,
            use_memory=request.use_memory,
            provider=request.provider.value,
            model=request.model,
            temperature=request.temperature,
            max_tokens=request.max_tokens
        )
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return QuestionResponse(
            answer=result["answer"],
            question=result["question"],
            prompt_type=result["prompt_type"],
            session_id=result.get("session_id"),
            timestamp=result["timestamp"],
            confidence=result.get("confidence"),
            sources=request.sources if request.cite_sources else None,
            metadata=result.get("metadata", {})
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error answering with sources: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversation/history", response_model=ConversationHistoryResponse)
async def get_conversation_history(
    session_id: str = Query(..., description="Session ID"),
    limit: Optional[int] = Query(None, ge=1, description="Limit messages")
) -> ConversationHistoryResponse:
    """Get conversation history for a session.
    
    Args:
        session_id: Session identifier
        limit: Optional limit on messages
        
    Returns:
        Conversation history
    """
    try:
        history = qa_service.get_session_history(session_id)
        
        # Apply limit if specified
        if limit:
            history = history[-limit:]
        
        # Convert to response format
        messages = [
            ConversationMessage(
                role=msg["role"],
                content=msg["content"],
                timestamp=None  # Add timestamp if stored
            )
            for msg in history
        ]
        
        return ConversationHistoryResponse(
            session_id=session_id,
            messages=messages,
            message_count=len(messages),
            created_at=None,  # Would need to track this
            last_updated=datetime.utcnow().isoformat() if messages else None
        )
        
    except Exception as e:
        logger.error(f"Error getting conversation history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/conversation/clear", response_model=ClearSessionResponse)
async def clear_conversation(request: ClearSessionRequest) -> ClearSessionResponse:
    """Clear conversation memory for a session.
    
    Args:
        request: Clear session request
        
    Returns:
        Clear session response
    """
    try:
        if not request.confirm:
            return ClearSessionResponse(
                success=False,
                session_id=request.session_id,
                message="Confirmation required to clear session"
            )
        
        success = qa_service.clear_session_memory(request.session_id)
        
        return ClearSessionResponse(
            success=success,
            session_id=request.session_id,
            message="Session cleared successfully" if success else "Session not found"
        )
        
    except Exception as e:
        logger.error(f"Error clearing session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/prompts", response_model=PromptListResponse)
async def list_prompt_types() -> PromptListResponse:
    """List all available prompt types with descriptions.
    
    Returns:
        List of prompt types
    """
    try:
        from services.question_answering.prompts import QAPrompts
        
        prompts = QAPrompts()
        prompt_types = []
        
        for pt in ServicePromptType:
            prompt_types.append({
                "type": pt.value,
                "description": prompts.get_prompt_description(pt)
            })
        
        return PromptListResponse(
            prompt_types=prompt_types,
            total_count=len(prompt_types)
        )
        
    except Exception as e:
        logger.error(f"Error listing prompts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/learning/topic-suggestions")
async def generate_topic_suggestions(request: Dict[str, Any]) -> Dict[str, Any]:
    """Generate topic suggestions based on interests or partial input.

    Args:
        request: Dictionary containing partial topic or interests

    Returns:
        Dictionary with suggested topics
    """
    try:
        # Accept both partialTopic and user_input for compatibility
        partial_topic = request.get("partialTopic", "") or request.get("user_input", "")
        interests = request.get("interests", [])
        skills = request.get("skills", [])

        if not partial_topic and not interests and not skills:
            raise HTTPException(status_code=400, detail="Partial topic, interests, or skills required")

        # Create a prompt for generating topic suggestions
        input_parts = []
        if partial_topic:
            input_parts.append(f"Partial Topic: {partial_topic}")
        if interests:
            input_parts.append(f"Interests: {', '.join(interests)}")
        if skills:
            input_parts.append(f"Skills: {', '.join(skills)}")

        input_text = '\n'.join(input_parts)

        prompt = f"""You are an expert educational advisor. Generate 4 specific learning course topics directly related to: {input_text}

Requirements:
- Topics MUST be directly related to and expand on the user's input
- Each topic should be 3-8 words (max 60 chars)
- Topics should be practical and actionable
- Make them progressively more specific or cover different aspects

Return only 4 topics, one per line, no numbering."""

        # Use the QA service to generate suggestions
        question_text = partial_topic or ', '.join(interests + skills)
        result = await qa_service.answer_question(
            question=question_text,
            prompt_type=ServicePromptType.EDUCATIONAL,
            custom_prompt=prompt,
            provider="vertex_ai",
            temperature=0.7,
            max_tokens=600
        )

        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])

        # Parse the response into individual topics
        topics_text = result.get("answer", "")
        topics = [topic.strip() for topic in topics_text.split('\n') if topic.strip()]

        # Ensure we have at least some topics
        if not topics:
            # Fallback topics
            topics = [
                "Web Development with React",
                "Python for Data Science",
                "Machine Learning Fundamentals",
                "Cloud Computing with AWS",
                "Mobile App Development"
            ]

        return {
            "success": True,
            "suggestions": topics[:4],  # Limit to 4 suggestions
            "input": partial_topic or interests
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating topic suggestions: {e}")
        return {
            "success": False,
            "error": str(e),
            "suggestions": []
        }


@router.post("/learning/goals")
async def generate_learning_goals(request: Dict[str, Any]) -> Dict[str, Any]:
    """Generate learning goals based on a topic.
    
    Args:
        request: Dictionary containing topic and optional context
        
    Returns:
        Dictionary with suggested learning goals
    """
    try:
        topic = request.get("topic", "")
        current_knowledge = request.get("currentKnowledge", "")
        
        if not topic:
            raise HTTPException(status_code=400, detail="Topic is required")
        
        # Create a specific prompt for generating learning goals
        prompt = f"""You are an expert educational advisor. Based on the topic provided, generate 5 specific, actionable, and measurable learning goals.

Topic: {topic}
{'Current Knowledge: ' + current_knowledge if current_knowledge else ''}

Generate 5 learning goals that are:
1. Specific and actionable (what the learner will DO)
2. Measurable (can track progress)
3. Realistic and achievable
4. Focused on practical outcomes
5. Progressive (from foundational to advanced)

Format each goal as a clear statement starting with an action verb.
Return ONLY the 5 goals, one per line, without numbering or bullet points."""

        # Use the QA service to generate goals
        result = await qa_service.answer_question(
            question=topic,
            prompt_type=ServicePromptType.EDUCATIONAL,
            custom_prompt=prompt,
            provider="vertex_ai",
            temperature=0.7,
            max_tokens=2000
        )
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        # Parse the response into individual goals
        goals_text = result.get("answer", "")
        goals = [goal.strip() for goal in goals_text.split('\n') if goal.strip()]
        
        # Ensure we have at least some goals
        if not goals:
            # Fallback goals based on topic
            goals = [
                f"Understand the fundamental concepts of {topic}",
                f"Build practical projects using {topic}",
                f"Master best practices and patterns in {topic}",
                f"Solve real-world problems with {topic}",
                f"Develop professional expertise in {topic}"
            ]
        
        return {
            "success": True,
            "goals": goals[:5],  # Limit to 5 goals
            "topic": topic
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating learning goals: {e}")
        return {
            "success": False,
            "error": str(e),
            "goals": []
        }


@router.get("/health", response_model=HealthCheckResponse)
async def health_check() -> HealthCheckResponse:
    """Health check endpoint for QA service.
    
    Returns:
        Service health status
    """
    try:
        return HealthCheckResponse(
            status="healthy",
            version="1.0.0",
            providers_available=["openai", "google", "anthropic", "cohere"],
            timestamp=datetime.utcnow().isoformat()
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service unhealthy")