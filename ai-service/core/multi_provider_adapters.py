"""
Multi-Provider LLM Adapters

Adapters for various AI providers (OpenAI, Anthropic, Google, etc.)
Supports user-provided API keys for free tier users
"""

import logging
from typing import Dict, Any, List, Optional, Union, AsyncGenerator
import asyncio

from core.llm_adapter import LLMAdapter

logger = logging.getLogger(__name__)


class OpenAIAdapter(LLMAdapter):
    """Adapter for OpenAI API (GPT-4, GPT-3.5, etc.)"""

    def __init__(self, api_key: str, base_url: Optional[str] = None):
        """
        Initialize OpenAI adapter

        Args:
            api_key: OpenAI API key
            base_url: Optional custom base URL (for OpenAI-compatible APIs)
        """
        self.api_key = api_key
        self.base_url = base_url or "https://api.openai.com/v1"

        # Import OpenAI library
        try:
            from openai import AsyncOpenAI
            self.client = AsyncOpenAI(
                api_key=self.api_key,
                base_url=self.base_url
            )
        except ImportError:
            logger.error("openai package not installed. Install with: pip install openai")
            raise

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        model_name: Optional[str] = None,
        **kwargs
    ) -> str:
        """Generate text using OpenAI"""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        return await self.chat(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            model_name=model_name,
            **kwargs
        )

    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        model_name: Optional[str] = None,
        **kwargs
    ) -> str:
        """Generate chat response using OpenAI"""
        try:
            response = await self.client.chat.completions.create(
                model=model_name or "gpt-4o",
                messages=messages,
                temperature=temperature or 0.7,
                max_tokens=max_tokens,
                **kwargs
            )
            return response.choices[0].message.content

        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            if "invalid_api_key" in str(e).lower() or "incorrect api key" in str(e).lower():
                from services.user_context_service import InvalidAPIKeyError
                raise InvalidAPIKeyError("Your OpenAI API key is invalid")
            raise

    async def embed(
        self,
        texts: Union[str, List[str]],
        model_name: Optional[str] = None
    ) -> Union[List[float], List[List[float]]]:
        """Generate embeddings using OpenAI"""
        if isinstance(texts, str):
            texts = [texts]

        try:
            response = await self.client.embeddings.create(
                model=model_name or "text-embedding-3-small",
                input=texts
            )

            embeddings = [item.embedding for item in response.data]
            return embeddings[0] if len(embeddings) == 1 else embeddings

        except Exception as e:
            logger.error(f"OpenAI embedding error: {e}")
            raise


class AnthropicAdapter(LLMAdapter):
    """Adapter for Anthropic API (Claude models)"""

    def __init__(self, api_key: str, base_url: Optional[str] = None):
        """
        Initialize Anthropic adapter

        Args:
            api_key: Anthropic API key
            base_url: Optional custom base URL
        """
        self.api_key = api_key
        self.base_url = base_url or "https://api.anthropic.com"

        # Import Anthropic library
        try:
            from anthropic import AsyncAnthropic
            self.client = AsyncAnthropic(
                api_key=self.api_key,
                base_url=self.base_url
            )
        except ImportError:
            logger.error("anthropic package not installed. Install with: pip install anthropic")
            raise

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        model_name: Optional[str] = None,
        **kwargs
    ) -> str:
        """Generate text using Anthropic"""
        messages = [{"role": "user", "content": prompt}]

        return await self.chat(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            model_name=model_name,
            system_prompt=system_prompt,
            **kwargs
        )

    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        model_name: Optional[str] = None,
        system_prompt: Optional[str] = None,
        **kwargs
    ) -> str:
        """Generate chat response using Anthropic"""
        try:
            # Anthropic requires system prompt separate from messages
            create_params = {
                "model": model_name or "claude-3-5-sonnet-20241022",
                "messages": messages,
                "max_tokens": max_tokens or 4096,
                "temperature": temperature or 0.7,
                **kwargs
            }

            if system_prompt:
                create_params["system"] = system_prompt

            response = await self.client.messages.create(**create_params)

            return response.content[0].text

        except Exception as e:
            logger.error(f"Anthropic API error: {e}")
            if "invalid_api_key" in str(e).lower() or "invalid x-api-key" in str(e).lower():
                from services.user_context_service import InvalidAPIKeyError
                raise InvalidAPIKeyError("Your Anthropic API key is invalid")
            raise

    async def embed(
        self,
        texts: Union[str, List[str]],
        model_name: Optional[str] = None
    ) -> Union[List[float], List[List[float]]]:
        """Anthropic doesn't provide embedding models - fallback to error"""
        raise NotImplementedError("Anthropic does not provide embedding models. Use OpenAI or Google for embeddings.")


class GoogleVertexAdapter(LLMAdapter):
    """
    Adapter for Google Generative AI (Gemini) via API key
    This is different from VertexAIAdapter which uses service accounts
    """

    def __init__(self, api_key: str, base_url: Optional[str] = None):
        """
        Initialize Google AI adapter

        Args:
            api_key: Google AI API key
            base_url: Optional custom base URL
        """
        self.api_key = api_key
        self.base_url = base_url or "https://generativelanguage.googleapis.com/v1"

        # Import Google Generative AI library
        try:
            import google.generativeai as genai
            genai.configure(api_key=self.api_key)
            self.genai = genai
        except ImportError:
            logger.error("google-generativeai package not installed. Install with: pip install google-generativeai")
            raise

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        model_name: Optional[str] = None,
        **kwargs
    ) -> str:
        """Generate text using Google Gemini"""
        try:
            model = self.genai.GenerativeModel(model_name or "gemini-2.5-pro")

            generation_config = {
                "temperature": temperature or 0.7,
                "max_output_tokens": max_tokens or 8192,
            }

            full_prompt = prompt
            if system_prompt:
                full_prompt = f"{system_prompt}\n\n{prompt}"

            response = await asyncio.to_thread(
                model.generate_content,
                full_prompt,
                generation_config=generation_config
            )

            return response.text

        except Exception as e:
            logger.error(f"Google AI error: {e}")
            if "invalid api key" in str(e).lower() or "api_key_invalid" in str(e).lower():
                from services.user_context_service import InvalidAPIKeyError
                raise InvalidAPIKeyError("Your Google AI API key is invalid")
            raise

    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        model_name: Optional[str] = None,
        **kwargs
    ) -> str:
        """Generate chat response using Google Gemini"""
        try:
            model = self.genai.GenerativeModel(model_name or "gemini-2.5-pro")

            generation_config = {
                "temperature": temperature or 0.7,
                "max_output_tokens": max_tokens or 8192,
            }

            # Convert messages to Gemini format
            chat = model.start_chat(history=[])

            # Build conversation history
            for msg in messages[:-1]:  # All but last message
                role = "user" if msg["role"] == "user" else "model"
                chat.history.append({
                    "role": role,
                    "parts": [msg["content"]]
                })

            # Send last message and get response
            last_message = messages[-1]["content"]
            response = await asyncio.to_thread(
                chat.send_message,
                last_message,
                generation_config=generation_config
            )

            return response.text

        except Exception as e:
            logger.error(f"Google AI chat error: {e}")
            if "invalid api key" in str(e).lower() or "api_key_invalid" in str(e).lower():
                from services.user_context_service import InvalidAPIKeyError
                raise InvalidAPIKeyError("Your Google AI API key is invalid")
            raise

    async def embed(
        self,
        texts: Union[str, List[str]],
        model_name: Optional[str] = None
    ) -> Union[List[float], List[List[float]]]:
        """Generate embeddings using Google"""
        if isinstance(texts, str):
            texts = [texts]

        try:
            embeddings = []
            for text in texts:
                result = await asyncio.to_thread(
                    self.genai.embed_content,
                    model=model_name or "models/embedding-001",
                    content=text,
                    task_type="retrieval_document"
                )
                embeddings.append(result['embedding'])

            return embeddings[0] if len(embeddings) == 1 else embeddings

        except Exception as e:
            logger.error(f"Google embedding error: {e}")
            raise


class OpenAICompatibleAdapter(OpenAIAdapter):
    """
    Adapter for OpenAI-compatible APIs
    Used for: Groq, DeepSeek, Mistral, OpenRouter, Together AI, etc.
    """

    def __init__(self, api_key: str, base_url: str, default_model: str = "gpt-3.5-turbo"):
        """
        Initialize OpenAI-compatible adapter

        Args:
            api_key: API key for the service
            base_url: Base URL for the API
            default_model: Default model name to use
        """
        super().__init__(api_key=api_key, base_url=base_url)
        self.default_model = default_model

    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        model_name: Optional[str] = None,
        **kwargs
    ) -> str:
        """Generate chat response using OpenAI-compatible API"""
        # Use provided model_name or default
        model = model_name or self.default_model

        return await super().chat(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            model_name=model,
            **kwargs
        )


# Provider to Adapter mapping
PROVIDER_ADAPTER_MAP = {
    "openai": OpenAIAdapter,
    "anthropic": AnthropicAdapter,
    "google": GoogleVertexAdapter,
    "groq": OpenAICompatibleAdapter,
    "deepseek": OpenAICompatibleAdapter,
    "mistral": OpenAICompatibleAdapter,
    "openrouter": OpenAICompatibleAdapter,
    "together": OpenAICompatibleAdapter,
    "perplexity": OpenAICompatibleAdapter,
    "fireworks": OpenAICompatibleAdapter,
    "anyscale": OpenAICompatibleAdapter,
    "replicate": OpenAICompatibleAdapter,
    "huggingface": OpenAICompatibleAdapter,
    "cohere": OpenAICompatibleAdapter,
    # Chinese providers (most are OpenAI-compatible)
    "qwen": OpenAICompatibleAdapter,
    "baichuan": OpenAICompatibleAdapter,
    "moonshot": OpenAICompatibleAdapter,
    "zhipu": OpenAICompatibleAdapter,
}


def create_user_llm_adapter(
    provider: str,
    api_key: str,
    base_url: Optional[str] = None,
    model: Optional[str] = None
) -> LLMAdapter:
    """
    Create an LLM adapter for user-provided API key

    Args:
        provider: Provider name (openai, anthropic, google, etc.)
        api_key: User's API key
        base_url: Optional custom base URL
        model: Optional default model

    Returns:
        LLMAdapter instance

    Raises:
        ValueError: If provider is not supported
    """
    if provider not in PROVIDER_ADAPTER_MAP:
        raise ValueError(f"Unsupported provider: {provider}. Supported: {list(PROVIDER_ADAPTER_MAP.keys())}")

    adapter_class = PROVIDER_ADAPTER_MAP[provider]

    # Handle different adapter types
    if adapter_class == OpenAICompatibleAdapter:
        return adapter_class(
            api_key=api_key,
            base_url=base_url or f"https://api.{provider}.com/v1",
            default_model=model or "gpt-3.5-turbo"
        )
    else:
        return adapter_class(api_key=api_key, base_url=base_url)
