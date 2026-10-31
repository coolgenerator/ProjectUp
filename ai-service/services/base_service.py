"""
Base service class with common functionality.
"""

import logging
from typing import Optional, Dict, Any
from abc import ABC, abstractmethod


class BaseService(ABC):
    """Base service class with common functionality."""
    
    def __init__(self, logger: Optional[logging.Logger] = None):
        """Initialize base service."""
        self.logger = logger or logging.getLogger(self.__class__.__name__)
        self._initialize()
    
    @abstractmethod
    def _initialize(self):
        """Initialize service-specific resources."""
        pass
    
    def log_info(self, message: str, **kwargs):
        """Log info message with context."""
        self.logger.info(f"{message}", extra=kwargs)
    
    def log_error(self, message: str, error: Optional[Exception] = None, **kwargs):
        """Log error message with exception details."""
        if error:
            self.logger.error(f"{message}: {str(error)}", exc_info=True, extra=kwargs)
        else:
            self.logger.error(f"{message}", extra=kwargs)
    
    def log_debug(self, message: str, **kwargs):
        """Log debug message."""
        self.logger.debug(f"{message}", extra=kwargs)

    def log_warning(self, message: str, **kwargs):
        """Log warning message."""
        self.logger.warning(f"{message}", extra=kwargs)

    def validate_request(self, request: Any, required_fields: list) -> tuple[bool, Optional[str]]:
        """Validate request has required fields."""
        for field in required_fields:
            if not hasattr(request, field) or getattr(request, field) is None:
                return False, f"Missing required field: {field}"
        return True, None
    
    def create_response(
        self, 
        success: bool, 
        data: Optional[Dict[str, Any]] = None, 
        error: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create standardized response."""
        response = {
            "success": success,
            "data": data
        }
        
        if error:
            response["error"] = error
        
        if metadata:
            response["metadata"] = metadata
            
        return response