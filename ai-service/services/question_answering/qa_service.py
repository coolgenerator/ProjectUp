"""
Question Answering Service for handling various types of questions with different prompts.
"""

import asyncio
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime
import json
import logging

from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.documents import Document

# Simple conversation memory replacement (ConversationBufferMemory is deprecated)
class ConversationBufferMemory:
    """Simple conversation buffer memory"""
    def __init__(self, memory_key: str = "history", return_messages: bool = True):
        self.memory_key = memory_key
        self.return_messages = return_messages
        self.messages = []

    def save_context(self, inputs: Dict, outputs: Dict):
        """Save conversation context"""
        if "input" in inputs:
            self.messages.append(HumanMessage(content=inputs["input"]))
        if "output" in outputs:
            self.messages.append(AIMessage(content=outputs["output"]))

    def load_memory_variables(self, inputs: Dict) -> Dict:
        """Load memory variables"""
        return {self.memory_key: self.messages}

    def clear(self):
        """Clear memory"""
        self.messages = []

from .prompts import QAPrompts, PromptType
from core.llm_adapter import LLMFactory
from config.settings import settings

logger = logging.getLogger(__name__)


class QuestionAnsweringService:
    """Service for handling question answering with various prompt strategies."""
    
    def __init__(self):
        """Initialize the QA service."""
        self.prompts = QAPrompts()
        self.conversations: Dict[str, ConversationBufferMemory] = {}
        
    def _get_or_create_memory(self, session_id: str) -> ConversationBufferMemory:
        """Get or create conversation memory for a session.
        
        Args:
            session_id: Session identifier
            
        Returns:
            ConversationBufferMemory instance
        """
        if session_id not in self.conversations:
            self.conversations[session_id] = ConversationBufferMemory(
                memory_key="chat_history",
                return_messages=True
            )
        return self.conversations[session_id]
    
    def _get_llm_client(
        self, 
        provider: str = "openai", 
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000
    ):
        """Get LLM client based on provider.
        
        Args:
            provider: LLM provider name
            model: Model name (optional)
            temperature: Temperature for generation
            max_tokens: Maximum tokens for response
            
        Returns:
            LLM client instance
        """
        try:
            if provider == "vertex_ai":
                # For Vertex AI, we'll return None and handle it specially
                # since it doesn't have a LangChain integration that works with ainvoke
                return None
            elif provider == "openai":
                return ChatOpenAI(
                    model=model or "gpt-4",
                    temperature=temperature,
                    max_tokens=max_tokens
                )
            elif provider == "google":
                return ChatGoogleGenerativeAI(
                    model=model or "gemini-pro",
                    temperature=temperature,
                    max_output_tokens=max_tokens
                )
            elif provider == "anthropic":
                return ChatAnthropic(
                    model=model or "claude-3-opus-20240229",
                    temperature=temperature,
                    max_tokens=max_tokens
                )
            else:
                # Default to checking settings for default provider
                if settings.default_llm_provider == "vertex_ai":
                    return None  # Handle Vertex AI specially
                else:
                    return ChatOpenAI(
                        model=model or "gpt-4",
                        temperature=temperature,
                        max_tokens=max_tokens
                    )
        except Exception as e:
            logger.warning(f"Failed to get LLM client for {provider}: {e}")
            # Check if we should use Vertex AI as fallback
            if settings.default_llm_provider == "vertex_ai":
                return None
            # Default to OpenAI
            return ChatOpenAI(
                model=model or "gpt-4",
                temperature=temperature,
                max_tokens=max_tokens
            )
    
    async def answer_question(
        self,
        question: str,
        prompt_type: PromptType = PromptType.GENERAL,
        context: Optional[str] = None,
        documents: Optional[List[Document]] = None,
        session_id: Optional[str] = None,
        use_memory: bool = False,
        provider: str = "openai",
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        custom_prompt: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Answer a question using specified prompt type and context.
        
        Args:
            question: The question to answer
            prompt_type: Type of prompt to use
            context: Optional context for the question
            documents: Optional documents for retrieval-based QA
            session_id: Session ID for conversation memory
            use_memory: Whether to use conversation memory
            provider: LLM provider
            model: Model name
            temperature: Temperature for generation
            max_tokens: Maximum tokens
            custom_prompt: Optional custom prompt template
            **kwargs: Additional parameters for prompt formatting
            
        Returns:
            Dictionary containing answer and metadata
        """
        try:
            # Get LLM client
            # Check if we should use Vertex AI based on config
            if provider == "openai" and settings.default_llm_provider == "vertex_ai":
                provider = "vertex_ai"
            
            llm = self._get_llm_client(provider, model, temperature, max_tokens)
            
            # Get or build prompt
            if custom_prompt:
                prompt_template = custom_prompt
            else:
                prompt_template = self.prompts.get_prompt(prompt_type)
            
            # Prepare prompt variables
            prompt_vars = {
                "question": question,
                **kwargs
            }
            
            # Add context if provided
            if context:
                prompt_vars["context"] = context
            
            # Add documents if provided
            if documents:
                # Format documents for context
                doc_context = "\n\n".join([
                    f"Document {i+1}:\n{doc.page_content}"
                    for i, doc in enumerate(documents)
                ])
                prompt_vars["documents"] = doc_context
            
            # Handle conversation memory if enabled
            messages = []
            if use_memory and session_id:
                memory = self._get_or_create_memory(session_id)
                # Get chat history
                chat_history = memory.chat_memory.messages
                messages.extend(chat_history)
            
            # Create the prompt
            if prompt_type == PromptType.CONVERSATIONAL or use_memory:
                # For conversational mode, use chat prompt template
                prompt = ChatPromptTemplate.from_messages([
                    ("system", prompt_template),
                    MessagesPlaceholder(variable_name="chat_history", optional=True),
                    ("human", "{question}")
                ])
                
                # Format the prompt
                formatted_prompt = prompt.format_messages(
                    chat_history=messages if use_memory else [],
                    **prompt_vars
                )
            else:
                # For non-conversational mode, use simple prompt
                system_message = SystemMessage(content=prompt_template.format(**prompt_vars))
                human_message = HumanMessage(content=question)
                formatted_prompt = [system_message, human_message]
            
            # Get response from LLM
            if llm is None or (provider == "vertex_ai" or settings.default_llm_provider == "vertex_ai"):
                # Use Vertex AI adapter directly
                llm_adapter = LLMFactory.create("vertex_ai")
                
                # Convert messages to the format expected by Vertex AI
                if isinstance(formatted_prompt, list):
                    # Extract the main content from messages
                    prompt_text = ""
                    for msg in formatted_prompt:
                        if hasattr(msg, 'content'):
                            prompt_text += msg.content + "\n\n"
                        else:
                            prompt_text += str(msg) + "\n\n"
                else:
                    prompt_text = str(formatted_prompt)
                
                # Use Vertex AI to generate response
                answer = await llm_adapter.generate(
                    prompt=prompt_text,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    model_name=model or settings.default_llm_model
                )
                response = type('Response', (), {'content': answer})()
            else:
                response = await llm.ainvoke(formatted_prompt)
            
            # Extract answer
            if hasattr(response, 'content'):
                answer = response.content
            else:
                answer = str(response)
            
            # Store in memory if enabled
            if use_memory and session_id:
                memory.chat_memory.add_user_message(question)
                memory.chat_memory.add_ai_message(answer)
            
            # Build response
            result = {
                "answer": answer,
                "question": question,
                "prompt_type": prompt_type.value,
                "session_id": session_id,
                "timestamp": datetime.utcnow().isoformat(),
                "metadata": {
                    "provider": provider,
                    "model": model or "default",
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "used_memory": use_memory,
                    "has_context": context is not None,
                    "has_documents": documents is not None,
                    "document_count": len(documents) if documents else 0
                }
            }
            
            # Add confidence score for certain prompt types
            if prompt_type in [PromptType.FACTUAL, PromptType.ANALYTICAL]:
                # Simple confidence estimation based on response characteristics
                confidence = self._estimate_confidence(answer, question)
                result["confidence"] = confidence
            
            return result
            
        except Exception as e:
            logger.error(f"Error answering question: {e}")
            return {
                "error": str(e),
                "question": question,
                "prompt_type": prompt_type.value,
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def answer_batch(
        self,
        questions: List[Dict[str, Any]],
        **default_params
    ) -> List[Dict[str, Any]]:
        """Answer multiple questions in batch.
        
        Args:
            questions: List of question dictionaries with parameters
            **default_params: Default parameters for all questions
            
        Returns:
            List of answer dictionaries
        """
        tasks = []
        for q_data in questions:
            # Merge default params with question-specific params
            params = {**default_params, **q_data}
            question = params.pop("question")
            
            # Create async task
            task = self.answer_question(question, **params)
            tasks.append(task)
        
        # Execute all tasks concurrently
        results = await asyncio.gather(*tasks)
        return results
    
    async def answer_with_sources(
        self,
        question: str,
        sources: List[Dict[str, str]],
        prompt_type: PromptType = PromptType.RETRIEVAL,
        **kwargs
    ) -> Dict[str, Any]:
        """Answer question using provided sources.
        
        Args:
            question: The question to answer
            sources: List of source dictionaries with 'content' and optional 'metadata'
            prompt_type: Prompt type to use
            **kwargs: Additional parameters
            
        Returns:
            Answer dictionary with sources cited
        """
        # Convert sources to documents
        documents = [
            Document(
                page_content=source.get("content", ""),
                metadata=source.get("metadata", {})
            )
            for source in sources
        ]
        
        # Answer with documents
        result = await self.answer_question(
            question=question,
            prompt_type=prompt_type,
            documents=documents,
            **kwargs
        )
        
        # Add source citations
        if "answer" in result:
            result["sources"] = sources
            result["metadata"]["source_count"] = len(sources)
        
        return result
    
    async def answer_comparative(
        self,
        question: str,
        options: List[str],
        criteria: Optional[List[str]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Answer comparative question analyzing multiple options.
        
        Args:
            question: The comparative question
            options: List of options to compare
            criteria: Optional comparison criteria
            **kwargs: Additional parameters
            
        Returns:
            Comparative analysis result
        """
        # Format options and criteria for prompt
        options_text = "\n".join([f"{i+1}. {opt}" for i, opt in enumerate(options)])
        
        if criteria:
            criteria_text = "\n".join([f"- {c}" for c in criteria])
            context = f"Options to compare:\n{options_text}\n\nComparison criteria:\n{criteria_text}"
        else:
            context = f"Options to compare:\n{options_text}"
        
        # Use comparative prompt type
        result = await self.answer_question(
            question=question,
            prompt_type=PromptType.COMPARATIVE,
            context=context,
            options=options,
            criteria=criteria,
            **kwargs
        )
        
        # Add structured comparison data
        if "answer" in result:
            result["comparison"] = {
                "options": options,
                "criteria": criteria or [],
                "option_count": len(options)
            }
        
        return result
    
    def _estimate_confidence(self, answer: str, question: str) -> float:
        """Estimate confidence score for an answer.
        
        Args:
            answer: The generated answer
            question: The original question
            
        Returns:
            Confidence score between 0 and 1
        """
        # Simple heuristic-based confidence estimation
        confidence = 0.5  # Base confidence
        
        # Check for uncertainty indicators
        uncertainty_phrases = [
            "i'm not sure", "i don't know", "uncertain", "possibly",
            "maybe", "might be", "could be", "it depends", "approximately"
        ]
        
        answer_lower = answer.lower()
        for phrase in uncertainty_phrases:
            if phrase in answer_lower:
                confidence -= 0.1
        
        # Check for confidence indicators
        confidence_phrases = [
            "definitely", "certainly", "absolutely", "clearly",
            "obviously", "without doubt", "it is", "the answer is"
        ]
        
        for phrase in confidence_phrases:
            if phrase in answer_lower:
                confidence += 0.1
        
        # Check answer length (longer, detailed answers often more confident)
        if len(answer.split()) > 50:
            confidence += 0.1
        
        # Clamp between 0 and 1
        return max(0.0, min(1.0, confidence))
    
    def clear_session_memory(self, session_id: str) -> bool:
        """Clear conversation memory for a session.
        
        Args:
            session_id: Session identifier
            
        Returns:
            True if cleared, False if session not found
        """
        if session_id in self.conversations:
            del self.conversations[session_id]
            return True
        return False
    
    def get_session_history(self, session_id: str) -> List[Dict[str, str]]:
        """Get conversation history for a session.
        
        Args:
            session_id: Session identifier
            
        Returns:
            List of message dictionaries
        """
        if session_id not in self.conversations:
            return []
        
        memory = self.conversations[session_id]
        messages = memory.chat_memory.messages
        
        history = []
        for msg in messages:
            if isinstance(msg, HumanMessage):
                history.append({"role": "user", "content": msg.content})
            elif isinstance(msg, AIMessage):
                history.append({"role": "assistant", "content": msg.content})
        
        return history