"""
Model Configurations

Defines available models for each provider and their specific settings.
"""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class ModelCapabilities(BaseModel):
    """Model capabilities and limitations"""
    supports_streaming: bool = Field(True, description="Supports streaming responses")
    supports_function_calling: bool = Field(False, description="Supports function calling")
    supports_vision: bool = Field(False, description="Supports vision/image inputs")
    supports_json_mode: bool = Field(False, description="Supports JSON mode")
    max_context_length: int = Field(4096, description="Maximum context length in tokens")
    max_output_tokens: int = Field(4096, description="Maximum output tokens")


class ModelConfig(BaseModel):
    """Configuration for a specific model"""
    model_id: str = Field(..., description="Model identifier")
    provider: str = Field(..., description="Provider name")
    display_name: str = Field(..., description="Human-readable name")
    description: Optional[str] = Field(None, description="Model description")
    capabilities: ModelCapabilities = Field(default_factory=ModelCapabilities)
    default_temperature: float = Field(0.7, description="Default temperature")
    cost_per_1k_input_tokens: Optional[float] = Field(None, description="Cost per 1K input tokens")
    cost_per_1k_output_tokens: Optional[float] = Field(None, description="Cost per 1K output tokens")
    recommended_use_cases: List[str] = Field(default_factory=list, description="Recommended use cases")


# OpenAI Models
OPENAI_MODELS: Dict[str, ModelConfig] = {
    "gpt-4-turbo-preview": ModelConfig(
        model_id="gpt-4-turbo-preview",
        provider="openai",
        display_name="GPT-4 Turbo",
        description="Most capable GPT-4 model with 128K context",
        capabilities=ModelCapabilities(
            supports_streaming=True,
            supports_function_calling=True,
            supports_vision=True,
            supports_json_mode=True,
            max_context_length=128000,
            max_output_tokens=4096,
        ),
        default_temperature=0.7,
        cost_per_1k_input_tokens=0.01,
        cost_per_1k_output_tokens=0.03,
        recommended_use_cases=["complex reasoning", "code generation", "analysis"],
    ),
    "gpt-4o": ModelConfig(
        model_id="gpt-4o",
        provider="openai",
        display_name="GPT-4o",
        description="Optimized GPT-4 model with multimodal capabilities",
        capabilities=ModelCapabilities(
            supports_streaming=True,
            supports_function_calling=True,
            supports_vision=True,
            supports_json_mode=True,
            max_context_length=128000,
            max_output_tokens=4096,
        ),
        default_temperature=0.7,
        cost_per_1k_input_tokens=0.005,
        cost_per_1k_output_tokens=0.015,
        recommended_use_cases=["general purpose", "multimodal", "fast responses"],
    ),
    "gpt-3.5-turbo": ModelConfig(
        model_id="gpt-3.5-turbo",
        provider="openai",
        display_name="GPT-3.5 Turbo",
        description="Fast and cost-effective model",
        capabilities=ModelCapabilities(
            supports_streaming=True,
            supports_function_calling=True,
            supports_json_mode=True,
            max_context_length=16385,
            max_output_tokens=4096,
        ),
        default_temperature=0.7,
        cost_per_1k_input_tokens=0.0005,
        cost_per_1k_output_tokens=0.0015,
        recommended_use_cases=["simple tasks", "chat", "quick responses"],
    ),
}

# Vertex AI Models
VERTEX_MODELS: Dict[str, ModelConfig] = {
    "gemini-1.5-pro": ModelConfig(
        model_id="gemini-1.5-pro",
        provider="vertex",
        display_name="Gemini 1.5 Pro",
        description="Google's most capable model with 1M token context",
        capabilities=ModelCapabilities(
            supports_streaming=True,
            supports_function_calling=True,
            supports_vision=True,
            supports_json_mode=True,
            max_context_length=1000000,
            max_output_tokens=8192,
        ),
        default_temperature=0.7,
        recommended_use_cases=["long context", "complex reasoning", "multimodal"],
    ),
    "gemini-1.5-flash": ModelConfig(
        model_id="gemini-1.5-flash",
        provider="vertex",
        display_name="Gemini 1.5 Flash",
        description="Fast and efficient model for high-volume tasks",
        capabilities=ModelCapabilities(
            supports_streaming=True,
            supports_function_calling=True,
            supports_vision=True,
            supports_json_mode=True,
            max_context_length=1000000,
            max_output_tokens=8192,
        ),
        default_temperature=0.7,
        recommended_use_cases=["fast responses", "high volume", "cost-effective"],
    ),
}

# Anthropic Models
ANTHROPIC_MODELS: Dict[str, ModelConfig] = {
    "claude-3-5-sonnet-20241022": ModelConfig(
        model_id="claude-3-5-sonnet-20241022",
        provider="anthropic",
        display_name="Claude 3.5 Sonnet",
        description="Anthropic's most capable model with excellent reasoning",
        capabilities=ModelCapabilities(
            supports_streaming=True,
            supports_function_calling=True,
            supports_vision=True,
            max_context_length=200000,
            max_output_tokens=4096,
        ),
        default_temperature=0.7,
        cost_per_1k_input_tokens=0.003,
        cost_per_1k_output_tokens=0.015,
        recommended_use_cases=["complex reasoning", "analysis", "code generation"],
    ),
    "claude-3-haiku-20240307": ModelConfig(
        model_id="claude-3-haiku-20240307",
        provider="anthropic",
        display_name="Claude 3 Haiku",
        description="Fast and cost-effective model",
        capabilities=ModelCapabilities(
            supports_streaming=True,
            supports_vision=True,
            max_context_length=200000,
            max_output_tokens=4096,
        ),
        default_temperature=0.7,
        cost_per_1k_input_tokens=0.00025,
        cost_per_1k_output_tokens=0.00125,
        recommended_use_cases=["simple tasks", "quick responses", "cost-effective"],
    ),
}

# All models registry
ALL_MODELS: Dict[str, ModelConfig] = {
    **OPENAI_MODELS,
    **VERTEX_MODELS,
    **ANTHROPIC_MODELS,
}


def get_model_config(model_id: str) -> ModelConfig:
    """
    Get configuration for a specific model.

    Args:
        model_id: Model identifier

    Returns:
        ModelConfig: Model configuration

    Raises:
        ValueError: If model not found
    """
    config = ALL_MODELS.get(model_id)
    if not config:
        raise ValueError(f"Unknown model: {model_id}")
    return config


def get_models_by_provider(provider: str) -> Dict[str, ModelConfig]:
    """
    Get all models for a specific provider.

    Args:
        provider: Provider name

    Returns:
        Dict[str, ModelConfig]: Models for the provider
    """
    return {
        model_id: config
        for model_id, config in ALL_MODELS.items()
        if config.provider == provider
    }


def get_recommended_model(use_case: str, provider: Optional[str] = None) -> Optional[ModelConfig]:
    """
    Get recommended model for a specific use case.

    Args:
        use_case: Use case description
        provider: Optional provider filter

    Returns:
        Optional[ModelConfig]: Recommended model or None
    """
    models = ALL_MODELS if not provider else get_models_by_provider(provider)

    for config in models.values():
        if use_case.lower() in [uc.lower() for uc in config.recommended_use_cases]:
            return config

    return None
