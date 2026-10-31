"""
Data models for roadmap generation
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class TopicComplexity(str, Enum):
    """Complexity level of a topic"""
    SIMPLE = "simple"       # Can be learned in days
    MODERATE = "moderate"   # Can be learned in weeks
    COMPLEX = "complex"     # Can be learned in months
    VAST = "vast"          # Requires years to master


class NodeType(str, Enum):
    """Type of roadmap node"""
    ROOT = "root"                  # Main topic
    DOMAIN = "domain"              # Major domain/field
    SUBJECT = "subject"            # Subject area
    TOPIC = "topic"                # Specific topic
    SUBTOPIC = "subtopic"          # Detailed subtopic
    CONCEPT = "concept"            # Individual concept/skill
    RESOURCE = "resource"          # Learning resource


class LearningPath(str, Enum):
    """Suggested learning path through topics"""
    SEQUENTIAL = "sequential"      # Learn in order
    PARALLEL = "parallel"          # Can learn simultaneously
    PREREQUISITE = "prerequisite"  # Must complete before others
    OPTIONAL = "optional"          # Optional/advanced topics


class RoadmapNode(BaseModel):
    """Single node in the learning roadmap tree"""
    
    id: str = Field(description="Unique identifier for the node")
    title: str = Field(description="Topic/subtopic title")
    description: str = Field(description="Brief description of what this covers")
    node_type: NodeType = Field(description="Type of node in the hierarchy")
    complexity: TopicComplexity = Field(description="Complexity level")
    
    # Learning metadata
    estimated_hours: Optional[int] = Field(None, description="Estimated learning hours")
    prerequisites: List[str] = Field(default_factory=list, description="Prerequisite node IDs")
    learning_path: LearningPath = Field(
        default=LearningPath.SEQUENTIAL,
        description="How to approach learning this"
    )
    
    # Key concepts and skills
    key_concepts: List[str] = Field(
        default_factory=list,
        description="Key concepts to learn"
    )
    skills: List[str] = Field(
        default_factory=list,
        description="Skills to develop"
    )
    
    # Hierarchy
    parent_id: Optional[str] = Field(None, description="Parent node ID")
    children: List['RoadmapNode'] = Field(
        default_factory=list,
        description="Child nodes (subtopics)"
    )
    
    # Recursion control
    depth: int = Field(0, description="Depth in the tree")
    is_leaf: bool = Field(False, description="Whether this is a leaf node")
    needs_expansion: bool = Field(False, description="Whether this needs further breakdown")
    
    # Resources and references
    learning_resources: List[Dict[str, str]] = Field(
        default_factory=list,
        description="Suggested learning resources"
    )
    projects: List[str] = Field(
        default_factory=list,
        description="Suggested projects to build"
    )
    
    # Metadata
    tags: List[str] = Field(default_factory=list, description="Tags for categorization")
    difficulty_level: str = Field("beginner", description="Difficulty level")
    industry_relevance: Optional[str] = Field(None, description="Industry/career relevance")
    
    class Config:
        arbitrary_types_allowed = True


class RoadmapTree(BaseModel):
    """Complete learning roadmap tree structure"""
    
    root: RoadmapNode = Field(description="Root node of the roadmap")
    total_nodes: int = Field(description="Total number of nodes in the tree")
    max_depth: int = Field(description="Maximum depth of the tree")
    
    # Statistics
    total_estimated_hours: Optional[int] = Field(
        None,
        description="Total estimated learning hours"
    )
    complexity_distribution: Dict[str, int] = Field(
        default_factory=dict,
        description="Distribution of nodes by complexity"
    )
    
    # Learning path information
    suggested_order: List[str] = Field(
        default_factory=list,
        description="Suggested learning order (node IDs)"
    )
    critical_path: List[str] = Field(
        default_factory=list,
        description="Critical learning path (must-learn topics)"
    )
    
    # Metadata
    generated_at: datetime = Field(default_factory=datetime.now)
    generation_params: Dict[str, Any] = Field(
        default_factory=dict,
        description="Parameters used for generation"
    )
    
    def get_node_by_id(self, node_id: str) -> Optional[RoadmapNode]:
        """Find a node by its ID"""
        def search_node(node: RoadmapNode, target_id: str) -> Optional[RoadmapNode]:
            if node.id == target_id:
                return node
            for child in node.children:
                result = search_node(child, target_id)
                if result:
                    return result
            return None
        
        return search_node(self.root, node_id)
    
    def get_leaf_nodes(self) -> List[RoadmapNode]:
        """Get all leaf nodes (most specific topics)"""
        leaves = []
        
        def collect_leaves(node: RoadmapNode):
            if node.is_leaf or not node.children:
                leaves.append(node)
            else:
                for child in node.children:
                    collect_leaves(child)
        
        collect_leaves(self.root)
        return leaves
    
    def get_nodes_at_depth(self, depth: int) -> List[RoadmapNode]:
        """Get all nodes at a specific depth"""
        nodes = []
        
        def collect_at_depth(node: RoadmapNode, current_depth: int):
            if current_depth == depth:
                nodes.append(node)
            elif current_depth < depth:
                for child in node.children:
                    collect_at_depth(child, current_depth + 1)
        
        collect_at_depth(self.root, 0)
        return nodes
    
    def to_flat_list(self) -> List[RoadmapNode]:
        """Convert tree to flat list of nodes"""
        nodes = []
        
        def flatten(node: RoadmapNode):
            nodes.append(node)
            for child in node.children:
                flatten(child)
        
        flatten(self.root)
        return nodes


class RoadmapRequest(BaseModel):
    """Request for generating a learning roadmap"""
    
    topic: str = Field(description="Main topic to create roadmap for")
    max_depth: int = Field(
        default=4,
        description="Maximum recursion depth"
    )
    target_audience: str = Field(
        default="beginner",
        description="Target audience level"
    )
    
    # Customization options
    include_resources: bool = Field(
        default=True,
        description="Include learning resources"
    )
    include_projects: bool = Field(
        default=True,
        description="Include project suggestions"
    )
    include_prerequisites: bool = Field(
        default=True,
        description="Include prerequisite relationships"
    )
    
    # Focus areas
    focus_areas: List[str] = Field(
        default_factory=list,
        description="Specific areas to focus on"
    )
    exclude_areas: List[str] = Field(
        default_factory=list,
        description="Areas to exclude"
    )
    
    # Learning goals
    learning_goals: List[str] = Field(
        default_factory=list,
        description="Specific learning goals"
    )
    time_commitment: Optional[str] = Field(
        None,
        description="Available time commitment (e.g., '3 months', '1 year')"
    )
    
    # Expansion control
    min_subtopics: int = Field(
        default=3,
        description="Minimum subtopics per node"
    )
    max_subtopics: int = Field(
        default=7,
        description="Maximum subtopics per node"
    )
    complexity_threshold: TopicComplexity = Field(
        default=TopicComplexity.MODERATE,
        description="Stop recursion when complexity is below this"
    )


class RoadmapResponse(BaseModel):
    """Response containing the generated roadmap"""
    
    success: bool = Field(description="Whether generation was successful")
    roadmap: Optional[RoadmapTree] = Field(None, description="Generated roadmap tree")
    
    # Summary statistics
    total_topics: int = Field(description="Total number of topics generated")
    total_learning_hours: Optional[int] = Field(
        None,
        description="Total estimated learning hours"
    )
    
    # Visualizations
    tree_visualization: Optional[str] = Field(
        None,
        description="Text-based tree visualization"
    )
    mermaid_diagram: Optional[str] = Field(
        None,
        description="Mermaid diagram code for visualization"
    )
    
    # Recommendations
    recommended_starting_points: List[str] = Field(
        default_factory=list,
        description="Recommended topics to start with"
    )
    learning_path_suggestions: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Suggested learning paths"
    )
    
    # Metadata
    generation_time_ms: int = Field(description="Time taken to generate (milliseconds)")
    recursion_depth_reached: int = Field(description="Actual recursion depth reached")
    error_message: Optional[str] = Field(None, description="Error message if failed")


class ExpansionDecision(BaseModel):
    """Decision on whether to expand a node further"""
    
    should_expand: bool = Field(description="Whether to expand this node")
    reason: str = Field(description="Reason for the decision")
    suggested_subtopics: List[str] = Field(
        default_factory=list,
        description="Suggested subtopics if expanding"
    )
    complexity_assessment: TopicComplexity = Field(
        description="Assessed complexity of the topic"
    )