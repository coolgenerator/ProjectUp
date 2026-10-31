"""
Reusable node functions shared across workflows
"""

import os
from typing import Dict, Any, List, Optional
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
import logging

# Try to import ChatVertexAI, make it optional
try:
    from langchain_google_vertexai import ChatVertexAI
except ImportError:
    ChatVertexAI = None
    print("Warning: langchain_google_vertexai not available")

logger = logging.getLogger(__name__)


class BaseNode:
    """Base class for workflow nodes"""
    
    def __init__(self, llm: Optional[Any] = None):
        # Get model from environment variable or use default
        model = os.environ.get("VERTEX_AI_MODEL", "gemini-pro")
        
        if llm:
            self.llm = llm
        elif ChatVertexAI:
            try:
                self.llm = ChatVertexAI(model=model, temperature=0.7)
            except Exception as e:
                logger.warning(f"Could not initialize ChatVertexAI: {e}, using fake LLM")
                from langchain.llms.fake import FakeListLLM
                self.llm = FakeListLLM(responses=["Mock response"])
        else:
            from langchain.llms.fake import FakeListLLM
            self.llm = FakeListLLM(responses=["Mock response"])
    
    async def process(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Process the state and return updates"""
        raise NotImplementedError("Subclasses must implement process method")


class MessageNode(BaseNode):
    """Node for processing messages"""
    
    async def process(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Process messages in state"""
        messages = state.get('messages', [])
        
        if not messages:
            return {"error": "No messages to process"}
        
        response = await self.llm.ainvoke(messages)
        
        return {
            "messages": [response],
            "current_step": "message_processed"
        }


class ValidationNode(BaseNode):
    """Node for validating inputs"""
    
    def __init__(self, validation_rules: Dict[str, Any] = None, **kwargs):
        super().__init__(**kwargs)
        self.validation_rules = validation_rules or {}
    
    async def process(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Validate state against rules"""
        errors = []
        
        for field, rule in self.validation_rules.items():
            if field not in state:
                errors.append(f"Missing required field: {field}")
            elif callable(rule):
                if not rule(state[field]):
                    errors.append(f"Validation failed for field: {field}")
        
        if errors:
            return {"error": "; ".join(errors), "current_step": "validation_failed"}
        
        return {"current_step": "validation_passed"}


class TransformNode(BaseNode):
    """Node for data transformation"""
    
    def __init__(self, transform_fn=None, **kwargs):
        super().__init__(**kwargs)
        self.transform_fn = transform_fn
    
    async def process(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Transform data in state"""
        if not self.transform_fn:
            return state
        
        try:
            transformed = self.transform_fn(state)
            return {**transformed, "current_step": "transformation_complete"}
        except Exception as e:
            logger.error(f"Transformation error: {e}")
            return {"error": str(e), "current_step": "transformation_failed"}


class AggregationNode(BaseNode):
    """Node for aggregating results"""
    
    async def process(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Aggregate multiple results"""
        results = state.get('results', [])
        
        if not results:
            return {"error": "No results to aggregate"}
        
        aggregated = {
            "count": len(results),
            "items": results,
            "summary": self._generate_summary(results)
        }
        
        return {
            "aggregated_results": aggregated,
            "current_step": "aggregation_complete"
        }
    
    def _generate_summary(self, results: List[Any]) -> str:
        """Generate a summary of results"""
        return f"Aggregated {len(results)} results"


class ErrorHandlerNode(BaseNode):
    """Node for handling errors"""
    
    async def process(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Handle errors in state"""
        error = state.get('error')
        
        if not error:
            return {"current_step": "no_error"}
        
        # Log the error
        logger.error(f"Error in workflow: {error}")
        
        # Attempt recovery based on error type
        recovery_action = self._determine_recovery(error)
        
        return {
            "error": None,  # Clear the error
            "recovery_action": recovery_action,
            "current_step": "error_handled"
        }
    
    def _determine_recovery(self, error: str) -> str:
        """Determine recovery action based on error"""
        if "validation" in error.lower():
            return "retry_with_validation"
        elif "timeout" in error.lower():
            return "retry_with_timeout"
        else:
            return "skip_and_continue"


# Utility functions for common node operations

async def initialize_state(state: Dict[str, Any]) -> Dict[str, Any]:
    """Initialize workflow state"""
    return {
        **state,
        "current_step": "initialized",
        "metadata": state.get('metadata', {}),
        "error": None
    }


async def finalize_state(state: Dict[str, Any]) -> Dict[str, Any]:
    """Finalize workflow state"""
    return {
        **state,
        "current_step": "completed",
        "metadata": {
            **state.get('metadata', {}),
            "completed_at": "timestamp_here"
        }
    }


async def log_step(state: Dict[str, Any]) -> Dict[str, Any]:
    """Log current step"""
    current_step = state.get('current_step', 'unknown')
    logger.info(f"Workflow step: {current_step}")
    
    history = state.get('history', [])
    history.append({
        "step": current_step,
        "timestamp": "timestamp_here"
    })
    
    return {"history": history}