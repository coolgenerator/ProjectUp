"""
Paper analysis routes for PDF outline generation, references extraction, and chat
"""

import requests
import json
import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, HttpUrl
from typing import List, Optional
from langchain_google_vertexai import ChatVertexAI
from config.settings import settings

logger = logging.getLogger(__name__)

# Import services
from services.paper import (
    extract_text_from_pdf,
    extract_references_from_pdf,
    generate_outline_with_llm,
    generate_references_with_llm,
    generate_title_with_llm,
    generate_chat_title_with_llm,
    search_pdf_link,
)
from services.paper.refextract_service import (
    extract_references_with_refextract,
    RefextractReference
)
from services.paper.llm_service import OutlineSection, Reference
from prompts.paper_prompts import (
    get_chat_prompt,
    get_general_answer_prompt,
    get_paper_specific_answer_prompt
)

router = APIRouter()


# Request/Response Models
from models.requests.paper_requests import (
    GenerateOutlineRequest,
    ChatRequest,
    GenerateTitleRequest,
    GenerateChatTitleRequest,
)
from models.responses.paper_responses import (
    GenerateOutlineResponse,
    GenerateReferencesResponse,
    ChatResponse,
    GenerateTitleResponse,
)


# Routes
@router.post("/papers/generate-outline", response_model=GenerateOutlineResponse)
async def generate_outline(request: GenerateOutlineRequest):
    """
    Generate outline for a PDF paper by reading it from S3.

    Args:
        request: Contains pdf_url and optional token

    Returns:
        Structured outline of the paper
    """
    try:
        # Extract text from PDF
        text, total_pages = extract_text_from_pdf(str(request.pdf_url), request.token)

        # Generate outline using LLM (Gemini via Vertex AI)
        outline = generate_outline_with_llm(text)

        return GenerateOutlineResponse(outline=outline)

    except requests.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to download PDF: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate outline: {str(e)}"
        )


@router.post("/papers/generate-references")
async def generate_references(request: GenerateOutlineRequest):
    """
    Extract references from a PDF paper using Grobid and search for PDF links with streaming.

    This endpoint:
    1. Uses Grobid to extract structured references from the PDF
    2. Falls back to LLM-based extraction if Grobid is unavailable
    3. Searches for PDF links for each reference

    Args:
        request: Contains pdf_url and optional token

    Returns:
        Streaming response with references as they are extracted
    """
    async def generate_stream():
        try:
            # Try refextract first
            use_refextract = True
            references = []

            if use_refextract:
                # Use refextract for structured reference extraction
                yield json.dumps({"type": "status", "message": "Extracting references with refextract..."}) + "\n"

                try:
                    refextract_refs = extract_references_with_refextract(str(request.pdf_url), request.token)

                    # Convert refextract references to the expected format
                    references = []
                    for rref in refextract_refs:
                        ref_dict = rref.to_dict()
                        # Create Reference object for compatibility
                        ref = Reference(
                            id=str(len(references) + 1),
                            title=ref_dict.get("title") or "Untitled",
                            authors=ref_dict.get("authors") or [],
                            year=int(ref_dict.get("year")) if ref_dict.get("year") and ref_dict.get("year").isdigit() else None,
                            venue=ref_dict.get("venue"),
                            doi=ref_dict.get("doi"),
                            url=ref_dict.get("url")
                        )
                        references.append(ref)

                    # Check if no references were found
                    if len(references) == 0:
                        yield json.dumps({
                            "type": "count",
                            "total": 0,
                            "message": "No references found"
                        }) + "\n"

                        yield json.dumps({
                            "type": "complete",
                            "references": [],
                            "method": "refextract",
                            "message": "No references found in this paper"
                        }) + "\n"
                        return

                    # Send total count immediately after extraction
                    yield json.dumps({
                        "type": "count",
                        "total": len(references),
                        "message": f"Found {len(references)} references"
                    }) + "\n"

                except Exception as e:
                    # Fallback to LLM if refextract fails
                    yield json.dumps({"type": "status", "message": f"refextract extraction failed, falling back to LLM..."}) + "\n"
                    use_refextract = False

            if not use_refextract:
                # Fallback: Use LLM-based extraction
                yield json.dumps({"type": "status", "message": "Extracting references from PDF..."}) + "\n"
                text = extract_references_from_pdf(str(request.pdf_url), request.token)

                yield json.dumps({"type": "status", "message": "Analyzing references with AI..."}) + "\n"
                references = generate_references_with_llm(text)

                # Send total count after LLM extraction
                yield json.dumps({
                    "type": "count",
                    "total": len(references),
                    "message": f"Found {len(references)} references"
                }) + "\n"

            # Announce we're starting PDF link search
            yield json.dumps({"type": "status", "message": f"Searching for PDF links..."}) + "\n"

            processed_references = []
            for idx, ref in enumerate(references):
                # Send progress update
                yield json.dumps({
                    "type": "progress",
                    "current": idx + 1,
                    "total": len(references),
                    "message": f"Analyzing reference {idx+1}/{len(references)}"
                }) + "\n"

                # Search for PDF link if not present
                if not ref.url:
                    pdf_link = search_pdf_link(ref.title, ref.authors)
                    if pdf_link:
                        ref.url = pdf_link

                # Send individual reference
                ref_dict = ref.model_dump()
                processed_references.append(ref_dict)
                yield json.dumps({
                    "type": "reference",
                    "reference": ref_dict,
                    "current": idx + 1,
                    "total": len(references)
                }) + "\n"

            # Send final complete message
            yield json.dumps({
                "type": "complete",
                "references": processed_references,
                "method": "refextract" if use_refextract else "llm"
            }) + "\n"

        except requests.RequestException as e:
            yield json.dumps({"type": "error", "error": f"Failed to download PDF: {str(e)}"}) + "\n"
        except Exception as e:
            yield json.dumps({"type": "error", "error": f"Failed to generate references: {str(e)}"}) + "\n"

    return StreamingResponse(generate_stream(), media_type="application/x-ndjson")


@router.post("/papers/chat")
async def chat_with_paper(request: ChatRequest):
    """
    Chat with a paper using AI assistant with intelligent routing and streaming responses.

    Uses LangGraph to determine if the question requires reading the full paper or can be
    answered directly from general knowledge.

    Args:
        request: Contains pdf_url, token, message, and optional selected text context

    Returns:
        Streaming response with AI-generated answers
    """
    async def generate_stream():
        try:
            from workflows.paper_analysis.smart_chat_workflow import SmartPaperChatWorkflow

            # Initialize the smart workflow
            workflow = SmartPaperChatWorkflow()
            graph = workflow.create_graph()

            # First, route the question to see if we need to read the paper
            yield json.dumps({"type": "status", "message": "Analyzing question..."}) + "\n"

            # Extract PDF text conditionally based on routing
            initial_state = {
                "question": request.message,
                "paper_text": "",  # Will be filled if needed
                "context": request.context,
                "needs_paper": True,  # Default
                "response": "",
                "route_reason": ""
            }

            # Run routing node only
            routed_state = workflow.route_question(initial_state)

            # If paper is needed, extract text
            if routed_state['needs_paper']:
                yield json.dumps({"type": "status", "message": "Reading paper..."}) + "\n"
                text, total_pages = extract_text_from_pdf(str(request.pdf_url), request.token)
                routed_state['paper_text'] = text
            else:
                yield json.dumps({"type": "status", "message": f"Answering directly ({routed_state['route_reason']})..."}) + "\n"

            # Generate response with streaming
            yield json.dumps({"type": "status", "message": "Generating response..."}) + "\n"

            # Use the workflow's LLM directly for streaming
            if routed_state['needs_paper']:
                prompt = get_paper_specific_answer_prompt(
                    routed_state['question'],
                    routed_state['paper_text'],
                    routed_state.get('context')
                )
            else:
                prompt = get_general_answer_prompt(
                    routed_state['question'],
                    routed_state.get('context')
                )

            # Stream the response
            full_response = ""
            try:
                for chunk in workflow.response_llm.stream(prompt):
                    if chunk.content:
                        full_response += chunk.content
                        yield json.dumps({"type": "chunk", "content": chunk.content}) + "\n"
            except Exception as stream_error:
                # If streaming fails mid-way, try to send what we have
                if full_response:
                    yield json.dumps({"type": "error", "error": f"Streaming interrupted: {str(stream_error)}", "partial_response": full_response}) + "\n"
                else:
                    raise stream_error

            # Send complete message
            yield json.dumps({"type": "complete", "response": full_response}) + "\n"

        except requests.RequestException as e:
            yield json.dumps({"type": "error", "error": f"Failed to download PDF: {str(e)}"}) + "\n"
        except Exception as e:
            yield json.dumps({"type": "error", "error": f"Failed to generate response: {str(e)}"}) + "\n"

    return StreamingResponse(generate_stream(), media_type="application/x-ndjson")


@router.post("/tree/generate-title", response_model=GenerateTitleResponse)
async def generate_tree_title(request: GenerateTitleRequest):
    """
    Generate a concise tree title based on the first node's content.

    Args:
        request: Contains node_content and optional node_description

    Returns:
        A concise, descriptive title for the tree
    """
    try:
        title = generate_title_with_llm(request.node_content, request.node_description)
        return GenerateTitleResponse(title=title)

    except Exception as e:
        print(f"Error generating title: {e}")
        return GenerateTitleResponse(title="New Tree")


@router.post("/papers/generate-chat-title", response_model=GenerateTitleResponse)
async def generate_paper_chat_title(request: GenerateChatTitleRequest):
    """
    Generate a concise chat title based on the conversation content.

    Args:
        request: Contains user_message and ai_response

    Returns:
        A concise, descriptive title for the chat session
    """
    try:
        title = generate_chat_title_with_llm(request.user_message, request.ai_response)
        return GenerateTitleResponse(title=title)

    except Exception as e:
        print(f"Error generating chat title: {e}")
        return GenerateTitleResponse(title="New Chat")


@router.post("/papers/chat-with-reasoning")
async def chat_with_paper_reasoning(request: ChatRequest):
    """
    Chat with a paper using ReAct (chain-of-thought) reasoning with streaming responses.

    This endpoint uses iterative reasoning with tool usage to provide deep analysis:
    - Thought: Reasons about what information is needed
    - Action: Uses tools (paper search, web search, etc.)
    - Observation: Analyzes tool results
    - Reflection: Assesses progress
    - Repeats until comprehensive answer is generated

    Args:
        request: Contains pdf_url, token, message, optional context, and reasoning parameters

    Returns:
        Streaming response with reasoning steps and final answer

    Stream events:
        - {"type": "reasoning", "step": int, "phase": str, "content": str}
        - {"type": "tool_call", "tool": str, "args": dict}
        - {"type": "observation", "result": str}
        - {"type": "reflection", "content": str}
        - {"type": "final_answer", "content": str}
        - {"type": "complete"}
    """
    async def generate_stream():
        try:
            from services.paper.react_engine import PaperReActEngine

            # Extract configuration from request
            max_iterations = getattr(request, 'max_iterations', 5)
            enable_reflection = getattr(request, 'enable_reflection', True)
            enable_web_search = getattr(request, 'enable_web_search', True)

            # Step 1: Extract paper text
            yield json.dumps({"type": "status", "message": "Reading paper..."}) + "\n"

            try:
                text, total_pages = extract_text_from_pdf(str(request.pdf_url), request.token)
            except Exception as e:
                yield json.dumps({"type": "error", "error": f"Failed to read PDF: {str(e)}"}) + "\n"
                return

            # Step 2: Initialize ReAct engine
            yield json.dumps({"type": "status", "message": "Initializing reasoning engine..."}) + "\n"

            engine = PaperReActEngine(
                paper_text=text,
                max_iterations=max_iterations,
                enable_reflection=enable_reflection,
                enable_web_search=enable_web_search
            )

            # Step 3: Run ReAct loop with streaming
            yield json.dumps({"type": "status", "message": "Starting chain-of-thought analysis..."}) + "\n"

            try:
                async for event in engine.run_react_loop(
                    question=request.message,
                    context=request.context
                ):
                    yield json.dumps(event) + "\n"
            except Exception as stream_error:
                logger.error(f"Error in ReAct loop: {stream_error}")
                yield json.dumps({
                    "type": "error",
                    "error": f"Reasoning error: {str(stream_error)}"
                }) + "\n"

        except requests.RequestException as e:
            yield json.dumps({"type": "error", "error": f"Failed to download PDF: {str(e)}"}) + "\n"
        except Exception as e:
            import traceback
            logger.error(f"Error in chat-with-reasoning: {e}\n{traceback.format_exc()}")
            yield json.dumps({"type": "error", "error": f"Failed to process request: {str(e)}"}) + "\n"

    return StreamingResponse(generate_stream(), media_type="application/x-ndjson")
