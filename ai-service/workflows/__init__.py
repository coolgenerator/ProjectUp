"""
AI Agent Workflows

Available workflows:
- chat: Conversational AI workflow
- project: Project planning and management
- research: Research and information gathering
- courses: Course generation workflow (LangGraph-based)
- idea_tree: IdeaTree node operations and queries
"""

from .chat import ChatWorkflow
from .project import ProjectWorkflow
from .research import ResearchWorkflow
from .idea_tree import IdeaTreeWorkflow

__all__ = [
    'ChatWorkflow',
    'ProjectWorkflow',
    'ResearchWorkflow',
    'IdeaTreeWorkflow'
]