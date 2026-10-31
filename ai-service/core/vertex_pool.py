"""
Vertex AI Connection Pool Manager
Manages a pool of Vertex AI LLM instances for concurrent requests
"""

import asyncio
from typing import List, Optional, Any
from contextlib import asynccontextmanager
import logging
from threading import Lock
import time

from langchain_google_vertexai import ChatVertexAI
from google.cloud import aiplatform

from core.vertex_config import VertexAIConfig

logger = logging.getLogger(__name__)


class VertexAIPool:
    """Connection pool for Vertex AI LLM instances"""
    
    def __init__(self, pool_size: int = 5, config: Optional[VertexAIConfig] = None):
        """
        Initialize the Vertex AI connection pool
        
        Args:
            pool_size: Number of LLM instances to maintain
            config: Vertex AI configuration
        """
        self.pool_size = pool_size
        self.config = config or VertexAIConfig.from_env()
        
        # Pool management
        self.available = asyncio.Queue(maxsize=pool_size)
        self.in_use = set()
        self.all_instances = []
        self._lock = Lock()
        self._initialized = False
        
        # Statistics
        self.stats = {
            "total_requests": 0,
            "active_connections": 0,
            "waiting_requests": 0,
            "total_wait_time": 0.0,
            "errors": 0
        }
    
    async def initialize(self):
        """Initialize the connection pool"""
        if self._initialized:
            return
        
        logger.info(f"Initializing Vertex AI pool with {self.pool_size} instances")
        
        # Initialize Vertex AI platform once
        try:
            aiplatform.init(
                project=self.config.project_id,
                location=self.config.location
            )
        except Exception as e:
            logger.error(f"Failed to initialize Vertex AI platform: {e}")
            raise
        
        # Create LLM instances
        for i in range(self.pool_size):
            try:
                llm = self._create_llm_instance(i)
                self.all_instances.append(llm)
                await self.available.put(llm)
                logger.debug(f"Created LLM instance {i}")
            except Exception as e:
                logger.error(f"Failed to create LLM instance {i}: {e}")
                self.stats["errors"] += 1
        
        self._initialized = True
        logger.info(f"Vertex AI pool initialized with {len(self.all_instances)} instances")
    
    def _create_llm_instance(self, instance_id: int) -> ChatVertexAI:
        """Create a single LLM instance"""
        return ChatVertexAI(
            model_name=self.config.model_name,
            temperature=self.config.temperature,
            max_output_tokens=self.config.max_output_tokens,
            project=self.config.project_id,
            location=self.config.location,
            # Add instance identifier for debugging
            metadata={"instance_id": f"llm_{instance_id}"}
        )
    
    @asynccontextmanager
    async def acquire(self):
        """
        Acquire an LLM instance from the pool
        
        Yields:
            ChatVertexAI: An available LLM instance
        """
        if not self._initialized:
            await self.initialize()
        
        start_time = time.time()
        self.stats["total_requests"] += 1
        
        # Update waiting statistics
        if self.available.empty():
            self.stats["waiting_requests"] += 1
        
        # Get an instance from the pool
        llm = await self.available.get()
        
        wait_time = time.time() - start_time
        self.stats["total_wait_time"] += wait_time
        
        if wait_time > 1.0:
            logger.warning(f"Long wait time for LLM instance: {wait_time:.2f}s")
        
        with self._lock:
            self.in_use.add(id(llm))
            self.stats["active_connections"] = len(self.in_use)
        
        try:
            yield llm
        finally:
            # Return instance to pool
            with self._lock:
                self.in_use.discard(id(llm))
                self.stats["active_connections"] = len(self.in_use)
            
            await self.available.put(llm)
    
    async def execute_with_retry(
        self,
        func: Any,
        *args,
        max_retries: int = 3,
        retry_delay: float = 1.0,
        **kwargs
    ):
        """
        Execute a function with an LLM instance and retry logic
        
        Args:
            func: Function to execute with LLM
            max_retries: Maximum number of retry attempts
            retry_delay: Delay between retries
            *args, **kwargs: Arguments to pass to the function
        
        Returns:
            Function result
        """
        last_error = None
        
        for attempt in range(max_retries):
            try:
                async with self.acquire() as llm:
                    # If func is async, await it
                    if asyncio.iscoroutinefunction(func):
                        return await func(llm, *args, **kwargs)
                    else:
                        # Run sync function in thread pool
                        return await asyncio.to_thread(func, llm, *args, **kwargs)
                        
            except Exception as e:
                last_error = e
                self.stats["errors"] += 1
                logger.warning(f"Attempt {attempt + 1} failed: {e}")
                
                if attempt < max_retries - 1:
                    await asyncio.sleep(retry_delay * (attempt + 1))
        
        raise Exception(f"All retry attempts failed: {last_error}")
    
    def get_stats(self) -> dict:
        """Get pool statistics"""
        stats = self.stats.copy()
        stats["pool_size"] = self.pool_size
        stats["available_instances"] = self.available.qsize()
        stats["average_wait_time"] = (
            self.stats["total_wait_time"] / max(1, self.stats["total_requests"])
        )
        return stats
    
    async def close(self):
        """Close all connections in the pool"""
        logger.info("Closing Vertex AI pool")
        
        # Clear the queue
        while not self.available.empty():
            try:
                await self.available.get_nowait()
            except asyncio.QueueEmpty:
                break
        
        # Note: LangChain's ChatVertexAI doesn't have explicit close method
        # Resources will be cleaned up by garbage collector
        self.all_instances.clear()
        self._initialized = False
        
        logger.info("Vertex AI pool closed")


# Global pool instance
_vertex_pool: Optional[VertexAIPool] = None


async def get_vertex_pool(pool_size: int = 5) -> VertexAIPool:
    """Get or create the global Vertex AI pool"""
    global _vertex_pool
    
    if _vertex_pool is None:
        _vertex_pool = VertexAIPool(pool_size=pool_size)
        await _vertex_pool.initialize()
    
    return _vertex_pool


async def close_vertex_pool():
    """Close the global Vertex AI pool"""
    global _vertex_pool
    
    if _vertex_pool:
        await _vertex_pool.close()
        _vertex_pool = None