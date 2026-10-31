"""
RAG Routes
API endpoints for document upload, indexing, and semantic search
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from pathlib import Path
import logging
import tempfile
import uuid

from database.session import get_session
from services.rag import RAGService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai-api/rag", tags=["rag"])


# === Request/Response Models ===

class DocumentIndexRequest(BaseModel):
    """Request to index text content"""
    project_id: str = Field(..., description="Project identifier")
    content: str = Field(..., min_length=1, description="Text content to index")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Optional metadata")
    collection_type: str = Field("documents", description="Collection type")


class SearchRequest(BaseModel):
    """Request to search documents"""
    project_id: str = Field(..., description="Project identifier")
    query: str = Field(..., min_length=1, description="Search query")
    n_results: int = Field(10, ge=1, le=50, description="Number of results")
    filters: Optional[Dict[str, Any]] = Field(None, description="Metadata filters")
    collection_type: str = Field("documents", description="Collection type")


class DeleteDocumentRequest(BaseModel):
    """Request to delete a document"""
    project_id: str = Field(..., description="Project identifier")
    document_id: str = Field(..., description="Document identifier")
    collection_type: str = Field("documents", description="Collection type")


class CollectionInfoRequest(BaseModel):
    """Request for collection information"""
    project_id: str = Field(..., description="Project identifier")
    collection_type: str = Field("documents", description="Collection type")


# === Helper Functions ===

async def get_rag_service(db: Session = Depends(get_session)) -> RAGService:
    """Get RAG service instance"""
    return RAGService(db=db)


# === Endpoints ===

@router.post("/upload-document")
async def upload_document(
    project_id: str = Form(...),
    file: UploadFile = File(...),
    metadata: Optional[str] = Form(None),  # JSON string
    collection_type: str = Form("documents"),
    rag_service: RAGService = Depends(get_rag_service)
):
    """
    Upload and index a document

    Supports:
    - PDF (.pdf)
    - Word (.docx)
    - Markdown (.md)
    - Text files (.txt)
    - Code files (.py, .js, .ts, etc.)

    The document will be:
    1. Saved temporarily
    2. Processed and chunked
    3. Embedded and indexed in vector store
    4. Made searchable via semantic search
    """
    try:
        # Parse metadata if provided
        import json
        metadata_dict = json.loads(metadata) if metadata else {}

        # Add file metadata
        metadata_dict["file_name"] = file.filename
        metadata_dict["content_type"] = file.content_type

        # Save uploaded file temporarily
        suffix = Path(file.filename).suffix
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name

        try:
            # Index document
            result = rag_service.index_document(
                project_id=project_id,
                file_path=tmp_path,
                metadata=metadata_dict,
                collection_type=collection_type
            )

            # Clean up temp file
            Path(tmp_path).unlink()

            if result["success"]:
                return {
                    "success": True,
                    "message": f"Document indexed successfully: {file.filename}",
                    "document_id": result["document_id"],
                    "chunks_indexed": result["chunks_indexed"],
                    "summary": result["summary"]
                }
            else:
                raise HTTPException(status_code=400, detail=result.get("error", "Indexing failed"))

        except Exception as e:
            # Clean up temp file on error
            if Path(tmp_path).exists():
                Path(tmp_path).unlink()
            raise

    except Exception as e:
        logger.error(f"Error uploading document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/index-text")
async def index_text(
    request: DocumentIndexRequest,
    rag_service: RAGService = Depends(get_rag_service)
):
    """
    Index text content directly

    Useful for:
    - Chat conversations
    - Notes
    - Code snippets
    - Any text content without a file
    """
    try:
        result = rag_service.index_text_content(
            project_id=request.project_id,
            content=request.content,
            metadata=request.metadata,
            collection_type=request.collection_type
        )

        if result["success"]:
            return {
                "success": True,
                "message": "Text content indexed successfully",
                "chunks_indexed": result["chunks_indexed"]
            }
        else:
            raise HTTPException(status_code=400, detail=result.get("error", "Indexing failed"))

    except Exception as e:
        logger.error(f"Error indexing text: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search")
async def search_documents(
    request: SearchRequest,
    rag_service: RAGService = Depends(get_rag_service)
):
    """
    Perform semantic search across indexed documents

    Returns relevant document chunks with:
    - Content
    - Metadata (source, file name, page, etc.)
    - Relevance score
    - Source citations
    """
    try:
        results = rag_service.search_documents(
            project_id=request.project_id,
            query=request.query,
            filters=request.filters,
            n_results=request.n_results,
            collection_type=request.collection_type
        )

        return {
            "success": True,
            "query": request.query,
            "results_count": len(results),
            "results": results
        }

    except Exception as e:
        logger.error(f"Error searching documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/retrieve-context")
async def retrieve_context(
    request: SearchRequest,
    rag_service: RAGService = Depends(get_rag_service)
):
    """
    Retrieve relevant context for RAG-augmented responses

    Similar to search but optimized for LLM context:
    - Filters by relevance threshold
    - Returns formatted context
    - Includes source citations
    """
    try:
        # Use smaller n_results for context (typically 3-5)
        n_results = min(request.n_results, 5)

        context_chunks = rag_service.retrieve_relevant_context(
            project_id=request.project_id,
            query=request.query,
            max_chunks=n_results,
            collection_type=request.collection_type,
            min_relevance=0.3
        )

        # Format for LLM
        formatted_context = rag_service.format_context_for_prompt(context_chunks)

        return {
            "success": True,
            "query": request.query,
            "chunks_retrieved": len(context_chunks),
            "context_chunks": context_chunks,
            "formatted_context": formatted_context
        }

    except Exception as e:
        logger.error(f"Error retrieving context: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/delete-document")
async def delete_document(
    request: DeleteDocumentRequest,
    rag_service: RAGService = Depends(get_rag_service)
):
    """
    Delete a document and all its chunks from the vector store
    """
    try:
        success = rag_service.delete_document(
            project_id=request.project_id,
            document_id=request.document_id,
            collection_type=request.collection_type
        )

        if success:
            return {
                "success": True,
                "message": f"Document {request.document_id} deleted successfully"
            }
        else:
            return {
                "success": False,
                "message": "Document not found or already deleted"
            }

    except Exception as e:
        logger.error(f"Error deleting document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/collection-info")
async def get_collection_info(
    request: CollectionInfoRequest,
    rag_service: RAGService = Depends(get_rag_service)
):
    """
    Get information about a collection

    Returns:
    - Total chunks indexed
    - Unique documents
    - Collection metadata
    """
    try:
        info = rag_service.get_collection_info(
            project_id=request.project_id,
            collection_type=request.collection_type
        )

        return {
            "success": True,
            "collection_info": info
        }

    except Exception as e:
        logger.error(f"Error getting collection info: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/clear-collection")
async def clear_collection(
    request: CollectionInfoRequest,
    rag_service: RAGService = Depends(get_rag_service)
):
    """
    Clear all documents from a collection

    WARNING: This action cannot be undone!
    """
    try:
        success = rag_service.clear_project_documents(
            project_id=request.project_id,
            collection_type=request.collection_type
        )

        if success:
            return {
                "success": True,
                "message": f"Collection cleared for project {request.project_id}"
            }
        else:
            return {
                "success": False,
                "message": "Failed to clear collection"
            }

    except Exception as e:
        logger.error(f"Error clearing collection: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def rag_health_check():
    """Check RAG service health"""
    try:
        # Test RAG service initialization
        rag_service = RAGService()

        return {
            "status": "healthy",
            "service": "rag",
            "vector_store": "operational",
            "document_processor": "operational"
        }
    except Exception as e:
        logger.error(f"RAG health check failed: {e}")
        return {
            "status": "unhealthy",
            "service": "rag",
            "error": str(e)
        }
