#!/usr/bin/env python3
"""
AI Agent - Main Entry Point

Unified entry point for all AI Agent workflows and services.
"""

import asyncio
import json
import logging
import os
import sys
from datetime import datetime
from typing import Dict, Any, Optional

import click
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config.settings import settings, workflow_settings
from core.concurrency import (
    initialize_executor,
    get_executor,
    shutdown_executor,
    ConcurrencyConfig
)
from models.requests.workflow_requests import WorkflowRequest
from routes.idea_tree_routes import router as idea_tree_router
from routes.qa_routes import router as qa_router
from routes.course_routes import router as course_router
from routes.quiz_routes import router as quiz_router
from routes.paper_persistence_routes import router as paper_persistence_router
from routes.paper_routes import router as paper_router
from routes.test_sessions import router as test_sessions_router
from routes.agent_routes import router as agent_router
from routes.project_routes import router as project_router
from routes.project_assistant_routes import router as project_assistant_router
from routes.plan_routes import router as plan_router
from routes.tool_routes import router as tool_router
from routes.workflow_routes import router as workflow_router
from routes.tree_data_routes import router as tree_data_router
from routes.node_chat_routes import router as node_chat_router
from routes.mention_routes import router as mention_router
from routes.intent_routes import router as intent_router
from routes.node_suggestion_routes import router as node_suggestion_router
from routes.template_routes import router as template_router
from routes.task_routes import router as task_router
from routes.version_routes import router as version_router
from routes.rag_routes import router as rag_router
from routes.backend_integration_routes import router as backend_integration_router
from routes.personalized_suggestions_routes import router as personalized_suggestions_router
from routes.action_expand_routes import router as action_expand_router
from routes.project_roadmap_routes import router as project_roadmap_router
from routes.onboarding_routes import router as onboarding_router
from routes.workflow_registry_routes import router as workflow_registry_router
from storage.checkpointer import SessionManager
from workflows import ChatWorkflow, ProjectWorkflow, ResearchWorkflow

# Configure logging with custom filter to suppress noisy WebSocket 403 errors
class WebSocketFilter(logging.Filter):
    """Filter out noisy WebSocket 403 errors from unknown routes"""
    def filter(self, record):
        # Log ALL 403 errors to identify the source
        if '403' in record.getMessage() or 'Forbidden' in record.getMessage():
            logger.error(f"[DEBUG 403] {record.getMessage()}")
            # Suppress known noisy routes
            if '/api/ai/completion/inline' in record.getMessage() or '/api/ai/chats' in record.getMessage():
                return False
        return True

logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format=settings.log_format,
    handlers=[
        logging.FileHandler(settings.log_file),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Apply filter to all uvicorn loggers
uvicorn_access_logger = logging.getLogger("uvicorn.access")
uvicorn_access_logger.addFilter(WebSocketFilter())
uvicorn_error_logger = logging.getLogger("uvicorn.error")
uvicorn_error_logger.addFilter(WebSocketFilter())
uvicorn_logger = logging.getLogger("uvicorn")
uvicorn_logger.addFilter(WebSocketFilter())

# Initialize FastAPI app with conditional Swagger UI
app = FastAPI(
    title="ProjectUp AI Agent API",
    description="""
# 🚀 ProjectUp AI Agent API

## Overview
A comprehensive AI-powered API for project management, workflow automation, and intelligent assistance.

## 🎯 Core Services

### 📊 **IdeaTree** (`/ai-api/idea-tree`)
AI-powered idea expansion and project planning
- **Expand Ideas**: Break down complex ideas into actionable components
- **Generate Tasks**: Create specific, actionable tasks with deliverables
- **Find Resources**: Discover tutorials, documentation, and tools
- **Analyze Feasibility**: Assess technical requirements and risks
- **Suggest Milestones**: Define project checkpoints with success criteria
- **Generate Learning Paths**: Create personalized education journeys

### 🤖 **Agents** (`/ai-api/agents`)
Manage AI agents with various capabilities
- Create and configure custom AI agents
- Chat with agents for assistance
- Execute specialized tools through agents

### 🔄 **Workflows** (`/ai-api/workflows`)
Orchestrate complex multi-step AI processes
- **Chat Workflows**: Conversational AI with memory
- **Project Planning**: Requirements → Ideas → Resources → Implementation
- **Research Workflows**: Search → Validate → Synthesize → Report
- **Custom Workflows**: User-defined multi-step processes

### 🛠️ **Tools** (`/ai-api/tools`)
Integrate with external services and utilities
- Web search and content extraction
- Document generation and analysis
- Code generation and review
- Data processing and transformation

### 📚 **Projects** (`/ai-api/projects`)
AI-enhanced project management
- Project initialization and planning
- Task generation and assignment
- Progress tracking and reporting
- Resource allocation and optimization

## 🔧 Configuration
- **Provider**: Vertex AI (Google Cloud)
- **Models**: Gemini 1.5 Flash/Pro
- **Storage**: Local/S3/GCS options
- **Authentication**: JWT-based auth integration

## 📝 Usage Examples

### Quick Start
1. Create an agent: `POST /ai-api/agents`
2. Send a message: `POST /ai-api/agents/{name}/chat`
3. Execute workflow: `POST /ai-api/workflows/execute`

### IdeaTree Query
```json
POST /ai-api/idea-tree/query
{
  "node_id": "node-123",
  "title": "Build Mobile App",
  "query_type": "expand_idea"
}
```

## 🔗 Related Services
- **Backend**: Go/Gin REST API (port 8080)
- **Frontend**: React/TypeScript SPA (port 3000)
- **Database**: PostgreSQL on AWS RDS
    """,
    version="2.1.0",
    docs_url=settings.docs_url,  # Swagger UI (disabled in production)
    redoc_url=settings.redoc_url,  # ReDoc UI (disabled in production)
    openapi_url=settings.openapi_url,  # OpenAPI schema (disabled in production)
    contact={
        "name": "ProjectUp AI Team",
        "email": "ai@projectup.com",
        "url": "https://projectup.com"
    },
    license_info={
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT",
    },
    servers=[
        {"url": "http://localhost:8000", "description": "Development server"},
        {"url": "https://projectup.com", "description": "Production server"}
    ],
    debug=settings.enable_debug
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add GZip compression middleware for large responses (idea tree, node chat)
# Compresses responses >1KB, reduces bandwidth by 70-90% for JSON
app.add_middleware(
    GZipMiddleware,
    minimum_size=1000,  # Only compress responses larger than 1KB
    compresslevel=6  # Balance between compression ratio and speed (1-9)
)

# Initialize session manager
session_manager = SessionManager()

# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Initialize resources on startup"""
    logger.info(f"Starting AI Agent in {settings.environment.upper()} mode...")

    # Validate configuration (critical for CI/CD)
    try:
        settings.validate()
        logger.info("✓ Configuration validation passed")
        logger.info(f"✓ GCP Project: {settings.gcp_project_id}")
        logger.info(f"✓ GCP Location: {settings.gcp_location}")
        logger.info(f"✓ Vertex AI Model: {settings.vertex_ai_model}")
    except ValueError as e:
        logger.error(f"❌ Configuration validation failed: {e}")
        logger.error("Please set required environment variables before starting the service")
        sys.exit(1)

    # Log Swagger UI status
    if settings.enable_swagger:
        logger.info("✓ Swagger UI enabled at /docs")
        logger.info("✓ ReDoc enabled at /redoc")
        logger.info("✓ OpenAPI schema available at /openapi.json")
    else:
        logger.warning("⚠ Swagger UI disabled (production mode)")
        logger.warning("⚠ API documentation not available")
    
    # Initialize concurrency executor optimized for single worker async operation
    # Single worker handles many concurrent requests via async/await
    config = ConcurrencyConfig(
        max_concurrent_requests=50,  # Higher for single worker async handling
        max_queue_size=200,
        vertex_ai_concurrent_limit=15,  # Concurrent AI API calls
        vertex_ai_rate_limit_per_minute=60,
        connection_pool_size=20  # Optimized for single worker
    )
    await initialize_executor(config)
    logger.info(f"✓ AI Agent startup complete - Environment: {settings.environment}")
    logger.info(f"✓ Running in single-worker async mode with {config.max_concurrent_requests} concurrent request capacity")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup resources on shutdown"""
    await shutdown_executor()
    logger.info("AI Agent shutdown complete")

# Configure API tags metadata
tags_metadata = [
    {
        "name": "idea-tree",
        "description": "📊 **IdeaTree Operations** - AI-powered idea expansion, task generation, and project planning",
        "externalDocs": {
            "description": "IdeaTree Documentation",
            "url": "https://docs.projectup.com/idea-tree",
        },
    },
    {
        "name": "agents",
        "description": "🤖 **Agent Management** - Create, configure, and interact with AI agents",
    },
    {
        "name": "workflows",
        "description": "🔄 **Workflow Orchestration** - Execute complex multi-step AI workflows",
    },
    {
        "name": "projects",
        "description": "📚 **Project Management** - AI-enhanced project planning and tracking",
    },
    {
        "name": "tools",
        "description": "🛠️ **Tool Integration** - Access external services and utilities",
    },
]

# Update app with tags
app.openapi_tags = tags_metadata

# Health check endpoints (for CI/CD, Kubernetes, load balancers)
@app.get("/health", tags=["monitoring"])
async def health_check():
    """
    Basic health check endpoint for load balancers and monitoring tools
    Returns 200 if service is running
    """
    return {
        "status": "healthy",
        "service": "ai-agent",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/readiness", tags=["monitoring"])
async def readiness_check():
    """
    Readiness check for Kubernetes/container orchestration
    Verifies that service is ready to accept traffic
    """
    try:
        # Check if configuration is valid
        settings.validate()

        return {
            "status": "ready",
            "service": "ai-agent",
            "environment": settings.environment,
            "model": settings.vertex_ai_model,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        raise HTTPException(status_code=503, detail={
            "status": "not_ready",
            "error": str(e)
        })

@app.get("/config", tags=["monitoring"])
async def get_config_info():
    """
    Get non-sensitive configuration information
    Useful for debugging and verification in CI/CD
    """
    return settings.to_dict()

# Include routers with enhanced configuration
app.include_router(
    agent_router,
    prefix="/ai-api",
    tags=["agents"],
    responses={404: {"description": "Agent not found"}}
)
app.include_router(
    project_router,
    prefix="/ai-api",
    tags=["projects"],
    responses={404: {"description": "Project not found"}}
)
app.include_router(
    tool_router,
    prefix="/ai-api",
    tags=["tools"],
    responses={404: {"description": "Tool not found"}}
)
app.include_router(
    workflow_router,
    prefix="/ai-api",
    tags=["workflows"],
    responses={404: {"description": "Workflow not found"}}
)
app.include_router(
    idea_tree_router,
    tags=["idea-tree"],
    responses={
        404: {"description": "Node not found"},
        500: {"description": "AI processing error"}
    }
)
app.include_router(
    qa_router,
    tags=["question-answering"],
    responses={
        404: {"description": "Not found"},
        500: {"description": "Processing error"}
    }
)
app.include_router(
    course_router,
    tags=["courses", "learning-path"],
    responses={
        404: {"description": "Course or session not found"},
        500: {"description": "Course generation error"}
    }
)
app.include_router(
    quiz_router,
    tags=["quizzes"],
    responses={
        404: {"description": "Quiz not found"},
        500: {"description": "Quiz generation error"}
    }
)
app.include_router(
    paper_persistence_router,
    prefix="/ai-api/papers",
    tags=["papers"],
    responses={
        404: {"description": "Resource not found"},
        500: {"description": "Processing error"}
    }
)
app.include_router(
    paper_router,
    prefix="/ai-api",
    tags=["papers"],
    responses={
        404: {"description": "Resource not found"},
        500: {"description": "Processing error"}
    }
)
app.include_router(
    test_sessions_router,
    prefix="/ai-api/papers",
    tags=["test"]
)
app.include_router(
    tree_data_router,
    tags=["tree-data"],
    responses={
        404: {"description": "Tree session or node not found"},
        500: {"description": "Processing error"}
    }
)
app.include_router(
    node_chat_router,
    tags=["node-chat"],
    responses={
        404: {"description": "Chat session or message not found"},
        500: {"description": "AI processing error"}
    }
)
app.include_router(
    mention_router,
    tags=["mentions"],
    responses={
        404: {"description": "Material not found"},
        500: {"description": "Search processing error"}
    }
)
app.include_router(
    intent_router,
    tags=["intents"],
    responses={
        404: {"description": "Intent or action not found"},
        500: {"description": "Intent detection or execution error"}
    }
)
app.include_router(
    node_suggestion_router,
    tags=["node-suggestions"],
    responses={
        404: {"description": "Node not found"},
        500: {"description": "Suggestion generation error"}
    }
)
app.include_router(
    template_router,
    tags=["templates"],
    responses={
        404: {"description": "Template not found"},
        500: {"description": "Template service error"}
    }
)
app.include_router(
    task_router,
    tags=["tasks"],
    responses={
        404: {"description": "Task not found"},
        500: {"description": "Task service error"}
    }
)
app.include_router(
    version_router,
    tags=["versions"],
    responses={
        404: {"description": "Version or branch not found"},
        500: {"description": "Version control service error"}
    }
)
app.include_router(
    rag_router,
    tags=["rag"],
    responses={
        404: {"description": "Document not found"},
        500: {"description": "RAG service error"}
    }
)
app.include_router(
    project_assistant_router,
    responses={
        404: {"description": "Resource not found"},
        500: {"description": "AI processing error"}
    }
)
app.include_router(
    plan_router,
    responses={
        404: {"description": "Resource not found"},
        500: {"description": "Plan conversion error"}
    }
)
app.include_router(
    backend_integration_router,
    tags=["backend-integration"],
    responses={
        404: {"description": "Resource not found"},
        500: {"description": "Backend integration error"}
    }
)
app.include_router(
    personalized_suggestions_router,
    responses={
        404: {"description": "Resource not found"},
        500: {"description": "Suggestion generation error"}
    }
)
app.include_router(
    action_expand_router,
    responses={
        404: {"description": "Resource not found"},
        500: {"description": "Action expansion error"}
    }
)
app.include_router(
    project_roadmap_router,
    tags=["project-roadmap"],
    responses={
        404: {"description": "Project or resource not found"},
        500: {"description": "Roadmap generation error"}
    }
)
app.include_router(
    onboarding_router,
    tags=["onboarding"],
    responses={
        404: {"description": "Resource not found"},
        500: {"description": "AI generation error"}
    }
)
app.include_router(
    workflow_registry_router,
    tags=["workflow-registry"],
    responses={
        404: {"description": "Workflow or integration not found"},
        500: {"description": "Registry service error"}
    }
)

@app.get("/",
    summary="API Root",
    description="Get API information and documentation links",
    tags=["default"],
    response_description="API status and documentation URLs"
)
async def root():
    """Root endpoint with API information."""
    return {
        "message": "AI Agent API is running",
        "documentation": {
            "swagger_ui": "http://localhost:8000/docs",
            "redoc": "http://localhost:8000/redoc",
            "openapi_schema": "http://localhost:8000/openapi.json"
        },
        "version": app.version,
        "services": [
            "idea-tree",
            "agents",
            "workflows",
            "projects",
            "tools",
            "courses"
        ]
    }

@app.get("/health",
    summary="Health Check",
    description="Check if the API service is healthy and operational",
    tags=["default", "health"],
    response_description="Service health status"
)
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": app.version,
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "idea_tree": "operational",
            "agents": "operational",
            "workflows": "operational"
        }
    }


# Compatibility endpoint for old learning path generation
@app.post("/workflows/learning-path/generate")
async def generate_learning_path_compat(request: dict):
    """
    Compatibility endpoint for old learning path generation.
    Generates a full course structure with modules and lessons quickly.
    """
    from langchain_google_vertexai import ChatVertexAI
    from langchain_core.messages import SystemMessage, HumanMessage
    import re
    
    topic_name = request.get("topic_name", "")
    learning_goals = request.get("learning_goals", [])
    estimated_weeks = request.get("estimated_weeks", 4)
    difficulty = request.get("difficulty", "intermediate")
    
    # Generate course content directly using Gemini
    llm = ChatVertexAI(model="gemini-2.5-pro", temperature=0.7)
    
    system_prompt = f"""You are an expert educator creating a comprehensive learning path.
Create a structured course with detailed modules and lessons.

Topic: {topic_name}
Goals: {', '.join(learning_goals) if isinstance(learning_goals, list) else learning_goals}
Duration: {estimated_weeks} weeks
Difficulty: {difficulty}

Provide a JSON response with this exact structure:
{{
  "title": "Course title",
  "description": "Course description", 
  "duration": "{estimated_weeks} weeks",
  "difficulty": "{difficulty}",
  "prerequisites": ["prerequisite 1", "prerequisite 2"],
  "modules": [
    {{
      "title": "Module 1 title",
      "description": "Module 1 description",
      "duration": "X hours",
      "lessons": [
        {{
          "title": "Lesson title",
          "description": "Lesson description",
          "objectives": ["objective 1", "objective 2"],
          "content_type": "video/article/exercise",
          "duration": "X minutes",
          "resources": ["resource 1", "resource 2"]
        }}
      ]
    }}
  ]
}}"""

    human_prompt = f"""Create a comprehensive {estimated_weeks}-week learning path for "{topic_name}" 
with at least 4 modules and 3-5 lessons per module. 
Focus on: {', '.join(learning_goals) if isinstance(learning_goals, list) else learning_goals}.
Make it practical and actionable for {difficulty} level learners."""

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=human_prompt)
    ]
    
    try:
        response = llm.invoke(messages)
        
        # Extract JSON from response
        json_match = re.search(r'\{.*\}', response.content, re.DOTALL)
        if json_match:
            course = json.loads(json_match.group())
            
            # Ensure all required fields are present with defaults
            if "modules" not in course:
                course["modules"] = []
            if "prerequisites" not in course:
                course["prerequisites"] = []
            if "title" not in course:
                course["title"] = f"{topic_name} Learning Path"
            if "description" not in course:
                course["description"] = f"Learning path for {topic_name}"
            if "duration" not in course:
                course["duration"] = f"{estimated_weeks} weeks"
            if "difficulty" not in course:
                course["difficulty"] = difficulty
                
            return {
                "learning_path": course,
                "status": "success",
                "message": "Learning path generated successfully"
            }
    except Exception as e:
        logger.error(f"Error generating learning path: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate learning path: {str(e)}"
        )


@app.post("/workflow/execute")
async def execute_workflow(request: WorkflowRequest):
    """Execute a workflow with the given input data."""
    try:
        workflow_type = request.workflow_type.lower()
        
        # Create or get session
        if request.session_id:
            session_id = request.session_id
        else:
            session_id = session_manager.create_session(
                user_id=request.user_id or "anonymous",
                workflow_type=workflow_type
            )
        
        # Get workflow configuration
        workflow_config = workflow_settings.get_workflow_config(workflow_type)
        
        # Initialize appropriate workflow
        if workflow_type == "project":
            workflow = ProjectWorkflow()
        elif workflow_type == "chat":
            workflow = ChatWorkflow()
        elif workflow_type == "research":
            workflow = ResearchWorkflow()
        elif workflow_type == "learning_path":
            raise HTTPException(
                status_code=400,
                detail="Learning path workflow has been replaced. Please use /ai-api/courses/generate endpoint or /workflows/learning-path/generate for compatibility."
            )
        else:
            raise HTTPException(status_code=400, detail=f"Unknown workflow type: {workflow_type}")
        
        # Execute workflow
        result = await workflow.execute(request.input_data)
        
        # Save session state
        session_manager.save_session_state(session_id, result)
        
        return {
            "status": "success",
            "workflow_type": workflow_type,
            "session_id": session_id,
            "result": result
        }
        
    except Exception as e:
        logger.error(f"Workflow execution error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/workflows")
async def list_workflows():
    """List available workflows."""
    return {
        "workflows": [
            {"name": "chat", "description": "Conversational AI workflow"},
            {"name": "project", "description": "Project planning and management"},
            {"name": "research", "description": "Research and information gathering"}
        ],
        "note": "Course/learning path generation is available via /ai-api/courses/generate"
    }


@app.get("/sessions/{user_id}")
async def get_user_sessions(user_id: str):
    """Get all sessions for a user."""
    sessions = session_manager.get_active_sessions(user_id)
    return {"sessions": sessions}


@app.get("/session/{session_id}")
async def get_session_state(session_id: str):
    """Get the current state of a session."""
    try:
        state = session_manager.load_session_state(session_id)
        return {"session_id": session_id, "state": state}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# CLI Commands
@click.group()
def cli():
    """AI Agent CLI"""
    pass


@cli.command()
@click.option('--workflow', '-w', type=click.Choice(['chat', 'project', 'research']),
              required=True, help='Workflow type to run')
@click.option('--input', '-i', help='Input data as JSON string')
@click.option('--interactive', '-it', is_flag=True, help='Run in interactive mode')
def run(workflow: str, input: Optional[str], interactive: bool):
    """Run a workflow from command line."""
    
    if interactive:
        click.echo(f"Starting {workflow} workflow in interactive mode...")
        # Interactive mode implementation
        if workflow == "chat":
            run_chat_interactive()
        else:
            click.echo("Interactive mode only available for chat workflow currently")
    else:
        if not input:
            click.echo("Please provide input data with --input flag")
            return
        
        try:
            input_data = json.loads(input)
            # Run workflow
            asyncio.run(execute_workflow_cli(workflow, input_data))
        except json.JSONDecodeError:
            click.echo("Invalid JSON input")
        except Exception as e:
            click.echo(f"Error: {e}")


def run_chat_interactive():
    """Run chat workflow in interactive mode."""
    click.echo("Chat mode activated. Type 'exit' to quit.")
    session_id = None
    
    while True:
        user_input = click.prompt("You")
        
        if user_input.lower() == 'exit':
            break
        
        try:
            request = WorkflowRequest(
                workflow_type="chat",
                input_data={"message": user_input},
                session_id=session_id,
                user_id="cli_user"
            )
            
            result = asyncio.run(execute_workflow(request))
            session_id = result.get("session_id")
            
            response = result.get("result", {}).get("response", "No response")
            click.echo(f"Assistant: {response}")
            
        except Exception as e:
            click.echo(f"Error: {e}")


async def execute_workflow_cli(workflow_type: str, input_data: Dict[str, Any]):
    """Execute workflow from CLI."""
    request = WorkflowRequest(
        workflow_type=workflow_type,
        input_data=input_data,
        user_id="cli_user"
    )
    result = await execute_workflow(request)
    print(json.dumps(result, indent=2))


@cli.command()
@click.option('--host', default='0.0.0.0', help='Host to bind to')
@click.option('--port', default=8000, type=int, help='Port to bind to')
@click.option('--reload', is_flag=True, help='Enable auto-reload')
@click.option('--workers', default=1, type=int, help='Number of worker processes')
def serve(host: str, port: int, reload: bool, workers: int):
    """Start the API server."""
    click.echo(f"Starting AI Agent API server on {host}:{port}")
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=reload or settings.reload,
        workers=workers if not reload else 1
    )


if __name__ == "__main__":
    # Check if running as script or module
    if len(sys.argv) > 1:
        # CLI mode
        cli()
    else:
        # Default: start server on port 8888
        # Always use single worker for better stability and async performance
        # Multiple workers should be managed externally (e.g., via systemd or gunicorn)
        uvicorn.run(
            "main:app",
            host=settings.host,
            port=8888,
            reload=settings.reload,
            workers=1,  # Single worker for pure async operation
            loop="asyncio",
            access_log=True,
            log_level=settings.log_level.lower()
        )