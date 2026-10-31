"""
Roadmap generation service based on database models.
"""

from typing import Dict, Any, List, Optional
import uuid
from datetime import datetime
import json
import logging

from models.database.concept_models import Source, Roadmap, RoadmapNode
# from models.database.resource_models import Resource  # TODO: Resource model not yet implemented
from database.database import get_db

logger = logging.getLogger(__name__)


class RoadmapService:
    """Service for generating and managing learning roadmaps."""
    
    def __init__(self):
        """Initialize roadmap service."""
        self.db_manager = get_db()
        self.default_source = {
            "name": "AI Agent Generator",
            "type": "ai_generated",
            "platform": "ProjectUp AI",
            "credibility_score": 0.85
        }
    
    def _get_session(self):
        """Get database session."""
        return self.db_manager.SessionLocal()
    
    async def generate_roadmap(self, topic: str, **kwargs) -> Dict[str, Any]:
        """
        Generate a complete learning roadmap for a topic.
        
        Args:
            topic: The topic to generate a roadmap for
            **kwargs: Additional parameters like difficulty, estimated_hours, etc.
        
        Returns:
            Dictionary containing the generated roadmap
        """
        try:
            session = self._get_session()
            
            # Create or get source
            source = self._get_or_create_source(session)
            
            # Create roadmap
            roadmap = Roadmap(
                title=f"{topic} Learning Roadmap",
                slug=self._generate_slug(topic),
                description=kwargs.get('description', f"Comprehensive learning path for {topic}"),
                category=kwargs.get('category', 'Technology'),
                difficulty_level=kwargs.get('difficulty', 'intermediate'),
                estimated_hours=kwargs.get('estimated_hours', 100),
                tags=kwargs.get('tags', [topic.lower(), 'learning', 'roadmap']),
                is_featured=kwargs.get('is_featured', False),
                source_id=source.id,
                meta_data={
                    'generated_by': 'ai_agent',
                    'version': '1.0',
                    'topic': topic,
                    'generation_params': kwargs
                }
            )
            session.add(roadmap)
            session.flush()
            
            # Generate roadmap nodes (hierarchical structure)
            root_node = self._create_root_node(session, roadmap, topic)
            
            # Generate main domains/areas
            domains = self._generate_domains(topic)
            for idx, domain in enumerate(domains):
                domain_node = self._create_domain_node(session, roadmap, root_node, domain, idx)
                
                # Generate topics for each domain
                topics = self._generate_topics(domain)
                for topic_idx, topic_data in enumerate(topics):
                    topic_node = self._create_topic_node(session, roadmap, domain_node, topic_data, topic_idx)
                    
                    # Generate resources for each topic
                    resources = self._generate_resources(topic_data)
                    for resource in resources:
                        self._create_resource(session, topic_node, resource)
            
            # Commit all changes
            session.commit()
            
            # Return the complete roadmap structure
            return self._roadmap_to_dict(roadmap, include_nodes=True)
            
        except Exception as e:
            logger.error(f"Error generating roadmap: {str(e)}")
            if session:
                session.rollback()
            raise
        finally:
            if session:
                session.close()
    
    def _get_or_create_source(self, session) -> Source:
        """Get or create the AI agent source."""
        source = session.query(Source).filter_by(
            name=self.default_source["name"],
            type=self.default_source["type"]
        ).first()
        
        if not source:
            source = Source(
                name=self.default_source["name"],
                type=self.default_source["type"],
                platform=self.default_source["platform"],
                credibility_score=self.default_source["credibility_score"],
                is_active=True,
                meta_data={'ai_powered': True}
            )
            session.add(source)
            session.flush()
        
        return source
    
    def _generate_slug(self, topic: str) -> str:
        """Generate a URL-friendly slug from topic."""
        import re
        slug = topic.lower()
        slug = re.sub(r'[^\w\s-]', '', slug)
        slug = re.sub(r'[-\s]+', '-', slug)
        return f"{slug}-{uuid.uuid4().hex[:8]}"
    
    def _create_root_node(self, session, roadmap: Roadmap, topic: str) -> RoadmapNode:
        """Create the root node of the roadmap."""
        root = RoadmapNode(
            roadmap_id=roadmap.id,
            parent_node_id=None,
            title=f"{topic} Mastery Path",
            description=f"Complete learning path to master {topic}",
            node_type='root',
            position=0,
            depth=0,
            estimated_hours=roadmap.estimated_hours,
            difficulty=roadmap.difficulty_level,
            is_optional=False,
            is_core=True,
            learning_outcomes=[
                f"Understand fundamental concepts of {topic}",
                f"Apply {topic} in real-world scenarios",
                f"Build projects using {topic}",
                f"Master advanced {topic} techniques"
            ],
            meta_data={'is_root': True}
        )
        session.add(root)
        session.flush()
        return root
    
    def _generate_domains(self, topic: str) -> List[Dict[str, Any]]:
        """Generate main learning domains for a topic."""
        # This is a simplified version - in production, use AI to generate
        base_domains = [
            {
                "title": "Fundamentals",
                "description": f"Core concepts and basics of {topic}",
                "estimated_hours": 20,
                "difficulty": "beginner"
            },
            {
                "title": "Core Concepts",
                "description": f"Essential {topic} principles and practices",
                "estimated_hours": 30,
                "difficulty": "intermediate"
            },
            {
                "title": "Advanced Topics",
                "description": f"Advanced {topic} techniques and patterns",
                "estimated_hours": 30,
                "difficulty": "advanced"
            },
            {
                "title": "Practical Projects",
                "description": f"Real-world {topic} applications and projects",
                "estimated_hours": 20,
                "difficulty": "intermediate"
            }
        ]
        return base_domains
    
    def _create_domain_node(self, session, roadmap: Roadmap, parent: RoadmapNode, 
                           domain: Dict[str, Any], position: int) -> RoadmapNode:
        """Create a domain-level node."""
        node = RoadmapNode(
            roadmap_id=roadmap.id,
            parent_node_id=parent.id,
            title=domain["title"],
            description=domain["description"],
            node_type='domain',
            position=position,
            depth=1,
            estimated_hours=domain["estimated_hours"],
            difficulty=domain["difficulty"],
            is_optional=False,
            is_core=True,
            meta_data={'domain_area': True}
        )
        session.add(node)
        session.flush()
        return node
    
    def _generate_topics(self, domain: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate topics for a domain."""
        # Simplified topic generation - enhance with AI
        topics = []
        
        if "Fundamentals" in domain["title"]:
            topics = [
                {"title": "Introduction and Setup", "hours": 5},
                {"title": "Basic Syntax and Structure", "hours": 8},
                {"title": "Core Data Types", "hours": 7}
            ]
        elif "Core Concepts" in domain["title"]:
            topics = [
                {"title": "Design Patterns", "hours": 10},
                {"title": "Best Practices", "hours": 10},
                {"title": "Architecture Principles", "hours": 10}
            ]
        elif "Advanced" in domain["title"]:
            topics = [
                {"title": "Performance Optimization", "hours": 10},
                {"title": "Security Considerations", "hours": 10},
                {"title": "Scalability Patterns", "hours": 10}
            ]
        elif "Practical" in domain["title"]:
            topics = [
                {"title": "Starter Project", "hours": 5},
                {"title": "Intermediate Project", "hours": 8},
                {"title": "Capstone Project", "hours": 7}
            ]
        
        return topics
    
    def _create_topic_node(self, session, roadmap: Roadmap, parent: RoadmapNode,
                          topic: Dict[str, Any], position: int) -> RoadmapNode:
        """Create a topic-level node."""
        node = RoadmapNode(
            roadmap_id=roadmap.id,
            parent_node_id=parent.id,
            title=topic["title"],
            description=f"Learn about {topic['title']}",
            node_type='topic',
            position=position,
            depth=2,
            estimated_hours=topic["hours"],
            difficulty=parent.difficulty,
            is_optional=False,
            is_core=True,
            meta_data={'topic_area': True}
        )
        session.add(node)
        session.flush()
        return node
    
    def _generate_resources(self, topic: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate learning resources for a topic."""
        resources = [
            {
                "title": f"{topic['title']} - Video Tutorial",
                "type": "video",
                "platform": "youtube",
                "url": f"https://youtube.com/watch?v=example_{uuid.uuid4().hex[:8]}",
                "is_free": True,
                "duration_minutes": 45,
                "difficulty": "beginner",
                "rating": 4.5,
                "author": "Tech Educator"
            },
            {
                "title": f"{topic['title']} - Documentation",
                "type": "documentation",
                "platform": "official_docs",
                "url": f"https://docs.example.com/{topic['title'].lower().replace(' ', '-')}",
                "is_free": True,
                "duration_minutes": 30,
                "difficulty": "intermediate"
            },
            {
                "title": f"{topic['title']} - Interactive Course",
                "type": "course",
                "platform": "coursera",
                "url": f"https://coursera.org/learn/{uuid.uuid4().hex[:8]}",
                "is_free": False,
                "price": 49.99,
                "currency": "USD",
                "duration_minutes": 180,
                "difficulty": "intermediate",
                "rating": 4.7,
                "rating_count": 1250
            }
        ]
        return resources
    
    def _create_resource(self, session, node: RoadmapNode, resource_data: Dict[str, Any]):
        """Create a resource for a node."""
        resource = Resource(
            node_id=node.id,
            title=resource_data["title"],
            type=resource_data["type"],
            url=resource_data.get("url"),
            platform=resource_data.get("platform"),
            is_free=resource_data.get("is_free", True),
            price=resource_data.get("price"),
            currency=resource_data.get("currency"),
            duration_minutes=resource_data.get("duration_minutes"),
            difficulty=resource_data.get("difficulty"),
            rating=resource_data.get("rating"),
            rating_count=resource_data.get("rating_count"),
            author=resource_data.get("author"),
            meta_data=resource_data.get("meta_data", {})
        )
        session.add(resource)
        return resource
    
    def _roadmap_to_dict(self, roadmap: Roadmap, include_nodes: bool = False) -> Dict[str, Any]:
        """Convert roadmap to dictionary format."""
        result = roadmap.to_dict()
        
        if include_nodes:
            # Get all nodes for this roadmap
            session = self._get_session()
            nodes = session.query(RoadmapNode).filter_by(
                roadmap_id=roadmap.id
            ).order_by(RoadmapNode.depth, RoadmapNode.position).all()
            
            # Build hierarchical structure
            nodes_dict = {}
            root_nodes = []
            
            for node in nodes:
                node_dict = node.to_dict()
                
                # Get resources for this node
                resources = session.query(Resource).filter_by(node_id=node.id).all()
                node_dict['resources'] = [r.to_dict() for r in resources]
                
                nodes_dict[str(node.id)] = node_dict
                
                if node.parent_node_id is None:
                    root_nodes.append(node_dict)
                else:
                    parent_id = str(node.parent_node_id)
                    if parent_id in nodes_dict:
                        if 'children' not in nodes_dict[parent_id]:
                            nodes_dict[parent_id]['children'] = []
                        nodes_dict[parent_id]['children'].append(node_dict)
            
            result['nodes'] = root_nodes
        
        return result
    
    async def get_roadmap(self, roadmap_id: str) -> Optional[Dict[str, Any]]:
        """Get a roadmap by ID."""
        try:
            session = self._get_session()
            roadmap = session.query(Roadmap).filter_by(id=roadmap_id).first()
            
            if not roadmap:
                return None
            
            return self._roadmap_to_dict(roadmap, include_nodes=True)
            
        except Exception as e:
            logger.error(f"Error getting roadmap: {str(e)}")
            return None
        finally:
            if session:
                session.close()
    
    async def list_roadmaps(self, category: Optional[str] = None, 
                           limit: int = 10) -> List[Dict[str, Any]]:
        """List available roadmaps."""
        try:
            session = self._get_session()
            query = session.query(Roadmap)
            
            if category:
                query = query.filter_by(category=category)
            
            roadmaps = query.order_by(Roadmap.created_at.desc()).limit(limit).all()
            
            return [r.to_dict() for r in roadmaps]
            
        except Exception as e:
            logger.error(f"Error listing roadmaps: {str(e)}")
            return []
        finally:
            if session:
                session.close()
    
    async def update_roadmap_resources(self, node_id: str, 
                                      resources: List[Dict[str, Any]]) -> bool:
        """Update resources for a roadmap node."""
        try:
            session = self._get_session()
            
            # Verify node exists
            node = session.query(RoadmapNode).filter_by(id=node_id).first()
            if not node:
                return False
            
            # Add new resources
            for resource_data in resources:
                self._create_resource(session, node, resource_data)
            
            session.commit()
            return True
            
        except Exception as e:
            logger.error(f"Error updating resources: {str(e)}")
            if session:
                session.rollback()
            return False
        finally:
            if session:
                session.close()