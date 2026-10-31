"""
Configuration for IdeaTree Workflow
"""

from dataclasses import dataclass
from typing import Dict, Any, Optional


@dataclass
class IdeaTreeConfig:
    """Configuration for IdeaTree workflow"""
    
    # Model settings
    model_provider: str = "vertexai"
    model_name: str = "gemini-1.5-flash"
    temperature: float = 0.7
    max_output_tokens: int = 4096
    
    # Workflow settings
    use_connection_pool: bool = True
    pool_size: int = 5
    max_retries: int = 3
    retry_delay: float = 1.0
    
    # Query type limits
    max_suggestions_per_query: int = 7
    max_tasks_per_query: int = 10
    max_resources_per_query: int = 15
    max_milestones_per_query: int = 6
    
    # Timeout settings (in seconds)
    query_timeout: float = 60.0
    expansion_timeout: float = 30.0
    
    # Prompts configuration
    system_prompts: Dict[str, str] = None
    
    def __post_init__(self):
        """Initialize default prompts if not provided"""
        if self.system_prompts is None:
            self.system_prompts = {
                "expand_idea": "You are an expert at breaking down complex ideas into actionable sub-components.",
                "generate_tasks": "You are a project management expert who creates actionable, specific tasks.",
                "find_resources": "You are a research assistant specializing in finding high-quality learning resources.",
                "analyze_feasibility": "You are a technical advisor who analyzes project feasibility.",
                "suggest_milestones": "You are a project planning expert who creates realistic, achievable milestones.",
                "generate_learning_path": "You are an education specialist who creates personalized learning paths.",
                "generate_plan": "You are an expert project planner who creates detailed, actionable project plans.",
                "analyze_plan": "You are an expert plan reviewer who provides constructive analysis and improvement suggestions.",
                "expand_plan": "You are an expert at elaborating project plans with detailed sections and actionable content."
            }
    
    @classmethod
    def from_dict(cls, config_dict: Dict[str, Any]) -> "IdeaTreeConfig":
        """Create config from dictionary"""
        return cls(**config_dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert config to dictionary"""
        return {
            "model_provider": self.model_provider,
            "model_name": self.model_name,
            "temperature": self.temperature,
            "max_output_tokens": self.max_output_tokens,
            "use_connection_pool": self.use_connection_pool,
            "pool_size": self.pool_size,
            "max_retries": self.max_retries,
            "retry_delay": self.retry_delay,
            "max_suggestions_per_query": self.max_suggestions_per_query,
            "max_tasks_per_query": self.max_tasks_per_query,
            "max_resources_per_query": self.max_resources_per_query,
            "max_milestones_per_query": self.max_milestones_per_query,
            "query_timeout": self.query_timeout,
            "expansion_timeout": self.expansion_timeout,
            "system_prompts": self.system_prompts
        }


# Default configuration instance
default_config = IdeaTreeConfig()