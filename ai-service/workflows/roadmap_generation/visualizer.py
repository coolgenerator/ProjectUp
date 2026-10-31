"""
Visualization utilities for roadmap trees
"""

from typing import List, Optional
from .models import RoadmapNode, RoadmapTree


class RoadmapVisualizer:
    """Generate visualizations for learning roadmaps"""
    
    def generate_tree_visualization(self, roadmap_tree: RoadmapTree) -> str:
        """Generate ASCII tree visualization"""
        
        lines = []
        self._build_tree_lines(roadmap_tree.root, lines, "", True)
        return "\n".join(lines)
    
    def _build_tree_lines(
        self,
        node: RoadmapNode,
        lines: List[str],
        prefix: str,
        is_last: bool
    ):
        """Recursively build tree lines"""
        
        # Add current node
        connector = "└── " if is_last else "├── "
        complexity_indicator = self._get_complexity_indicator(node.complexity)
        hours_str = f"({node.estimated_hours}h)" if node.estimated_hours else ""
        
        line = f"{prefix}{connector}{node.title} {complexity_indicator} {hours_str}"
        lines.append(line)
        
        # Add description if it's short
        if node.description and len(node.description) < 50:
            desc_prefix = prefix + ("    " if is_last else "│   ")
            lines.append(f"{desc_prefix}  └─ {node.description}")
        
        # Add children
        if node.children:
            extension = "    " if is_last else "│   "
            for i, child in enumerate(node.children):
                is_last_child = (i == len(node.children) - 1)
                self._build_tree_lines(
                    child,
                    lines,
                    prefix + extension,
                    is_last_child
                )
    
    def _get_complexity_indicator(self, complexity) -> str:
        """Get visual indicator for complexity"""
        indicators = {
            'simple': '○',
            'moderate': '◐',
            'complex': '◉',
            'vast': '⬤'
        }
        return indicators.get(complexity.value if complexity else 'moderate', '○')
    
    def generate_mermaid_diagram(self, roadmap_tree: RoadmapTree) -> str:
        """Generate Mermaid diagram code for visualization"""
        
        lines = ["graph TD"]
        
        # Add nodes
        self._add_mermaid_nodes(roadmap_tree.root, lines)
        
        # Add connections
        self._add_mermaid_connections(roadmap_tree.root, lines)
        
        # Add styling
        lines.extend([
            "",
            "classDef simple fill:#90EE90,stroke:#333,stroke-width:2px;",
            "classDef moderate fill:#FFE4B5,stroke:#333,stroke-width:2px;",
            "classDef complex fill:#FFB6C1,stroke:#333,stroke-width:2px;",
            "classDef vast fill:#DDA0DD,stroke:#333,stroke-width:2px;",
            "",
            "class " + self._get_mermaid_class_assignments(roadmap_tree.root)
        ])
        
        return "\n".join(lines)
    
    def _add_mermaid_nodes(self, node: RoadmapNode, lines: List[str]):
        """Add Mermaid node definitions"""
        
        # Format node text
        hours = f"<br/>{node.estimated_hours}h" if node.estimated_hours else ""
        node_text = f"{node.title}{hours}"
        
        # Add node based on type
        if node.node_type == 'root':
            lines.append(f'    {node.id}["{node_text}"]')
        elif node.is_leaf:
            lines.append(f'    {node.id}("{node_text}")')
        else:
            lines.append(f'    {node.id}["{node_text}"]')
        
        # Recursively add children
        for child in node.children:
            self._add_mermaid_nodes(child, lines)
    
    def _add_mermaid_connections(self, node: RoadmapNode, lines: List[str]):
        """Add Mermaid connections between nodes"""
        
        for child in node.children:
            # Check if there are prerequisites
            if child.prerequisites and child.prerequisites[0] != node.id:
                lines.append(f'    {node.id} --> {child.id}')
                for prereq_id in child.prerequisites:
                    lines.append(f'    {prereq_id} -.-> {child.id}')
            else:
                lines.append(f'    {node.id} --> {child.id}')
            
            # Recursively add child connections
            self._add_mermaid_connections(child, lines)
    
    def _get_mermaid_class_assignments(self, node: RoadmapNode) -> str:
        """Get class assignments for Mermaid styling"""
        
        assignments = {}
        
        def collect_by_complexity(n: RoadmapNode):
            complexity = n.complexity.value if n.complexity else 'moderate'
            if complexity not in assignments:
                assignments[complexity] = []
            assignments[complexity].append(n.id)
            
            for child in n.children:
                collect_by_complexity(child)
        
        collect_by_complexity(node)
        
        # Format assignments
        result = []
        for complexity, node_ids in assignments.items():
            result.append(f"{','.join(node_ids)} {complexity}")
        
        return ';'.join(result)
    
    def generate_markdown_outline(self, roadmap_tree: RoadmapTree) -> str:
        """Generate a markdown outline of the roadmap"""
        
        lines = [f"# {roadmap_tree.root.title} Learning Roadmap\n"]
        
        # Add summary
        lines.extend([
            f"**Total Topics:** {roadmap_tree.total_nodes}",
            f"**Estimated Time:** {roadmap_tree.total_estimated_hours} hours",
            f"**Maximum Depth:** {roadmap_tree.max_depth}",
            "",
            "## Learning Path\n"
        ])
        
        # Add tree structure
        self._add_markdown_node(roadmap_tree.root, lines, 0)
        
        # Add learning order
        lines.extend([
            "",
            "## Suggested Learning Order\n",
            "Follow this sequence for optimal learning:\n"
        ])
        
        for i, node_id in enumerate(roadmap_tree.suggested_order[:20], 1):
            node = roadmap_tree.get_node_by_id(node_id)
            if node:
                lines.append(f"{i}. {node.title} ({node.estimated_hours}h)")
        
        return "\n".join(lines)
    
    def _add_markdown_node(self, node: RoadmapNode, lines: List[str], level: int):
        """Add markdown representation of a node"""
        
        # Create heading based on level
        heading = "#" * min(level + 2, 6)  # Start with ## for root
        
        # Add node info
        hours = f" *({node.estimated_hours} hours)*" if node.estimated_hours else ""
        lines.append(f"{heading} {node.title}{hours}")
        
        if node.description:
            lines.append(f"\n{node.description}")
        
        if node.key_concepts:
            lines.append("\n**Key Concepts:**")
            for concept in node.key_concepts:
                lines.append(f"- {concept}")
        
        if node.skills:
            lines.append("\n**Skills to Develop:**")
            for skill in node.skills:
                lines.append(f"- {skill}")
        
        lines.append("")  # Empty line
        
        # Add children
        for child in node.children:
            self._add_markdown_node(child, lines, level + 1)