"""
Core roadmap generation logic with recursive expansion
Enhanced to use concept models from database
"""

import os
import uuid
from typing import List, Dict, Any, Optional, Tuple
from langchain_core.messages import SystemMessage, HumanMessage

from .models import (
    RoadmapNode, RoadmapTree, TopicComplexity, NodeType,
    LearningPath, ExpansionDecision, RoadmapRequest
)
from models.database import (
    Domain, Topic, Concept, ConceptResource,
    ConceptRoadmap, DomainRoadmap
)
from langchain_google_vertexai import ChatVertexAI

# Lazy initialization of LLM
_llm_instance = None

def get_llm():
    """Get LLM instance (lazy initialization)"""
    global _llm_instance
    if _llm_instance is None:
        if ChatVertexAI:
            model = os.environ.get("VERTEX_AI_MODEL", "gemini-1.5-flash")
            _llm_instance = ChatVertexAI(model=model, temperature=0.7)
        else:
            raise RuntimeError("No LLM available. Please configure Google Vertex AI.")
    return _llm_instance


class RoadmapGenerator:
    """Generates learning roadmaps with recursive topic expansion"""
    
    def __init__(self):
        self.llm = None  # Lazy initialization
        self.node_counter = 0
    
    def _get_llm(self):
        """Get or initialize LLM"""
        if self.llm is None:
            self.llm = get_llm()
        return self.llm
        
    def generate_roadmap(self, request: RoadmapRequest) -> RoadmapTree:
        """Generate a complete learning roadmap for a topic"""
        
        print(f"\n{'='*60}")
        print(f"STARTING ROADMAP GENERATION")
        print(f"Topic: {request.topic}")
        print(f"Target Audience: {request.target_audience}")
        print(f"Max Depth: {request.max_depth}")
        print(f"{'='*60}\n")
        
        # Create root node
        print(f"[STEP 1] Creating root node for '{request.topic}'...")
        root = self._create_root_node(request.topic, request.target_audience)
        print(f"  ✓ Root node created: {root.title}")
        print(f"  - Complexity: {root.complexity}")
        print(f"  - Estimated hours: {root.estimated_hours}")
        print(f"  - Needs expansion: {root.needs_expansion}")
        
        # Recursively expand the roadmap
        print(f"\n[STEP 2] Starting recursive expansion...")
        self._expand_node_recursive(
            node=root,
            request=request,
            current_depth=0
        )
        
        # Build the complete tree
        print(f"\n[STEP 3] Building roadmap tree...")
        roadmap_tree = self._build_tree(root, request)
        print(f"  ✓ Tree built with {roadmap_tree.total_nodes} nodes")
        print(f"  - Max depth reached: {roadmap_tree.max_depth}")
        print(f"  - Total learning hours: {roadmap_tree.total_estimated_hours}")
        
        # Generate learning paths
        print(f"\n[STEP 4] Generating learning paths...")
        roadmap_tree.suggested_order = self._generate_learning_order(root)
        roadmap_tree.critical_path = self._identify_critical_path(root)
        print(f"  ✓ Learning order: {len(roadmap_tree.suggested_order)} nodes")
        print(f"  ✓ Critical path: {len(roadmap_tree.critical_path)} nodes")
        
        print(f"\n{'='*60}")
        print(f"ROADMAP GENERATION COMPLETE")
        print(f"{'='*60}\n")
        
        return roadmap_tree
    
    def _create_root_node(self, topic: str, target_audience: str) -> RoadmapNode:
        """Create the root node for the roadmap"""
        
        # Analyze the topic complexity
        complexity = self._assess_complexity(topic)
        
        # Generate estimated hours based on complexity
        hours_map = {
            TopicComplexity.SIMPLE: 50,
            TopicComplexity.MODERATE: 150,
            TopicComplexity.COMPLEX: 500,
            TopicComplexity.VAST: 1000
        }
        
        # Generate key concepts for the topic
        key_concepts = self._generate_key_concepts(topic)
        
        return RoadmapNode(
            id=self._generate_node_id(),
            title=topic,
            description=f"Comprehensive learning path for mastering {topic} from fundamentals to advanced concepts",
            node_type=NodeType.ROOT,
            complexity=complexity,
            estimated_hours=hours_map.get(complexity, 200),
            depth=0,
            difficulty_level=target_audience,
            needs_expansion=complexity in [TopicComplexity.COMPLEX, TopicComplexity.VAST, TopicComplexity.MODERATE],
            key_concepts=key_concepts,
            skills=self._generate_skills(topic),
            tags=self._generate_tags(topic)
        )
    
    def _generate_key_concepts(self, topic: str) -> list:
        """Generate key concepts for a topic"""
        # Default key concepts based on topic
        if 'quant' in topic.lower() or 'trading' in topic.lower():
            return [
                "Statistical Analysis",
                "Algorithm Development", 
                "Risk Management",
                "Market Microstructure",
                "Backtesting",
                "Portfolio Optimization"
            ]
        elif 'data science' in topic.lower():
            return [
                "Statistical Modeling",
                "Machine Learning",
                "Data Visualization",
                "Big Data Processing",
                "Feature Engineering"
            ]
        else:
            return ["Core Fundamentals", "Practical Applications", "Best Practices"]
    
    def _generate_skills(self, topic: str) -> list:
        """Generate skills for a topic"""
        if 'quant' in topic.lower() or 'trading' in topic.lower():
            return [
                "Python/R programming",
                "Financial modeling",
                "Time series analysis",
                "Strategy development"
            ]
        elif 'data science' in topic.lower():
            return [
                "Python programming",
                "SQL databases",
                "Statistical analysis",
                "Model deployment"
            ]
        else:
            return ["Problem solving", "Technical implementation", "Project management"]
    
    def _generate_tags(self, topic: str) -> list:
        """Generate tags for a topic"""
        tags = [topic.lower()]
        if 'quant' in topic.lower():
            tags.extend(['finance', 'algorithms', 'mathematics', 'programming'])
        elif 'trading' in topic.lower():
            tags.extend(['finance', 'markets', 'automation'])
        elif 'data' in topic.lower():
            tags.extend(['analytics', 'machine-learning', 'statistics'])
        return tags
    
    def _expand_node_recursive(
        self,
        node: RoadmapNode,
        request: RoadmapRequest,
        current_depth: int
    ):
        """Recursively expand a node into subtopics"""
        
        # Check stopping conditions
        if current_depth >= request.max_depth:
            node.is_leaf = True
            return
        
        if not self._should_expand_node(node, request):
            node.is_leaf = True
            return
        
        # Generate subtopics
        subtopics = self._generate_subtopics(node, request)
        
        # Create child nodes
        for subtopic_info in subtopics:
            child = self._create_child_node(
                parent=node,
                subtopic_info=subtopic_info,
                depth=current_depth + 1
            )
            
            # Add to parent's children
            node.children.append(child)
            
            # Recursively expand child
            self._expand_node_recursive(child, request, current_depth + 1)
    
    def _should_expand_node(self, node: RoadmapNode, request: RoadmapRequest) -> bool:
        """Determine if a node should be expanded further"""
        
        # Always expand if needs_expansion flag is set
        if node.needs_expansion:
            return True
        
        # Expand vast and complex topics
        if node.complexity in [TopicComplexity.VAST, TopicComplexity.COMPLEX]:
            return True
        
        # Expand moderate topics at shallow depths
        if node.complexity == TopicComplexity.MODERATE and node.depth < 2:
            return True
        
        # Don't expand simple topics unless at depth 0
        if node.complexity == TopicComplexity.SIMPLE and node.depth > 0:
            return False
        
        # Check if it's in exclude areas
        for exclude in request.exclude_areas:
            if exclude.lower() in node.title.lower():
                return False
        
        # For depth 0-1, always try to expand to get a meaningful tree
        if node.depth <= 1:
            return True
        
        # Use LLM to make expansion decision for borderline cases
        decision = self._get_expansion_decision(node, request)
        return decision.should_expand
    
    def _get_expansion_decision(self, node: RoadmapNode, request: RoadmapRequest) -> ExpansionDecision:
        """Use LLM to decide whether to expand a node"""
        
        prompt = f"""
        Analyze whether this topic needs to be broken down into subtopics:
        
        Topic: {node.title}
        Description: {node.description}
        Current Depth: {node.depth}
        Target Audience: {request.target_audience}
        
        Consider:
        1. Is this topic too broad to learn as a single unit?
        2. Would breaking it down help learners understand better?
        3. Are there distinct subtopics that should be learned separately?
        
        Respond with:
        1. Should expand (yes/no)
        2. Complexity assessment (simple/moderate/complex/vast)
        3. If yes, suggest 3-7 subtopics
        4. Brief reason for decision
        """
        
        messages = [
            SystemMessage(content="You are an expert in curriculum design and learning path creation."),
            HumanMessage(content=prompt)
        ]
        
        response = self._get_llm().invoke(messages)
        content = response.content if hasattr(response, 'content') else str(response)
        
        # Parse response (simplified parsing)
        should_expand = "yes" in content.lower()[:100]
        
        # Extract suggested subtopics
        subtopics = []
        if should_expand:
            lines = content.split('\n')
            for line in lines:
                if '-' in line or '•' in line or any(f"{i}." in line for i in range(1, 10)):
                    # Clean and add subtopic
                    subtopic = line.strip().lstrip('-•').strip()
                    if len(subtopic) > 3 and len(subtopic) < 100:
                        subtopics.append(subtopic)
        
        # Assess complexity
        complexity = TopicComplexity.MODERATE  # default
        if "vast" in content.lower():
            complexity = TopicComplexity.VAST
        elif "complex" in content.lower():
            complexity = TopicComplexity.COMPLEX
        elif "simple" in content.lower():
            complexity = TopicComplexity.SIMPLE
        
        return ExpansionDecision(
            should_expand=should_expand,
            reason=content[:200],
            suggested_subtopics=subtopics[:request.max_subtopics],
            complexity_assessment=complexity
        )
    
    def _generate_subtopics(self, node: RoadmapNode, request: RoadmapRequest) -> List[Dict[str, Any]]:
        """Generate subtopics for a node"""
        
        prompt = f"""
        Break down this topic into learnable subtopics:
        
        Main Topic: {node.title}
        Description: {node.description}
        Target Audience: {request.target_audience}
        Learning Goals: {', '.join(request.learning_goals) if request.learning_goals else 'General mastery'}
        
        Generate {request.min_subtopics} to {request.max_subtopics} subtopics that:
        1. Cover the essential aspects of {node.title}
        2. Are appropriately sized for the target audience
        3. Follow a logical learning progression
        4. Include both foundational and advanced concepts
        
        For each subtopic, provide:
        - Title
        - Brief description
        - Estimated learning hours
        - Key concepts (2-3)
        - Prerequisites (if any)
        - Whether it's core or optional
        
        Format as a structured list.
        """
        
        if request.focus_areas:
            prompt += f"\n\nFocus especially on: {', '.join(request.focus_areas)}"
        
        messages = [
            SystemMessage(content="You are an expert educator creating comprehensive learning paths."),
            HumanMessage(content=prompt)
        ]
        
        response = self._get_llm().invoke(messages)
        content = response.content if hasattr(response, 'content') else str(response)
        
        # Parse subtopics from response
        subtopics = self._parse_subtopics(content, node)
        
        # Ensure minimum subtopics
        if len(subtopics) < request.min_subtopics:
            # Generate additional generic subtopics
            subtopics.extend(self._generate_default_subtopics(
                node,
                request.min_subtopics - len(subtopics)
            ))
        
        return subtopics[:request.max_subtopics]
    
    def _parse_subtopics(self, content: str, parent: RoadmapNode) -> List[Dict[str, Any]]:
        """Parse subtopics from LLM response"""
        
        subtopics = []
        current_subtopic = {}
        
        lines = content.split('\n')
        for line in lines:
            line = line.strip()
            
            # Detect new subtopic
            if any(marker in line for marker in ['Title:', '- Title:', '•', '-', '1.', '2.', '3.']):
                if current_subtopic and 'title' in current_subtopic:
                    subtopics.append(current_subtopic)
                    current_subtopic = {}
                
                # Extract title
                title = line
                for marker in ['Title:', '- Title:', '•', '-'] + [f"{i}." for i in range(1, 10)]:
                    title = title.replace(marker, '').strip()
                
                current_subtopic['title'] = title[:100]  # Limit length
            
            # Extract other fields
            elif 'description:' in line.lower():
                current_subtopic['description'] = line.split(':', 1)[1].strip()
            elif 'hours:' in line.lower() or 'duration:' in line.lower():
                try:
                    hours = int(''.join(filter(str.isdigit, line)))
                    current_subtopic['estimated_hours'] = hours
                except:
                    current_subtopic['estimated_hours'] = 10
            elif 'concepts:' in line.lower():
                concepts = line.split(':', 1)[1].strip().split(',')
                current_subtopic['key_concepts'] = [c.strip() for c in concepts]
            elif 'prerequisite' in line.lower():
                current_subtopic['has_prerequisites'] = True
        
        # Add last subtopic
        if current_subtopic and 'title' in current_subtopic:
            subtopics.append(current_subtopic)
        
        # Ensure all subtopics have required fields
        for subtopic in subtopics:
            if 'description' not in subtopic:
                subtopic['description'] = f"Learn about {subtopic.get('title', 'this topic')}"
            if 'estimated_hours' not in subtopic:
                subtopic['estimated_hours'] = 20
            if 'key_concepts' not in subtopic:
                subtopic['key_concepts'] = []
        
        return subtopics
    
    def _generate_default_subtopics(self, node: RoadmapNode, count: int) -> List[Dict[str, Any]]:
        """Generate default subtopics when LLM doesn't provide enough"""
        
        default_categories = [
            "Fundamentals",
            "Core Concepts",
            "Advanced Topics",
            "Practical Applications",
            "Best Practices",
            "Tools and Technologies",
            "Case Studies"
        ]
        
        subtopics = []
        for i in range(count):
            category = default_categories[i % len(default_categories)]
            subtopics.append({
                'title': f"{node.title} - {category}",
                'description': f"Explore {category.lower()} of {node.title}",
                'estimated_hours': 15,
                'key_concepts': [f"{category} concept 1", f"{category} concept 2"]
            })
        
        return subtopics
    
    def _create_child_node(
        self,
        parent: RoadmapNode,
        subtopic_info: Dict[str, Any],
        depth: int
    ) -> RoadmapNode:
        """Create a child node from subtopic information"""
        
        # Determine node type based on depth
        node_types = [NodeType.ROOT, NodeType.DOMAIN, NodeType.SUBJECT, 
                     NodeType.TOPIC, NodeType.SUBTOPIC, NodeType.CONCEPT]
        node_type = node_types[min(depth, len(node_types) - 1)]
        
        # Assess complexity
        complexity = self._assess_complexity(subtopic_info['title'])
        
        # Ensure we have key concepts
        key_concepts = subtopic_info.get('key_concepts', [])
        if not key_concepts:
            # Generate default concepts based on title
            key_concepts = [
                f"Understanding {subtopic_info['title']}",
                f"Implementing {subtopic_info['title']}",
                f"Best practices for {subtopic_info['title']}"
            ]
        
        # Generate skills if not provided
        skills = []
        if 'programming' in subtopic_info['title'].lower():
            skills = ["Coding", "Debugging", "Testing"]
        elif 'analysis' in subtopic_info['title'].lower():
            skills = ["Data analysis", "Problem solving", "Critical thinking"]
        elif 'strategy' in subtopic_info['title'].lower():
            skills = ["Strategic planning", "Implementation", "Evaluation"]
        
        # Generate learning path type
        learning_path = LearningPath.SEQUENTIAL
        if 'advanced' in subtopic_info['title'].lower() or 'optional' in subtopic_info['title'].lower():
            learning_path = LearningPath.OPTIONAL
        elif 'foundation' in subtopic_info['title'].lower() or 'basic' in subtopic_info['title'].lower():
            learning_path = LearningPath.PREREQUISITE
        
        # Create node with enhanced information
        node = RoadmapNode(
            id=self._generate_node_id(),
            title=subtopic_info['title'],
            description=subtopic_info['description'],
            node_type=node_type,
            complexity=complexity,
            estimated_hours=subtopic_info.get('estimated_hours', 20),
            key_concepts=key_concepts,
            skills=skills,
            parent_id=parent.id,
            depth=depth,
            difficulty_level=parent.difficulty_level,
            needs_expansion=(complexity in [TopicComplexity.COMPLEX, TopicComplexity.VAST, TopicComplexity.MODERATE] and depth < 3),
            learning_path=learning_path,
            tags=[parent.title.lower(), subtopic_info['title'].lower()],
            projects=[f"Build a {subtopic_info['title']} project"] if depth >= 2 else []
        )
        
        # Set prerequisites if this has dependencies
        if subtopic_info.get('has_prerequisites'):
            # Link to previous sibling as prerequisite
            if parent.children:
                node.prerequisites.append(parent.children[-1].id)
        
        return node
    
    def _assess_complexity(self, topic: str) -> TopicComplexity:
        """Assess the complexity of a topic"""
        
        # Keywords indicating vast topics
        vast_keywords = [
            'machine learning', 'artificial intelligence', 'data science',
            'quantum computing', 'blockchain', 'cloud computing',
            'cybersecurity', 'full stack', 'devops', 'medicine',
            'quant', 'quantitative', 'algorithmic trading', 'financial engineering'
        ]
        
        # Keywords indicating complex topics
        complex_keywords = [
            'algorithms', 'distributed systems', 'neural networks',
            'compiler', 'operating system', 'cryptography', 'statistics',
            'calculus', 'physics', 'chemistry', 'economics', 'trading',
            'finance', 'deep learning', 'computer vision', 'nlp'
        ]
        
        # Keywords indicating moderate topics
        moderate_keywords = [
            'programming', 'database', 'api', 'framework', 'testing',
            'debugging', 'optimization', 'design patterns', 'architecture',
            'react', 'vue', 'angular', 'django', 'flask', 'spring'
        ]
        
        topic_lower = topic.lower()
        
        # Check for vast topics
        if any(keyword in topic_lower for keyword in vast_keywords):
            return TopicComplexity.VAST
        
        # Check for complex topics
        if any(keyword in topic_lower for keyword in complex_keywords):
            return TopicComplexity.COMPLEX
        
        # Check for moderate topics
        if any(keyword in topic_lower for keyword in moderate_keywords):
            return TopicComplexity.MODERATE
        
        # For unknown topics, assume at least moderate complexity to trigger expansion
        # Better to over-expand than under-expand
        return TopicComplexity.MODERATE
    
    def _build_tree(self, root: RoadmapNode, request: RoadmapRequest) -> RoadmapTree:
        """Build the complete roadmap tree"""
        
        # Calculate statistics
        all_nodes = self._flatten_tree(root)
        total_hours = sum(node.estimated_hours or 0 for node in all_nodes)
        
        # Complexity distribution
        complexity_dist = {}
        for node in all_nodes:
            complexity_dist[node.complexity] = complexity_dist.get(node.complexity, 0) + 1
        
        # Find max depth
        max_depth = max(node.depth for node in all_nodes)
        
        return RoadmapTree(
            root=root,
            total_nodes=len(all_nodes),
            max_depth=max_depth,
            total_estimated_hours=total_hours,
            complexity_distribution=complexity_dist,
            generation_params={
                'topic': request.topic,
                'target_audience': request.target_audience,
                'max_depth': request.max_depth
            }
        )
    
    def _flatten_tree(self, node: RoadmapNode) -> List[RoadmapNode]:
        """Flatten tree to list of nodes"""
        nodes = [node]
        for child in node.children:
            nodes.extend(self._flatten_tree(child))
        return nodes
    
    def _generate_learning_order(self, root: RoadmapNode) -> List[str]:
        """Generate suggested learning order"""
        
        # Depth-first traversal with prerequisites considered
        order = []
        visited = set()
        
        def visit(node: RoadmapNode):
            if node.id in visited:
                return
            
            # Visit prerequisites first
            for prereq_id in node.prerequisites:
                prereq_node = self._find_node_by_id(root, prereq_id)
                if prereq_node:
                    visit(prereq_node)
            
            visited.add(node.id)
            order.append(node.id)
            
            # Visit children
            for child in node.children:
                visit(child)
        
        visit(root)
        return order
    
    def _identify_critical_path(self, root: RoadmapNode) -> List[str]:
        """Identify the critical learning path"""
        
        # Find nodes marked as core or fundamental
        critical_nodes = []
        
        def find_critical(node: RoadmapNode):
            # Check if node is critical (simplified logic)
            if any(keyword in node.title.lower() 
                   for keyword in ['fundamental', 'core', 'essential', 'basic']):
                critical_nodes.append(node.id)
            
            # Always include root and first-level nodes
            if node.depth <= 1:
                if node.id not in critical_nodes:
                    critical_nodes.append(node.id)
            
            for child in node.children:
                find_critical(child)
        
        find_critical(root)
        return critical_nodes
    
    def _find_node_by_id(self, root: RoadmapNode, node_id: str) -> Optional[RoadmapNode]:
        """Find a node by ID"""
        if root.id == node_id:
            return root
        for child in root.children:
            result = self._find_node_by_id(child, node_id)
            if result:
                return result
        return None
    
    def _generate_node_id(self) -> str:
        """Generate unique node ID"""
        self.node_counter += 1
        return f"node_{self.node_counter}_{uuid.uuid4().hex[:8]}"
    
    def convert_to_concept_models(self, roadmap_tree: RoadmapTree) -> Dict[str, Any]:
        """Convert RoadmapTree to database concept models
        
        Returns a dictionary with:
        - domain: Domain object representing the main topic
        - topics: List of Topic objects for major areas
        - concepts: List of Concept objects for specific skills
        - resources: List of ConceptResource objects
        """
        
        # Create domain from root node
        domain_data = {
            "name": roadmap_tree.root.title,
            "description": roadmap_tree.root.description or f"Learning domain for {roadmap_tree.root.title}"
        }
        
        # Extract topics from depth 1 nodes
        topics = []
        concepts = []
        resources = []
        
        # Map nodes to topics and concepts based on depth
        def process_node(node: RoadmapNode, parent_topic_id: Optional[int] = None):
            if node.depth == 1:
                # Depth 1 nodes become topics
                topic_data = {
                    "name": node.title,
                    "description": node.description,
                    "level": 0,
                    "order_index": len(topics),
                    "meta_data": {
                        "estimated_hours": node.estimated_hours,
                        "complexity": node.complexity.value if node.complexity else None,
                        "prerequisites": [p.title for p in node.prerequisites] if node.prerequisites else []
                    }
                }
                topics.append(topic_data)
                current_topic_id = len(topics) - 1
                
                # Process children as concepts
                for child in node.children:
                    process_concept(child, current_topic_id)
            
        def process_concept(node: RoadmapNode, topic_id: int):
            # Create concept from node
            concept_data = {
                "name": node.title,
                "topic_id": topic_id,
                "description": node.description,
                "summary": node.key_points[0] if node.key_points else "",
                "is_atomic": node.depth >= 2,  # Deeper nodes are more atomic
                "keywords": node.key_points or [],
                "prerequisites": [p.title for p in node.prerequisites] if node.prerequisites else [],
                "learning_outcomes": node.practical_applications or [],
                "meta_data": {
                    "estimated_hours": node.estimated_hours,
                    "complexity": node.complexity.value if node.complexity else None,
                    "tools": node.tools_technologies
                },
                "verified": False
            }
            concepts.append(concept_data)
            
            # Generate resources for this concept
            if node.learning_resources:
                for resource in node.learning_resources:
                    resource_data = {
                        "concept_id": len(concepts) - 1,
                        "title": resource.get("title", f"Resource for {node.title}"),
                        "description": resource.get("description", ""),
                        "url": resource.get("url", ""),
                        "resource_type": resource.get("type", "article"),
                        "difficulty_level": self._map_complexity_to_difficulty(node.complexity),
                        "estimated_minutes": (node.estimated_hours or 1) * 60 // max(len(node.learning_resources), 1),
                        "is_free": True,
                        "meta_data": resource
                    }
                    resources.append(resource_data)
            
            # Process children recursively
            for child in node.children:
                process_concept(child, topic_id)
        
        # Process all nodes starting from root's children
        for child in roadmap_tree.root.children:
            process_node(child)
        
        return {
            "domain": domain_data,
            "topics": topics,
            "concepts": concepts,
            "resources": resources,
            "roadmap_metadata": {
                "total_nodes": roadmap_tree.total_nodes,
                "max_depth": roadmap_tree.max_depth,
                "total_hours": roadmap_tree.total_estimated_hours,
                "critical_path": roadmap_tree.critical_path,
                "suggested_order": roadmap_tree.suggested_order
            }
        }
    
    def _map_complexity_to_difficulty(self, complexity: Optional[TopicComplexity]) -> str:
        """Map TopicComplexity enum to difficulty level string"""
        if not complexity:
            return "intermediate"
        
        mapping = {
            TopicComplexity.SIMPLE: "beginner",
            TopicComplexity.MODERATE: "intermediate",
            TopicComplexity.COMPLEX: "advanced",
            TopicComplexity.EXPERT: "advanced"
        }
        return mapping.get(complexity, "intermediate")