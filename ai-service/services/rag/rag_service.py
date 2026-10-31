"""
RAG Service
Retrieval Augmented Generation service for enhanced AI responses
"""

import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from services.rag.pgvector_store_manager import PGVectorStoreManager
from services.rag.document_processor import DocumentProcessor
from services.embedding_service import EmbeddingService
from langchain_core.documents import Document

logger = logging.getLogger(__name__)


class RAGService:
    """
    RAG Service for retrieval-augmented generation

    Features:
    - Semantic search across uploaded documents
    - Context-aware responses with citations
    - Multi-source document retrieval
    - Relevance scoring
    """

    def __init__(
        self,
        db: Optional[Session] = None,
        chunk_size: int = 1000,
        chunk_overlap: int = 200
    ):
        """
        Initialize RAG service

        Args:
            db: Database session (optional)
            chunk_size: Size of document chunks
            chunk_overlap: Overlap between chunks
        """
        self.db = db
        self.vector_store = PGVectorStoreManager(
            embedding_model="text-embedding-004",
            embedding_dimension=768
        )
        self.embedding_service = EmbeddingService()
        self.document_processor = DocumentProcessor(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )

        logger.info("RAG service initialized with pgvector backend")

    def index_document(
        self,
        project_id: str,
        file_path: str,
        metadata: Optional[Dict[str, Any]] = None,
        collection_type: str = "documents"
    ) -> Dict[str, Any]:
        """
        Index a document for semantic search

        Args:
            project_id: Project identifier
            file_path: Path to document file
            metadata: Optional metadata
            collection_type: Type of collection

        Returns:
            Indexing result with stats
        """
        try:
            # Process document
            chunks = self.document_processor.process_document(
                file_path=file_path,
                metadata=metadata,
                chunk=True
            )

            if not chunks:
                return {
                    "success": False,
                    "error": "No content extracted from document",
                    "chunks_indexed": 0
                }

            # Prepare for vector store
            texts = [chunk.page_content for chunk in chunks]
            metadatas = [chunk.metadata for chunk in chunks]

            # Generate embeddings
            embeddings = self.embedding_service.generate_embeddings_batch(texts)

            # Add to vector store
            doc_ids = self.vector_store.add_documents(
                project_id=project_id,
                documents=texts,
                embeddings=embeddings,
                metadatas=metadatas,
                collection_type=collection_type
            )

            # Get summary
            summary = self.document_processor.get_document_summary(chunks)

            logger.info(f"Indexed document {file_path}: {len(chunks)} chunks")

            return {
                "success": True,
                "document_id": chunks[0].metadata.get("document_id", "unknown"),
                "chunks_indexed": len(chunks),
                "chunk_ids": doc_ids,
                "summary": summary
            }

        except Exception as e:
            logger.error(f"Error indexing document: {e}")
            return {
                "success": False,
                "error": str(e),
                "chunks_indexed": 0
            }

    def index_text_content(
        self,
        project_id: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
        collection_type: str = "documents"
    ) -> Dict[str, Any]:
        """
        Index text content directly (e.g., from API)

        Args:
            project_id: Project identifier
            content: Text content to index
            metadata: Optional metadata
            collection_type: Type of collection

        Returns:
            Indexing result
        """
        try:
            # Process content
            chunks = self.document_processor.extract_text_from_content(
                content=content,
                metadata=metadata,
                chunk=True
            )

            if not chunks:
                return {
                    "success": False,
                    "error": "No content to index",
                    "chunks_indexed": 0
                }

            # Prepare for vector store
            texts = [chunk.page_content for chunk in chunks]
            metadatas = [chunk.metadata for chunk in chunks]

            # Generate embeddings
            embeddings = self.embedding_service.generate_embeddings_batch(texts)

            # Add to vector store
            doc_ids = self.vector_store.add_documents(
                project_id=project_id,
                documents=texts,
                embeddings=embeddings,
                metadatas=metadatas,
                collection_type=collection_type
            )

            logger.info(f"Indexed text content: {len(chunks)} chunks")

            return {
                "success": True,
                "chunks_indexed": len(chunks),
                "chunk_ids": doc_ids
            }

        except Exception as e:
            logger.error(f"Error indexing text content: {e}")
            return {
                "success": False,
                "error": str(e),
                "chunks_indexed": 0
            }

    def retrieve_relevant_context(
        self,
        project_id: str,
        query: str,
        max_chunks: int = 5,
        collection_type: str = "documents",
        min_relevance: float = 0.3
    ) -> List[Dict[str, Any]]:
        """
        Retrieve relevant context for a query

        Args:
            project_id: Project identifier
            query: User query
            max_chunks: Maximum chunks to retrieve
            collection_type: Type of collection
            min_relevance: Minimum relevance score (0-1)

        Returns:
            List of relevant context chunks with metadata
        """
        try:
            # Generate query embedding
            query_embedding = self.embedding_service.generate_embedding(query)

            context_chunks = self.vector_store.get_relevant_context(
                project_id=project_id,
                query_embedding=query_embedding,
                max_chunks=max_chunks,
                collection_type=collection_type
            )

            # Filter by relevance
            filtered_chunks = [
                chunk for chunk in context_chunks
                if chunk["relevance_score"] >= min_relevance
            ]

            logger.info(
                f"Retrieved {len(filtered_chunks)}/{len(context_chunks)} "
                f"relevant chunks (min_relevance={min_relevance})"
            )

            return filtered_chunks

        except Exception as e:
            logger.error(f"Error retrieving context: {e}")
            return []

    def format_context_for_prompt(
        self,
        context_chunks: List[Dict[str, Any]],
        include_sources: bool = True
    ) -> str:
        """
        Format retrieved context for LLM prompt

        Args:
            context_chunks: List of context chunks
            include_sources: Whether to include source citations

        Returns:
            Formatted context string
        """
        if not context_chunks:
            return ""

        lines = ["## Retrieved Context from Documents:\n"]

        for i, chunk in enumerate(context_chunks, 1):
            lines.append(f"### Context {i} (Relevance: {chunk['relevance_score']:.2f})")

            if include_sources and chunk.get("source"):
                source = chunk["source"]
                file_name = chunk["metadata"].get("file_name", "unknown")
                lines.append(f"**Source:** {file_name}")

                if chunk["metadata"].get("page"):
                    lines.append(f"**Page:** {chunk['metadata']['page']}")

            lines.append(f"\n{chunk['content']}\n")

        return "\n".join(lines)

    def augment_query_with_context(
        self,
        project_id: str,
        query: str,
        max_chunks: int = 3,
        collection_type: str = "documents"
    ) -> Dict[str, Any]:
        """
        Augment a query with relevant context

        Args:
            project_id: Project identifier
            query: User query
            max_chunks: Maximum context chunks
            collection_type: Type of collection

        Returns:
            Dict with augmented prompt and sources
        """
        # Retrieve relevant context
        context_chunks = self.retrieve_relevant_context(
            project_id=project_id,
            query=query,
            max_chunks=max_chunks,
            collection_type=collection_type
        )

        if not context_chunks:
            return {
                "augmented_prompt": query,
                "has_context": False,
                "sources": [],
                "context_used": 0
            }

        # Format context
        formatted_context = self.format_context_for_prompt(context_chunks)

        # Build augmented prompt
        augmented_prompt = f"""{formatted_context}

## User Question:
{query}

Please answer the question based on the retrieved context above. If the context doesn't contain relevant information, you can use your general knowledge but mention this."""

        # Extract sources
        sources = []
        for chunk in context_chunks:
            source_info = {
                "file_name": chunk["metadata"].get("file_name", "unknown"),
                "source": chunk.get("source", ""),
                "relevance": chunk["relevance_score"],
                "page": chunk["metadata"].get("page")
            }
            sources.append(source_info)

        return {
            "augmented_prompt": augmented_prompt,
            "has_context": True,
            "sources": sources,
            "context_used": len(context_chunks),
            "context_chunks": context_chunks
        }

    def search_documents(
        self,
        project_id: str,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        n_results: int = 10,
        collection_type: str = "documents"
    ) -> List[Dict[str, Any]]:
        """
        Search documents with optional filters

        Args:
            project_id: Project identifier
            query: Search query
            filters: Metadata filters
            n_results: Number of results
            collection_type: Type of collection

        Returns:
            List of search results
        """
        # Generate query embedding
        query_embedding = self.embedding_service.generate_embedding(query)

        if filters:
            results = self.vector_store.search_with_filters(
                project_id=project_id,
                query_embedding=query_embedding,
                filters=filters,
                n_results=n_results,
                collection_type=collection_type
            )
        else:
            search_results = self.vector_store.semantic_search(
                project_id=project_id,
                query_embedding=query_embedding,
                n_results=n_results,
                collection_type=collection_type
            )
            results = self.vector_store._format_search_results(search_results)

        return results

    def delete_document(
        self,
        project_id: str,
        document_id: str,
        collection_type: str = "documents"
    ) -> bool:
        """
        Delete a document from the vector store

        Args:
            project_id: Project identifier
            document_id: Document identifier
            collection_type: Type of collection

        Returns:
            Success status
        """
        return self.vector_store.delete_document(
            project_id=project_id,
            document_id=document_id,
            collection_type=collection_type
        )

    def get_collection_info(
        self,
        project_id: str,
        collection_type: str = "documents"
    ) -> Dict[str, Any]:
        """
        Get information about a collection

        Args:
            project_id: Project identifier
            collection_type: Type of collection

        Returns:
            Collection statistics
        """
        return self.vector_store.get_collection_stats(
            project_id=project_id,
            collection_type=collection_type
        )

    def clear_project_documents(
        self,
        project_id: str,
        collection_type: str = "documents"
    ) -> bool:
        """
        Clear all documents for a project

        Args:
            project_id: Project identifier
            collection_type: Type of collection

        Returns:
            Success status
        """
        return self.vector_store.clear_collection(
            project_id=project_id,
            collection_type=collection_type
        )
