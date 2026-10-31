"""
Node Template Service

Handles template management, embedding generation, and semantic search.
"""

import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text, or_, and_
from models.database.node_template import NodeTemplate, TemplateCategory, TemplateUsageLog
from services.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)


class TemplateService:
    """
    Service for managing node templates with semantic search capabilities.
    """

    def __init__(self, db: Session):
        self.db = db
        self.embedding_service = EmbeddingService()

    def create_template(
        self,
        template_id: str,
        name: str,
        description: str,
        category: str,
        subcategory: Optional[str] = None,
        icon: Optional[str] = None,
        color: Optional[str] = None,
        prompt: Optional[str] = None,
        rationale: Optional[str] = None,
        priority: int = 2,
        tags: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> NodeTemplate:
        """
        Create a new template with embedding.

        Args:
            template_id: Unique template identifier
            name: Template name
            description: Template description
            category: Main category (business, marketing, etc.)
            subcategory: Optional subcategory
            icon: Optional emoji icon
            color: Optional color hex code
            prompt: Optional prompt template
            rationale: Optional rationale text
            priority: Priority level (1-3)
            tags: Optional list of tags
            metadata: Optional metadata dictionary

        Returns:
            Created NodeTemplate instance
        """
        try:
            # Generate embedding for template
            embedding_text = f"{name} {description} {prompt or ''} {rationale or ''}"
            embedding = self.embedding_service.generate_embedding(embedding_text)

            # Create template - node_type will be set to None by default
            template = NodeTemplate(
                id=template_id,
                name=name,
                description=description,
                category=category,
                subcategory=subcategory,
                icon=icon,
                color=color,
                prompt=prompt,
                rationale=rationale,
                priority=priority,
                tags=tags or [],
                metadata=metadata or {},
                embedding=embedding,
                is_active=True,
                usage_count=0,
            )

            self.db.add(template)
            self.db.commit()
            self.db.refresh(template)

            logger.info(f"Created template: {template_id}")
            return template

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating template: {e}")
            raise

    def get_template(self, template_id: str) -> Optional[NodeTemplate]:
        """Get template by ID"""
        return self.db.query(NodeTemplate).filter(
            NodeTemplate.id == template_id,
            NodeTemplate.is_active == True
        ).first()

    def get_templates_by_category(
        self,
        category: Optional[str] = None,
        subcategory: Optional[str] = None,
        limit: int = 50
    ) -> List[NodeTemplate]:
        """
        Get templates by category.

        Args:
            category: Main category (if None, returns all)
            subcategory: Optional subcategory filter
            limit: Maximum number of templates to return

        Returns:
            List of NodeTemplate instances
        """
        query = self.db.query(NodeTemplate).filter(NodeTemplate.is_active == True)

        if category and category != 'all':
            query = query.filter(NodeTemplate.category == category)

        if subcategory:
            query = query.filter(NodeTemplate.subcategory == subcategory)

        return query.order_by(NodeTemplate.priority.asc(), NodeTemplate.usage_count.desc()).limit(limit).all()

    def semantic_search(
        self,
        query: str,
        category: Optional[str] = None,
        limit: int = 20,
        threshold: float = 0.7
    ) -> List[Dict[str, Any]]:
        """
        Semantic search for templates using embeddings.

        Args:
            query: Search query text
            category: Optional category filter
            limit: Maximum results to return
            threshold: Minimum similarity threshold (0-1)

        Returns:
            List of templates with similarity scores
        """
        try:
            # Generate embedding for query
            query_embedding = self.embedding_service.generate_embedding(query)

            # Build SQL query with vector similarity
            sql = """
                SELECT
                    id, name, description, category, subcategory,
                    icon, color, prompt, rationale, priority, tags, metadata,
                    usage_count, is_active,
                    1 - (embedding <=> :query_embedding) as similarity
                FROM node_templates
                WHERE is_active = true
            """

            params = {"query_embedding": query_embedding, "limit": limit}

            # Add category filter if specified
            if category and category != 'all':
                sql += " AND category = :category"
                params["category"] = category

            # Add similarity threshold and ordering
            sql += """
                AND 1 - (embedding <=> :query_embedding) >= :threshold
                ORDER BY similarity DESC, priority ASC, usage_count DESC
                LIMIT :limit
            """
            params["threshold"] = threshold

            result = self.db.execute(text(sql), params)
            rows = result.fetchall()

            # Convert to dictionaries
            templates = []
            for row in rows:
                templates.append({
                    "id": row.id,
                    "name": row.name,
                    "description": row.description,
                    "category": row.category,
                    "subcategory": row.subcategory,
                    "icon": row.icon,
                    "color": row.color,
                    "prompt": row.prompt,
                    "rationale": row.rationale,
                    "priority": row.priority,
                    "tags": row.tags,
                    "metadata": row.metadata,
                    "usage_count": row.usage_count,
                    "similarity": float(row.similarity),
                })

            logger.info(f"Semantic search found {len(templates)} templates for query: {query[:50]}")
            return templates

        except Exception as e:
            logger.error(f"Error in semantic search: {e}")
            # Fallback to keyword search
            return self._keyword_search(query, category, limit)

    def _keyword_search(
        self,
        query: str,
        category: Optional[str] = None,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Fallback keyword search when embeddings are not available.

        Args:
            query: Search query text
            category: Optional category filter
            limit: Maximum results to return

        Returns:
            List of templates
        """
        query_lower = query.lower()
        q = self.db.query(NodeTemplate).filter(NodeTemplate.is_active == True)

        # Keyword filter
        q = q.filter(
            or_(
                NodeTemplate.name.ilike(f"%{query}%"),
                NodeTemplate.description.ilike(f"%{query}%"),
                NodeTemplate.prompt.ilike(f"%{query}%"),
            )
        )

        # Category filter
        if category and category != 'all':
            q = q.filter(NodeTemplate.category == category)

        templates = q.order_by(NodeTemplate.priority.asc(), NodeTemplate.usage_count.desc()).limit(limit).all()

        return [
            {
                **template.to_dict(),
                "similarity": 0.5,  # Default similarity for keyword search
            }
            for template in templates
        ]

    def get_all_categories(self) -> List[Dict[str, Any]]:
        """
        Get all template categories with counts.

        Returns:
            List of category dictionaries with template counts
        """
        # Get category counts
        sql = """
            SELECT category, COUNT(*) as count
            FROM node_templates
            WHERE is_active = true
            GROUP BY category
            ORDER BY category
        """

        result = self.db.execute(text(sql))
        rows = result.fetchall()

        # Build category list
        categories = [
            {
                "id": "all",
                "name": "All Templates",
                "count": sum(row.count for row in rows),
                "icon": "📚"
            }
        ]

        # Add individual categories
        category_icons = {
            "business": "💼",
            "marketing": "📢",
            "academy": "🎓",
            "product": "⚙️",
            "personal": "🎯",
            "development": "💻",
            "research": "🔬",
        }

        for row in rows:
            categories.append({
                "id": row.category,
                "name": row.category.capitalize(),
                "count": row.count,
                "icon": category_icons.get(row.category, "📌")
            })

        return categories

    def log_template_usage(
        self,
        template_id: str,
        project_id: Optional[int] = None,
        user_id: Optional[str] = None,
        node_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Log template usage and increment usage count.

        Args:
            template_id: Template ID
            project_id: Optional project ID
            user_id: Optional user ID
            node_id: Optional created node ID
            context: Optional context dictionary
        """
        try:
            # Create usage log entry
            log_entry = TemplateUsageLog(
                template_id=template_id,
                project_id=project_id,
                user_id=user_id,
                node_id=node_id,
                context=context or {}
            )
            self.db.add(log_entry)

            # Increment usage count
            template = self.get_template(template_id)
            if template:
                template.usage_count += 1

            self.db.commit()
            logger.info(f"Logged usage for template: {template_id}")

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error logging template usage: {e}")

    def update_template_embedding(self, template_id: str) -> bool:
        """
        Regenerate embedding for a template.

        Args:
            template_id: Template ID

        Returns:
            True if successful, False otherwise
        """
        try:
            template = self.get_template(template_id)
            if not template:
                return False

            # Regenerate embedding
            embedding_text = f"{template.name} {template.description} {template.prompt or ''} {template.rationale or ''}"
            embedding = self.embedding_service.generate_embedding(embedding_text)

            template.embedding = embedding
            self.db.commit()

            logger.info(f"Updated embedding for template: {template_id}")
            return True

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating template embedding: {e}")
            return False

    def bulk_create_templates(self, templates: List[Dict[str, Any]]) -> int:
        """
        Bulk create templates from list.

        Args:
            templates: List of template dictionaries

        Returns:
            Number of templates created
        """
        created_count = 0
        for template_data in templates:
            try:
                self.create_template(**template_data)
                created_count += 1
            except Exception as e:
                logger.error(f"Error creating template {template_data.get('template_id')}: {e}")
                continue

        return created_count
