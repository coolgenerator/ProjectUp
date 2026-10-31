"""Base classes for workflows."""
from typing import Dict, Any, Optional, List
from abc import ABC, abstractmethod
import logging
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)


class WorkflowState:
    """Base state class for workflows."""
    
    def __init__(self, **kwargs):
        """Initialize workflow state with given attributes."""
        for key, value in kwargs.items():
            setattr(self, key, value)
        
        # Add default attributes if not provided
        if not hasattr(self, 'workflow_id'):
            self.workflow_id = str(uuid.uuid4())
        if not hasattr(self, 'created_at'):
            self.created_at = datetime.now().isoformat()
        if not hasattr(self, 'status'):
            self.status = 'initialized'
        if not hasattr(self, 'errors'):
            self.errors = []
        if not hasattr(self, 'metadata'):
            self.metadata = {}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert state to dictionary."""
        return {k: v for k, v in self.__dict__.items() if not k.startswith('_')}
    
    def update(self, **kwargs):
        """Update state attributes."""
        for key, value in kwargs.items():
            setattr(self, key, value)
        self.updated_at = datetime.now().isoformat()
    
    def add_error(self, error: str, context: Optional[Dict[str, Any]] = None):
        """Add an error to the state."""
        error_entry = {
            'message': error,
            'timestamp': datetime.now().isoformat(),
            'context': context or {}
        }
        self.errors.append(error_entry)
        self.status = 'error'


class BaseWorkflow(ABC):
    """Base class for all workflows."""
    
    name: str = "base_workflow"
    description: str = "Base workflow class"
    version: str = "1.0.0"
    
    def __init__(self):
        """Initialize workflow."""
        self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")
        self.nodes = {}
        self.edges = []
        self.entry_point = None
        self._setup_workflow()
    
    @abstractmethod
    def _setup_workflow(self):
        """Set up the workflow graph structure."""
        pass
    
    @abstractmethod
    def get_state_schema(self) -> type[WorkflowState]:
        """Get the state schema for this workflow."""
        pass
    
    def add_node(self, name: str, func: callable):
        """Add a node to the workflow."""
        self.nodes[name] = func
        self.logger.debug(f"Added node: {name}")
    
    def add_edge(self, from_node: str, to_node: str):
        """Add an edge between nodes."""
        self.edges.append((from_node, to_node))
        self.logger.debug(f"Added edge: {from_node} -> {to_node}")
    
    def set_entry_point(self, node: str):
        """Set the entry point for the workflow."""
        if node not in self.nodes:
            raise ValueError(f"Entry point node '{node}' not found in workflow")
        self.entry_point = node
        self.logger.debug(f"Set entry point: {node}")
    
    def validate(self) -> bool:
        """Validate the workflow configuration."""
        if not self.entry_point:
            self.logger.error("No entry point set for workflow")
            return False
        
        if not self.nodes:
            self.logger.error("No nodes defined in workflow")
            return False
        
        # Check if all edges reference existing nodes
        all_nodes = set(self.nodes.keys())
        for from_node, to_node in self.edges:
            if from_node not in all_nodes:
                self.logger.error(f"Edge references non-existent node: {from_node}")
                return False
            if to_node not in all_nodes and to_node != "END":
                self.logger.error(f"Edge references non-existent node: {to_node}")
                return False
        
        return True
    
    def get_metadata(self) -> Dict[str, Any]:
        """Get workflow metadata."""
        return {
            'name': self.name,
            'description': self.description,
            'version': self.version,
            'nodes': list(self.nodes.keys()),
            'edges': self.edges,
            'entry_point': self.entry_point
        }


class ConditionalWorkflow(BaseWorkflow):
    """Base class for workflows with conditional routing."""
    
    def __init__(self):
        """Initialize conditional workflow."""
        self.conditional_edges = {}
        super().__init__()
    
    def add_conditional_edge(self, from_node: str, condition_func: callable, edge_map: Dict[str, str]):
        """Add a conditional edge that routes based on condition function result.
        
        Args:
            from_node: Source node
            condition_func: Function that returns a key from edge_map
            edge_map: Dictionary mapping condition results to target nodes
        """
        self.conditional_edges[from_node] = {
            'condition': condition_func,
            'edges': edge_map
        }
        self.logger.debug(f"Added conditional edge from {from_node}")
    
    def get_next_node(self, current_node: str, state: WorkflowState) -> Optional[str]:
        """Get the next node based on current node and state.
        
        Args:
            current_node: Current node name
            state: Current workflow state
            
        Returns:
            Next node name or None
        """
        # Check conditional edges first
        if current_node in self.conditional_edges:
            condition_info = self.conditional_edges[current_node]
            condition_result = condition_info['condition'](state)
            return condition_info['edges'].get(condition_result)
        
        # Check regular edges
        for from_node, to_node in self.edges:
            if from_node == current_node:
                return to_node
        
        return None