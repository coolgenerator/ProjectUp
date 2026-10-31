"""
Google Vertex AI service wrapper for LLM operations
"""

import os
import json
import asyncio
from typing import Dict, Any, List, Optional, Union, AsyncGenerator
import logging
from datetime import datetime

import vertexai
from vertexai.generative_models import (
    GenerativeModel,
    Content,
    Part,
    FunctionDeclaration,
    Tool,
    GenerationConfig,
    HarmCategory,
    HarmBlockThreshold
)
from vertexai.language_models import TextEmbeddingModel
from google.cloud import aiplatform
from google.oauth2 import service_account

from services.core.base_service import BaseService
from config.settings import settings


class VertexAIService(BaseService):
    """Service wrapper for Google Vertex AI operations"""
    
    def __init__(self):
        """Initialize Vertex AI service"""
        super().__init__()
        # Use settings for Vertex AI configuration
        self.config = settings
        self.models: Dict[str, GenerativeModel] = {}
        self.embedding_model: Optional[TextEmbeddingModel] = None
        self._initialize_vertex_ai()
    
    def _initialize(self):
        """Initialize service-specific resources"""
        self.log_info("Vertex AI service initialized")
    
    def _initialize_vertex_ai(self):
        """Initialize Vertex AI with credentials"""
        try:
            # Get credentials from river-sonar service account file
            credentials = None
            service_account_path = os.path.join(
                os.path.dirname(os.path.dirname(__file__)),
                "config", "river-sonar", "service_account.json"
            )
            
            if os.path.exists(service_account_path):
                try:
                    credentials = service_account.Credentials.from_service_account_file(
                        service_account_path
                    )
                except Exception as e:
                    self.log_warning(f"Could not load service account from {service_account_path}: {e}")
            
            # Fallback to environment variable
            if not credentials and os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
                credentials = service_account.Credentials.from_service_account_file(
                    os.environ["GOOGLE_APPLICATION_CREDENTIALS"]
                )
            
            # Initialize Vertex AI with project
            vertexai.init(
                project=self.config.gcp_project_id or "project-up66",  # Use project_id from config
                location=self.config.gcp_location or "us-central1",    # Use location from config
                credentials=credentials
            )
            
            # Initialize AI Platform
            aiplatform.init(
                project=self.config.gcp_project_id or "project-up66",
                location=self.config.gcp_location or "us-central1",
                credentials=credentials
            )
            
            self.log_info(
                f"Vertex AI initialized for project: {self.config.gcp_project_id or 'project-up66'}",
                location=self.config.gcp_location or "us-central1"
            )
            
        except Exception as e:
            self.log_error("Failed to initialize Vertex AI", error=e)
            raise
    
    def get_model(self, model_name: Optional[str] = None, use_case: Optional[str] = None) -> GenerativeModel:
        """Get or create a GenerativeModel instance"""
        # Use settings to get appropriate model for use case
        if use_case:
            model_name = self.config.default_llm_model or "gemini-2.5-pro"
        else:
            model_name = model_name or self.config.default_llm_model or "gemini-2.5-pro"
        
        if model_name not in self.models:
            generation_config = GenerationConfig(
                temperature=0.7,
                max_output_tokens=8192,
                top_p=0.95,
                top_k=40
            )
            
            safety_settings = self._get_safety_settings()
            
            self.models[model_name] = GenerativeModel(
                model_name=model_name,
                generation_config=generation_config,
                safety_settings=safety_settings
            )
            
            self.log_debug(f"Created model instance: {model_name}")
        
        return self.models[model_name]
    
    def get_embedding_model(self) -> TextEmbeddingModel:
        """Get or create an embedding model instance"""
        if not self.embedding_model:
            # Get embedding model from settings
            embedding_model_name = "textembedding-gecko@001"
            self.embedding_model = TextEmbeddingModel.from_pretrained(
                embedding_model_name
            )
            self.log_debug(f"Created embedding model: {embedding_model_name}")
        
        return self.embedding_model
    
    async def generate_text(
        self,
        prompt: str,
        model_name: Optional[str] = None,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        max_output_tokens: Optional[int] = None,  # Accept both parameter names for compatibility
        **kwargs
    ) -> str:
        """Generate text using Vertex AI"""
        try:
            model = self.get_model(model_name)

            # Use max_output_tokens if provided, otherwise fall back to max_tokens
            # This ensures compatibility with both parameter naming conventions
            final_max_tokens = max_output_tokens or max_tokens or 8192

            # Build generation config
            generation_config = GenerationConfig(
                temperature=temperature or 0.7,
                max_output_tokens=final_max_tokens,
                top_p=kwargs.get('top_p', self.config.top_p),
                top_k=kwargs.get('top_k', self.config.top_k)
            )
            
            # Build content
            contents = []
            if system_prompt:
                contents.append(Content(
                    role="user",
                    parts=[Part.from_text(system_prompt)]
                ))
            
            contents.append(Content(
                role="user",
                parts=[Part.from_text(prompt)]
            ))
            
            # Generate response
            response = await asyncio.to_thread(
                model.generate_content,
                contents=contents,
                generation_config=generation_config
            )
            
            # Check if we have a valid response
            if response and response.candidates:
                candidate = response.candidates[0]
                # Check if the response was cut off due to MAX_TOKENS
                if hasattr(candidate, 'finish_reason') and str(candidate.finish_reason) == "FinishReason.MAX_TOKENS":
                    self.log_warning(
                        f"⚠️ Response truncated due to MAX_TOKENS limit ({final_max_tokens}). "
                        "This may result in incomplete data. Consider increasing max_tokens or using a more capable model.",
                        model=model_name or "default"
                    )
                    # Try to extract partial content if available
                    if candidate.content and candidate.content.parts:
                        partial_text = ""
                        for part in candidate.content.parts:
                            if hasattr(part, 'text'):
                                partial_text += part.text
                        if partial_text:
                            self.log_info(
                                f"Returning partial response ({len(partial_text)} chars) due to token limit"
                            )
                            return partial_text
                    # No content available, raise error with explanation
                    raise ValueError(
                        f"Response exceeded max token limit ({final_max_tokens}). "
                        f"Please increase max_tokens parameter or use a model with higher output capacity."
                    )
                
                # Normal case - return the text
                try:
                    return response.text
                except Exception:
                    # Fallback to extracting from candidate
                    if candidate.content and candidate.content.parts:
                        text = ""
                        for part in candidate.content.parts:
                            if hasattr(part, 'text'):
                                text += part.text
                        return text
            
            # Fallback if no valid response
            return ""
            
        except Exception as e:
            self.log_error("Failed to generate text", error=e)
            raise
    
    async def generate_chat_response(
        self,
        messages: List[Dict[str, str]],
        model_name: Optional[str] = None,
        temperature: Optional[float] = None,
        **kwargs
    ) -> str:
        """Generate chat response using Vertex AI"""
        try:
            model = self.get_model(model_name)
            
            # Convert messages to Vertex AI format
            contents = self._convert_messages_to_contents(messages)
            
            # Build generation config
            generation_config = GenerationConfig(
                temperature=temperature or 0.7,
                max_output_tokens=kwargs.get('max_tokens', self.config.VERTEX_MAX_TOKENS),
                top_p=kwargs.get('top_p', self.config.top_p),
                top_k=kwargs.get('top_k', self.config.top_k)
            )
            
            # Generate response
            response = await asyncio.to_thread(
                model.generate_content,
                contents=contents,
                generation_config=generation_config
            )
            
            return response.text
            
        except Exception as e:
            self.log_error("Failed to generate chat response", error=e)
            raise
    
    async def generate_stream(
        self,
        prompt: str,
        model_name: Optional[str] = None,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Generate streaming text response"""
        try:
            model = self.get_model(model_name)
            
            generation_config = GenerationConfig(
                temperature=kwargs.get('temperature', self.config.VERTEX_TEMPERATURE),
                max_output_tokens=kwargs.get('max_tokens', self.config.VERTEX_MAX_TOKENS),
                top_p=kwargs.get('top_p', self.config.top_p),
                top_k=kwargs.get('top_k', self.config.top_k)
            )
            
            response_stream = await asyncio.to_thread(
                model.generate_content,
                contents=[Content(role="user", parts=[Part.from_text(prompt)])],
                generation_config=generation_config,
                stream=True
            )
            
            for chunk in response_stream:
                if chunk.text:
                    yield chunk.text
                    
        except Exception as e:
            self.log_error("Failed to generate streaming response", error=e)
            raise
    
    async def generate_embeddings(
        self,
        texts: Union[str, List[str]],
        model_name: Optional[str] = None
    ) -> Union[List[float], List[List[float]]]:
        """Generate embeddings for text(s)"""
        try:
            model = self.get_embedding_model()
            
            # Ensure texts is a list
            if isinstance(texts, str):
                texts = [texts]
                single_text = True
            else:
                single_text = False
            
            # Generate embeddings
            embeddings = await asyncio.to_thread(
                model.get_embeddings,
                texts
            )
            
            # Extract embedding values
            embedding_values = [emb.values for emb in embeddings]
            
            # Return single embedding if input was single text
            if single_text:
                return embedding_values[0]
            
            return embedding_values
            
        except Exception as e:
            self.log_error("Failed to generate embeddings", error=e)
            raise
    
    async def analyze_image(
        self,
        image_data: bytes,
        prompt: str,
        model_name: Optional[str] = None
    ) -> str:
        """Analyze an image using Vertex AI"""
        try:
            model_name = model_name or "gemini-1.5-flash"
            
            # Check if model supports vision
            if not VertexAIModelConfig.is_multimodal(model_name):
                raise ValueError(f"Model {model_name} does not support image analysis")
            
            model = self.get_model(model_name)
            
            # Create content with image and text
            image_part = Part.from_data(data=image_data, mime_type="image/jpeg")
            text_part = Part.from_text(prompt)
            
            content = Content(
                role="user",
                parts=[image_part, text_part]
            )
            
            # Generate response
            response = await asyncio.to_thread(
                model.generate_content,
                contents=[content]
            )
            
            return response.text
            
        except Exception as e:
            self.log_error("Failed to analyze image", error=e)
            raise
    
    async def function_calling(
        self,
        prompt: str,
        functions: List[Dict[str, Any]],
        model_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Execute function calling with Vertex AI"""
        try:
            model_name = model_name or self.config.vertex_ai_model
            
            # Check if model supports function calling
            if not VertexAIModelConfig.supports_function_calling(model_name):
                raise ValueError(f"Model {model_name} does not support function calling")
            
            # Convert functions to Vertex AI format
            function_declarations = self._convert_to_function_declarations(functions)
            tool = Tool(function_declarations=function_declarations)
            
            # Create model with tools
            model = GenerativeModel(
                model_name=model_name,
                generation_config=self.config.get_generation_config(),
                safety_settings=self._get_safety_settings(),
                tools=[tool]
            )
            
            # Generate response with function calling
            response = await asyncio.to_thread(
                model.generate_content,
                contents=[Content(role="user", parts=[Part.from_text(prompt)])]
            )
            
            # Extract function call if present
            if response.candidates[0].content.parts:
                for part in response.candidates[0].content.parts:
                    if part.function_call:
                        return {
                            "function_name": part.function_call.name,
                            "arguments": dict(part.function_call.args)
                        }
            
            return {"text": response.text}
            
        except Exception as e:
            self.log_error("Failed to execute function calling", error=e)
            raise
    
    def _convert_messages_to_contents(self, messages: List[Dict[str, str]]) -> List[Content]:
        """Convert chat messages to Vertex AI Content format"""
        contents = []
        
        for message in messages:
            role = message.get("role", "user")
            content = message.get("content", "")
            
            # Map roles (Vertex AI uses "user" and "model")
            if role in ["assistant", "system"]:
                role = "model"
            elif role != "user":
                role = "user"
            
            contents.append(Content(
                role=role,
                parts=[Part.from_text(content)]
            ))
        
        return contents
    
    def _convert_to_function_declarations(
        self, 
        functions: List[Dict[str, Any]]
    ) -> List[FunctionDeclaration]:
        """Convert function definitions to Vertex AI format"""
        declarations = []
        
        for func in functions:
            declaration = FunctionDeclaration(
                name=func["name"],
                description=func.get("description", ""),
                parameters=func.get("parameters", {})
            )
            declarations.append(declaration)
        
        return declarations
    
    def _get_safety_settings(self) -> Dict[HarmCategory, HarmBlockThreshold]:
        """Get safety settings for the model"""
        # Default safety settings - can be overridden if needed
        # Use moderate safety settings by default
        threshold = HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
        
        return {
            HarmCategory.HARM_CATEGORY_HATE_SPEECH: threshold,
            HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: threshold,
            HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: threshold,
            HarmCategory.HARM_CATEGORY_HARASSMENT: threshold
        }
    
    async def count_tokens(
        self,
        text: str,
        model_name: Optional[str] = None
    ) -> int:
        """Count tokens in text"""
        try:
            model = self.get_model(model_name)
            
            response = await asyncio.to_thread(
                model.count_tokens,
                contents=[Content(role="user", parts=[Part.from_text(text)])]
            )
            
            return response.total_tokens
            
        except Exception as e:
            self.log_error("Failed to count tokens", error=e)
            raise
    
    async def batch_generate(
        self,
        prompts: List[str],
        model_name: Optional[str] = None,
        **kwargs
    ) -> List[str]:
        """Generate responses for multiple prompts in batch"""
        try:
            tasks = [
                self.generate_text(prompt, model_name, **kwargs)
                for prompt in prompts
            ]
            
            responses = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Handle any exceptions in responses
            results = []
            for i, response in enumerate(responses):
                if isinstance(response, Exception):
                    self.log_error(f"Failed to generate response for prompt {i}", error=response)
                    results.append("")
                else:
                    results.append(response)
            
            return results
            
        except Exception as e:
            self.log_error("Failed to batch generate", error=e)
            raise


# Create singleton instance
vertex_ai_service = VertexAIService()