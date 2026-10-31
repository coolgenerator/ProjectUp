"""
Unified LLM service that wraps different providers (Vertex AI, OpenAI, etc.)
"""
import logging
from typing import Optional, Dict, Any
from services.llm.vertex_ai_service import VertexAIService

logger = logging.getLogger(__name__)


class LLMService:
    """
    Unified interface for LLM operations across different providers.
    Currently supports Vertex AI (Gemini models).
    """

    def __init__(self, provider: str = "vertex_ai"):
        """
        Initialize LLM service with specified provider.

        Args:
            provider: LLM provider to use ("vertex_ai", "openai", etc.)
        """
        self.provider = provider

        if provider == "vertex_ai":
            self.service = VertexAIService()
        else:
            raise ValueError(f"Unsupported LLM provider: {provider}")

    async def generate_structured_response(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        model_name: Optional[str] = None
    ) -> str:
        """
        Generate a structured response from the LLM.

        Args:
            system_prompt: System-level instructions for the LLM
            user_prompt: User query/prompt
            temperature: Sampling temperature (0.0 to 1.0)
            max_tokens: Maximum tokens in response
            model_name: Optional specific model to use

        Returns:
            LLM response as string
        """
        if self.provider == "vertex_ai":
            return await self._generate_vertex_ai(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
                model_name=model_name
            )
        else:
            raise NotImplementedError(f"Provider {self.provider} not implemented")

    async def _generate_vertex_ai(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float,
        max_tokens: int,
        model_name: Optional[str]
    ) -> str:
        """Generate response using Vertex AI (Gemini)"""

        # Combine system and user prompts for Vertex AI
        combined_prompt = f"{system_prompt}\n\n{user_prompt}"

        try:
            # Use the vertex AI service to generate
            response = await self.service.generate_text(
                prompt=combined_prompt,
                temperature=temperature,
                max_output_tokens=max_tokens,
                model_name=model_name or "gemini-2.0-flash-exp"
            )

            return response

        except Exception as e:
            logger.error(f"Error generating response from Vertex AI: {e}")
            raise

    async def generate_with_retry(
        self,
        system_prompt: str,
        user_prompt: str,
        max_retries: int = 3,
        **kwargs
    ) -> str:
        """
        Generate response with retry logic for handling transient errors.

        Args:
            system_prompt: System-level instructions
            user_prompt: User query
            max_retries: Maximum number of retry attempts
            **kwargs: Additional arguments for generate_structured_response

        Returns:
            LLM response as string
        """
        last_error = None

        for attempt in range(max_retries):
            try:
                return await self.generate_structured_response(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    **kwargs
                )
            except Exception as e:
                last_error = e
                logger.warning(
                    f"LLM generation attempt {attempt + 1}/{max_retries} failed: {e}"
                )

                if attempt == max_retries - 1:
                    logger.error(f"All {max_retries} attempts failed")
                    raise last_error

    async def generate_json(
        self,
        system_prompt: str,
        user_prompt: str,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate a JSON response and parse it.

        Args:
            system_prompt: System-level instructions
            user_prompt: User query (should request JSON format)
            **kwargs: Additional arguments

        Returns:
            Parsed JSON response as dict
        """
        import json

        response_text = await self.generate_structured_response(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            **kwargs
        )

        # Try to parse JSON
        try:
            return json.loads(response_text)
        except json.JSONDecodeError:
            # Try to extract JSON from markdown code blocks
            if "```json" in response_text:
                json_start = response_text.find("```json") + 7
                json_end = response_text.find("```", json_start)
                json_str = response_text[json_start:json_end].strip()
                return json.loads(json_str)
            elif "```" in response_text:
                # Try generic code block
                json_start = response_text.find("```") + 3
                json_end = response_text.find("```", json_start)
                json_str = response_text[json_start:json_end].strip()
                return json.loads(json_str)
            else:
                raise ValueError("Could not extract valid JSON from LLM response")
