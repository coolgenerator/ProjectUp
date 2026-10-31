"""
Roadmap Database Manager
Handles specialized database operations for roadmap data
"""

import os
import logging
from typing import Optional, Any, Dict, List
from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session
from .database import DatabaseManager, get_db

from database.connection import Base
from models.database.concept_models import (
    Source, Roadmap, Domain, Topic, Concept, ConceptResource,
    RoadmapNode  # Backward compatibility alias
)
from models.database.crawl_models import CrawlJob
from models.database.recommendation_models import LearningPathRecommendation

# Alias for backward compatibility
Resource = ConceptResource

logger = logging.getLogger(__name__)


class RoadmapDatabaseManager(DatabaseManager):
    """Extended database manager with roadmap-specific operations"""
    
    def __init__(self, connection_url: Optional[str] = None):
        """Initialize roadmap database manager"""
        super().__init__(connection_url)
        logger.info("Roadmap database manager initialized")
    
    # === Source Management ===
    
    def create_source(self, session: Session, source_data: Dict[str, Any]) -> Source:
        """Create a new source"""
        source = Source(**source_data)
        session.add(source)
        session.flush()
        return source
    
    def create_source_and_return_id(self, **source_data) -> str:
        """Create a new source and return its ID"""
        try:
            with self.get_session() as session:
                source = Source(**source_data)
                session.add(source)
                session.flush()
                logger.info(f"Created source: {source.name} with ID: {source.id}")
                return str(source.id)
        except Exception as e:
            logger.error(f"Failed to create source: {e}")
            raise
    
    def get_source(self, session: Session, source_id: UUID) -> Optional[Source]:
        """Get source by ID"""
        return session.query(Source).filter(Source.id == source_id).first()
    
    def get_active_sources(self, session: Session) -> List[Source]:
        """Get all active sources"""
        return session.query(Source).filter(Source.is_active == True).all()
    
    def get_source_by_repo_name(self, repo_name: str) -> Optional[str]:
        """Get source ID by repository name"""
        try:
            with self.get_session() as session:
                source = session.query(Source).filter(
                    Source.name.ilike(f"%{repo_name}%")
                ).first()
                return str(source.id) if source else None
        except Exception as e:
            logger.error(f"Failed to get source by repo name: {e}")
            return None
    
    def list_sources(self, is_active: bool = None) -> List[Source]:
        """List sources with optional filter"""
        try:
            with self.get_session() as session:
                query = session.query(Source)
                if is_active is not None:
                    query = query.filter(Source.is_active == is_active)
                return query.all()
        except Exception as e:
            logger.error(f"Failed to list sources: {e}")
            return []
    
    def update_source_scraped(self, source_id: str) -> bool:
        """Update source last scraped timestamp"""
        try:
            with self.get_session() as session:
                source = session.query(Source).filter(Source.id == source_id).first()
                if source:
                    source.last_scraped_at = datetime.utcnow()
                    session.flush()
                    return True
                return False
        except Exception as e:
            logger.error(f"Failed to update source scraped time: {e}")
            return False
    
    # === Roadmap Management ===
    
    def create_roadmap(self, roadmap_data: Dict[str, Any]) -> Optional[Roadmap]:
        """Create a new roadmap"""
        try:
            with self.get_session() as session:
                roadmap = Roadmap(**roadmap_data)
                session.add(roadmap)
                session.flush()
                logger.info(f"Created roadmap: {roadmap.title}")
                return roadmap
        except Exception as e:
            logger.error(f"Failed to create roadmap: {e}")
            return None
    
    def create_roadmap_and_return_id(self, **roadmap_data) -> str:
        """Create a new roadmap and return its ID"""
        try:
            with self.get_session() as session:
                roadmap = Roadmap(**roadmap_data)
                session.add(roadmap)
                session.flush()
                logger.info(f"Created roadmap: {roadmap.title} with ID: {roadmap.id}")
                return str(roadmap.id)
        except Exception as e:
            logger.error(f"Failed to create roadmap: {e}")
            raise
    
    def get_roadmap(self, roadmap_id: UUID) -> Optional[Dict[str, Any]]:
        """Get roadmap by ID"""
        try:
            with self.get_session() as session:
                roadmap = session.query(Roadmap).filter(Roadmap.id == roadmap_id).first()
                if roadmap:
                    return roadmap.to_dict()
                return None
        except Exception as e:
            logger.error(f"Failed to get roadmap: {e}")
            return None
    
    def get_roadmap_by_slug(self, slug: str) -> Optional[Dict[str, Any]]:
        """Get roadmap by slug"""
        try:
            with self.get_session() as session:
                roadmap = session.query(Roadmap).filter(Roadmap.slug == slug).first()
                if roadmap:
                    return roadmap.to_dict()
                return None
        except Exception as e:
            logger.error(f"Failed to get roadmap by slug: {e}")
            return None
    
    def update_roadmap(self, roadmap_id: UUID, update_data: Dict[str, Any]) -> bool:
        """Update a roadmap"""
        try:
            with self.get_session() as session:
                roadmap = session.query(Roadmap).filter(Roadmap.id == roadmap_id).first()
                if roadmap:
                    for key, value in update_data.items():
                        if hasattr(roadmap, key):
                            setattr(roadmap, key, value)
                    roadmap.updated_at = datetime.utcnow()
                    logger.info(f"Updated roadmap: {roadmap.title}")
                    return True
                return False
        except Exception as e:
            logger.error(f"Failed to update roadmap: {e}")
            return False
    
    def list_roadmaps(self, limit: int = 100, offset: int = 0, 
                     category: str = None, difficulty: str = None,
                     is_featured: bool = None) -> List[Dict[str, Any]]:
        """List all roadmaps with optional filters"""
        try:
            with self.get_session() as session:
                query = session.query(Roadmap)
                
                # Apply filters if provided
                if category:
                    query = query.filter(Roadmap.category == category)
                if difficulty:
                    query = query.filter(Roadmap.difficulty_level == difficulty)
                if is_featured is not None:
                    query = query.filter(Roadmap.is_featured == is_featured)
                
                roadmaps = query.limit(limit).offset(offset).all()
                return [r.to_dict() for r in roadmaps]
        except Exception as e:
            logger.error(f"Failed to list roadmaps: {e}")
            return []
    
    # === Node Management ===
    
    def create_node(self, node_data: Dict[str, Any]) -> Optional[RoadmapNode]:
        """Create a new roadmap node"""
        try:
            with self.get_session() as session:
                node = RoadmapNode(**node_data)
                session.add(node)
                session.flush()
                logger.debug(f"Created node: {node.title}")
                return node
        except Exception as e:
            logger.error(f"Failed to create node: {e}")
            return None
    
    def get_roadmap_nodes(self, roadmap_id: UUID) -> List[Dict[str, Any]]:
        """Get all nodes for a roadmap"""
        try:
            with self.get_session() as session:
                nodes = session.query(RoadmapNode).filter(
                    RoadmapNode.roadmap_id == roadmap_id
                ).all()
                return [n.to_dict() for n in nodes]
        except Exception as e:
            logger.error(f"Failed to get roadmap nodes: {e}")
            return []
    
    def get_node(self, node_id: str) -> Optional[RoadmapNode]:
        """Get node by ID"""
        try:
            with self.get_session() as session:
                return session.query(RoadmapNode).filter(RoadmapNode.id == node_id).first()
        except Exception as e:
            logger.error(f"Failed to get node: {e}")
            return None
    
    def get_child_nodes(self, parent_node_id: str) -> List[RoadmapNode]:
        """Get child nodes of a parent"""
        try:
            with self.get_session() as session:
                return session.query(RoadmapNode).filter(
                    RoadmapNode.parent_node_id == parent_node_id
                ).all()
        except Exception as e:
            logger.error(f"Failed to get child nodes: {e}")
            return []
    
    def get_node_resources(self, node_id: UUID, resource_type: str = None, is_free: bool = None) -> List[Dict[str, Any]]:
        """Get all resources for a node with optional filters"""
        try:
            with self.get_session() as session:
                query = session.query(ConceptResource).filter(ConceptResource.concept_id == node_id)
                if resource_type:
                    query = query.filter(Resource.type == resource_type)
                if is_free is not None:
                    query = query.filter(Resource.is_free == is_free)
                resources = query.all()
                return [r.to_dict() for r in resources]
        except Exception as e:
            logger.error(f"Failed to get node resources: {e}")
            return []
    
    # === Crawl Job Management ===
    
    def create_crawl_job(self, job_id: str, url: str, status: str, 
                        job_type: str = "crawl", config: Dict[str, Any] = None) -> Optional[CrawlJob]:
        """Create a new crawl job"""
        try:
            with self.get_session() as session:
                job = CrawlJob(
                    id=job_id,
                    source_id=None,  # Can be set later
                    job_type=job_type,
                    status=status,
                    config=config or {},
                    started_at=datetime.utcnow()
                )
                session.add(job)
                session.flush()
                logger.info(f"Created crawl job: {job_id}")
                return job
        except Exception as e:
            logger.error(f"Failed to create crawl job: {e}")
            return None
    
    def update_crawl_job_status(self, job_id: str, status: str, 
                               items_found: int = None, items_processed: int = None,
                               error_message: str = None) -> bool:
        """Update crawl job status"""
        try:
            with self.get_session() as session:
                job = session.query(CrawlJob).filter(CrawlJob.id == job_id).first()
                if job:
                    job.status = status
                    if items_found is not None:
                        job.pages_crawled = items_found
                    if items_processed is not None:
                        job.nodes_extracted = items_processed
                    if error_message:
                        job.error_logs = {"error": error_message}
                    if status in ["completed", "failed"]:
                        job.completed_at = datetime.utcnow()
                        if job.started_at:
                            job.duration_seconds = int(
                                (job.completed_at - job.started_at).total_seconds()
                            )
                    logger.info(f"Updated crawl job {job_id}: {status}")
                    return True
                return False
        except Exception as e:
            logger.error(f"Failed to update crawl job: {e}")
            return False
    
    def get_crawl_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get crawl job by ID"""
        try:
            with self.get_session() as session:
                job = session.query(CrawlJob).filter(CrawlJob.id == job_id).first()
                if job:
                    return {
                        "id": job.id,
                        "status": job.status,
                        "job_type": job.job_type,
                        "started_at": job.started_at,
                        "completed_at": job.completed_at,
                        "duration_seconds": job.duration_seconds,
                        "pages_crawled": job.pages_crawled,
                        "nodes_extracted": job.nodes_extracted,
                        "error_logs": job.error_logs
                    }
                return None
        except Exception as e:
            logger.error(f"Failed to get crawl job: {e}")
            return None
    
    # === Search and Discovery ===
    
    def search_roadmaps(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search roadmaps by title or description"""
        try:
            with self.get_session() as session:
                search_pattern = f"%{query}%"
                roadmaps = session.query(Roadmap).filter(
                    (Roadmap.title.ilike(search_pattern)) |
                    (Roadmap.description.ilike(search_pattern))
                ).limit(limit).all()
                return [r.to_dict() for r in roadmaps]
        except Exception as e:
            logger.error(f"Failed to search roadmaps: {e}")
            return []
    
    def get_featured_roadmaps(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get featured roadmaps"""
        try:
            with self.get_session() as session:
                roadmaps = session.query(Roadmap).filter(
                    Roadmap.is_featured == True
                ).limit(limit).all()
                return [r.to_dict() for r in roadmaps]
        except Exception as e:
            logger.error(f"Failed to get featured roadmaps: {e}")
            return []
    
    def get_roadmaps_by_category(self, category: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get roadmaps by category"""
        try:
            with self.get_session() as session:
                roadmaps = session.query(Roadmap).filter(
                    Roadmap.category == category
                ).limit(limit).all()
                return [r.to_dict() for r in roadmaps]
        except Exception as e:
            logger.error(f"Failed to get roadmaps by category: {e}")
            return []
    
    # === Resource Management ===
    
    def create_resource(self, **resource_data) -> Optional[Resource]:
        """Create a new resource"""
        try:
            with self.get_session() as session:
                resource = Resource(**resource_data)
                session.add(resource)
                session.flush()
                logger.debug(f"Created resource: {resource.title}")
                return resource
        except Exception as e:
            logger.error(f"Failed to create resource: {e}")
            return None
    
    def bulk_create_resources(self, resources: List[Dict[str, Any]]) -> List[Resource]:
        """Bulk create resources"""
        try:
            with self.get_session() as session:
                resource_objects = [Resource(**r) for r in resources]
                session.bulk_save_objects(resource_objects, return_defaults=True)
                session.flush()
                logger.info(f"Bulk created {len(resource_objects)} resources")
                return resource_objects
        except Exception as e:
            logger.error(f"Failed to bulk create resources: {e}")
            return []
    
    def get_resource(self, resource_id: str) -> Optional[Resource]:
        """Get resource by ID"""
        try:
            with self.get_session() as session:
                return session.query(Resource).filter(Resource.id == resource_id).first()
        except Exception as e:
            logger.error(f"Failed to get resource: {e}")
            return None
    
    def search_resources(self, query_text: str, platform: str = None, is_free: bool = None, limit: int = 50) -> List[Resource]:
        """Search resources by text"""
        try:
            with self.get_session() as session:
                query = session.query(Resource)
                search_pattern = f"%{query_text}%"
                query = query.filter(
                    (Resource.title.ilike(search_pattern)) |
                    (Resource.description.ilike(search_pattern))
                )
                if platform:
                    query = query.filter(Resource.platform == platform)
                if is_free is not None:
                    query = query.filter(Resource.is_free == is_free)
                return query.limit(limit).all()
        except Exception as e:
            logger.error(f"Failed to search resources: {e}")
            return []
    
    def record_interaction(self, **interaction_data) -> bool:
        """Record a resource interaction"""
        try:
            with self.get_session() as session:
                from .models.resource_models import ResourceInteraction
                interaction = ResourceInteraction(**interaction_data)
                session.add(interaction)
                session.flush()
                return True
        except Exception as e:
            logger.error(f"Failed to record interaction: {e}")
            return False
    
    def get_resource_stats(self, resource_id: str) -> Dict[str, Any]:
        """Get resource statistics"""
        try:
            with self.get_session() as session:
                from .models.resource_models import ResourceInteraction
                from sqlalchemy import func
                
                stats = session.query(
                    func.count(ResourceInteraction.id).label('total_interactions'),
                    func.avg(ResourceInteraction.rating).label('avg_rating'),
                    func.sum(ResourceInteraction.completion_time).label('total_completion_time')
                ).filter(ResourceInteraction.resource_id == resource_id).first()
                
                return {
                    'total_interactions': stats.total_interactions or 0,
                    'average_rating': float(stats.avg_rating) if stats.avg_rating else None,
                    'total_completion_time': stats.total_completion_time or 0
                }
        except Exception as e:
            logger.error(f"Failed to get resource stats: {e}")
            return {}
    
    # === Crawl Job Extended Management ===
    
    def list_crawl_jobs(self, status: str = None, source_id: str = None, limit: int = 100) -> List[CrawlJob]:
        """List crawl jobs with optional filters"""
        try:
            with self.get_session() as session:
                query = session.query(CrawlJob)
                if status:
                    query = query.filter(CrawlJob.status == status)
                if source_id:
                    query = query.filter(CrawlJob.source_id == source_id)
                return query.limit(limit).all()
        except Exception as e:
            logger.error(f"Failed to list crawl jobs: {e}")
            return []
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get overall database statistics"""
        try:
            with self.get_session() as session:
                roadmap_count = session.query(Roadmap).count()
                node_count = session.query(RoadmapNode).count()
                resource_count = session.query(Resource).count()
                source_count = session.query(Source).count()
                
                return {
                    'total_roadmaps': roadmap_count,
                    'total_nodes': node_count,
                    'total_resources': resource_count,
                    'total_sources': source_count
                }
        except Exception as e:
            logger.error(f"Failed to get statistics: {e}")
            return {}


# Singleton instance for roadmap database
_roadmap_db_instance = None

def get_roadmap_db() -> RoadmapDatabaseManager:
    """Get singleton roadmap database instance"""
    global _roadmap_db_instance
    if _roadmap_db_instance is None:
        _roadmap_db_instance = RoadmapDatabaseManager()
    return _roadmap_db_instance