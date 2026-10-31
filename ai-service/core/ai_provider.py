"""
AI Provider - Unified interface for AI/LLM operations

Wrapper around LLMService to provide a consistent interface for onboarding and other services.
"""

import logging
from typing import Dict, Any, Optional
from services.llm.llm_service import LLMService

logger = logging.getLogger(__name__)


class AIProvider:
    """
    Unified AI provider interface for generating completions.

    This class wraps the LLMService to provide a simple, consistent interface
    for AI operations across the application.
    """

    def __init__(self, provider: str = "vertex_ai"):
        """
        Initialize AI provider.

        Args:
            provider: LLM provider to use ("vertex_ai", "openai", etc.)
        """
        self.llm_service = LLMService(provider=provider)
        logger.info(f"AIProvider initialized with provider: {provider}")

    async def generate_completion(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        response_format: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        model_name: Optional[str] = None,
        **kwargs
    ) -> str:
        """
        Generate a completion from the AI model.

        Args:
            prompt: The user prompt/query
            system_prompt: System-level instructions for the AI
            response_format: Expected response format ("json" for JSON responses)
            temperature: Sampling temperature (0.0 to 1.0)
            max_tokens: Maximum tokens in response
            model_name: Optional specific model to use
            **kwargs: Additional arguments

        Returns:
            AI response as string (may be JSON if response_format="json")
        """
        try:
            # If JSON response is requested, use generate_json
            if response_format == "json":
                # Add JSON instruction to system prompt if not already present
                json_instruction = "\n\nYou must respond with valid JSON only. Do not include any text outside the JSON structure."
                enhanced_system_prompt = (system_prompt or "") + json_instruction

                response = await self.llm_service.generate_structured_response(
                    system_prompt=enhanced_system_prompt,
                    user_prompt=prompt,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    model_name=model_name
                )

                return response
            else:
                # Regular text response
                response = await self.llm_service.generate_structured_response(
                    system_prompt=system_prompt or "",
                    user_prompt=prompt,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    model_name=model_name
                )

                return response

        except Exception as e:
            logger.error(f"Error generating completion: {e}")
            raise

    async def generate_completion_with_retry(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        response_format: Optional[str] = None,
        max_retries: int = 3,
        **kwargs
    ) -> str:
        """
        Generate a completion with retry logic for handling transient errors.

        Args:
            prompt: The user prompt/query
            system_prompt: System-level instructions
            response_format: Expected response format
            max_retries: Maximum number of retry attempts
            **kwargs: Additional arguments

        Returns:
            AI response as string
        """
        last_error = None

        for attempt in range(max_retries):
            try:
                return await self.generate_completion(
                    prompt=prompt,
                    system_prompt=system_prompt,
                    response_format=response_format,
                    **kwargs
                )
            except Exception as e:
                last_error = e
                logger.warning(
                    f"AI generation attempt {attempt + 1}/{max_retries} failed: {e}"
                )

                if attempt == max_retries - 1:
                    logger.error(f"All {max_retries} attempts failed")
                    raise last_error
