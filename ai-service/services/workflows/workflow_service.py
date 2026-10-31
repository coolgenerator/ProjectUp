"""
Service layer for workflow management.
"""

from typing import Dict, Any, Optional, List
import uuid
from datetime import datetime

from services.core.base_service import BaseService
from schemas import (
    WorkflowCreateRequest,
    WorkflowExecuteRequest,
    WorkflowImportRequest,
    CustomWorkflowDefinition,
    WorkflowExecutionResult,
    WorkflowInfo,
    WorkflowListResponse
)
# Lazy import to avoid circular imports
ChatWorkflow = None
ProjectWorkflow = None
ResearchWorkflow = None
IdeaTreeWorkflow = None

def _lazy_import_workflows():
    """Lazy import workflows to avoid circular imports"""
    global ChatWorkflow, ProjectWorkflow, ResearchWorkflow, IdeaTreeWorkflow
    if ChatWorkflow is None:
        from workflows import ChatWorkflow as _ChatWorkflow
        from workflows import ProjectWorkflow as _ProjectWorkflow
        from workflows import ResearchWorkflow as _ResearchWorkflow
        from workflows import IdeaTreeWorkflow as _IdeaTreeWorkflow
        ChatWorkflow = _ChatWorkflow
        ProjectWorkflow = _ProjectWorkflow
        ResearchWorkflow = _ResearchWorkflow
        IdeaTreeWorkflow = _IdeaTreeWorkflow
from storage.checkpointer import SessionManager


class WorkflowService(BaseService):
    """Service for managing LangGraph workflows."""
    
    def __init__(self):
        """Initialize workflow service."""
        super().__init__()
        self.workflows: Dict[str, Any] = {}
        self.session_manager = SessionManager()
        # Lazy import workflows to avoid circular imports
        _lazy_import_workflows()
        self.workflow_types = {
            'chat': ChatWorkflow,
            'project': ProjectWorkflow,
            'research': ResearchWorkflow,
            'idea_tree': IdeaTreeWorkflow
        }
    
    def _initialize(self):
        """Initialize workflow service resources."""
        self.log_info("Workflow service initialized")
    
    async def create_workflow(
        self, 
        request: WorkflowCreateRequest
    ) -> Dict[str, Any]:
        """Create a new workflow."""
        try:
            workflow_id = request.workflow_id or str(uuid.uuid4())
            
            # Validate workflow type
            if request.workflow_type not in self.workflow_types and request.workflow_type != 'custom':
                return self.create_response(
                    success=False,
                    error=f"Invalid workflow type: {request.workflow_type}"
                )
            
            # Create workflow instance
            if request.workflow_type == 'custom':
                if not request.custom_definition:
                    return self.create_response(
                        success=False,
                        error="Custom workflow requires definition"
                    )
                workflow = self._create_custom_workflow(request.custom_definition)
            else:
                workflow_class = self.workflow_types[request.workflow_type]
                workflow = workflow_class()
            
            # Store workflow
            self.workflows[workflow_id] = {
                'instance': workflow,
                'type': request.workflow_type,
                'description': request.description or f"{request.workflow_type} workflow",
                'created_at': datetime.utcnow().isoformat(),
                'definition': request.custom_definition if request.workflow_type == 'custom' else None
            }
            
            self.log_info(f"Created workflow: {workflow_id}", workflow_type=request.workflow_type)
            
            return self.create_response(
                success=True,
                data={
                    'workflow_id': workflow_id,
                    'type': request.workflow_type,
                    'description': self.workflows[workflow_id]['description']
                }
            )
            
        except Exception as e:
            self.log_error("Failed to create workflow", error=e)
            return self.create_response(
                success=False,
                error=str(e)
            )
    
    async def execute_workflow(
        self, 
        request: WorkflowExecuteRequest
    ) -> WorkflowExecutionResult:
        """Execute a workflow."""
        try:
            # Check if workflow exists
            if request.workflow_id not in self.workflows:
                return WorkflowExecutionResult(
                    execution_id=str(uuid.uuid4()),
                    workflow_id=request.workflow_id,
                    status='error',
                    error='Workflow not found'
                )
            
            workflow_info = self.workflows[request.workflow_id]
            workflow = workflow_info['instance']
            
            # Create or get session
            session_id = request.session_id or self.session_manager.create_session(
                user_id='anonymous',
                workflow_type=workflow_info['type']
            )
            
            # Execute workflow
            execution_id = str(uuid.uuid4())
            self.log_info(
                f"Executing workflow: {request.workflow_id}",
                execution_id=execution_id,
                session_id=session_id
            )
            
            result = await workflow.execute(
                message=request.message,
                session_id=session_id,
                config=request.config or {}
            )
            
            return WorkflowExecutionResult(
                execution_id=execution_id,
                workflow_id=request.workflow_id,
                session_id=session_id,
                status='completed',
                result=result.get('output', ''),
                tool_results=result.get('tool_results'),
                context=result.get('context'),
                metadata=result.get('metadata')
            )
            
        except Exception as e:
            self.log_error(f"Failed to execute workflow: {request.workflow_id}", error=e)
            return WorkflowExecutionResult(
                execution_id=str(uuid.uuid4()),
                workflow_id=request.workflow_id,
                status='error',
                error=str(e)
            )
    
    async def import_workflow(
        self, 
        request: WorkflowImportRequest
    ) -> Dict[str, Any]:
        """Import a workflow definition."""
        try:
            workflow_id = request.workflow_id or str(uuid.uuid4())
            
            # Validate and create workflow from definition
            workflow = self._create_custom_workflow(request.workflow_definition)
            
            # Store workflow
            self.workflows[workflow_id] = {
                'instance': workflow,
                'type': 'custom',
                'description': request.workflow_definition.get('description', 'Imported workflow'),
                'created_at': datetime.utcnow().isoformat(),
                'definition': request.workflow_definition
            }
            
            self.log_info(f"Imported workflow: {workflow_id}")
            
            return self.create_response(
                success=True,
                data={
                    'workflow_id': workflow_id,
                    'type': 'custom',
                    'description': self.workflows[workflow_id]['description']
                }
            )
            
        except Exception as e:
            self.log_error("Failed to import workflow", error=e)
            return self.create_response(
                success=False,
                error=str(e)
            )
    
    async def list_workflows(self) -> WorkflowListResponse:
        """List all available workflows."""
        try:
            workflows_info = {}
            
            for workflow_id, info in self.workflows.items():
                workflows_info[workflow_id] = WorkflowInfo(
                    workflow_id=workflow_id,
                    type=info['type'],
                    description=info['description'],
                    created_at=info['created_at'],
                    definition=info.get('definition')
                )
            
            return WorkflowListResponse(
                workflows=workflows_info,
                count=len(workflows_info),
                success=True
            )
            
        except Exception as e:
            self.log_error("Failed to list workflows", error=e)
            return WorkflowListResponse(
                workflows={},
                count=0,
                success=False,
                error=str(e)
            )
    
    async def get_workflow(self, workflow_id: str) -> Optional[WorkflowInfo]:
        """Get workflow information."""
        if workflow_id not in self.workflows:
            return None
        
        info = self.workflows[workflow_id]
        return WorkflowInfo(
            workflow_id=workflow_id,
            type=info['type'],
            description=info['description'],
            created_at=info['created_at'],
            definition=info.get('definition')
        )
    
    async def delete_workflow(self, workflow_id: str) -> Dict[str, Any]:
        """Delete a workflow."""
        try:
            if workflow_id not in self.workflows:
                return self.create_response(
                    success=False,
                    error='Workflow not found'
                )
            
            del self.workflows[workflow_id]
            self.log_info(f"Deleted workflow: {workflow_id}")
            
            return self.create_response(
                success=True,
                data={'workflow_id': workflow_id}
            )
            
        except Exception as e:
            self.log_error(f"Failed to delete workflow: {workflow_id}", error=e)
            return self.create_response(
                success=False,
                error=str(e)
            )
    
    def _create_custom_workflow(self, definition: Dict[str, Any]) -> Any:
        """Create a custom workflow from definition."""
        raise NotImplementedError("Custom workflow creation is not yet implemented")
    
    async def get_workflow_templates(self) -> List[Dict[str, Any]]:
        """Get available workflow templates."""
        templates = [
            {
                'id': 'qa_template',
                'name': 'Q&A Workflow',
                'description': 'Simple question-answering workflow',
                'type': 'chat'
            },
            {
                'id': 'research_template',
                'name': 'Research Workflow',
                'description': 'Multi-step research and analysis workflow',
                'type': 'research'
            },
            {
                'id': 'project_template',
                'name': 'Project Planning Workflow',
                'description': 'Project ideation and roadmap generation',
                'type': 'project'
            }
        ]
        
        return templates