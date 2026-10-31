"""
Common edge logic and routing for workflows
"""

from typing import Dict, Any, Literal, List, Callable, Optional
from langgraph.graph import END


class EdgeRouter:
    """Base router for conditional edges"""
    
    def __init__(self, routes: Dict[str, str] = None):
        self.routes = routes or {}
    
    def route(self, state: Dict[str, Any]) -> str:
        """Determine next node based on state"""
        raise NotImplementedError("Subclasses must implement route method")


class ConditionalRouter(EdgeRouter):
    """Router based on conditions"""
    
    def __init__(self, condition_field: str, routes: Dict[Any, str]):
        super().__init__(routes)
        self.condition_field = condition_field
    
    def route(self, state: Dict[str, Any]) -> str:
        """Route based on condition field value"""
        value = state.get(self.condition_field)
        
        if value in self.routes:
            return self.routes[value]
        
        # Default route
        return self.routes.get('default', END)


class ThresholdRouter(EdgeRouter):
    """Router based on threshold values"""
    
    def __init__(self, threshold_field: str, threshold: float, 
                 above_route: str, below_route: str):
        self.threshold_field = threshold_field
        self.threshold = threshold
        self.above_route = above_route
        self.below_route = below_route
    
    def route(self, state: Dict[str, Any]) -> str:
        """Route based on threshold comparison"""
        value = state.get(self.threshold_field, 0)
        
        if value >= self.threshold:
            return self.above_route
        return self.below_route


class MultiPathRouter(EdgeRouter):
    """Router for multiple path selection"""
    
    def __init__(self, path_selector: Callable[[Dict[str, Any]], str]):
        self.path_selector = path_selector
    
    def route(self, state: Dict[str, Any]) -> str:
        """Route using custom path selector"""
        return self.path_selector(state)


class ErrorRouter(EdgeRouter):
    """Router for error handling"""
    
    def __init__(self, error_route: str = "error_handler", 
                 success_route: str = "continue"):
        self.error_route = error_route
        self.success_route = success_route
    
    def route(self, state: Dict[str, Any]) -> str:
        """Route based on error presence"""
        if state.get('error'):
            return self.error_route
        return self.success_route


class CompletionRouter(EdgeRouter):
    """Router for checking completion status"""
    
    def __init__(self, completion_check: Callable[[Dict[str, Any]], bool],
                 complete_route: str = END,
                 continue_route: str = "next"):
        self.completion_check = completion_check
        self.complete_route = complete_route
        self.continue_route = continue_route
    
    def route(self, state: Dict[str, Any]) -> str:
        """Route based on completion status"""
        if self.completion_check(state):
            return self.complete_route
        return self.continue_route


# Utility routing functions

def route_on_field(field: str, routes: Dict[Any, str]) -> Callable:
    """Create a routing function based on a field value"""
    def router(state: Dict[str, Any]) -> str:
        value = state.get(field)
        return routes.get(value, routes.get('default', END))
    return router


def route_on_condition(condition: Callable[[Dict[str, Any]], bool],
                       true_route: str, false_route: str) -> Callable:
    """Create a routing function based on a condition"""
    def router(state: Dict[str, Any]) -> str:
        if condition(state):
            return true_route
        return false_route
    return router


def route_on_list_empty(list_field: str, empty_route: str, 
                        non_empty_route: str) -> Callable:
    """Create a routing function based on list emptiness"""
    def router(state: Dict[str, Any]) -> str:
        items = state.get(list_field, [])
        if not items:
            return empty_route
        return non_empty_route
    return router


def route_on_success(state: Dict[str, Any]) -> str:
    """Standard success/failure routing"""
    if state.get('error'):
        return "error_handler"
    elif state.get('completed'):
        return END
    else:
        return "continue"


def route_with_retry(state: Dict[str, Any], max_retries: int = 3) -> str:
    """Route with retry logic"""
    retry_count = state.get('retry_count', 0)
    
    if state.get('error'):
        if retry_count < max_retries:
            return "retry"
        else:
            return "max_retries_exceeded"
    
    return "success"


def parallel_route(state: Dict[str, Any], branches: List[str]) -> List[str]:
    """Route to multiple branches in parallel"""
    # This would be used for parallel execution
    # Returns all branches that should be executed
    active_branches = []
    
    for branch in branches:
        condition_field = f"enable_{branch}"
        if state.get(condition_field, True):
            active_branches.append(branch)
    
    return active_branches if active_branches else ["default"]