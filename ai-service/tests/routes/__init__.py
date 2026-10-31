"""Test Routes Module

This module contains all test API routes for development and testing purposes.
These routes are only available in development mode.

Organization:
- /test/hierarchy/* - Test hierarchy workflow nodes
- /test/learning-path/* - Test learning path generation
- /test/qa/* - Test question answering service
"""

from fastapi import APIRouter
import logging

logger = logging.getLogger(__name__)

# Create main test router
test_router = APIRouter(prefix="/test", tags=["tests"])

# Import and include test routers with error handling
try:
    from .test_hierarchy_workflow_routes import router as hierarchy_test_router
    test_router.include_router(
        hierarchy_test_router,
        prefix="/hierarchy",
        tags=["test-hierarchy-workflow"]
    )
    logger.info("✓ Hierarchy workflow test routes loaded")
except ImportError as e:
    logger.warning(f"Could not load hierarchy test routes: {e}")

try:
    from .test_learning_path_routes import router as learning_path_test_router
    test_router.include_router(
        learning_path_test_router,
        prefix="/learning-path",
        tags=["test-learning-path"]
    )
    logger.info("✓ Learning path test routes loaded")
except ImportError as e:
    logger.warning(f"Could not load learning path test routes: {e}")

try:
    from .test_qa_routes import router as qa_test_router
    test_router.include_router(
        qa_test_router,
        prefix="/qa",
        tags=["test-qa"]
    )
    logger.info("✓ Q&A test routes loaded")
except ImportError as e:
    logger.warning(f"Could not load Q&A test routes: {e}")


# Root test endpoint
@test_router.get("/")
async def test_root():
    """Get information about available test endpoints"""
    return {
        "message": "Test API Root - Development Mode Only",
        "available_test_suites": [
            {
                "name": "Hierarchy Workflow",
                "prefix": "/test/hierarchy",
                "description": "Test individual nodes in hierarchy generation workflow",
                "endpoints": [
                    "/test/hierarchy/node/semantic-similarity",
                    "/test/hierarchy/node/web-search",
                    "/test/hierarchy/node/extract-topic",
                    "/test/hierarchy/node/generate-hierarchy",
                    "/test/hierarchy/node/validate",
                    "/test/hierarchy/node/handle-error",
                    "/test/hierarchy/workflow/full",
                    "/test/hierarchy/workflow/info",
                    "/test/hierarchy/test/sample-states"
                ]
            },
            {
                "name": "Learning Path",
                "prefix": "/test/learning-path",
                "description": "Test learning path generation components",
                "endpoints": [
                    "/test/learning-path/generate",
                    "/test/learning-path/analyze-topic",
                    "/test/learning-path/sample-topics"
                ]
            },
            {
                "name": "Question Answering",
                "prefix": "/test/qa",
                "description": "Test Q&A service components",
                "endpoints": [
                    "/test/qa/ask",
                    "/test/qa/embedding",
                    "/test/qa/context-retrieval",
                    "/test/qa/provider-comparison"
                ]
            }
        ],
        "documentation": "/docs#/tests",
        "note": "These endpoints are only available in development mode"
    }


__all__ = ["test_router"]