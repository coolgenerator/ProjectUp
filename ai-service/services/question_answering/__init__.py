"""
Question Answering Service Module.

This module provides a flexible question answering system with:
- Multiple prompt types for different question scenarios
- Support for various LLM providers
- Conversation memory management
- Batch processing capabilities
- Document-based retrieval QA
- Comparative analysis
"""

from .qa_service import QuestionAnsweringService
from .prompts import QAPrompts, PromptType

__all__ = [
    'QuestionAnsweringService',
    'QAPrompts',
    'PromptType'
]

# Module version
__version__ = '1.0.0'