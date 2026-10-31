"""
IdeaTree routes for the AI Agent API.
Provides endpoints for processing IdeaTree node queries.
"""

from fastapi import APIRouter, HTTPException
from typing import List
import logging
import asyncio

from models.requests.idea_tree_requests import IdeaTreeQueryRequest, BatchQueryRequest
from models.responses.idea_tree_responses import IdeaTreeQueryResponse
from workflows.idea_tree import IdeaTreeWorkflow

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai-api/idea-tree", tags=["idea-tree"])


# Initialize workflow instance
idea_tree_workflow = None


def get_workflow():
    """Get or create the IdeaTree workflow instance."""
    global idea_tree_workflow
    if idea_tree_workflow is None:
        idea_tree_workflow = IdeaTreeWorkflow()
    return idea_tree_workflow


@router.post("/query", 
    response_model=IdeaTreeQueryResponse,
    summary="Process IdeaTree Query",
    description="""
    Process an AI query for an IdeaTree node.
    
    ## Query Types:
    - **expand_idea**: Break down ideas into sub-components
    - **generate_tasks**: Create actionable tasks with deliverables
    - **find_resources**: Discover learning materials and tools
    - **analyze_feasibility**: Assess technical requirements and risks
    - **suggest_milestones**: Define project checkpoints
    - **generate_learning_path**: Create personalized education journey
    
    ## Response includes:
    - Structured suggestions with priorities
    - Relevant resources with metadata
    - Actionable tasks with time estimates
    - Analysis metadata (feasibility scores, complexity ratings)
    """,
    response_description="Processed query results with AI-generated content"
)
async def process_idea_tree_query(request: IdeaTreeQueryRequest):
    """Process a single IdeaTree node query."""
    try:
        workflow = get_workflow()
        
        # Process the query
        result = await workflow.process({
            "node_id": request.node_id,
            "title": request.title,
            "description": request.description,
            "query_type": request.query_type,
            "query": request.query,
            "context": request.context
        })
        
        return IdeaTreeQueryResponse(**result)
        
    except Exception as e:
        logger.error(f"Error processing IdeaTree query: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch-query", 
    response_model=List[IdeaTreeQueryResponse],
    summary="Batch Process Queries",
    description="""
    Process multiple IdeaTree queries concurrently for improved performance.
    
    Useful for:
    - Expanding multiple nodes simultaneously
    - Generating tasks for an entire project tree
    - Analyzing multiple ideas in parallel
    
    Returns results in the same order as input queries.
    """
)
async def process_batch_queries(request: BatchQueryRequest):
    """Process multiple IdeaTree queries in batch."""
    try:
        workflow = get_workflow()
        
        # Process all queries concurrently
        tasks = []
        for query in request.queries:
            task = workflow.process({
                "node_id": query.node_id,
                "title": query.title,
                "description": query.description,
                "query_type": query.query_type,
                "query": query.query,
                "context": query.context
            })
            tasks.append(task)
        
        # Wait for all tasks to complete
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        responses = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Error processing query {i}: {result}")
                responses.append(IdeaTreeQueryResponse(
                    node_id=request.queries[i].node_id,
                    query_type=request.queries[i].query_type,
                    response="Failed to process query",
                    error=str(result)
                ))
            else:
                responses.append(IdeaTreeQueryResponse(**result))
        
        return responses
        
    except Exception as e:
        logger.error(f"Error processing batch queries: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/expand/{node_id}",
    summary="Expand Node",
    description="""
    Generate AI-powered expansion suggestions for an idea node.
    
    Creates a structured breakdown with:
    - Sub-ideas with clear connections to parent
    - Priority levels for each expansion
    - Potential challenges and solutions
    - Implementation strategies
    """
)
async def expand_node(
    node_id: str,
    title: str,
    description: str,
    depth: int = 1,
    max_children: int = 5,
    focus: List[str] = None
):
    """Generate expansion suggestions for a node."""
    try:
        workflow = get_workflow()
        
        query = f"Expand with depth={depth}, max_children={max_children}"
        if focus:
            query += f", focus areas={focus}"
        
        result = await workflow.process({
            "node_id": node_id,
            "title": title,
            "description": description,
            "query_type": "expand_idea",
            "query": query,
            "context": {
                "depth": depth,
                "max_children": max_children,
                "focus": focus or []
            }
        })
        
        return result
        
    except Exception as e:
        logger.error(f"Error expanding node {node_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/learning-path/{node_id}")
async def generate_learning_path(
    node_id: str,
    title: str,
    description: str,
    level: str = "beginner",
    learning_style: str = "mixed",
    time_commitment: str = "10 hours/week",
    prerequisites: List[str] = None
):
    """Generate a learning path for a node."""
    try:
        workflow = get_workflow()
        
        query = f"Level: {level}, Style: {learning_style}, Time: {time_commitment}"
        if prerequisites:
            query += f", Prerequisites: {prerequisites}"
        
        result = await workflow.process({
            "node_id": node_id,
            "title": title,
            "description": description,
            "query_type": "generate_learning_path",
            "query": query,
            "context": {
                "level": level,
                "learning_style": learning_style,
                "time_commitment": time_commitment,
                "prerequisites": prerequisites or []
            }
        })
        
        return result
        
    except Exception as e:
        logger.error(f"Error generating learning path for node {node_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze/{node_id}")
async def analyze_node(
    node_id: str,
    title: str,
    description: str,
    analysis_type: str = "feasibility",
    constraints: str = ""
):
    """Analyze a node for feasibility, risks, or other aspects."""
    try:
        workflow = get_workflow()
        
        query_type = "analyze_feasibility" if analysis_type == "feasibility" else "generic"
        
        result = await workflow.process({
            "node_id": node_id,
            "title": title,
            "description": description,
            "query_type": query_type,
            "query": constraints,
            "context": {
                "analysis_type": analysis_type
            }
        })
        
        return result
        
    except Exception as e:
        logger.error(f"Error analyzing node {node_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/test",
    summary="Test IdeaTree Service",
    description="Verify that the IdeaTree service is operational and list available query types.",
    tags=["idea-tree", "health"]
)
async def test_idea_tree():
    """Test endpoint to verify IdeaTree routes are working."""
    return {
        "status": "ok",
        "message": "IdeaTree routes are working",
        "available_query_types": [
            "expand_idea",
            "generate_tasks",
            "find_resources",
            "analyze_feasibility",
            "suggest_milestones",
            "generate_learning_path"
        ]
    }