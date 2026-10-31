"""
Concurrency management for AI Agent
Handles connection pooling, rate limiting, and request queuing
"""

import asyncio
import time
from typing import Dict, Any, Optional, Callable
from dataclasses import dataclass, field
from collections import deque
import logging
from contextlib import asynccontextmanager
from threading import Lock
import aiohttp
from asyncio import Semaphore, Queue

logger = logging.getLogger(__name__)


@dataclass
class ConcurrencyConfig:
    """Configuration for concurrent request handling"""
    max_concurrent_requests: int = 10
    max_queue_size: int = 100
    request_timeout: float = 300.0  # 5 minutes
    rate_limit_per_minute: int = 60
    connection_pool_size: int = 20
    max_retries: int = 3
    retry_delay: float = 1.0
    
    # Vertex AI specific limits
    vertex_ai_concurrent_limit: int = 5
    vertex_ai_rate_limit_per_minute: int = 30


class RateLimiter:
    """Token bucket rate limiter"""
    
    def __init__(self, rate: int, per: float = 60.0):
        """
        Args:
            rate: Number of requests allowed
            per: Time period in seconds (default 60 for per minute)
        """
        self.rate = rate
        self.per = per
        self.allowance = rate
        self.last_check = time.monotonic()
        self._lock = Lock()
    
    def acquire(self, tokens: int = 1) -> bool:
        """Try to acquire tokens from the bucket"""
        with self._lock:
            current = time.monotonic()
            time_passed = current - self.last_check
            self.last_check = current
            
            # Refill tokens based on time passed
            self.allowance += time_passed * (self.rate / self.per)
            if self.allowance > self.rate:
                self.allowance = self.rate
            
            if self.allowance < tokens:
                return False
            
            self.allowance -= tokens
            return True
    
    async def acquire_async(self, tokens: int = 1) -> None:
        """Async version that waits if necessary"""
        while not self.acquire(tokens):
            await asyncio.sleep(0.1)


class RequestQueue:
    """Priority queue for managing requests"""
    
    def __init__(self, max_size: int = 100):
        self.queue = asyncio.Queue(maxsize=max_size)
        self.processing = {}
        self.completed = {}
        self._request_id = 0
    
    async def add(self, request: Dict[str, Any], priority: int = 0) -> str:
        """Add request to queue and return request ID"""
        self._request_id += 1
        request_id = f"req_{self._request_id}"
        
        item = {
            "id": request_id,
            "request": request,
            "priority": priority,
            "timestamp": time.time()
        }
        
        await self.queue.put(item)
        return request_id
    
    async def get(self) -> Dict[str, Any]:
        """Get next request from queue"""
        return await self.queue.get()
    
    def mark_processing(self, request_id: str):
        """Mark request as being processed"""
        self.processing[request_id] = time.time()
    
    def mark_completed(self, request_id: str, result: Any):
        """Mark request as completed"""
        if request_id in self.processing:
            del self.processing[request_id]
        self.completed[request_id] = {
            "result": result,
            "timestamp": time.time()
        }
    
    def get_status(self, request_id: str) -> Dict[str, Any]:
        """Get status of a request"""
        if request_id in self.completed:
            return {"status": "completed", "result": self.completed[request_id]}
        elif request_id in self.processing:
            return {"status": "processing", "started_at": self.processing[request_id]}
        else:
            return {"status": "queued"}


class ConnectionPool:
    """Connection pool for external services"""
    
    def __init__(self, size: int = 20):
        self.size = size
        self.semaphore = Semaphore(size)
        self.sessions = []
        self.session_index = 0
        self._lock = Lock()
    
    async def initialize(self):
        """Initialize connection pool"""
        connector = aiohttp.TCPConnector(
            limit=self.size,
            limit_per_host=self.size,
            ttl_dns_cache=300
        )
        
        for _ in range(min(5, self.size)):  # Start with 5 sessions
            session = aiohttp.ClientSession(connector=connector)
            self.sessions.append(session)
    
    @asynccontextmanager
    async def acquire_session(self):
        """Acquire a session from the pool"""
        async with self.semaphore:
            with self._lock:
                if not self.sessions:
                    await self.initialize()
                
                session = self.sessions[self.session_index % len(self.sessions)]
                self.session_index += 1
            
            yield session
    
    async def close(self):
        """Close all sessions"""
        for session in self.sessions:
            await session.close()


class WorkflowExecutor:
    """Manages concurrent workflow execution"""
    
    def __init__(self, config: ConcurrencyConfig):
        self.config = config
        self.request_queue = RequestQueue(config.max_queue_size)
        self.rate_limiter = RateLimiter(config.rate_limit_per_minute)
        self.vertex_rate_limiter = RateLimiter(config.vertex_ai_rate_limit_per_minute)
        self.connection_pool = ConnectionPool(config.connection_pool_size)
        
        # Semaphores for concurrent limits
        self.general_semaphore = Semaphore(config.max_concurrent_requests)
        self.vertex_semaphore = Semaphore(config.vertex_ai_concurrent_limit)
        
        # Worker tasks
        self.workers = []
        self.running = False
    
    async def start(self, num_workers: int = 0):
        """Start worker tasks (default 0 for pure async FastAPI mode)"""
        self.running = True
        await self.connection_pool.initialize()

        if num_workers > 0:
            for i in range(num_workers):
                worker = asyncio.create_task(self._worker(f"worker_{i}"))
                self.workers.append(worker)

            logger.info(f"Started {num_workers} worker tasks")
        else:
            logger.info("Running in pure async mode (no internal worker tasks)")
    
    async def stop(self):
        """Stop all workers"""
        self.running = False
        
        # Wait for workers to finish
        await asyncio.gather(*self.workers, return_exceptions=True)
        
        # Close connection pool
        await self.connection_pool.close()
        
        logger.info("Stopped all workers")
    
    async def _worker(self, worker_id: str):
        """Worker task that processes requests from queue"""
        logger.info(f"Worker {worker_id} started")
        
        while self.running:
            try:
                # Get request from queue with timeout
                request_item = await asyncio.wait_for(
                    self.request_queue.get(),
                    timeout=1.0
                )
                
                request_id = request_item["id"]
                request = request_item["request"]
                
                # Mark as processing
                self.request_queue.mark_processing(request_id)
                
                # Execute request
                result = await self._execute_request(request)
                
                # Mark as completed
                self.request_queue.mark_completed(request_id, result)
                
                logger.debug(f"Worker {worker_id} completed request {request_id}")
                
            except asyncio.TimeoutError:
                # No requests in queue, continue
                continue
            except Exception as e:
                logger.error(f"Worker {worker_id} error: {e}")
                if request_id:
                    self.request_queue.mark_completed(request_id, {"error": str(e)})
    
    async def _execute_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a single request with rate limiting and concurrency control"""
        request_type = request.get("type", "general")
        
        try:
            # Apply rate limiting
            await self.rate_limiter.acquire_async()
            
            # Apply concurrency limits
            async with self.general_semaphore:
                if request_type == "vertex_ai":
                    # Additional limit for Vertex AI requests
                    await self.vertex_rate_limiter.acquire_async()
                    async with self.vertex_semaphore:
                        return await self._execute_with_retry(request)
                else:
                    return await self._execute_with_retry(request)
                    
        except Exception as e:
            logger.error(f"Request execution failed: {e}")
            return {"error": str(e)}
    
    async def _execute_with_retry(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Execute request with retry logic"""
        handler = request.get("handler")
        data = request.get("data", {})
        
        if not handler:
            return {"error": "No handler specified"}
        
        last_error = None
        for attempt in range(self.config.max_retries):
            try:
                # Execute the handler
                if asyncio.iscoroutinefunction(handler):
                    result = await handler(data)
                else:
                    result = await asyncio.to_thread(handler, data)
                
                return result
                
            except Exception as e:
                last_error = e
                logger.warning(f"Request attempt {attempt + 1} failed: {e}")
                
                if attempt < self.config.max_retries - 1:
                    await asyncio.sleep(self.config.retry_delay * (attempt + 1))
        
        return {"error": f"All retry attempts failed: {last_error}"}
    
    async def submit_request(
        self,
        handler: Callable,
        data: Dict[str, Any],
        request_type: str = "general",
        priority: int = 0
    ) -> str:
        """Submit a request for processing"""
        request = {
            "type": request_type,
            "handler": handler,
            "data": data
        }
        
        request_id = await self.request_queue.add(request, priority)
        logger.debug(f"Submitted request {request_id} with priority {priority}")
        
        return request_id
    
    def get_request_status(self, request_id: str) -> Dict[str, Any]:
        """Get the status of a submitted request"""
        return self.request_queue.get_status(request_id)


# Global executor instance
_executor: Optional[WorkflowExecutor] = None


async def initialize_executor(config: Optional[ConcurrencyConfig] = None):
    """Initialize the global executor"""
    global _executor
    
    if _executor is None:
        config = config or ConcurrencyConfig()
        _executor = WorkflowExecutor(config)
        await _executor.start()
        logger.info("Initialized global workflow executor")
    
    return _executor


async def get_executor() -> WorkflowExecutor:
    """Get the global executor instance"""
    if _executor is None:
        await initialize_executor()
    return _executor


async def shutdown_executor():
    """Shutdown the global executor"""
    global _executor
    
    if _executor:
        await _executor.stop()
        _executor = None
        logger.info("Shutdown global workflow executor")