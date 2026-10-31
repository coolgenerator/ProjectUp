"""
Settings configuration for the AI agent
"""

import os
from pathlib import Path
from typing import Optional

class Settings:
    """Application settings for AI agent"""
    
    def __init__(self):
        # Base configuration
        self.app_name = "ProjectUp AI Agent"
        self.version = "2.1.0"
        
        # Environment configuration
        self.environment = os.getenv("ENVIRONMENT", "development").lower()
        self.is_production = self.environment == "production"
        self.is_development = self.environment in ["development", "dev"]
        
        # Get config directory path
        config_dir = Path(__file__).parent
        
        # Google Cloud / Vertex AI configuration
        # Using project-up66 as specified in the service account file
        self.gcp_project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "project-up66")
        self.gcp_location = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")

        # Aliases for compatibility
        self.VERTEX_PROJECT_ID = self.gcp_project_id
        self.VERTEX_LOCATION = self.gcp_location
        self.GOOGLE_CLOUD_PROJECT = self.gcp_project_id
        self.GOOGLE_CLOUD_LOCATION = self.gcp_location

        # Vertex AI model configuration
        self.vertex_ai_model = os.getenv("VERTEX_AI_MODEL", "gemini-2.5-pro")
        self.vertex_ai_temperature = float(os.getenv("VERTEX_AI_TEMPERATURE", "0.7"))
        self.vertex_ai_max_tokens = int(os.getenv("VERTEX_AI_MAX_TOKENS", "8192"))

        # Additional uppercase aliases for compatibility
        self.VERTEX_TEMPERATURE = self.vertex_ai_temperature
        self.VERTEX_MAX_TOKENS = self.vertex_ai_max_tokens
        self.max_output_tokens = self.vertex_ai_max_tokens  # For vertex_ai_service.py line 227
        
        # Service account configuration
        # Priority: environment variable first, then local file (for dev)
        self.google_application_credentials = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

        if not self.google_application_credentials:
            # Fallback: look for any service account JSON file in config directory
            # Check for common service account file patterns
            for pattern in ["service-account.json", "project-up66-*.json", "*service*.json"]:
                matches = list(config_dir.glob(pattern))
                if matches:
                    service_account_file = matches[0]
                    if service_account_file.exists():
                        self.google_application_credentials = str(service_account_file.absolute())
                        break

        # Set environment variable for Google Cloud SDK if credentials are found
        if self.google_application_credentials:
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = self.google_application_credentials

        # Add uppercase alias for compatibility
        self.GOOGLE_APPLICATION_CREDENTIALS = self.google_application_credentials
        
        # OpenAI configuration (fallback, not currently used)
        self.openai_api_key: Optional[str] = os.getenv("OPENAI_API_KEY")
        self.openai_model = os.getenv("OPENAI_MODEL", "gpt-4-turbo-preview")
        
        # API configuration
        self.api_host = os.getenv("API_HOST", "0.0.0.0")
        self.api_port = int(os.getenv("API_PORT", "8888"))
        self.api_debug = os.getenv("API_DEBUG", "true").lower() == "true"
        
        # Server settings (for FastAPI/Uvicorn)
        self.host = self.api_host
        self.port = self.api_port
        self.reload = os.getenv("RELOAD", "false").lower() == "true"
        self.enable_debug = self.api_debug
        self.workers = int(os.getenv("WORKERS", "4"))  # Number of worker processes
        
        # Backend API configuration
        self.backend_url = os.getenv("BACKEND_URL", "http://localhost:8080")
        self.backend_api_prefix = os.getenv("BACKEND_API_PREFIX", "/api")
        self.backend_timeout = int(os.getenv("BACKEND_TIMEOUT", "30"))  # seconds

        # CORS configuration
        self.cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:8080").split(",")

        # Logging configuration
        self.log_level = os.getenv("LOG_LEVEL", "INFO")
        self.log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        self.log_file = os.getenv("LOG_FILE", "ai_agent.log")
        
        # API Documentation settings
        self.enable_swagger = os.getenv("ENABLE_SWAGGER", "true" if self.is_development else "false").lower() == "true"
        self.docs_url = "/docs" if self.enable_swagger else None
        self.redoc_url = "/redoc" if self.enable_swagger else None
        self.openapi_url = "/openapi.json" if self.enable_swagger else None
        
        # Default LLM provider settings
        self.default_llm_provider = os.getenv("DEFAULT_LLM_PROVIDER", "vertex_ai")
        self.default_llm_model = os.getenv("DEFAULT_LLM_MODEL", "gemini-2.5-pro")
        self.max_retries = int(os.getenv("MAX_RETRIES", "3"))
        self.top_p = float(os.getenv("TOP_P", "0.95"))
        self.top_k = int(os.getenv("TOP_K", "40"))
        
    def get_vertex_ai_config(self):
        """Get Vertex AI configuration as a dictionary"""
        return {
            "project": self.gcp_project_id,
            "location": self.gcp_location,
            "model": self.vertex_ai_model,
            "temperature": self.vertex_ai_temperature,
            "max_output_tokens": self.vertex_ai_max_tokens,
            "credentials_path": self.google_application_credentials
        }

    def get_generation_config(self):
        """Get GenerationConfig for Vertex AI models"""
        from vertexai.generative_models import GenerationConfig

        return GenerationConfig(
            temperature=self.vertex_ai_temperature,
            max_output_tokens=self.vertex_ai_max_tokens,
            top_p=self.top_p,
            top_k=self.top_k
        )

    def validate(self) -> bool:
        """
        Validate required configuration for CI/CD deployment

        Raises:
            ValueError: If required configuration is missing

        Returns:
            True if configuration is valid
        """
        errors = []

        # Required for Vertex AI
        if not self.gcp_project_id:
            errors.append("GOOGLE_CLOUD_PROJECT environment variable is required")

        if not self.gcp_location:
            errors.append("GOOGLE_CLOUD_LOCATION environment variable is required")

        # In production, credentials MUST be set
        if self.is_production and not self.google_application_credentials:
            errors.append("GOOGLE_APPLICATION_CREDENTIALS is required in production")

        if errors:
            raise ValueError(f"Configuration validation failed:\n" + "\n".join(f"  - {e}" for e in errors))

        return True

    def to_dict(self) -> dict:
        """
        Export configuration as dictionary (for logging/debugging)
        Excludes sensitive values like credentials
        """
        return {
            "environment": self.environment,
            "gcp_project_id": self.gcp_project_id,
            "gcp_location": self.gcp_location,
            "vertex_ai_model": self.vertex_ai_model,
            "vertex_ai_temperature": self.vertex_ai_temperature,
            "vertex_ai_max_tokens": self.vertex_ai_max_tokens,
            "api_host": self.api_host,
            "api_port": self.api_port,
            "default_llm_provider": self.default_llm_provider,
            "has_credentials": bool(self.google_application_credentials)
        }

class WorkflowSettings:
    """Workflow configuration settings"""
    
    def __init__(self):
        self.workflow_configs = {
            "project": {
                "name": "Project Planning Workflow",
                "description": "AI-assisted project planning and roadmap generation",
                "max_iterations": 10,
                "timeout": 300
            },
            "chat": {
                "name": "Chat Workflow",
                "description": "Conversational AI assistant",
                "max_iterations": 5,
                "timeout": 120
            },
            "research": {
                "name": "Research Workflow",
                "description": "AI-powered research and information gathering",
                "max_iterations": 15,
                "timeout": 600
            },
            "learning_path": {
                "name": "Learning Path Workflow",
                "description": "Personalized learning path generation",
                "max_iterations": 8,
                "timeout": 240
            },
            "custom": {
                "name": "Custom Workflow",
                "description": "User-defined custom workflow",
                "max_iterations": 20,
                "timeout": 900
            }
        }
    
    def get_workflow_config(self, workflow_type: str):
        """Get configuration for a specific workflow type"""
        return self.workflow_configs.get(workflow_type, self.workflow_configs["custom"])

# Create global settings instances
settings = Settings()
workflow_settings = WorkflowSettings()