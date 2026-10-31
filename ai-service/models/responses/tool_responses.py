"""
Tool-related response schemas for the AI Agent system.
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel


class ImageAnalysisResult(BaseModel):
    """Model for image analysis results."""
    extracted_text: Optional[str] = None
    labels: Optional[List[str]] = None
    objects_detected: Optional[List[Dict[str, Any]]] = None
    confidence_scores: Optional[Dict[str, float]] = None
    error: Optional[str] = None


class ToolResponse(BaseModel):
    """Response model for tool execution."""
    tool_name: str
    success: bool
    result: Optional[Any] = None
    error: Optional[str] = None
    execution_time: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None


class URLResponse(BaseModel):
    """Response model for URL operations."""
    urls_found: int
    url_contents: Dict[str, str]
    metadata: Optional[Dict[str, Any]] = None


class ImageResponse(BaseModel):
    """Response model for image operations."""
    images_found: int
    image_analysis: List[ImageAnalysisResult]
    processing_time: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None