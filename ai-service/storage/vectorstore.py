"""
Vector store for RAG and semantic search
"""

from typing import List, Dict, Any, Optional, Tuple

# Try to import VertexAIEmbeddings, but make it optional
try:
    from langchain_google_vertexai import VertexAIEmbeddings
except ImportError:
    VertexAIEmbeddings = None
    print("Warning: langchain_google_vertexai not installed, using fake embeddings")

try:
    from langchain_community.vectorstores import FAISS, Chroma
except ImportError:
    # Fallback if langchain_community is not available
    FAISS = None
    Chroma = None
from langchain_core.documents import Document
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import pickle
import os


class VectorStore:
    """Unified vector store interface"""
    
    def __init__(self, store_type: str = "faiss", persist_directory: Optional[str] = None):
        """
        Initialize vector store
        
        Args:
            store_type: Type of vector store ("faiss" or "chroma")
            persist_directory: Directory to persist the store
        """
        self.store_type = store_type
        self.persist_directory = persist_directory
        
        # Use VertexAIEmbeddings if available, otherwise use fake embeddings
        if VertexAIEmbeddings:
            try:
                self.embeddings = VertexAIEmbeddings(model_name="text-embedding-004")
            except Exception as e:
                print(f"Warning: Could not initialize VertexAI embeddings: {e}")
                from langchain.embeddings import FakeEmbeddings
                self.embeddings = FakeEmbeddings(size=768)
        else:
            from langchain.embeddings import FakeEmbeddings
            self.embeddings = FakeEmbeddings(size=768)
            
        self.store = None
        
        if persist_directory and not os.path.exists(persist_directory):
            os.makedirs(persist_directory)
    
    def create_store(self, documents: List[Document]) -> None:
        """Create a new vector store from documents"""
        if self.store_type == "faiss":
            self.store = FAISS.from_documents(documents, self.embeddings)
        elif self.store_type == "chroma":
            self.store = Chroma.from_documents(
                documents, 
                self.embeddings,
                persist_directory=self.persist_directory
            )
        else:
            raise ValueError(f"Unknown store type: {self.store_type}")
    
    def add_documents(self, documents: List[Document]) -> List[str]:
        """Add documents to existing store"""
        if not self.store:
            self.create_store(documents)
            return [str(i) for i in range(len(documents))]
        
        return self.store.add_documents(documents)
    
    def similarity_search(self, query: str, k: int = 4) -> List[Document]:
        """Search for similar documents"""
        if not self.store:
            return []
        
        return self.store.similarity_search(query, k=k)
    
    def similarity_search_with_score(self, query: str, k: int = 4) -> List[Tuple[Document, float]]:
        """Search for similar documents with scores"""
        if not self.store:
            return []
        
        return self.store.similarity_search_with_score(query, k=k)
    
    def save(self, path: Optional[str] = None) -> None:
        """Save vector store to disk"""
        save_path = path or self.persist_directory
        
        if not save_path:
            raise ValueError("No save path specified")
        
        if self.store_type == "faiss":
            self.store.save_local(save_path)
        elif self.store_type == "chroma":
            # Chroma auto-persists if persist_directory is set
            pass
    
    def load(self, path: Optional[str] = None) -> None:
        """Load vector store from disk"""
        load_path = path or self.persist_directory
        
        if not load_path:
            raise ValueError("No load path specified")
        
        if self.store_type == "faiss":
            self.store = FAISS.load_local(load_path, self.embeddings)
        elif self.store_type == "chroma":
            self.store = Chroma(
                persist_directory=load_path,
                embedding_function=self.embeddings
            )
    
    def delete(self, ids: List[str]) -> None:
        """Delete documents by ID"""
        if self.store and hasattr(self.store, 'delete'):
            self.store.delete(ids)
    
    def as_retriever(self, **kwargs):
        """Get retriever interface"""
        if not self.store:
            raise ValueError("Store not initialized")
        
        return self.store.as_retriever(**kwargs)


class EmbeddingManager:
    """Manage embeddings for various use cases"""
    
    def __init__(self, model: str = "text-embedding-004"):
        # Use VertexAIEmbeddings if available, otherwise use fake embeddings
        if VertexAIEmbeddings:
            try:
                self.embeddings = VertexAIEmbeddings(model_name=model)
            except Exception as e:
                print(f"Warning: Could not initialize VertexAI embeddings: {e}")
                from langchain.embeddings import FakeEmbeddings
                self.embeddings = FakeEmbeddings(size=768)
        else:
            from langchain.embeddings import FakeEmbeddings
            self.embeddings = FakeEmbeddings(size=768)
        self._cache = {}
    
    def embed_text(self, text: str, use_cache: bool = True) -> List[float]:
        """Embed a single text"""
        if use_cache and text in self._cache:
            return self._cache[text]
        
        embedding = self.embeddings.embed_query(text)
        
        if use_cache:
            self._cache[text] = embedding
        
        return embedding
    
    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Embed multiple texts"""
        return self.embeddings.embed_documents(texts)
    
    def compute_similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """Compute cosine similarity between two embeddings"""
        return cosine_similarity([embedding1], [embedding2])[0][0]
    
    def find_most_similar(self, query_embedding: List[float], 
                         candidate_embeddings: List[List[float]], 
                         top_k: int = 5) -> List[Tuple[int, float]]:
        """Find most similar embeddings"""
        similarities = cosine_similarity([query_embedding], candidate_embeddings)[0]
        
        # Get top k indices
        top_indices = np.argsort(similarities)[-top_k:][::-1]
        
        # Return indices with scores
        return [(idx, similarities[idx]) for idx in top_indices]
    
    def cluster_embeddings(self, embeddings: List[List[float]], n_clusters: int = 5):
        """Cluster embeddings using KMeans"""
        from sklearn.cluster import KMeans
        
        kmeans = KMeans(n_clusters=n_clusters, random_state=42)
        clusters = kmeans.fit_predict(embeddings)
        
        return clusters
    
    def save_cache(self, path: str) -> None:
        """Save embedding cache to disk"""
        with open(path, 'wb') as f:
            pickle.dump(self._cache, f)
    
    def load_cache(self, path: str) -> None:
        """Load embedding cache from disk"""
        if os.path.exists(path):
            with open(path, 'rb') as f:
                self._cache = pickle.load(f)