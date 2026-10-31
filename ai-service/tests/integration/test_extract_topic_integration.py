"""
Integration tests for extract_topic_node

Run with: pytest tests/integration/test_extract_topic_integration.py -v

NOTE: These tests are currently disabled because hierarchy_workflow.py no longer exists.
The workflow structure has been refactored. These tests need to be updated to use
the new workflow architecture.
"""

import pytest
import asyncio
from typing import Dict, Any

# Skip all tests in this module until workflow is updated
pytestmark = pytest.mark.skip(reason="hierarchy_workflow.py no longer exists - needs refactoring")

# from workflows.learning_path_workflow.hierarchy_workflow import HierarchyWorkflowGraph


class TestExtractTopicNode:
    """Integration tests for extract_topic_node"""
    
    @pytest.fixture
    def workflow(self):
        """Create workflow instance"""
        return HierarchyWorkflowGraph()
    
    @pytest.fixture
    def basic_state(self):
        """Basic test state with minimal data"""
        return {
            "topic": "Python Web Development",
            "depth": 3,
            "provider": "vertex_ai",
            "temperature": 0.3,
            "semantic_results": {},
            "research_results": {
                "prerequisites": [
                    {"description": "Python basics required", "source": "Django Docs"}
                ],
                "prerequisite_topics": ["python", "html", "css"],
                "learning_structure": {
                    "subtopics": [
                        {"title": "Django", "description": "Web framework"},
                        {"title": "Flask", "description": "Micro framework"}
                    ],
                    "core_concepts": [
                        {"concept": "MVC Pattern", "description": "Model-View-Controller"}
                    ]
                }
            },
            "hierarchy": None,
            "validation_results": {},
            "errors": [],
            "current_step": "test",
            "iteration_count": 0,
            "refinement_queries": []
        }
    
    @pytest.fixture
    def firecrawl_state(self):
        """State with Firecrawl extracted content"""
        return {
            "topic": "Machine Learning",
            "depth": 4,
            "provider": "vertex_ai",
            "temperature": 0.3,
            "semantic_results": {},
            "research_results": {
                "prerequisites": [
                    {"description": "Math foundation needed", "source": "Coursera"}
                ],
                "prerequisite_topics": ["python", "statistics", "linear_algebra"],
                "learning_structure": {
                    "subtopics": [
                        {"title": "Supervised Learning", "description": "Learning with labels"},
                        {"title": "Unsupervised Learning", "description": "Pattern discovery"}
                    ],
                    "core_concepts": [
                        {"concept": "Neural Networks", "source": "firecrawl_extraction"},
                        {"concept": "Decision Trees", "source": "firecrawl_extraction"}
                    ]
                },
                "learning_objectives": [
                    "Build ML models",
                    "Evaluate model performance",
                    "Deploy to production"
                ],
                "firecrawl_extracted_content": {
                    "extracted_content": [
                        {
                            "url": "https://coursera.org/ml",
                            "title": "Machine Learning Course",
                            "summary": "Complete ML course by Andrew Ng",
                            "extraction": {
                                "prerequisites": ["Linear Algebra", "Calculus", "Python"],
                                "key_concepts": [
                                    "Regression",
                                    "Classification",
                                    "Clustering",
                                    "Neural Networks"
                                ],
                                "learning_objectives": [
                                    "Master ML algorithms",
                                    "Implement from scratch",
                                    "Apply to real problems"
                                ],
                                "difficulty_level": "intermediate",
                                "estimated_time": "11 weeks"
                            }
                        }
                    ],
                    "consolidated": {
                        "prerequisites": ["Python", "Math", "Statistics"],
                        "key_concepts": ["Supervised Learning", "Deep Learning"],
                        "sources_processed": 3,
                        "sources_failed": 0
                    }
                }
            },
            "hierarchy": None,
            "validation_results": {},
            "errors": [],
            "current_step": "test",
            "iteration_count": 0,
            "refinement_queries": []
        }
    
    @pytest.mark.asyncio
    async def test_basic_extraction(self, workflow, basic_state):
        """Test basic extraction without Firecrawl content"""
        # Run extraction
        result_state = await workflow.extract_topic_node(basic_state)
        
        # Assertions
        assert "research_results" in result_state
        assert "extracted_structure" in result_state["research_results"]
        
        extracted = result_state["research_results"]["extracted_structure"]
        
        # Check hierarchical breakdown
        assert "hierarchical_breakdown" in extracted
        breakdown = extracted["hierarchical_breakdown"]
        assert "major_areas" in breakdown
        assert "core_concepts" in breakdown
        assert "specific_skills" in breakdown
        assert "learning_hierarchy" in breakdown
        
        # Check prerequisites
        assert "prerequisites" in extracted
        prereqs = extracted["prerequisites"]
        assert "direct" in prereqs
        assert "recommended" in prereqs
        assert "co_requisites" in prereqs
        
        # Check learning structure
        assert "learning_structure" in extracted
        struct = extracted["learning_structure"]
        assert "sequence" in struct
        assert "milestones" in struct
        assert "estimated_duration" in struct
    
    @pytest.mark.asyncio
    async def test_firecrawl_extraction(self, workflow, firecrawl_state):
        """Test extraction with Firecrawl content"""
        # Run extraction
        result_state = await workflow.extract_topic_node(firecrawl_state)
        
        # Assertions
        assert "research_results" in result_state
        assert "extracted_structure" in result_state["research_results"]
        
        extracted = result_state["research_results"]["extracted_structure"]
        
        # Should have richer extraction due to Firecrawl content
        breakdown = extracted["hierarchical_breakdown"]
        
        # Check if major areas were extracted
        if breakdown.get("major_areas"):
            assert len(breakdown["major_areas"]) > 0
            # Check first major area
            first_area = breakdown["major_areas"][0]
            assert "name" in first_area
            assert "description" in first_area
            assert "importance" in first_area
        
        # Check if prerequisites were categorized
        prereqs = extracted["prerequisites"]
        # Should have some prerequisites from Firecrawl content
        all_prereqs = (
            prereqs.get("direct", []) + 
            prereqs.get("recommended", []) + 
            prereqs.get("co_requisites", [])
        )
        # May have prerequisites if LLM extraction worked
        
        # Check learning structure
        struct = extracted["learning_structure"]
        if struct.get("sequence"):
            assert len(struct["sequence"]) > 0
            # Check sequence has proper structure
            first_step = struct["sequence"][0]
            assert "order" in first_step or "area" in first_step
    
    @pytest.mark.asyncio
    async def test_extraction_with_empty_data(self, workflow):
        """Test extraction with minimal/empty data"""
        empty_state = {
            "topic": "Blockchain",
            "depth": 3,
            "provider": "vertex_ai",
            "temperature": 0.3,
            "semantic_results": {},
            "research_results": {
                "prerequisites": [],
                "prerequisite_topics": [],
                "learning_structure": {
                    "subtopics": [],
                    "core_concepts": []
                }
            },
            "hierarchy": None,
            "validation_results": {},
            "errors": [],
            "current_step": "test",
            "iteration_count": 0,
            "refinement_queries": []
        }
        
        # Run extraction
        result_state = await workflow.extract_topic_node(empty_state)
        
        # Should still return valid structure even with empty data
        assert "research_results" in result_state
        assert "extracted_structure" in result_state["research_results"]
        
        extracted = result_state["research_results"]["extracted_structure"]
        
        # Should have all required keys even if empty
        assert "hierarchical_breakdown" in extracted
        assert "prerequisites" in extracted
        assert "learning_structure" in extracted
        assert "resources" in extracted
    
    @pytest.mark.asyncio
    async def test_extraction_preserves_existing_data(self, workflow, firecrawl_state):
        """Test that extraction preserves existing research results"""
        # Add some existing data
        firecrawl_state["research_results"]["custom_field"] = "should_be_preserved"
        
        # Run extraction
        result_state = await workflow.extract_topic_node(firecrawl_state)
        
        # Check original data is preserved
        assert "custom_field" in result_state["research_results"]
        assert result_state["research_results"]["custom_field"] == "should_be_preserved"
        
        # Check new data was added
        assert "extracted_structure" in result_state["research_results"]
    
    @pytest.mark.asyncio
    async def test_error_handling(self, workflow):
        """Test error handling in extraction"""
        # Create state that might cause issues
        problematic_state = {
            "topic": None,  # Invalid topic
            "depth": 3,
            "provider": "vertex_ai",
            "temperature": 0.3,
            "semantic_results": {},
            "research_results": None,  # Invalid research results
            "hierarchy": None,
            "validation_results": {},
            "errors": [],
            "current_step": "test",
            "iteration_count": 0,
            "refinement_queries": []
        }
        
        # Run extraction - should handle errors gracefully
        try:
            result_state = await workflow.extract_topic_node(problematic_state)
            # If it doesn't raise, check errors were recorded
            assert len(result_state.get("errors", [])) > 0
        except Exception as e:
            # Should handle exceptions gracefully
            assert "Topic extraction error" in str(e) or "Error" in str(e)


@pytest.mark.asyncio
async def test_extraction_context_preparation(workflow):
    """Test the _prepare_extraction_context method"""
    workflow = HierarchyWorkflowGraph()
    
    # Test with Firecrawl content
    research_results = {
        "prerequisites": [
            {"description": "Test prerequisite"}
        ],
        "learning_structure": {
            "subtopics": [
                {"title": "Test Topic", "description": "Test description"}
            ],
            "core_concepts": [
                {"concept": "Test Concept"}
            ]
        },
        "learning_objectives": ["Test objective"],
        "firecrawl_extracted_content": {
            "extracted_content": [
                {"summary": "Test summary", "title": "Test"}
            ],
            "consolidated": {
                "learning_objectives": ["Extracted objective"]
            }
        }
    }
    
    context = workflow._prepare_extraction_context(research_results)
    
    # Check context includes all relevant sections
    assert "Extracted web content:" in context
    assert "Prerequisites found:" in context
    assert "Subtopics identified:" in context
    assert "Core concepts:" in context
    assert "Learning objectives found:" in context


if __name__ == "__main__":
    # Run tests directly
    pytest.main([__file__, "-v"])