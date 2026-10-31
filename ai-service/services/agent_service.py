"""
Service layer for agent management.
"""

from typing import Dict, Any, Optional, List
import uuid
from datetime import datetime

from .base_service import BaseService
from models.requests.agent_requests import (
    AgentCreateRequest,
    AgentUpdateRequest
)
from models.responses.agent_responses import (
    AgentInfo,
    AgentResponse,
    AgentListResponse
)


class AgentService(BaseService):
    """Service for managing AI agents."""
    
    def __init__(self):
        """Initialize agent service."""
        super().__init__()
        self.agents: Dict[str, Dict[str, Any]] = {}
        self.provider_configs = {
            'openai': {
                'models': ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
                'default_model': 'gpt-4'
            },
            'google': {
                'models': ['gemini-pro', 'gemini-pro-vision'],
                'default_model': 'gemini-pro'
            },
            'anthropic': {
                'models': ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
                'default_model': 'claude-3-sonnet'
            }
        }
    
    def _initialize(self):
        """Initialize agent service resources."""
        self.log_info("Agent service initialized")
    
    async def create_agent(
        self, 
        request: AgentCreateRequest
    ) -> AgentResponse:
        """Create a new AI agent."""
        try:
            # Validate provider
            if request.provider not in self.provider_configs and request.provider != 'custom':
                return AgentResponse(
                    success=False,
                    error=f"Invalid provider: {request.provider}"
                )
            
            agent_id = str(uuid.uuid4())
            
            # Create agent configuration
            agent_config = {
                'id': agent_id,
                'name': request.name,
                'provider': request.provider,
                'model': request.model,
                'temperature': request.temperature,
                'max_tokens': request.max_tokens,
                'memory_size': request.memory_size,
                'capabilities': self._determine_capabilities(request),
                'config': {
                    'enable_url_search': request.enable_url_search,
                    'enable_image_processing': request.enable_image_processing,
                    'enable_link_validator': request.enable_link_validator,
                    'use_entity_memory': request.use_entity_memory,
                    'unlimited_memory': request.unlimited_memory,
                },
                'system_prompt': request.system_prompt,
                'tools': request.tools or [],
                'api_key': request.api_key,
                'status': 'active',
                'created_at': datetime.utcnow(),
                'updated_at': None
            }
            
            # Store agent
            self.agents[agent_id] = agent_config
            
            self.log_info(f"Created agent: {agent_id}", agent_name=request.name)
            
            return AgentResponse(
                success=True,
                agent=self._create_agent_info(agent_config),
                message=f"Agent '{request.name}' created successfully"
            )
            
        except Exception as e:
            self.log_error("Failed to create agent", error=e)
            return AgentResponse(
                success=False,
                error=str(e)
            )
    
    async def update_agent(
        self, 
        agent_id: str,
        request: AgentUpdateRequest
    ) -> AgentResponse:
        """Update an existing agent."""
        try:
            if agent_id not in self.agents:
                return AgentResponse(
                    success=False,
                    error='Agent not found'
                )
            
            agent = self.agents[agent_id]
            
            # Update fields if provided
            if request.name is not None:
                agent['name'] = request.name
            if request.temperature is not None:
                agent['temperature'] = request.temperature
            if request.max_tokens is not None:
                agent['max_tokens'] = request.max_tokens
            if request.memory_size is not None:
                agent['memory_size'] = request.memory_size
            if request.system_prompt is not None:
                agent['system_prompt'] = request.system_prompt
            if request.tools is not None:
                agent['tools'] = request.tools
            
            # Update config flags
            if request.enable_url_search is not None:
                agent['config']['enable_url_search'] = request.enable_url_search
            if request.enable_image_processing is not None:
                agent['config']['enable_image_processing'] = request.enable_image_processing
            if request.enable_link_validator is not None:
                agent['config']['enable_link_validator'] = request.enable_link_validator
            
            agent['updated_at'] = datetime.utcnow()
            
            # Update capabilities based on new configuration
            agent['capabilities'] = self._determine_capabilities_from_config(agent)
            
            self.log_info(f"Updated agent: {agent_id}")
            
            return AgentResponse(
                success=True,
                agent=self._create_agent_info(agent),
                message=f"Agent '{agent['name']}' updated successfully"
            )
            
        except Exception as e:
            self.log_error(f"Failed to update agent: {agent_id}", error=e)
            return AgentResponse(
                success=False,
                error=str(e)
            )
    
    async def get_agent(self, agent_id: str) -> Optional[AgentInfo]:
        """Get agent information."""
        if agent_id not in self.agents:
            return None
        
        return self._create_agent_info(self.agents[agent_id])
    
    async def list_agents(self) -> AgentListResponse:
        """List all agents."""
        try:
            agents_list = []
            active_count = 0
            
            for agent_config in self.agents.values():
                agents_list.append(self._create_agent_info(agent_config))
                if agent_config['status'] == 'active':
                    active_count += 1
            
            return AgentListResponse(
                agents=agents_list,
                total_count=len(agents_list),
                active_count=active_count,
                metadata={
                    'providers': list(self.provider_configs.keys())
                }
            )
            
        except Exception as e:
            self.log_error("Failed to list agents", error=e)
            return AgentListResponse(
                agents=[],
                total_count=0,
                active_count=0
            )
    
    async def delete_agent(self, agent_id: str) -> AgentResponse:
        """Delete an agent."""
        try:
            if agent_id not in self.agents:
                return AgentResponse(
                    success=False,
                    error='Agent not found'
                )
            
            agent_name = self.agents[agent_id]['name']
            del self.agents[agent_id]
            
            self.log_info(f"Deleted agent: {agent_id}")
            
            return AgentResponse(
                success=True,
                message=f"Agent '{agent_name}' deleted successfully"
            )
            
        except Exception as e:
            self.log_error(f"Failed to delete agent: {agent_id}", error=e)
            return AgentResponse(
                success=False,
                error=str(e)
            )
    
    async def activate_agent(self, agent_id: str) -> AgentResponse:
        """Activate an agent."""
        return await self._set_agent_status(agent_id, 'active')
    
    async def deactivate_agent(self, agent_id: str) -> AgentResponse:
        """Deactivate an agent."""
        return await self._set_agent_status(agent_id, 'inactive')
    
    async def _set_agent_status(self, agent_id: str, status: str) -> AgentResponse:
        """Set agent status."""
        try:
            if agent_id not in self.agents:
                return AgentResponse(
                    success=False,
                    error='Agent not found'
                )
            
            self.agents[agent_id]['status'] = status
            self.agents[agent_id]['updated_at'] = datetime.utcnow()
            
            self.log_info(f"Set agent {agent_id} status to {status}")
            
            return AgentResponse(
                success=True,
                agent=self._create_agent_info(self.agents[agent_id]),
                message=f"Agent status set to {status}"
            )
            
        except Exception as e:
            self.log_error(f"Failed to set agent status: {agent_id}", error=e)
            return AgentResponse(
                success=False,
                error=str(e)
            )
    
    def _determine_capabilities(self, request: AgentCreateRequest) -> List[str]:
        """Determine agent capabilities from request."""
        capabilities = ['chat', 'memory']
        
        if request.enable_url_search:
            capabilities.append('web_search')
        if request.enable_image_processing:
            capabilities.append('image_analysis')
        if request.enable_link_validator:
            capabilities.append('link_validation')
        if request.use_entity_memory:
            capabilities.append('entity_memory')
        if request.tools:
            capabilities.append('tools')
            
        return capabilities
    
    def _determine_capabilities_from_config(self, agent_config: Dict[str, Any]) -> List[str]:
        """Determine capabilities from agent configuration."""
        capabilities = ['chat', 'memory']
        
        config = agent_config.get('config', {})
        if config.get('enable_url_search'):
            capabilities.append('web_search')
        if config.get('enable_image_processing'):
            capabilities.append('image_analysis')
        if config.get('enable_link_validator'):
            capabilities.append('link_validation')
        if config.get('use_entity_memory'):
            capabilities.append('entity_memory')
        if agent_config.get('tools'):
            capabilities.append('tools')
            
        return capabilities
    
    def _create_agent_info(self, agent_config: Dict[str, Any]) -> AgentInfo:
        """Create AgentInfo from configuration."""
        return AgentInfo(
            agent_id=agent_config['id'],
            name=agent_config['name'],
            provider=agent_config['provider'],
            model=agent_config['model'],
            status=agent_config['status'],
            capabilities=agent_config['capabilities'],
            created_at=agent_config['created_at'],
            updated_at=agent_config.get('updated_at'),
            metadata={
                'temperature': agent_config['temperature'],
                'max_tokens': agent_config['max_tokens'],
                'memory_size': agent_config['memory_size'],
                'tools_count': len(agent_config.get('tools', []))
            }
        )