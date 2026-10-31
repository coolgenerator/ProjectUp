"""Vertex AI configuration for the AI agent"""

import os
import json
from pathlib import Path
from typing import Optional, Dict, Any
from dataclasses import dataclass

@dataclass
class VertexAIConfig:
    """Configuration for Vertex AI"""
    project_id: str = "project-up66"
    location: str = "us-central1"
    model_name: str = "gemini-1.5-flash"
    temperature: float = 0.7
    max_output_tokens: int = 4096
    service_account_path: Optional[str] = None
    
    def __post_init__(self):
        """Set up environment variables and paths"""
        config_dir = Path(__file__).parent.parent / "config"

        # Set service account path if not provided
        if not self.service_account_path:
            # Priority: check environment variable first
            env_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
            if env_path:
                self.service_account_path = env_path
            else:
                # Fallback: look for any service account JSON file in config directory
                # Check for common service account file patterns
                for pattern in ["service-account.json", "project-up66-*.json", "*service*.json"]:
                    matches = list(config_dir.glob(pattern))
                    if matches:
                        service_account_file = matches[0]
                        if service_account_file.exists():
                            self.service_account_path = str(service_account_file.absolute())
                            break

        # Set environment variable for Google Cloud SDK if path is set
        if self.service_account_path:
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = self.service_account_path

        # Set project and location environment variables
        os.environ["GOOGLE_CLOUD_PROJECT"] = self.project_id
        os.environ["GOOGLE_CLOUD_LOCATION"] = self.location
        
    def to_dict(self) -> Dict[str, Any]:
        """Convert config to dictionary"""
        return {
            "project_id": self.project_id,
            "location": self.location,
            "model_name": self.model_name,
            "temperature": self.temperature,
            "max_output_tokens": self.max_output_tokens,
            "service_account_path": self.service_account_path
        }
    
    @classmethod
    def from_env(cls) -> "VertexAIConfig":
        """Create config from environment variables"""
        return cls(
            project_id=os.getenv("GOOGLE_CLOUD_PROJECT", "project-up66"),
            location=os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1"),
            model_name=os.getenv("VERTEX_AI_MODEL", "gemini-1.5-flash"),
            temperature=float(os.getenv("VERTEX_AI_TEMPERATURE", "0.7")),
            max_output_tokens=int(os.getenv("VERTEX_AI_MAX_TOKENS", "4096")),
            service_account_path=os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        )
    
    @classmethod
    def from_config_file(cls) -> "VertexAIConfig":
        """Load config from api_config.json"""
        config_file = Path(__file__).parent.parent.parent / "config" / "api_config.json"
        
        if config_file.exists():
            with open(config_file, 'r') as f:
                config = json.load(f)
                vertex_config = config.get("vertex_ai", {})
                
                return cls(
                    project_id=vertex_config.get("project_id", "project-up66"),
                    location=vertex_config.get("location", "us-central1"),
                    model_name=vertex_config.get("model", "gemini-1.5-flash"),
                    temperature=vertex_config.get("temperature", 0.7),
                    max_output_tokens=vertex_config.get("max_output_tokens", 4096)
                )
        
        return cls()


def get_vertex_ai_llm():
    """Get a configured Vertex AI LLM instance"""
    try:
        from langchain_google_vertexai import ChatVertexAI
        from google.cloud import aiplatform
        
        config = VertexAIConfig.from_env()
        
        # Initialize Vertex AI
        aiplatform.init(
            project=config.project_id,
            location=config.location
        )
        
        # Create and return the LLM
        return ChatVertexAI(
            model_name=config.model_name,
            temperature=config.temperature,
            max_output_tokens=config.max_output_tokens,
            project=config.project_id,
            location=config.location
        )
        
    except ImportError as e:
        raise ImportError(
            "Vertex AI dependencies not installed. Run:\n"
            "pip install google-cloud-aiplatform langchain-google-vertexai"
        ) from e
    except Exception as e:
        raise RuntimeError(f"Failed to initialize Vertex AI: {e}") from e