"""
PGVector Store Manager
Manages pgvector-based vector store for semantic search and RAG
"""

import logging
import uuid
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, text, and_, or_
from pgvector.sqlalchemy import Vector

from models.database.embedding_models import DocumentChunk
from database.connection import get_db_context

logger = logging.getLogger(__name__)


class PGVectorStoreManager:
    """
    Manages vector store operations using PostgreSQL pgvector

    Features:
    - Document storage with embeddings
    - Semantic search using cosine similarity
    - Project-based collections via source_type filtering
    - Metadata filtering
    - Citation tracking
    """

    def __init__(
        self,
        embedding_model: str = "text-embedding-004",
        embedding_dimension: int = 768
    ):
        """
        Initialize pgvector store manager

        Args:
            embedding_model: Model used for generating embeddings
            embedding_dimension: Dimension of embedding vectors
        """
        self.embedding_model = embedding_model
        self.embedding_dimension = embedding_dimension

        logger.info(f"PGVector store initialized with model: {embedding_model}")

    def _get_embedding_function(self):
        """
        Get embedding function for generating vectors
        Note: You'll need to implement this based on your embedding service
        """
        # This should integrate with your existing embedding service
        # For now, we'll assume embeddings are provided by the caller
        raise NotImplementedError(
            "Embedding generation should be handled by the caller. "
            "Pass pre-generated embeddings to add_documents()."
        )

    def add_documents(
        self,
        project_id: str,
        documents: List[str],
        embeddings: List[List[float]],
        metadatas: List[Dict[str, Any]],
        ids: Optional[List[str]] = None,
        collection_type: str = "documents"
    ) -> List[str]:
        """
        Add documents to the vector store

        Args:
            project_id: Project identifier
            documents: List of document texts
            embeddings: List of embedding vectors (must match documents length)
            metadatas: List of metadata dicts for each document
            ids: Optional list of document IDs
            collection_type: Type of collection (stored in source_type)

        Returns:
            List of document IDs
        """
        if not documents:
            return []

        if len(documents) != len(embeddings):
            raise ValueError("Documents and embeddings must have the same length")

        if ids is None:
            ids = [str(uuid.uuid4()) for _ in documents]

        try:
            with get_db_context() as db:
                chunks = []
                for i, (doc_id, text, embedding, metadata) in enumerate(
                    zip(ids, documents, embeddings, metadatas)
                ):
                    # Merge project_id into metadata
                    full_metadata = {**metadata, "project_id": project_id}

                    chunk = DocumentChunk(
                        id=uuid.UUID(doc_id) if doc_id else uuid.uuid4(),
                        source_type=collection_type,
                        source_id=uuid.UUID(project_id) if project_id else None,
                        content=text,
                        embedding=embedding,
                        model_name=self.embedding_model,
                        chunk_metadata=full_metadata,
                        chunk_index=i,
                        total_chunks=len(documents)
                    )
                    chunks.append(chunk)

                db.add_all(chunks)
                db.commit()

                logger.info(
                    f"Added {len(chunks)} documents to project {project_id}, "
                    f"collection {collection_type}"
                )
                return ids

        except Exception as e:
            logger.error(f"Error adding documents: {e}")
            raise

    def semantic_search(
        self,
        project_id: str,
        query_embedding: List[float],
        n_results: int = 5,
        collection_type: str = "documents",
        where: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Perform semantic search using cosine similarity

        Args:
            project_id: Project identifier
            query_embedding: Query embedding vector
            n_results: Number of results to return
            collection_type: Type of collection to search
            where: Metadata filters (JSON path queries)

        Returns:
            Dict with documents, metadatas, distances, and ids
        """
        try:
            with get_db_context() as db:
                # Build base query
                query = db.query(
                    DocumentChunk,
                    DocumentChunk.embedding.cosine_distance(query_embedding).label('distance')
                ).filter(
                    DocumentChunk.source_type == collection_type,
                    DocumentChunk.chunk_metadata['project_id'].astext == project_id
                )

                # Apply metadata filters if provided
                if where:
                    for key, value in where.items():
                        query = query.filter(
                            DocumentChunk.chunk_metadata[key].astext == str(value)
                        )

                # Order by similarity and limit
                results = query.order_by('distance').limit(n_results).all()

                # Format results
                formatted_results = {
                    "documents": [chunk.content for chunk, _ in results],
                    "metadatas": [chunk.chunk_metadata for chunk, _ in results],
                    "distances": [float(distance) for _, distance in results],
                    "ids": [str(chunk.id) for chunk, _ in results]
                }

                logger.info(f"Found {len(results)} results for query in project {project_id}")
                return formatted_results

        except Exception as e:
            logger.error(f"Error in semantic search: {e}")
            return {
                "documents": [],
                "metadatas": [],
                "distances": [],
                "ids": []
            }

    def get_relevant_context(
        self,
        project_id: str,
        query_embedding: List[float],
        max_chunks: int = 5,
        collection_type: str = "documents"
    ) -> List[Dict[str, Any]]:
        """
        Get relevant context chunks for a query

        Args:
            project_id: Project identifier
            query_embedding: Query embedding vector
            max_chunks: Maximum number of chunks to return
            collection_type: Type of collection

        Returns:
            List of context chunks with metadata
        """
        results = self.semantic_search(
            project_id=project_id,
            query_embedding=query_embedding,
            n_results=max_chunks,
            collection_type=collection_type
        )

        context_chunks = []
        for i, (doc, metadata, distance) in enumerate(zip(
            results["documents"],
            results["metadatas"],
            results["distances"]
        )):
            context_chunks.append({
                "content": doc,
                "metadata": metadata,
                "relevance_score": 1 - distance,  # Convert distance to similarity
                "rank": i + 1,
                "source": metadata.get("source", "unknown"),
                "chunk_id": metadata.get("chunk_id", ""),
                "document_id": metadata.get("document_id", "")
            })

        return context_chunks

    def delete_document(
        self,
        project_id: str,
        document_id: str,
        collection_type: str = "documents"
    ) -> bool:
        """
        Delete a document and all its chunks

        Args:
            project_id: Project identifier
            document_id: Document identifier
            collection_type: Type of collection

        Returns:
            Success status
        """
        try:
            with get_db_context() as db:
                # Find all chunks for this document
                chunks = db.query(DocumentChunk).filter(
                    DocumentChunk.source_type == collection_type,
                    DocumentChunk.chunk_metadata['project_id'].astext == project_id,
                    DocumentChunk.chunk_metadata['document_id'].astext == document_id
                ).all()

                if chunks:
                    for chunk in chunks:
                        db.delete(chunk)
                    db.commit()
                    logger.info(f"Deleted {len(chunks)} chunks for document {document_id}")
                    return True
                else:
                    logger.warning(f"No chunks found for document {document_id}")
                    return False

        except Exception as e:
            logger.error(f"Error deleting document: {e}")
            return False

    def get_collection_stats(
        self,
        project_id: str,
        collection_type: str = "documents"
    ) -> Dict[str, Any]:
        """
        Get statistics about a collection

        Args:
            project_id: Project identifier
            collection_type: Type of collection

        Returns:
            Statistics dict
        """
        try:
            with get_db_context() as db:
                # Count total chunks
                total_chunks = db.query(func.count(DocumentChunk.id)).filter(
                    DocumentChunk.source_type == collection_type,
                    DocumentChunk.chunk_metadata['project_id'].astext == project_id
                ).scalar()

                # Get unique documents
                unique_docs_query = db.query(
                    func.distinct(DocumentChunk.chunk_metadata['document_id'].astext)
                ).filter(
                    DocumentChunk.source_type == collection_type,
                    DocumentChunk.chunk_metadata['project_id'].astext == project_id,
                    DocumentChunk.chunk_metadata.has_key('document_id')
                )

                unique_documents = unique_docs_query.count()

                return {
                    "total_chunks": total_chunks or 0,
                    "unique_documents": unique_documents or 0,
                    "collection_name": f"{project_id}_{collection_type}",
                    "project_id": project_id,
                    "collection_type": collection_type
                }

        except Exception as e:
            logger.error(f"Error getting collection stats: {e}")
            return {
                "total_chunks": 0,
                "unique_documents": 0,
                "error": str(e)
            }

    def update_document_metadata(
        self,
        project_id: str,
        document_id: str,
        new_metadata: Dict[str, Any],
        collection_type: str = "documents"
    ) -> bool:
        """
        Update metadata for all chunks of a document

        Args:
            project_id: Project identifier
            document_id: Document identifier
            new_metadata: New metadata to merge
            collection_type: Type of collection

        Returns:
            Success status
        """
        try:
            with get_db_context() as db:
                # Find all chunks for this document
                chunks = db.query(DocumentChunk).filter(
                    DocumentChunk.source_type == collection_type,
                    DocumentChunk.chunk_metadata['project_id'].astext == project_id,
                    DocumentChunk.chunk_metadata['document_id'].astext == document_id
                ).all()

                if not chunks:
                    logger.warning(f"No chunks found for document {document_id}")
                    return False

                # Update each chunk's metadata
                for chunk in chunks:
                    chunk.chunk_metadata = {**chunk.chunk_metadata, **new_metadata}

                db.commit()
                logger.info(f"Updated metadata for {len(chunks)} chunks")
                return True

        except Exception as e:
            logger.error(f"Error updating metadata: {e}")
            return False

    def search_with_filters(
        self,
        project_id: str,
        query_embedding: List[float],
        filters: Dict[str, Any],
        n_results: int = 5,
        collection_type: str = "documents"
    ) -> List[Dict[str, Any]]:
        """
        Search with metadata filters

        Args:
            project_id: Project identifier
            query_embedding: Query embedding vector
            filters: Metadata filters
            n_results: Number of results
            collection_type: Type of collection

        Returns:
            List of matching documents
        """
        results = self.semantic_search(
            project_id=project_id,
            query_embedding=query_embedding,
            n_results=n_results,
            collection_type=collection_type,
            where=filters
        )

        return self._format_search_results(results)

    def _format_search_results(self, results: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Format search results into a clean list"""
        formatted = []
        for doc, metadata, distance, doc_id in zip(
            results["documents"],
            results["metadatas"],
            results["distances"],
            results["ids"]
        ):
            formatted.append({
                "id": doc_id,
                "content": doc,
                "metadata": metadata,
                "relevance_score": 1 - distance,
                "source": metadata.get("source", "unknown")
            })
        return formatted

    def clear_collection(
        self,
        project_id: str,
        collection_type: str = "documents"
    ) -> bool:
        """
        Clear all documents from a collection

        Args:
            project_id: Project identifier
            collection_type: Type of collection

        Returns:
            Success status
        """
        try:
            with get_db_context() as db:
                # Delete all chunks for this project and collection
                deleted_count = db.query(DocumentChunk).filter(
                    DocumentChunk.source_type == collection_type,
                    DocumentChunk.chunk_metadata['project_id'].astext == project_id
                ).delete(synchronize_session=False)

                db.commit()
                logger.info(
                    f"Cleared collection {project_id}_{collection_type}: "
                    f"deleted {deleted_count} chunks"
                )
                return True

        except Exception as e:
            logger.error(f"Error clearing collection: {e}")
            return False
