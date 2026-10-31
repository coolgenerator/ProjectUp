"""
Embedding Service

Generates text embeddings using Google's Vertex AI text-embedding model.
"""

import logging
from typing import List
import vertexai
from vertexai.language_models import TextEmbeddingModel
import os

logger = logging.getLogger(__name__)


class EmbeddingService:
    """
    Service for generating text embeddings using Google Vertex AI.
    """

    def __init__(self):
        """Initialize the embedding service"""
        self.project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "projectup-444709")
        self.location = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
        self.model_name = "text-embedding-004"

        # Initialize Vertex AI
        try:
            vertexai.init(project=self.project_id, location=self.location)
            self.model = TextEmbeddingModel.from_pretrained(self.model_name)
            logger.info(f"Initialized embedding model: {self.model_name}")
        except Exception as e:
            logger.error(f"Error initializing embedding model: {e}")
            self.model = None

    def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for a single text.

        Args:
            text: Input text to embed

        Returns:
            List of floats representing the embedding vector (768 dimensions)
        """
        if not self.model:
            logger.warning("Embedding model not initialized, returning empty vector")
            return [0.0] * 768

        try:
            # Clean and truncate text if needed
            text = text.strip()
            if len(text) > 10000:
                text = text[:10000]

            if not text:
                return [0.0] * 768

            # Generate embedding
            embeddings = self.model.get_embeddings([text])

            if embeddings and len(embeddings) > 0:
                return embeddings[0].values
            else:
                logger.warning("No embeddings returned")
                return [0.0] * 768

        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            return [0.0] * 768

    def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts in batch.

        Args:
            texts: List of input texts to embed

        Returns:
            List of embedding vectors
        """
        if not self.model:
            logger.warning("Embedding model not initialized, returning empty vectors")
            return [[0.0] * 768 for _ in texts]

        try:
            # Clean texts
            cleaned_texts = []
            for text in texts:
                text = text.strip()
                if len(text) > 10000:
                    text = text[:10000]
                cleaned_texts.append(text if text else " ")

            # Generate embeddings in batch
            embeddings = self.model.get_embeddings(cleaned_texts)

            return [emb.values for emb in embeddings]

        except Exception as e:
            logger.error(f"Error generating batch embeddings: {e}")
            return [[0.0] * 768 for _ in texts]

    def compute_similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """
        Compute cosine similarity between two embeddings.

        Args:
            embedding1: First embedding vector
            embedding2: Second embedding vector

        Returns:
            Similarity score between 0 and 1
        """
        import numpy as np

        # Convert to numpy arrays
        vec1 = np.array(embedding1)
        vec2 = np.array(embedding2)

        # Compute cosine similarity
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)

        if norm1 == 0 or norm2 == 0:
            return 0.0

        similarity = dot_product / (norm1 * norm2)

        # Ensure result is between 0 and 1
        return max(0.0, min(1.0, (similarity + 1) / 2))
