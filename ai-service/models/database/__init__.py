"""
Database models package
"""

from database.connection import Base
from .paper_models import PaperChatSession, PaperChatMessage, PaperNote, PaperOutline, PaperReference
from .tree_models import IdeaForest, IdeaTree, IdeaNode, NodeConnection
from .concept_models import Source, Roadmap, Domain, Topic, Concept, ConceptResource, ConceptRelationship, DomainRoadmap, ConceptRoadmap, RoadmapNode
from .crawl_models import CrawlJob
from .embedding_models import DocumentChunk
from .node_chat_models import NodeChatSession
from .node_version_models import NodeVersion, ChatBranch
from .recommendation_models import LearningPathRecommendation
from .resource_models import ResourceInteraction
from .checkpoint_models import WorkflowCheckpoint, WorkflowSession
from .course_models import CourseRequest, CourseGenerationProgress, CourseSection, CourseRefinement, UserCourseProgress, Contact
from .quiz_models import Quiz, QuizAttempt

__all__ = [
    "Base",
    "PaperChatSession",
    "PaperChatMessage",
    "PaperNote",
    "PaperOutline",
    "PaperReference",
    "IdeaForest",
    "IdeaTree",
    "IdeaNode",
    "NodeConnection",
    "Source",
    "Roadmap",
    "Domain",
    "Topic",
    "Concept",
    "ConceptResource",
    "ConceptRelationship",
    "DomainRoadmap",
    "ConceptRoadmap",
    "RoadmapNode",
    "CrawlJob",
    "DocumentChunk",
    "NodeChatSession",
    "NodeVersion",
    "ChatBranch",
    "LearningPathRecommendation",
    "ResourceInteraction",
    "WorkflowCheckpoint",
    "WorkflowSession",
    "CourseRequest",
    "CourseGenerationProgress",
    "CourseSection",
    "CourseRefinement",
    "UserCourseProgress",
    "Contact",
    "Quiz",
    "QuizAttempt",
]
