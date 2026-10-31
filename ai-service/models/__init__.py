"""
ProjectUp AI Agent Models Package

Organized model structure:
- entities/: Pydantic models representing backend database entities
- database/: SQLAlchemy models for AI agent database tables
- requests/: API request models
- responses/: API response models
"""

# ==================== Entity Models ====================
# User models
from .entities.user_models import (
    User,
    Profile,
    Category,
    UserConcept,
    UserSkill,
    UserInterest,
    SkillData,
    InterestData,
    LoginRequest,
    VerifiedUser,
)

# Project models
from .entities.project_models import (
    Project,
    ProjectPost,
    ProjectApplication,
    ApplicationQuestion,
    ApplicationAnswer,
    ProjectInvitation,
    ProjectShare,
    ProjectPostShare,
    InviteMemberRequest,
    CreateShareRequest,
)

# Post models
from .entities.post_models import (
    Post,
    MediaItem,
)

# Comment models
from .entities.comment_models import (
    GenericComment,
    CommentResponse,
    ENTITY_TYPE_PROJECT_POST,
    ENTITY_TYPE_GENERAL_POST,
    ENTITY_TYPE_PARTNER_POST,
)

# Agent models
from .entities.agent_models import (
    AgentRequest,
    AgentResponse,
    AgentConfig,
    ProjectIdea,
    ProjectIdeaResponse,
    RoadmapResource,
    BasicRoadmapStep,
    RoadmapStep,
    BasicRoadmap,
    Roadmap,
    BasicRoadmapResponse,
    RoadmapResponse,
    StepResources,
    RoadmapResourcesResponse,
    ChecklistItem,
    ProjectChecklist,
    CurriculumSkill,
    TopicCategory,
    CurriculumAlignment,
    ProjectRoadmapWithChecklist,
    ProjectRoadmapWithChecklistResponse,
)

# Group models
from .entities.group_models import (
    ProjectGroup,
    ProjectGroupMember,
    ProjectMember,
)

# Chat models
from .entities.chat_models import (
    PrivateChat,
    PrivateMessage,
    GroupChat,
    GroupMessage,
    GroupMember,
)

# Partner models
from .entities.partner_models import (
    PartnerEvent,
    EventParticipant,
    EventMemo,
)

# Interaction models
from .entities.interaction_models import (
    Interaction,
    ProjectInteraction,
    InteractionCountResponse,
    INTERACTION_TYPE_LIKE,
    INTERACTION_TYPE_SAVE,
    INTERACTION_TYPE_VIEW,
    INTERACTION_TYPE_SHARE,
    convert_interaction_type_to_int,
    convert_interaction_type_to_string,
)

# Notification models
from .entities.notification_models import (
    Notification,
)

# Bookmark models
from .entities.bookmark_models import (
    Bookmark,
    BookmarkCategory,
    BookmarkRequest,
    BookmarkResponse,
)

# Subscription models
from .entities.subscription_models import (
    SubscriptionTier,
    Subscription,
    PaymentMethod,
    PaymentHistory,
    PricingPlan,
    PRICING_PLANS,
)

# ==================== Database Models ====================
from database.connection import Base

from .database.paper_models import (
    PaperChatSession,
    PaperChatMessage,
    PaperNote,
    PaperOutline,
    PaperReference,
)

from .database.tree_models import (
    IdeaTree,
    IdeaNode,
    NodeConnection,
)

from .database.concept_models import (
    Source,
    Roadmap,
    Domain,
    Topic,
    Concept,
    ConceptResource,
    ConceptRelationship,
    DomainRoadmap,
    ConceptRoadmap,
    RoadmapNode,
)

from .database.crawl_models import (
    CrawlJob,
)

from .database.embedding_models import (
    DocumentChunk,
)

from .database.node_chat_models import (
    NodeChatSession,
)

from .database.node_version_models import (
    NodeVersion,
    ChatBranch,
)

from .database.recommendation_models import (
    LearningPathRecommendation,
)

from .database.resource_models import (
    ResourceInteraction,
)

from .database.checkpoint_models import (
    WorkflowCheckpoint,
    WorkflowSession,
)

from .database.node_template import (
    NodeTemplate,
    TemplateCategory,
    TemplateUsageLog,
)

from .database.task import (
    Task,
    LearningResource,
    Subtask,
    TaskDependency,
)

# ==================== Request Models ====================
from .requests.paper_requests import (
    GenerateOutlineRequest,
    ChatRequest,
    GenerateTitleRequest,
    ChatSessionCreate,
    ChatMessageCreate,
    MessageCreateRequest,
    NoteCreate,
    NoteUpdate,
    OutlineSave,
    ReferencesSave,
    Section,
    Outline,
    PaperReference,
)

from .requests.course_requests import (
    CourseGenerationRequest,
    CourseFeedback,
)

from .requests.node_chat_requests import (
    ChatMessageRequest,
    CreateVersionRequest,
    RestoreVersionRequest,
)

from .requests.tree_data_requests import (
    IdeaTreeCreate,
    IdeaNodeCreate,
    IdeaTreeQuery,
)

from .requests.idea_tree_requests import (
    IdeaTreeQueryRequest,
    BatchQueryRequest,
)

from .requests.roadmap_requests import (
    GenerateRoadmapRequest,
    UpdateResourcesRequest,
)

from .requests.agent_requests import (
    AgentCreateRequest,
    AgentUpdateRequest,
)

from .requests.common_requests import (
    MessageRequest,
    SessionRequest,
)

from .requests.tool_requests import (
    ToolRequest,
    URLRequest,
    ImageRequest,
)

from .requests.workflow_requests import (
    WorkflowNodeDefinition,
    WorkflowEdgeDefinition,
    CustomWorkflowDefinition,
    WorkflowRequest,
    WorkflowCreateRequest,
    WorkflowExecuteRequest,
    WorkflowImportRequest,
)

from .requests.project_requests import (
    ProjectIdeasRequest,
    ProjectRoadmapRequest,
    EnhancedRoadmapRequest,
)

# ==================== Response Models ====================
from .responses.paper_responses import (
    GenerateOutlineResponse,
    GenerateReferencesResponse,
    ChatResponse,
    GenerateTitleResponse,
    ChatSessionResponse,
    ChatMessageResponse,
    NoteResponse,
    OutlineResponse,
    ReferenceResponse,
    ChatSession,
    ChatMessage,
)

from .responses.course_responses import (
    CourseItemResponse,
    CourseListResponse,
    CourseDeleteResponse,
    CourseGenerationResponse,
    CourseStatusResponse,
    CourseResponse,
)

from .responses.node_chat_responses import (
    ChatMessageResponse as NodeChatMessageResponse,
    SessionResponse,
    VersionResponse,
)

from .responses.tree_data_responses import (
    IdeaTreeResponse,
    IdeaNodeResponse,
)

from .responses.idea_tree_responses import (
    IdeaTreeQueryResponse,
)

from .responses.roadmap_responses import (
    RoadmapResponse as RoadmapAPIResponse,
)

from .responses.agent_responses import (
    AgentInfo,
    AgentResponse,
    AgentListResponse,
)

from .responses.common_responses import (
    BaseResponse,
    ErrorResponse,
    SuccessResponse,
)

from .responses.tool_responses import (
    ImageAnalysisResult,
    ToolResponse,
    URLResponse,
    ImageResponse,
)

from .responses.workflow_responses import (
    WorkflowInfo,
    WorkflowExecutionResult,
    WorkflowListResponse,
)

from .responses.project_responses import (
    ProjectIdea as ProjectIdeaModel,
    RoadmapPhase,
    ProjectIdeasResponse,
    ProjectRoadmapResponse,
)

# ==================== Constants ====================
from .constants import (
    VISIBILITY_PUBLIC,
    VISIBILITY_PRIVATE,
    VISIBILITY_LOCAL,
    VISIBILITY_ORGANIZATION,
    STATUS_ACTIVE,
    STATUS_ARCHIVED,
    PROJECT_STATUS_DRAFT,
    PROJECT_STATUS_ACTIVE,
    PROJECT_STATUS_COMPLETED,
    PROJECT_STATUS_ARCHIVED,
)

__all__ = [
    # Entity models - User
    "User",
    "Profile",
    "Category",
    "UserConcept",
    "UserSkill",
    "UserInterest",
    "SkillData",
    "InterestData",
    "LoginRequest",
    "VerifiedUser",
    # Entity models - Project
    "Project",
    "ProjectPost",
    "ProjectApplication",
    "ApplicationQuestion",
    "ApplicationAnswer",
    "ProjectInvitation",
    "ProjectShare",
    "ProjectPostShare",
    "InviteMemberRequest",
    "CreateShareRequest",
    # Entity models - Post
    "Post",
    "MediaItem",
    # Entity models - Comment
    "GenericComment",
    "CommentResponse",
    "ENTITY_TYPE_PROJECT_POST",
    "ENTITY_TYPE_GENERAL_POST",
    "ENTITY_TYPE_PARTNER_POST",
    # Entity models - Agent
    "AgentRequest",
    "AgentResponse",
    "AgentConfig",
    "ProjectIdea",
    "ProjectIdeaResponse",
    "RoadmapResource",
    "BasicRoadmapStep",
    "RoadmapStep",
    "BasicRoadmap",
    "Roadmap",
    "BasicRoadmapResponse",
    "RoadmapResponse",
    "StepResources",
    "RoadmapResourcesResponse",
    "ChecklistItem",
    "ProjectChecklist",
    "CurriculumSkill",
    "TopicCategory",
    "CurriculumAlignment",
    "ProjectRoadmapWithChecklist",
    "ProjectRoadmapWithChecklistResponse",
    # Entity models - Group
    "ProjectGroup",
    "ProjectGroupMember",
    "ProjectMember",
    # Entity models - Chat
    "PrivateChat",
    "PrivateMessage",
    "GroupChat",
    "GroupMessage",
    "GroupMember",
    # Entity models - Partner
    "PartnerEvent",
    "EventParticipant",
    "EventMemo",
    # Entity models - Interaction
    "Interaction",
    "ProjectInteraction",
    "InteractionCountResponse",
    "INTERACTION_TYPE_LIKE",
    "INTERACTION_TYPE_SAVE",
    "INTERACTION_TYPE_VIEW",
    "INTERACTION_TYPE_SHARE",
    "convert_interaction_type_to_int",
    "convert_interaction_type_to_string",
    # Entity models - Notification
    "Notification",
    # Entity models - Bookmark
    "Bookmark",
    "BookmarkCategory",
    "BookmarkRequest",
    "BookmarkResponse",
    # Entity models - Subscription
    "SubscriptionTier",
    "Subscription",
    "PaymentMethod",
    "PaymentHistory",
    "PricingPlan",
    "PRICING_PLANS",
    # Database models
    "Base",
    "PaperChatSession",
    "PaperChatMessage",
    "PaperNote",
    "PaperOutline",
    "PaperReference",
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
    "RecommendationRequest",
    "RecommendationResult",
    "Resource",
    "ResourceTag",
    "WorkflowCheckpoint",
    "WorkflowSession",
    "NodeTemplate",
    "TemplateCategory",
    "TemplateUsageLog",
    "Task",
    "LearningResource",
    "Subtask",
    "TaskDependency",
    # Request models
    "GenerateOutlineRequest",
    "ChatRequest",
    "GenerateTitleRequest",
    "ChatSessionCreate",
    "ChatMessageCreate",
    "MessageCreateRequest",
    "NoteCreate",
    "NoteUpdate",
    "OutlineSave",
    "ReferencesSave",
    "Section",
    "Outline",
    "PaperReference",
    "CourseGenerationRequest",
    "CourseFeedback",
    "ChatMessageRequest",
    "CreateVersionRequest",
    "RestoreVersionRequest",
    "IdeaTreeCreate",
    "IdeaNodeCreate",
    "IdeaTreeQuery",
    "IdeaTreeQueryRequest",
    "BatchQueryRequest",
    "GenerateRoadmapRequest",
    "UpdateResourcesRequest",
    "AgentCreateRequest",
    "AgentUpdateRequest",
    "MessageRequest",
    "SessionRequest",
    "ToolRequest",
    "URLRequest",
    "ImageRequest",
    "WorkflowNodeDefinition",
    "WorkflowEdgeDefinition",
    "CustomWorkflowDefinition",
    "WorkflowRequest",
    "WorkflowCreateRequest",
    "WorkflowExecuteRequest",
    "WorkflowImportRequest",
    "ProjectIdeasRequest",
    "ProjectRoadmapRequest",
    "EnhancedRoadmapRequest",
    # Response models
    "GenerateOutlineResponse",
    "GenerateReferencesResponse",
    "ChatResponse",
    "GenerateTitleResponse",
    "ChatSessionResponse",
    "ChatMessageResponse",
    "NoteResponse",
    "OutlineResponse",
    "ReferenceResponse",
    "ChatSession",
    "ChatMessage",
    "CourseItemResponse",
    "CourseListResponse",
    "CourseDeleteResponse",
    "CourseGenerationResponse",
    "CourseStatusResponse",
    "CourseResponse",
    "NodeChatMessageResponse",
    "SessionResponse",
    "VersionResponse",
    "IdeaTreeResponse",
    "IdeaNodeResponse",
    "IdeaTreeQueryResponse",
    "RoadmapAPIResponse",
    "AgentInfo",
    "AgentResponse",
    "AgentListResponse",
    "BaseResponse",
    "ErrorResponse",
    "SuccessResponse",
    "ImageAnalysisResult",
    "ToolResponse",
    "URLResponse",
    "ImageResponse",
    "WorkflowInfo",
    "WorkflowExecutionResult",
    "WorkflowListResponse",
    "ProjectIdeaModel",
    "RoadmapPhase",
    "ProjectIdeasResponse",
    "ProjectRoadmapResponse",
    # Constants
    "VISIBILITY_PUBLIC",
    "VISIBILITY_PRIVATE",
    "VISIBILITY_LOCAL",
    "VISIBILITY_ORGANIZATION",
    "STATUS_ACTIVE",
    "STATUS_ARCHIVED",
    "PROJECT_STATUS_DRAFT",
    "PROJECT_STATUS_ACTIVE",
    "PROJECT_STATUS_COMPLETED",
    "PROJECT_STATUS_ARCHIVED",
]
