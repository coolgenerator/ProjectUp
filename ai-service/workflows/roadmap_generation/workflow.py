"""
Main roadmap generation workflow
Enhanced to integrate with database concept models
"""

import time
from typing import Optional, Dict, Any, List
import uuid
from datetime import datetime

from .models import RoadmapRequest, RoadmapResponse, RoadmapTree
from .generator import RoadmapGenerator
from .visualizer import RoadmapVisualizer
from models.database import (
    Roadmap, Domain, Topic, Concept, 
    ConceptResource, DomainRoadmap, ConceptRoadmap
)


class RoadmapGenerationWorkflow:
    """Workflow for generating learning roadmaps"""
    
    def __init__(self):
        self.generator = RoadmapGenerator()
        self.visualizer = RoadmapVisualizer()
    
    def generate_roadmap(self, request: RoadmapRequest) -> RoadmapResponse:
        """Generate a complete learning roadmap"""
        
        start_time = time.time()
        
        try:
            # Generate the roadmap tree
            roadmap_tree = self.generator.generate_roadmap(request)
            
            # Generate tree visualization only
            tree_viz = self.visualizer.generate_tree_visualization(roadmap_tree)
            
            # Generate recommendations
            recommendations = self._generate_recommendations(roadmap_tree, request)
            
            # Calculate generation time
            generation_time = int((time.time() - start_time) * 1000)
            
            # Get all leaf nodes for detailed topics
            leaf_nodes = roadmap_tree.get_leaf_nodes()
            
            # Don't need simplified roadmap for now, roadmap tree already has all info
            
            return RoadmapResponse(
                success=True,
                roadmap=roadmap_tree,
                total_topics=roadmap_tree.total_nodes,
                total_learning_hours=roadmap_tree.total_estimated_hours,
                tree_visualization=tree_viz,
                mermaid_diagram=None,  # Remove mermaid
                recommended_starting_points=recommendations['starting_points'],
                learning_path_suggestions=recommendations['paths'],
                generation_time_ms=generation_time,
                recursion_depth_reached=roadmap_tree.max_depth
            )
            
        except Exception as e:
            return RoadmapResponse(
                success=False,
                total_topics=0,
                generation_time_ms=int((time.time() - start_time) * 1000),
                recursion_depth_reached=0,
                error_message=str(e)
            )
    
    def expand_node(self, roadmap_tree: RoadmapTree, node_id: str, max_depth: int = 2) -> RoadmapTree:
        """Expand a specific node further"""
        
        node = roadmap_tree.get_node_by_id(node_id)
        if not node:
            raise ValueError(f"Node {node_id} not found")
        
        # Create a request for expansion
        request = RoadmapRequest(
            topic=node.title,
            max_depth=max_depth,
            target_audience=node.difficulty_level
        )
        
        # Expand the node
        self.generator._expand_node_recursive(
            node=node,
            request=request,
            current_depth=node.depth
        )
        
        # Update tree statistics
        all_nodes = roadmap_tree.to_flat_list()
        roadmap_tree.total_nodes = len(all_nodes)
        roadmap_tree.total_estimated_hours = sum(n.estimated_hours or 0 for n in all_nodes)
        
        return roadmap_tree
    
    def _generate_recommendations(
        self,
        roadmap_tree: RoadmapTree,
        request: RoadmapRequest
    ) -> Dict[str, Any]:
        """Generate learning recommendations"""
        
        recommendations = {
            'starting_points': [],
            'paths': []
        }
        
        # Find good starting points
        # Start with depth 1 nodes (main domains)
        depth_1_nodes = roadmap_tree.get_nodes_at_depth(1)
        for node in depth_1_nodes[:3]:  # Top 3 starting points
            recommendations['starting_points'].append(node.title)
        
        # Generate learning paths based on goals
        if request.learning_goals:
            for goal in request.learning_goals[:3]:
                path = self._find_path_for_goal(roadmap_tree, goal)
                if path:
                    recommendations['paths'].append({
                        'goal': goal,
                        'path': path,
                        'estimated_hours': sum(
                            roadmap_tree.get_node_by_id(node_id).estimated_hours or 0
                            for node_id in path
                        )
                    })
        
        # Add default paths if no specific goals
        if not recommendations['paths']:
            # Beginner path
            beginner_path = self._generate_beginner_path(roadmap_tree)
            recommendations['paths'].append({
                'goal': 'Beginner Foundation',
                'path': beginner_path,
                'description': 'Start with fundamentals and build up'
            })
            
            # Fast track path (critical only)
            fast_track = roadmap_tree.critical_path[:10]
            recommendations['paths'].append({
                'goal': 'Fast Track',
                'path': fast_track,
                'description': 'Focus on essential topics only'
            })
        
        return recommendations
    
    def _find_path_for_goal(self, roadmap_tree: RoadmapTree, goal: str) -> Optional[list]:
        """Find a learning path for a specific goal"""
        
        relevant_nodes = []
        goal_lower = goal.lower()
        
        # Find nodes relevant to the goal
        for node in roadmap_tree.to_flat_list():
            if any(keyword in node.title.lower() or keyword in node.description.lower()
                   for keyword in goal_lower.split()):
                relevant_nodes.append(node.id)
        
        # Sort by depth (learn foundations first)
        relevant_nodes.sort(key=lambda nid: roadmap_tree.get_node_by_id(nid).depth)
        
        return relevant_nodes[:15]  # Limit path length
    
    def _generate_beginner_path(self, roadmap_tree: RoadmapTree) -> list:
        """Generate a beginner-friendly learning path"""
        
        path = []
        
        # Start with root
        path.append(roadmap_tree.root.id)
        
        # Add first child of each level
        current = roadmap_tree.root
        for _ in range(3):  # Go 3 levels deep
            if current.children:
                # Pick the first or simplest child
                simplest = min(current.children, 
                             key=lambda c: c.complexity.value if c.complexity else 0)
                path.append(simplest.id)
                current = simplest
            else:
                break
        
        # Add some breadth at level 1
        for node in roadmap_tree.get_nodes_at_depth(1)[:3]:
            if node.id not in path:
                path.append(node.id)
        
        return path
    
    def generate_with_concept_models(self, request: RoadmapRequest) -> Dict[str, Any]:
        """Generate roadmap and convert to database concept models
        
        Returns:
            Dictionary containing:
            - roadmap_response: The standard RoadmapResponse
            - concept_models: Dictionary with domain, topics, concepts, resources
            - database_ready: Boolean indicating if models are ready for database insertion
        """
        
        # Generate the standard roadmap
        roadmap_response = self.generate_roadmap(request)
        
        if not roadmap_response.success or not roadmap_response.roadmap:
            return {
                "roadmap_response": roadmap_response,
                "concept_models": None,
                "database_ready": False
            }
        
        # Convert to concept models
        concept_models = self.generator.convert_to_concept_models(roadmap_response.roadmap)
        
        # Create Roadmap database model
        roadmap_id = uuid.uuid4()
        roadmap_model = {
            "id": roadmap_id,
            "title": roadmap_response.roadmap.root.title,
            "slug": roadmap_response.roadmap.root.title.lower().replace(" ", "-"),
            "description": roadmap_response.roadmap.root.description,
            "category": concept_models["domain"]["name"],
            "difficulty_level": request.target_audience or "intermediate",
            "estimated_hours": roadmap_response.total_learning_hours,
            "tags": self._extract_tags_from_tree(roadmap_response.roadmap),
            "is_featured": False,
            "view_count": 0,
            "meta_data": {
                "generation_time_ms": roadmap_response.generation_time_ms,
                "total_topics": roadmap_response.total_topics,
                "recursion_depth": roadmap_response.recursion_depth_reached,
                "request": {
                    "topic": request.topic,
                    "target_audience": request.target_audience,
                    "max_depth": request.max_depth,
                    "learning_goals": request.learning_goals
                }
            },
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Add roadmap reference to concept models
        concept_models["roadmap"] = roadmap_model
        
        return {
            "roadmap_response": roadmap_response,
            "concept_models": concept_models,
            "database_ready": True
        }
    
    def _extract_tags_from_tree(self, roadmap_tree: RoadmapTree) -> List[str]:
        """Extract relevant tags from the roadmap tree"""
        tags = []
        
        # Add tools and technologies as tags
        for node in roadmap_tree.to_flat_list():
            if node.tools_technologies:
                tags.extend(node.tools_technologies)
        
        # Deduplicate and limit
        unique_tags = list(set(tags))
        return unique_tags[:20]  # Limit to 20 tags
    
    def create_database_relationships(self, concept_models: Dict[str, Any]) -> Dict[str, Any]:
        """Create relationship objects for database insertion
        
        Creates DomainRoadmap and ConceptRoadmap relationship objects
        """
        
        roadmap_id = concept_models["roadmap"]["id"]
        
        # Create DomainRoadmap relationship
        domain_roadmap = {
            "roadmap_id": roadmap_id,
            "domain_id": None,  # Will be set after domain is inserted
            "order_index": 0
        }
        
        # Create ConceptRoadmap relationships
        concept_roadmaps = []
        for idx, concept in enumerate(concept_models["concepts"]):
            is_core = idx < 10  # First 10 concepts are core
            concept_roadmap = {
                "roadmap_id": roadmap_id,
                "concept_id": None,  # Will be set after concept is inserted
                "order_index": idx,
                "is_optional": not is_core,
                "is_core": is_core
            }
            concept_roadmaps.append(concept_roadmap)
        
        return {
            "domain_roadmap": domain_roadmap,
            "concept_roadmaps": concept_roadmaps
        }