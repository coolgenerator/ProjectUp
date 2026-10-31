"""
Tool-related request schemas for the AI Agent system.
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel


class ToolRequest(BaseModel):
    """Request model for using tools."""
    tool_name: str
    parameters: Dict[str, Any]
    session_id: Optional[str] = None


class URLRequest(BaseModel):
    """Request model for URL operations."""
    text: str
    extract_content: bool = True
    follow_redirects: bool = True
    timeout: int = 30


class ImageRequest(BaseModel):
    """Request model for image operations."""
    base64_images: List[str]
    analyze_content: bool = True
    extract_text: bool = True
    detect_objects: bool = False