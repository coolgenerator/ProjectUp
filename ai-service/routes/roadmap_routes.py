"""
Roadmap generation and management routes.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, List, Optional
import logging

from models.requests.roadmap_requests import GenerateRoadmapRequest, UpdateResourcesRequest
from models.responses.roadmap_responses import RoadmapResponse
from services.roadmap_service import RoadmapService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai-api/roadmaps", tags=["roadmaps"])

# Initialize service
roadmap_service = RoadmapService()


@router.post("/generate", response_model=RoadmapResponse)
async def generate_roadmap(request: GenerateRoadmapRequest):
    """Generate a new learning roadmap for a topic."""
    try:
        logger.info(f"Generating roadmap for topic: {request.topic}")
        
        roadmap = await roadmap_service.generate_roadmap(
            topic=request.topic,
            description=request.description,
            category=request.category,
            difficulty=request.difficulty,
            estimated_hours=request.estimated_hours,
            tags=request.tags,
            is_featured=request.is_featured
        )
        
        return RoadmapResponse(
            success=True,
            roadmap=roadmap,
            message=f"Successfully generated roadmap for {request.topic}"
        )
        
    except Exception as e:
        logger.error(f"Error generating roadmap: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{roadmap_id}", response_model=RoadmapResponse)
async def get_roadmap(roadmap_id: str):
    """Get a specific roadmap by ID."""
    try:
        roadmap = await roadmap_service.get_roadmap(roadmap_id)
        
        if not roadmap:
            return RoadmapResponse(
                success=False,
                error="Roadmap not found"
            )
        
        return RoadmapResponse(
            success=True,
            roadmap=roadmap
        )
        
    except Exception as e:
        logger.error(f"Error getting roadmap: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=Dict[str, Any])
async def list_roadmaps(
    category: Optional[str] = Query(None, description="Filter by category"),
    limit: int = Query(10, description="Number of roadmaps to return", ge=1, le=100)
):
    """List available roadmaps."""
    try:
        roadmaps = await roadmap_service.list_roadmaps(
            category=category,
            limit=limit
        )
        
        return {
            "success": True,
            "roadmaps": roadmaps,
            "count": len(roadmaps)
        }
        
    except Exception as e:
        logger.error(f"Error listing roadmaps: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/nodes/{node_id}/resources")
async def update_node_resources(
    node_id: str,
    request: UpdateResourcesRequest
):
    """Update resources for a roadmap node."""
    try:
        success = await roadmap_service.update_roadmap_resources(
            node_id=node_id,
            resources=request.resources
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Node not found")
        
        return {
            "success": True,
            "message": f"Successfully updated resources for node {node_id}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating resources: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-from-template/{template_name}")
async def generate_from_template(
    template_name: str,
    custom_params: Optional[Dict[str, Any]] = None
):
    """Generate a roadmap from a predefined template."""
    templates = {
        "web_development": {
            "topic": "Web Development",
            "description": "Complete path to become a full-stack web developer",
            "category": "Technology",
            "difficulty": "intermediate",
            "estimated_hours": 200,
            "tags": ["web", "frontend", "backend", "fullstack"]
        },
        "data_science": {
            "topic": "Data Science",
            "description": "Comprehensive data science learning path",
            "category": "Technology",
            "difficulty": "advanced",
            "estimated_hours": 300,
            "tags": ["data", "ml", "statistics", "python"]
        },
        "mobile_development": {
            "topic": "Mobile Development",
            "description": "Build native and cross-platform mobile apps",
            "category": "Technology",
            "difficulty": "intermediate",
            "estimated_hours": 150,
            "tags": ["mobile", "ios", "android", "react-native"]
        },
        "machine_learning": {
            "topic": "Machine Learning",
            "description": "From basics to advanced ML techniques",
            "category": "Technology",
            "difficulty": "advanced",
            "estimated_hours": 250,
            "tags": ["ml", "ai", "deep-learning", "neural-networks"]
        },
        "cloud_computing": {
            "topic": "Cloud Computing",
            "description": "Master cloud platforms and services",
            "category": "Technology",
            "difficulty": "intermediate",
            "estimated_hours": 180,
            "tags": ["cloud", "aws", "azure", "gcp", "devops"]
        }
    }
    
    if template_name not in templates:
        raise HTTPException(
            status_code=404, 
            detail=f"Template '{template_name}' not found. Available: {list(templates.keys())}"
        )
    
    try:
        # Get template and merge with custom params
        template = templates[template_name].copy()
        if custom_params:
            template.update(custom_params)
        
        roadmap = await roadmap_service.generate_roadmap(**template)
        
        return {
            "success": True,
            "roadmap": roadmap,
            "template_used": template_name,
            "message": f"Successfully generated roadmap from {template_name} template"
        }
        
    except Exception as e:
        logger.error(f"Error generating from template: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search/by-tags")
async def search_by_tags(
    tags: str = Query(..., description="Comma-separated list of tags"),
    limit: int = Query(10, description="Number of results", ge=1, le=50)
):
    """Search roadmaps by tags."""
    try:
        tag_list = [tag.strip() for tag in tags.split(",")]
        
        # This would need to be implemented in the service
        # For now, return a placeholder
        return {
            "success": True,
            "message": f"Search for tags: {tag_list}",
            "results": [],
            "count": 0
        }
        
    except Exception as e:
        logger.error(f"Error searching by tags: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))