"""
Schema definitions for Question Answering service.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class PromptType(str, Enum):
    """Enumeration of available prompt types."""
    GENERAL = "general"
    FACTUAL = "factual"
    ANALYTICAL = "analytical"
    CREATIVE = "creative"
    TECHNICAL = "technical"
    CONVERSATIONAL = "conversational"
    RETRIEVAL = "retrieval"
    COMPARATIVE = "comparative"
    SUMMARIZATION = "summarization"
    EXPLANATION = "explanation"
    STEP_BY_STEP = "step_by_step"
    CODING = "coding"
    MATHEMATICAL = "mathematical"
    SCIENTIFIC = "scientific"
    PHILOSOPHICAL = "philosophical"
    EDUCATIONAL = "educational"
    PROFESSIONAL = "professional"
    CASUAL = "casual"
    CRITICAL_THINKING = "critical_thinking"
    PROBLEM_SOLVING = "problem_solving"


class LLMProvider(str, Enum):
    """Supported LLM providers."""
    OPENAI = "openai"
    GOOGLE = "google"
    ANTHROPIC = "anthropic"
    COHERE = "cohere"
    HUGGINGFACE = "huggingface"


class SourceDocument(BaseModel):
    """Schema for source documents."""
    content: str = Field(..., description="Document content")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Document metadata")
    source: Optional[str] = Field(default=None, description="Document source identifier")
    relevance_score: Optional[float] = Field(default=None, description="Relevance score if available")


class QuestionRequest(BaseModel):
    """Request schema for answering a single question."""
    question: str = Field(..., description="The question to answer")
    prompt_type: PromptType = Field(default=PromptType.GENERAL, description="Type of prompt to use")
    context: Optional[str] = Field(default=None, description="Additional context for the question")
    documents: Optional[List[SourceDocument]] = Field(default=None, description="Source documents for retrieval QA")
    session_id: Optional[str] = Field(default=None, description="Session ID for conversation memory")
    use_memory: bool = Field(default=False, description="Whether to use conversation memory")
    provider: LLMProvider = Field(default=LLMProvider.OPENAI, description="LLM provider to use")
    model: Optional[str] = Field(default=None, description="Specific model to use")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0, description="Temperature for generation")
    max_tokens: int = Field(default=2000, ge=1, le=8000, description="Maximum tokens for response")
    custom_prompt: Optional[str] = Field(default=None, description="Custom prompt template")
    stream: bool = Field(default=False, description="Whether to stream the response")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional metadata")


class BatchQuestionItem(BaseModel):
    """Schema for a single question in batch processing."""
    question: str = Field(..., description="The question to answer")
    prompt_type: Optional[PromptType] = Field(default=None, description="Type of prompt to use")
    context: Optional[str] = Field(default=None, description="Additional context")
    documents: Optional[List[SourceDocument]] = Field(default=None, description="Source documents")
    custom_prompt: Optional[str] = Field(default=None, description="Custom prompt template")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Question-specific metadata")


class BatchQuestionRequest(BaseModel):
    """Request schema for answering multiple questions."""
    questions: List[BatchQuestionItem] = Field(..., description="List of questions to answer")
    session_id: Optional[str] = Field(default=None, description="Session ID for all questions")
    use_memory: bool = Field(default=False, description="Whether to use conversation memory")
    provider: LLMProvider = Field(default=LLMProvider.OPENAI, description="LLM provider to use")
    model: Optional[str] = Field(default=None, description="Specific model to use")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0, description="Temperature for generation")
    max_tokens: int = Field(default=2000, ge=1, le=8000, description="Maximum tokens per response")
    parallel: bool = Field(default=True, description="Process questions in parallel")


class ComparativeQuestionRequest(BaseModel):
    """Request schema for comparative questions."""
    question: str = Field(..., description="The comparative question")
    options: List[str] = Field(..., min_items=2, description="Options to compare")
    criteria: Optional[List[str]] = Field(default=None, description="Comparison criteria")
    session_id: Optional[str] = Field(default=None, description="Session ID")
    provider: LLMProvider = Field(default=LLMProvider.OPENAI, description="LLM provider")
    model: Optional[str] = Field(default=None, description="Specific model")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=3000, ge=1, le=8000)


class SourcedQuestionRequest(BaseModel):
    """Request schema for questions with sources."""
    question: str = Field(..., description="The question to answer")
    sources: List[SourceDocument] = Field(..., min_items=1, description="Source documents")
    prompt_type: PromptType = Field(default=PromptType.RETRIEVAL, description="Prompt type")
    session_id: Optional[str] = Field(default=None, description="Session ID")
    use_memory: bool = Field(default=False, description="Use conversation memory")
    provider: LLMProvider = Field(default=LLMProvider.OPENAI, description="LLM provider")
    model: Optional[str] = Field(default=None, description="Specific model")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=2000, ge=1, le=8000)
    cite_sources: bool = Field(default=True, description="Include source citations")


class QuestionResponse(BaseModel):
    """Response schema for answered questions."""
    answer: str = Field(..., description="The generated answer")
    question: str = Field(..., description="The original question")
    prompt_type: str = Field(..., description="Prompt type used")
    session_id: Optional[str] = Field(default=None, description="Session ID if provided")
    timestamp: str = Field(..., description="Response timestamp")
    confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0, description="Confidence score")
    sources: Optional[List[SourceDocument]] = Field(default=None, description="Source documents used")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Response metadata")
    error: Optional[str] = Field(default=None, description="Error message if failed")


class BatchQuestionResponse(BaseModel):
    """Response schema for batch questions."""
    results: List[QuestionResponse] = Field(..., description="List of answers")
    total_questions: int = Field(..., description="Total number of questions")
    successful: int = Field(..., description="Number of successful answers")
    failed: int = Field(..., description="Number of failed answers")
    processing_time: float = Field(..., description="Total processing time in seconds")
    parallel_processed: bool = Field(..., description="Whether processed in parallel")


class ComparativeAnalysis(BaseModel):
    """Schema for comparative analysis results."""
    options: List[str] = Field(..., description="Compared options")
    criteria: List[str] = Field(..., description="Comparison criteria")
    similarities: List[str] = Field(..., description="Key similarities")
    differences: List[str] = Field(..., description="Key differences")
    recommendation: Optional[str] = Field(default=None, description="Recommended option")
    option_scores: Optional[Dict[str, float]] = Field(default=None, description="Scores per option")


class ComparativeQuestionResponse(BaseModel):
    """Response schema for comparative questions."""
    answer: str = Field(..., description="Comparative analysis text")
    question: str = Field(..., description="Original question")
    comparison: ComparativeAnalysis = Field(..., description="Structured comparison")
    session_id: Optional[str] = Field(default=None)
    timestamp: str = Field(...)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ConversationMessage(BaseModel):
    """Schema for a conversation message."""
    role: str = Field(..., description="Message role (user/assistant)")
    content: str = Field(..., description="Message content")
    timestamp: Optional[str] = Field(default=None, description="Message timestamp")


class ConversationHistoryRequest(BaseModel):
    """Request schema for getting conversation history."""
    session_id: str = Field(..., description="Session ID")
    limit: Optional[int] = Field(default=None, ge=1, description="Limit number of messages")
    include_metadata: bool = Field(default=False, description="Include message metadata")


class ConversationHistoryResponse(BaseModel):
    """Response schema for conversation history."""
    session_id: str = Field(..., description="Session ID")
    messages: List[ConversationMessage] = Field(..., description="Conversation messages")
    message_count: int = Field(..., description="Total message count")
    created_at: Optional[str] = Field(default=None, description="Session creation time")
    last_updated: Optional[str] = Field(default=None, description="Last update time")


class ClearSessionRequest(BaseModel):
    """Request schema for clearing session memory."""
    session_id: str = Field(..., description="Session ID to clear")
    confirm: bool = Field(default=False, description="Confirmation flag")


class ClearSessionResponse(BaseModel):
    """Response schema for clearing session."""
    success: bool = Field(..., description="Whether clearing was successful")
    session_id: str = Field(..., description="Cleared session ID")
    message: str = Field(..., description="Status message")


class PromptListResponse(BaseModel):
    """Response schema for listing available prompts."""
    prompt_types: List[Dict[str, str]] = Field(..., description="Available prompt types with descriptions")
    total_count: int = Field(..., description="Total number of prompt types")


class HealthCheckResponse(BaseModel):
    """Response schema for health check."""
    status: str = Field(..., description="Service status")
    version: str = Field(..., description="Service version")
    providers_available: List[str] = Field(..., description="Available LLM providers")
    timestamp: str = Field(...)


class ErrorResponse(BaseModel):
    """Response schema for errors."""
    error: str = Field(..., description="Error message")
    error_type: str = Field(..., description="Error type")
    details: Optional[Dict[str, Any]] = Field(default=None, description="Error details")
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    request_id: Optional[str] = Field(default=None, description="Request ID for tracking")