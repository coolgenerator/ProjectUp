"""
Prompts module
Contains all AI prompt templates organized by feature
"""

from .paper_prompts import (
    get_chat_prompt,
    get_outline_generation_prompt as get_outline_prompt,
    get_references_extraction_prompt as get_references_prompt,
    get_title_generation_prompt as get_title_prompt
)
from .course_prompts import CoursePrompts
from .node_chat_prompts import NodeChatPrompts
from .tree_prompts import TreePrompts

__all__ = [
    # Paper prompts
    "get_chat_prompt",
    "get_outline_prompt",
    "get_references_prompt",
    "get_title_prompt",
    # Course prompts
    "CoursePrompts",
    # Node chat prompts
    "NodeChatPrompts",
    # Tree prompts
    "TreePrompts",
]
