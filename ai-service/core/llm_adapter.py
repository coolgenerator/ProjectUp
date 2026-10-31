"""
LLM Adapter for unified interface across different providers
"""

from typing import Dict, Any, List, Optional, Union, AsyncGenerator
import asyncio
from abc import ABC, abstractmethod

from config.settings import settings
from services.vertex_ai_service import vertex_ai_service


class LLMAdapter(ABC):
    """Abstract base class for LLM adapters"""
    
    @abstractmethod
    async def generate(
        self,
        prompt: str,
        **kwargs
    ) -> str:
        """Generate text from prompt"""
        pass
    
    @abstractmethod
    async def chat(
        self,
        messages: List[Dict[str, str]],
        **kwargs
    ) -> str:
        """Generate chat response"""
        pass
    
    @abstractmethod
    async def embed(
        self,
        texts: Union[str, List[str]]
    ) -> Union[List[float], List[List[float]]]:
        """Generate embeddings"""
        pass


class VertexAIAdapter(LLMAdapter):
    """Adapter for Google Vertex AI"""
    
    def __init__(self):
        self.service = vertex_ai_service
    
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        model_name: Optional[str] = None,
        **kwargs
    ) -> str:
        """Generate text using Vertex AI"""
        return await self.service.generate_text(
            prompt=prompt,
            system_prompt=system_prompt,
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
        """Generate chat response using Vertex AI"""
        return await self.service.generate_chat_response(
            messages=messages,
            temperature=temperature,
            model_name=model_name,
            **kwargs
        )
    
    async def embed(
        self,
        texts: Union[str, List[str]],
        model_name: Optional[str] = None
    ) -> Union[List[float], List[List[float]]]:
        """Generate embeddings using Vertex AI"""
        return await self.service.generate_embeddings(
            texts=texts,
            model_name=model_name
        )
    
    async def stream(
        self,
        prompt: str,
        model_name: Optional[str] = None,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Stream text generation"""
        async for chunk in self.service.generate_stream(
            prompt=prompt,
            model_name=model_name,
            **kwargs
        ):
            yield chunk
    
    async def analyze_image(
        self,
        image_data: bytes,
        prompt: str,
        model_name: Optional[str] = None
    ) -> str:
        """Analyze image using Vertex AI"""
        return await self.service.analyze_image(
            image_data=image_data,
            prompt=prompt,
            model_name=model_name
        )
    
    async def function_call(
        self,
        prompt: str,
        functions: List[Dict[str, Any]],
        model_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Execute function calling"""
        return await self.service.function_calling(
            prompt=prompt,
            functions=functions,
            model_name=model_name
        )

    async def chat_with_tools(
        self,
        messages: List[Dict[str, str]],
        tools: List[Dict[str, Any]],
        model_name: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Generate chat response with function calling tools"""
        return await self.service.chat_with_tools(
            messages=messages,
            tools=tools,
            model_name=model_name,
            **kwargs
        )


class LLMFactory:
    """Factory for creating LLM adapters"""

    _adapters = {
        "vertex_ai": VertexAIAdapter,
    }

    @classmethod
    def create(
        cls,
        provider: Optional[str] = None,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        user_context: Optional[Any] = None
    ) -> LLMAdapter:
        """
        Create an LLM adapter based on provider

        Args:
            provider: LLM provider name (vertex_ai, openai, anthropic, etc.)
            api_key: Optional user-provided API key (for free tier users)
            base_url: Optional custom base URL
            model: Optional preferred model
            user_context: Optional UserContext object with user credentials

        Returns:
            LLMAdapter instance

        Raises:
            ValueError: If provider is not supported
        """
        # Extract info from user_context if provided
        if user_context:
            provider = provider or user_context.provider or settings.default_llm_provider
            api_key = api_key or user_context.api_key
            base_url = base_url or user_context.base_url
            model = model or user_context.model
        else:
            provider = provider or settings.default_llm_provider

        # If user provided API key, use multi-provider adapter
        if api_key and provider != "vertex_ai":
            from core.multi_provider_adapters import create_user_llm_adapter
            return create_user_llm_adapter(
                provider=provider,
                api_key=api_key,
                base_url=base_url,
                model=model
            )

        # Otherwise use service credentials (default)
        if provider not in cls._adapters:
            raise ValueError(f"Unsupported LLM provider: {provider}")

        adapter_class = cls._adapters[provider]
        return adapter_class()

    @classmethod
    def register_adapter(cls, provider: str, adapter_class: type):
        """Register a new adapter"""
        cls._adapters[provider] = adapter_class


# Convenience functions for direct usage

async def generate_text(
    prompt: str,
    provider: Optional[str] = None,
    user_context: Optional[Any] = None,
    **kwargs
) -> str:
    """
    Generate text using configured LLM provider

    Args:
        prompt: Text prompt
        provider: Optional provider name
        user_context: Optional UserContext with user credentials
        **kwargs: Additional arguments for generation

    Returns:
        Generated text
    """
    adapter = LLMFactory.create(provider=provider, user_context=user_context)
    return await adapter.generate(prompt, **kwargs)


async def generate_chat(
    messages: List[Dict[str, str]],
    provider: Optional[str] = None,
    user_context: Optional[Any] = None,
    **kwargs
) -> str:
    """
    Generate chat response using configured LLM provider

    Args:
        messages: Chat messages
        provider: Optional provider name
        user_context: Optional UserContext with user credentials
        **kwargs: Additional arguments for chat

    Returns:
        Chat response
    """
    adapter = LLMFactory.create(provider=provider, user_context=user_context)
    return await adapter.chat(messages, **kwargs)


async def generate_embeddings(
    texts: Union[str, List[str]],
    provider: Optional[str] = None,
    **kwargs
) -> Union[List[float], List[List[float]]]:
    """Generate embeddings using configured LLM provider"""
    adapter = LLMFactory.create(provider)
    return await adapter.embed(texts, **kwargs)


async def stream_text(
    prompt: str,
    provider: Optional[str] = None,
    **kwargs
) -> AsyncGenerator[str, None]:
    """Stream text generation using configured LLM provider"""
    adapter = LLMFactory.create(provider)

    if hasattr(adapter, 'stream'):
        async for chunk in adapter.stream(prompt, **kwargs):
            yield chunk
    else:
        # Fallback to non-streaming
        result = await adapter.generate(prompt, **kwargs)
        yield result


async def generate_chat_with_tools(
    messages: List[Dict[str, str]],
    tools: List[Dict[str, Any]],
    provider: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Generate chat response with function calling tools"""
    adapter = LLMFactory.create(provider)

    if hasattr(adapter, 'chat_with_tools'):
        return await adapter.chat_with_tools(messages, tools, **kwargs)
    else:
        # Fallback to regular chat if tools not supported
        response = await adapter.chat(messages, **kwargs)
        return {
            "message": response,
            "tool_calls": []
        }


# Utility class for managing LLM interactions
class LLMManager:
    """Manager for LLM operations with caching and retry logic"""
    
    def __init__(self, provider: Optional[str] = None):
        self.adapter = LLMFactory.create(provider)
        self.cache = {}
        self.max_retries = settings.max_retries
    
    async def generate_with_retry(
        self,
        prompt: str,
        **kwargs
    ) -> str:
        """Generate text with retry logic"""
        last_error = None
        
        for attempt in range(self.max_retries):
            try:
                return await self.adapter.generate(prompt, **kwargs)
            except Exception as e:
                last_error = e
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
        
        raise last_error
    
    async def chat_with_context(
        self,
        messages: List[Dict[str, str]],
        context: Optional[str] = None,
        **kwargs
    ) -> str:
        """Generate chat response with additional context"""
        if context:
            # Prepend context as system message
            messages_with_context = [
                {"role": "system", "content": context},
                *messages
            ]
        else:
            messages_with_context = messages
        
        return await self.adapter.chat(messages_with_context, **kwargs)
    
    async def batch_generate(
        self,
        prompts: List[str],
        **kwargs
    ) -> List[str]:
        """Generate responses for multiple prompts"""
        tasks = [
            self.generate_with_retry(prompt, **kwargs)
            for prompt in prompts
        ]
        return await asyncio.gather(*tasks)
    
    def clear_cache(self):
        """Clear the cache"""
        self.cache.clear()


# Default LLM manager instance
default_llm_manager = LLMManager()


def get_llm_adapter(provider: Optional[str] = None) -> LLMAdapter:
    """
    Get an LLM adapter instance.

    Args:
        provider: Optional LLM provider name. Defaults to settings.default_llm_provider

    Returns:
        LLMAdapter instance
    """
    return LLMFactory.create(provider)