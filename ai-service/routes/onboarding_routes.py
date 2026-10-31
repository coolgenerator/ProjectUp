"""
AI-Guided Project Onboarding Routes

Unified API endpoints for all project types with enhanced intelligence:
- /onboarding/{project_type}/suggest-topics (Enhanced with RAG + CoT)
- /onboarding/{project_type}/elaborate-topic (Enhanced with RAG + CoT)
- /onboarding/{project_type}/generate-details
- /onboarding/upload-documents (NEW: Document analysis)
- /onboarding/analyze-documents (NEW: Deep analysis)

Enhanced Features:
- Chain-of-thought reasoning
- RAG-based context retrieval
- Multi-step validation and refinement
- Document analysis with intelligent extraction
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
import logging
import os
from pathlib import Path
import tempfile

from services.onboarding_service import OnboardingService

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize unified onboarding service
# Automatically detects and uses enhanced features (RAG + CoT) when available
onboarding_service = OnboardingService()

logger.info("Onboarding routes initialized with unified service")

# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class TopicSuggestionRequest(BaseModel):
    """Request for topic suggestions - flexible to support all project types."""
    project_type: str = Field(..., description="Type of project (course, hackathon, capstone, etc.)")
    context: Dict[str, Any] = Field(..., description="Project context (varies by type)")

class TopicElaborationRequest(BaseModel):
    """Request for topic elaboration."""
    project_type: str
    selected_topic: Dict[str, Any]
    context: Dict[str, Any]

class ProjectDetailsRequest(BaseModel):
    """Request for project details generation."""
    project_type: str
    elaboration: Dict[str, Any]

# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/onboarding/{project_type}/suggest-topics")
async def suggest_topics(
    project_type: str,
    request: Dict[str, Any]
):
    """
    Generate project topic suggestions with enhanced intelligence.

    **Intelligent Features (Auto-enabled when available):**
    - Chain-of-thought reasoning for deep analysis
    - RAG retrieval of similar projects
    - Multi-step validation and refinement
    - Self-critique and feasibility checks
    - Automatic fallback to fast mode if RAG unavailable

    **Supported project types:**
    - course: Course group projects
    - hackathon: Hackathon projects (24-48 hours)
    - capstone: Graduation/capstone projects
    - research: Academic research projects
    - competition: Competition projects (Kaggle, business plan, etc.)
    - internship: Internship projects
    - industry: Industry collaboration and business solution projects
    - freelance: Freelance/client commissioned projects
    - opensource: Open source contributions
    - portfolio: Portfolio projects
    - coursenote: Course note/study guide projects
    - examprep: Exam preparation projects

    **Request body:**
    - context: Project context (requirements, constraints, team info, etc.)
    - project_id (optional): For RAG context retrieval
    """
    try:
        project_id = request.get("project_id")

        result = await onboarding_service.suggest_topics(
            project_type=project_type,
            context=request,
            project_id=project_id
        )

        return result

    except Exception as e:
        logger.error(f"Error in suggest_topics for {project_type}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/onboarding/{project_type}/elaborate-topic")
async def elaborate_topic(
    project_type: str,
    request: Dict[str, Any]
):
    """
    Elaborate on selected topic with detailed planning and enhanced intelligence.

    **Intelligent Features (Auto-enabled when available):**
    - Technical feasibility analysis with chain-of-thought
    - Comprehensive risk assessment with mitigation strategies
    - Resource requirement analysis
    - Timeline validation
    - RAG retrieval of technical knowledge
    - Automatic fallback to fast mode if RAG unavailable

    **Returns comprehensive plan including:**
    - Background and objectives
    - Core and enhanced features
    - Technical architecture recommendations
    - Detailed milestones and timeline
    - Success criteria
    - Risk assessment with mitigation
    - Feasibility analysis

    **Request body:**
    - selected_topic: The topic selected by user
    - context: Project context
    - project_id (optional): For RAG context retrieval
    """
    try:
        selected_topic = request.get("selected_topic", {})
        context = request.get("context", {})
        project_id = request.get("project_id")

        result = await onboarding_service.elaborate_topic(
            project_type=project_type,
            selected_topic=selected_topic,
            context=context,
            project_id=project_id
        )

        return result

    except Exception as e:
        logger.error(f"Error in elaborate_topic for {project_type}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/onboarding/{project_type}/refine-topic")
async def refine_topic(
    project_type: str,
    request: Dict[str, Any]
):
    """
    Refine/customize a selected topic based on user modification requests.

    This endpoint allows users to keep parts of a topic they like while modifying
    specific aspects (e.g., changing tech stack, adjusting features, difficulty).

    **Request body:**
    - base_topic: The original topic to be refined
    - modification_request: User's description of what to change
    - context: Original project context (course info, constraints, etc.)

    **Returns:**
    - Refined topic with same structure as original, but with requested modifications
    """
    try:
        base_topic = request.get("base_topic", {})
        modification_request = request.get("modification_request", "")
        context = request.get("context", {})

        if not base_topic or not modification_request:
            raise HTTPException(
                status_code=400,
                detail="base_topic and modification_request are required"
            )

        result = await onboarding_service.refine_topic(
            project_type=project_type,
            base_topic=base_topic,
            modification_request=modification_request,
            context=context
        )

        return result

    except Exception as e:
        logger.error(f"Error in refine_topic for {project_type}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/onboarding/{project_type}/refine-elaboration")
async def refine_elaboration(
    project_type: str,
    request: Dict[str, Any]
):
    """
    Refine/customize a specific section of the elaboration based on user modification requests.

    This endpoint allows users to refine individual sections (background, objectives, features,
    architecture, milestones, success criteria, challenges) while keeping other sections unchanged.

    **Request body:**
    - base_elaboration: The original elaboration to be refined
    - section: The section name to refine (background, objectives, core_features, etc.)
    - modification_request: User's description of what to change
    - context: Original project context (course info, constraints, etc.)
    - selected_topic: The selected topic for context

    **Returns:**
    - Refined elaboration with same structure as original, but with requested section modified
    """
    try:
        base_elaboration = request.get("base_elaboration", {})
        section = request.get("section", "")
        modification_request = request.get("modification_request", "")
        context = request.get("context", {})
        selected_topic = request.get("selected_topic", {})

        if not base_elaboration or not section or not modification_request:
            raise HTTPException(
                status_code=400,
                detail="base_elaboration, section, and modification_request are required"
            )

        result = await onboarding_service.refine_elaboration(
            project_type=project_type,
            base_elaboration=base_elaboration,
            section=section,
            modification_request=modification_request,
            context=context,
            selected_topic=selected_topic
        )

        return result

    except Exception as e:
        logger.error(f"Error in refine_elaboration for {project_type}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/onboarding/{project_type}/generate-details")
async def generate_details(
    project_type: str,
    request: Dict[str, Any]
):
    """
    Generate project name options, description, and tags.

    Returns:
    - 3 name options with rationale
    - Elevator pitch description
    - Relevant tags/keywords
    """
    try:
        elaboration = request.get("elaboration", {})

        result = await onboarding_service.generate_project_details(
            project_type=project_type,
            elaboration=elaboration
        )
        return result

    except Exception as e:
        logger.error(f"Error in generate_details for {project_type}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/onboarding/supported-types")
async def get_supported_types():
    """Get list of supported project types."""
    return {
        "project_types": [
            {
                "id": "course",
                "name": "Course Group Project",
                "description": "Academic course projects with syllabus and deadlines",
                "tier": 1
            },
            {
                "id": "hackathon",
                "name": "Hackathon Project",
                "description": "24-48 hour rapid prototyping challenges",
                "tier": 1
            },
            {
                "id": "capstone",
                "name": "Capstone/Final Year Project",
                "description": "Graduation projects with multiple review stages",
                "tier": 1
            },
            {
                "id": "research",
                "name": "Research Project",
                "description": "Academic research projects with publication goals",
                "tier": 1
            },
            {
                "id": "competition",
                "name": "Competition Project",
                "description": "Competition entries (Kaggle, business plan, design)",
                "tier": 1
            },
            {
                "id": "internship",
                "name": "Internship Project",
                "description": "Professional projects in business environment",
                "tier": 2
            },
            {
                "id": "industry",
                "name": "Industry Project",
                "description": "Real-world business solutions and industry collaborations",
                "tier": 2
            },
            {
                "id": "freelance",
                "name": "Freelance/Client Project",
                "description": "Client-commissioned work with defined deliverables",
                "tier": 2
            },
            {
                "id": "opensource",
                "name": "Open Source Contribution",
                "description": "Contributions to open source projects",
                "tier": 2
            },
            {
                "id": "portfolio",
                "name": "Portfolio Project",
                "description": "Projects for personal brand and showcase",
                "tier": 3
            },
            {
                "id": "coursenote",
                "name": "Course Note/Study Guide",
                "description": "Educational content creation projects",
                "tier": 3
            },
            {
                "id": "examprep",
                "name": "Exam Preparation",
                "description": "Structured exam study projects",
                "tier": 3
            }
        ]
    }

# ============================================================================
# ENHANCED ENDPOINTS - Document Analysis
# ============================================================================

@router.post("/onboarding/upload-documents")
async def upload_documents(
    project_id: str = Form(...),
    document_type: str = Form(default="document"),
    files: List[UploadFile] = File(...)
):
    """
    Upload documents for intelligent analysis (syllabus, papers, requirements).

    **Supports:**
    - PDF files (.pdf)
    - Word documents (.docx)
    - Markdown (.md)
    - Text files (.txt)
    - Code files (.py, .js, .java, etc.)

    **Document Types:**
    - syllabus: Course syllabus
    - paper: Research paper
    - requirements: Requirements document
    - reference: Reference material
    - document: Generic document

    **Process:**
    1. Uploads files to temp storage
    2. Processes with RAG for chunking and embedding
    3. Indexes in vector database
    4. Returns summary and extracted information

    **Returns:**
    - document_ids: List of uploaded document IDs
    - analysis_summary: Quick analysis of uploaded materials
    """
    try:
        uploaded_docs = []
        temp_dir = Path(tempfile.gettempdir()) / "onboarding_uploads" / project_id
        temp_dir.mkdir(parents=True, exist_ok=True)

        # Save uploaded files
        for file in files:
            file_path = temp_dir / file.filename
            with open(file_path, "wb") as f:
                content = await file.read()
                f.write(content)

            uploaded_docs.append({
                "path": str(file_path),
                "type": document_type,
                "filename": file.filename,
                "uploaded_at": os.path.getmtime(file_path)
            })

        # Analyze documents with unified service
        result = await onboarding_service.analyze_uploaded_documents(
            project_id=project_id,
            documents=uploaded_docs
        )

        return {
            **result,
            "document_ids": [doc["filename"] for doc in uploaded_docs],
            "temp_storage": str(temp_dir)
        }

    except Exception as e:
        logger.error(f"Error uploading documents: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/onboarding/analyze-documents")
async def analyze_documents(
    request: Dict[str, Any]
):
    """
    Perform deep analysis on previously uploaded documents.

    **Request body:**
    - project_id: Project identifier
    - analysis_type: Type of analysis (requirements/timeline/concepts/all)
    - focus_areas (optional): Specific areas to analyze

    **Analysis Types:**
    - requirements: Extract explicit and implicit requirements
    - timeline: Identify deadlines, milestones, review cycles
    - concepts: Extract key concepts, technologies, methodologies
    - risks: Identify potential risks and challenges
    - all: Comprehensive analysis (default)

    **Returns:**
    - extracted_requirements: List of requirements with priorities
    - identified_deadlines: Timeline with critical dates
    - key_concepts: Important topics and technologies
    - risk_factors: Potential challenges
    - recommendations: Actionable insights for project planning
    """
    try:
        project_id = request.get("project_id")
        analysis_type = request.get("analysis_type", "all")

        if not project_id:
            raise HTTPException(status_code=400, detail="project_id is required")

        # Use RAG service to retrieve and analyze documents
        # This would be implemented based on the specific analysis needed
        logger.info(f"Analyzing documents for project {project_id} (type: {analysis_type})")

        return {
            "success": True,
            "project_id": project_id,
            "analysis_type": analysis_type,
            "message": "Document analysis endpoint - implementation in progress"
        }

    except Exception as e:
        logger.error(f"Error analyzing documents: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/onboarding/service-status")
async def get_service_status():
    """
    Get status of onboarding service and available features.

    **Returns:**
    - mode: Current service mode (basic/enhanced)
    - features_available: List of available features
    - rag_status: RAG service status
    - version: Service version
    """
    # Check service capabilities
    has_rag = onboarding_service.has_rag

    return {
        "mode": "enhanced" if has_rag else "basic",
        "features_available": {
            "always": ["topic_suggestion", "topic_elaboration", "project_details"],
            "enhanced": [
                "chain_of_thought_reasoning",
                "rag_context_retrieval",
                "multi_step_validation",
                "document_analysis",
                "risk_assessment",
                "feasibility_analysis"
            ] if has_rag else []
        },
        "rag_status": "available" if has_rag else "not_available",
        "version": "2.0.0-unified",
        "supported_document_types": [
            ".pdf", ".docx", ".txt", ".md", ".py", ".js", ".java"
        ] if has_rag else [],
        "automatic_mode_selection": True,
        "fallback_enabled": True
    }
