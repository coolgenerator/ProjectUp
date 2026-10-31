"""
Service layer for project-related operations.
"""

from typing import Dict, Any, List, Optional
import uuid
from datetime import datetime

from .base_service import BaseService
from models.requests.project_requests import (
    ProjectIdeasRequest,
    ProjectRoadmapRequest,
    EnhancedRoadmapRequest
)
from models.responses.project_responses import (
    ProjectIdeasResponse,
    ProjectRoadmapResponse,
    ProjectIdea,
    RoadmapPhase
)
from workflows.project import ProjectWorkflow


class ProjectService(BaseService):
    """Service for project planning and ideation."""
    
    def __init__(self):
        """Initialize project service."""
        super().__init__()
        self.project_workflow = ProjectWorkflow()
        self.saved_projects: Dict[str, Any] = {}
    
    def _initialize(self):
        """Initialize project service resources."""
        self.log_info("Project service initialized")
    
    async def generate_project_ideas(
        self, 
        request: ProjectIdeasRequest
    ) -> ProjectIdeasResponse:
        """Generate project ideas based on user input."""
        try:
            self.log_info(
                "Generating project ideas",
                skills_count=len(request.skills),
                interests_count=len(request.interests)
            )
            
            # Prepare input for workflow
            workflow_input = {
                'skills': request.skills,
                'interests': request.interests,
                'reference': request.reference,
                'goal': request.goal,
                'preferred_difficulty': request.preferred_difficulty,
                'preferred_timeframe': request.preferred_timeframe
            }
            
            # Execute workflow
            result = await self.project_workflow.generate_ideas(
                input_data=workflow_input,
                session_id=request.session_id
            )
            
            # Parse and structure ideas
            ideas = self._parse_project_ideas(result)
            
            return ProjectIdeasResponse(
                ideas=ideas,
                total_count=len(ideas),
                session_id=request.session_id,
                metadata={
                    'generation_timestamp': datetime.utcnow().isoformat(),
                    'input_skills': request.skills,
                    'input_interests': request.interests
                }
            )
            
        except Exception as e:
            self.log_error("Failed to generate project ideas", error=e)
            # Return empty response on error
            return ProjectIdeasResponse(
                ideas=[],
                total_count=0,
                session_id=request.session_id,
                metadata={'error': str(e)}
            )
    
    async def generate_project_roadmap(
        self, 
        request: ProjectRoadmapRequest
    ) -> ProjectRoadmapResponse:
        """Generate a detailed project roadmap."""
        try:
            self.log_info(
                f"Generating roadmap for project: {request.title}",
                difficulty=request.difficulty_level
            )
            
            # Prepare input for workflow
            workflow_input = {
                'title': request.title,
                'description': request.description,
                'difficulty_level': request.difficulty_level,
                'key_features': request.key_features or []
            }
            
            # Execute workflow
            result = await self.project_workflow.generate_roadmap(
                input_data=workflow_input,
                session_id=request.session_id
            )
            
            # Parse and structure roadmap
            roadmap = self._parse_project_roadmap(result, request.title)
            
            # Save project if session_id provided
            if request.session_id:
                project_id = str(uuid.uuid4())
                self.saved_projects[project_id] = {
                    'id': project_id,
                    'title': request.title,
                    'roadmap': roadmap,
                    'created_at': datetime.utcnow().isoformat(),
                    'session_id': request.session_id
                }
            
            return roadmap
            
        except Exception as e:
            self.log_error(f"Failed to generate roadmap for: {request.title}", error=e)
            # Return basic roadmap on error
            return ProjectRoadmapResponse(
                project_title=request.title,
                total_duration="TBD",
                phases=[],
                tech_requirements=[],
                session_id=request.session_id,
                metadata={'error': str(e)}
            )
    
    async def generate_enhanced_roadmap(
        self, 
        request: EnhancedRoadmapRequest
    ) -> ProjectRoadmapResponse:
        """Generate an enhanced project roadmap with additional details."""
        try:
            self.log_info(
                f"Generating enhanced roadmap for: {request.title}",
                project_type=request.project_type
            )
            
            # Prepare input with enhanced parameters
            workflow_input = {
                'title': request.title,
                'description': request.description,
                'project_type': request.project_type,
                'difficulty_level': request.difficulty_level,
                'key_features': request.key_features or [],
                'enhanced': True
            }
            
            # Execute enhanced workflow
            result = await self.project_workflow.generate_enhanced_roadmap(
                input_data=workflow_input,
                session_id=request.session_id
            )
            
            # Parse enhanced roadmap
            roadmap = self._parse_enhanced_roadmap(result, request.title)
            
            return roadmap
            
        except Exception as e:
            self.log_error(f"Failed to generate enhanced roadmap: {request.title}", error=e)
            return ProjectRoadmapResponse(
                project_title=request.title,
                total_duration="TBD",
                phases=[],
                tech_requirements=[],
                session_id=request.session_id,
                metadata={'error': str(e)}
            )
    
    async def get_saved_projects(self, session_id: str) -> List[Dict[str, Any]]:
        """Get saved projects for a session."""
        projects = []
        for project in self.saved_projects.values():
            if project.get('session_id') == session_id:
                projects.append(project)
        
        return sorted(projects, key=lambda x: x['created_at'], reverse=True)
    
    async def get_project(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific saved project."""
        return self.saved_projects.get(project_id)
    
    async def delete_project(self, project_id: str) -> bool:
        """Delete a saved project."""
        if project_id in self.saved_projects:
            del self.saved_projects[project_id]
            self.log_info(f"Deleted project: {project_id}")
            return True
        return False
    
    def _parse_project_ideas(self, workflow_result: Dict[str, Any]) -> List[ProjectIdea]:
        """Parse workflow result into structured project ideas."""
        ideas = []
        
        # Extract ideas from workflow result
        # This would parse the actual LLM output
        raw_ideas = workflow_result.get('ideas', [])
        
        for idx, raw_idea in enumerate(raw_ideas):
            if isinstance(raw_idea, dict):
                idea = ProjectIdea(
                    title=raw_idea.get('title', f'Project {idx + 1}'),
                    description=raw_idea.get('description', ''),
                    difficulty=raw_idea.get('difficulty', 'Intermediate'),
                    estimated_time=raw_idea.get('estimated_time', '2-4 weeks'),
                    key_features=raw_idea.get('key_features', []),
                    tech_stack=raw_idea.get('tech_stack', []),
                    learning_outcomes=raw_idea.get('learning_outcomes', [])
                )
                ideas.append(idea)
        
        # Default ideas if parsing fails
        if not ideas:
            ideas = [
                ProjectIdea(
                    title="Sample Project",
                    description="A sample project to get started",
                    difficulty="Beginner",
                    estimated_time="1-2 weeks",
                    key_features=["Feature 1", "Feature 2"],
                    tech_stack=["Python", "FastAPI"],
                    learning_outcomes=["Learn API development", "Practice Python"]
                )
            ]
        
        return ideas
    
    def _parse_project_roadmap(
        self, 
        workflow_result: Dict[str, Any], 
        project_title: str
    ) -> ProjectRoadmapResponse:
        """Parse workflow result into structured roadmap."""
        phases = []
        
        # Extract phases from workflow result
        raw_phases = workflow_result.get('phases', [])
        
        for idx, raw_phase in enumerate(raw_phases):
            if isinstance(raw_phase, dict):
                phase = RoadmapPhase(
                    phase_number=idx + 1,
                    title=raw_phase.get('title', f'Phase {idx + 1}'),
                    description=raw_phase.get('description', ''),
                    duration=raw_phase.get('duration', '1 week'),
                    deliverables=raw_phase.get('deliverables', []),
                    tasks=raw_phase.get('tasks', []),
                    resources=raw_phase.get('resources', [])
                )
                phases.append(phase)
        
        # Default phases if parsing fails
        if not phases:
            phases = [
                RoadmapPhase(
                    phase_number=1,
                    title="Planning & Setup",
                    description="Initial project setup and planning",
                    duration="1 week",
                    deliverables=["Project plan", "Development environment"],
                    tasks=["Define requirements", "Set up repository"],
                    resources=["Project documentation"]
                )
            ]
        
        # Calculate total duration
        total_duration = workflow_result.get('total_duration', f"{len(phases)} weeks")
        
        return ProjectRoadmapResponse(
            project_title=project_title,
            total_duration=total_duration,
            phases=phases,
            tech_requirements=workflow_result.get('tech_requirements', []),
            learning_resources=workflow_result.get('learning_resources', []),
            metadata=workflow_result.get('metadata', {})
        )
    
    def _parse_enhanced_roadmap(
        self, 
        workflow_result: Dict[str, Any], 
        project_title: str
    ) -> ProjectRoadmapResponse:
        """Parse enhanced workflow result with additional details."""
        # Similar to _parse_project_roadmap but with enhanced fields
        roadmap = self._parse_project_roadmap(workflow_result, project_title)
        
        # Add enhanced metadata
        if roadmap.metadata:
            roadmap.metadata['enhanced'] = True
            roadmap.metadata['project_type'] = workflow_result.get('project_type')
            roadmap.metadata['best_practices'] = workflow_result.get('best_practices', [])
            roadmap.metadata['testing_strategy'] = workflow_result.get('testing_strategy')
        
        return roadmap