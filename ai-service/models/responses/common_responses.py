"""
Common response schemas used across the AI Agent system.
"""

from typing import Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime


class BaseResponse(BaseModel):
    """Base response model."""
    success: bool
    message: Optional[str] = None
    timestamp: datetime = datetime.utcnow()
    

class ErrorResponse(BaseResponse):
    """Error response model."""
    success: bool = False
    error: str
    error_code: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class SuccessResponse(BaseResponse):
    """Success response model."""
    success: bool = True
    data: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None