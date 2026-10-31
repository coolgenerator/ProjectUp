"""
LLM Provider Configurations

Configuration for different AI/LLM providers (OpenAI, Vertex AI, Anthropic).
"""

from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from config.settings import settings


class ProviderConfig(BaseModel):
    """Base configuration for an LLM provider"""
    name: str = Field(..., description="Provider name")
    api_key: Optional[str] = Field(None, description="API key")
    model: str = Field(..., description="Default model")
    max_tokens: int = Field(4096, description="Maximum tokens")
    temperature: float = Field(0.7, description="Temperature setting")
    timeout: int = Field(60, description="Request timeout in seconds")
    retry_attempts: int = Field(3, description="Number of retry attempts")
    retry_delay: float = Field(1.0, description="Delay between retries in seconds")
    extra_config: Dict[str, Any] = Field(default_factory=dict, description="Additional provider-specific config")


class OpenAIConfig(ProviderConfig):
    """OpenAI provider configuration"""
    name: str = "openai"
    api_key: Optional[str] = settings.OPENAI_API_KEY
    model: str = settings.OPENAI_MODEL
    max_tokens: int = settings.OPENAI_MAX_TOKENS
    temperature: float = settings.OPENAI_TEMPERATURE
    organization: Optional[str] = None

    class Config:
        extra = "allow"


class VertexAIConfig(ProviderConfig):
    """Vertex AI provider configuration"""
    name: str = "vertex"
    project_id: str = settings.VERTEX_PROJECT_ID or ""
    location: str = settings.VERTEX_LOCATION
    model: str = settings.VERTEX_MODEL
    max_tokens: int = 8192
    temperature: float = 0.7
    top_p: float = 0.95
    top_k: int = 40

    class Config:
        extra = "allow"


class AnthropicConfig(ProviderConfig):
    """Anthropic provider configuration"""
    name: str = "anthropic"
    api_key: Optional[str] = settings.ANTHROPIC_API_KEY
    model: str = settings.ANTHROPIC_MODEL
    max_tokens: int = 4096
    temperature: float = 0.7

    class Config:
        extra = "allow"


# Provider configuration registry
PROVIDER_CONFIGS: Dict[str, ProviderConfig] = {
    "openai": OpenAIConfig(),
    "vertex": VertexAIConfig(),
    "anthropic": AnthropicConfig(),
}


def get_provider_config(provider_name: str) -> ProviderConfig:
    """
    Get configuration for a specific provider.

    Args:
        provider_name: Name of the provider

    Returns:
        ProviderConfig: Provider configuration

    Raises:
        ValueError: If provider not found
    """
    config = PROVIDER_CONFIGS.get(provider_name.lower())
    if not config:
        raise ValueError(f"Unknown provider: {provider_name}")
    return config


def get_default_provider_config() -> ProviderConfig:
    """
    Get the default provider configuration.

    Returns:
        ProviderConfig: Default provider configuration
    """
    return get_provider_config(settings.DEFAULT_PROVIDER)
