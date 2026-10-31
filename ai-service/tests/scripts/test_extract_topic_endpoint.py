#!/usr/bin/env python3
"""
Test script for the extract_topic_node endpoint

This script tests the extract_topic_node with various scenarios including:
1. Basic extraction with minimal data
2. Extraction with Firecrawl content
3. Extraction with rich web search results
4. Error handling scenarios
"""

import asyncio
import json
import aiohttp
from typing import Dict, Any
import argparse
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8888"
ENDPOINT = "/test/hierarchy/node/extract-topic"


class ExtractTopicTester:
    """Test harness for extract_topic_node endpoint"""
    
    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url
        self.endpoint = f"{base_url}{ENDPOINT}"
    
    async def test_basic_extraction(self) -> Dict[str, Any]:
        """Test with basic research results"""
        print("\n" + "="*60)
        print("TEST 1: Basic Extraction")
        print("="*60)
        
        request_data = {
            "topic": "Python Web Development",
            "depth": 3,
            "provider": "vertex_ai",
            "temperature": 0.3,
            "research_results": {
                "prerequisites": [
                    {
                        "description": "Basic Python programming knowledge required",
                        "source": "Django Documentation"
                    },
                    {
                        "description": "Understanding of HTML, CSS, and JavaScript",
                        "source": "MDN Web Docs"
                    }
                ],
                "prerequisite_topics": ["python", "html", "css", "javascript", "sql"],
                "learning_structure": {
                    "subtopics": [
                        {
                            "title": "Web Frameworks",
                            "description": "Django, Flask, FastAPI"
                        },
                        {
                            "title": "Database Integration",
                            "description": "SQLAlchemy, Django ORM"
                        },
                        {
                            "title": "API Development",
                            "description": "RESTful APIs, GraphQL"
                        }
                    ],
                    "core_concepts": [
                        {"concept": "HTTP Protocol", "description": "Request/Response cycle"},
                        {"concept": "MVC Architecture", "description": "Model-View-Controller pattern"},
                        {"concept": "Database Design", "description": "Relational and NoSQL databases"}
                    ]
                },
                "resources_found": [
                    {"url": "https://djangoproject.com", "title": "Django Official Site"},
                    {"url": "https://flask.palletsprojects.com", "title": "Flask Documentation"}
                ]
            }
        }
        
        return await self._make_request(request_data)
    
    async def test_with_firecrawl_content(self) -> Dict[str, Any]:
        """Test with Firecrawl extracted content"""
        print("\n" + "="*60)
        print("TEST 2: Extraction with Firecrawl Content")
        print("="*60)
        
        request_data = {
            "topic": "Machine Learning Engineering",
            "depth": 4,
            "provider": "vertex_ai",
            "temperature": 0.3,
            "research_results": {
                "prerequisites": [
                    {
                        "description": "Strong foundation in mathematics, especially linear algebra and calculus",
                        "source": "Coursera ML Course"
                    }
                ],
                "prerequisite_topics": ["python", "statistics", "linear algebra", "calculus"],
                "learning_structure": {
                    "subtopics": [
                        {"title": "Supervised Learning", "description": "Classification and regression"},
                        {"title": "Unsupervised Learning", "description": "Clustering and dimensionality reduction"},
                        {"title": "Deep Learning", "description": "Neural networks and architectures"}
                    ],
                    "core_concepts": [
                        {"concept": "Feature Engineering", "source": "firecrawl_extraction"},
                        {"concept": "Model Evaluation", "source": "firecrawl_extraction"},
                        {"concept": "Hyperparameter Tuning", "source": "firecrawl_extraction"}
                    ]
                },
                "learning_objectives": [
                    "Understand the fundamentals of machine learning algorithms",
                    "Build and train models using scikit-learn and TensorFlow",
                    "Deploy ML models to production",
                    "Implement MLOps best practices"
                ],
                "firecrawl_extracted_content": {
                    "extracted_content": [
                        {
                            "url": "https://www.coursera.org/learn/machine-learning",
                            "title": "Machine Learning by Andrew Ng",
                            "summary": "Comprehensive introduction to machine learning, covering supervised and unsupervised learning, best practices in ML",
                            "extraction": {
                                "title": "Machine Learning Course",
                                "prerequisites": ["Linear Algebra", "Basic Programming", "Calculus"],
                                "key_concepts": [
                                    "Linear Regression",
                                    "Logistic Regression",
                                    "Neural Networks",
                                    "Support Vector Machines",
                                    "K-Means Clustering",
                                    "Principal Component Analysis"
                                ],
                                "learning_objectives": [
                                    "Master fundamental ML algorithms",
                                    "Understand when to use different algorithms",
                                    "Implement ML algorithms from scratch",
                                    "Apply ML to real-world problems"
                                ],
                                "difficulty_level": "intermediate",
                                "estimated_time": "11 weeks"
                            }
                        },
                        {
                            "url": "https://www.fast.ai/",
                            "title": "Practical Deep Learning for Coders",
                            "summary": "A practical approach to deep learning that gets you to state-of-the-art results",
                            "extraction": {
                                "prerequisites": ["Python Programming", "High School Math"],
                                "key_concepts": [
                                    "Transfer Learning",
                                    "CNNs",
                                    "RNNs",
                                    "Transformers",
                                    "GANs"
                                ],
                                "learning_objectives": [
                                    "Build state-of-the-art models",
                                    "Understand modern DL architectures"
                                ]
                            }
                        }
                    ],
                    "consolidated": {
                        "prerequisites": [
                            "Python Programming",
                            "Linear Algebra",
                            "Calculus",
                            "Statistics",
                            "Basic Programming"
                        ],
                        "key_concepts": [
                            "Supervised Learning",
                            "Unsupervised Learning",
                            "Neural Networks",
                            "Deep Learning",
                            "Feature Engineering",
                            "Model Evaluation"
                        ],
                        "main_topics": [
                            "Classical ML Algorithms",
                            "Deep Learning",
                            "MLOps",
                            "Model Deployment"
                        ],
                        "learning_objectives": [
                            "Master fundamental ML algorithms",
                            "Build and train various ML models",
                            "Deploy models to production",
                            "Implement MLOps practices"
                        ],
                        "sources_processed": 5,
                        "sources_failed": 0
                    }
                }
            }
        }
        
        return await self._make_request(request_data)
    
    async def test_comprehensive_extraction(self) -> Dict[str, Any]:
        """Test with comprehensive data including all fields"""
        print("\n" + "="*60)
        print("TEST 3: Comprehensive Extraction")
        print("="*60)
        
        request_data = {
            "topic": "Cloud Native Development",
            "depth": 4,
            "provider": "vertex_ai",
            "temperature": 0.3,
            "semantic_results": {
                "similar_concepts": [
                    {"name": "Microservices", "similarity": 0.85},
                    {"name": "Kubernetes", "similarity": 0.82},
                    {"name": "Docker", "similarity": 0.80}
                ],
                "gap_analysis": {
                    "missing_areas": ["Service Mesh", "Serverless", "GitOps"]
                }
            },
            "research_results": {
                "main_topic": "Cloud Native Development",
                "prerequisites": [
                    {
                        "description": "Understanding of containerization with Docker",
                        "source": "CNCF Documentation"
                    },
                    {
                        "description": "Basic knowledge of distributed systems",
                        "source": "Google SRE Book"
                    },
                    {
                        "description": "Familiarity with CI/CD pipelines",
                        "source": "GitLab CI Documentation"
                    }
                ],
                "prerequisite_topics": [
                    "docker",
                    "kubernetes basics",
                    "linux",
                    "networking",
                    "git",
                    "yaml"
                ],
                "learning_structure": {
                    "subtopics": [
                        {
                            "title": "Container Orchestration",
                            "description": "Kubernetes, Docker Swarm, Nomad"
                        },
                        {
                            "title": "Microservices Architecture",
                            "description": "Service design, communication patterns, data management"
                        },
                        {
                            "title": "DevOps Practices",
                            "description": "CI/CD, Infrastructure as Code, Monitoring"
                        },
                        {
                            "title": "Cloud Platforms",
                            "description": "AWS, GCP, Azure native services"
                        }
                    ],
                    "core_concepts": [
                        {
                            "concept": "Container Orchestration",
                            "description": "Managing containerized applications at scale",
                            "source": "firecrawl_extraction"
                        },
                        {
                            "concept": "Service Mesh",
                            "description": "Infrastructure layer for service-to-service communication",
                            "source": "firecrawl_extraction"
                        },
                        {
                            "concept": "Observability",
                            "description": "Monitoring, logging, and tracing in distributed systems",
                            "source": "web_search"
                        },
                        {
                            "concept": "GitOps",
                            "description": "Git as single source of truth for deployment",
                            "source": "web_search"
                        }
                    ],
                    "learning_path": [
                        "Containerization Basics",
                        "Kubernetes Fundamentals",
                        "Microservices Design",
                        "Advanced Orchestration",
                        "Production Operations"
                    ]
                },
                "difficulty_progression": [
                    "Start with Docker basics and containerization",
                    "Move to Kubernetes fundamentals",
                    "Learn microservices patterns",
                    "Advanced topics like service mesh and observability"
                ],
                "learning_objectives": [
                    "Design and build cloud-native applications",
                    "Deploy and manage applications on Kubernetes",
                    "Implement microservices architecture",
                    "Set up CI/CD pipelines for cloud-native apps",
                    "Monitor and troubleshoot distributed systems"
                ],
                "resources_found": [
                    {
                        "url": "https://kubernetes.io/docs/",
                        "title": "Kubernetes Documentation",
                        "relevance": "high"
                    },
                    {
                        "url": "https://12factor.net/",
                        "title": "The Twelve-Factor App",
                        "relevance": "high"
                    }
                ],
                "subtopics": {
                    "Container Orchestration": {
                        "sources": 5,
                        "content_summary": "Kubernetes is the de facto standard for container orchestration..."
                    },
                    "Microservices Architecture": {
                        "sources": 4,
                        "content_summary": "Breaking applications into small, independent services..."
                    }
                },
                "firecrawl_extracted_content": {
                    "extracted_content": [
                        {
                            "url": "https://kubernetes.io/docs/tutorials/",
                            "title": "Kubernetes Tutorials",
                            "summary": "Official Kubernetes tutorials covering basics to advanced topics",
                            "extraction": {
                                "prerequisites": ["Docker", "Linux basics", "YAML"],
                                "key_concepts": [
                                    "Pods",
                                    "Services",
                                    "Deployments",
                                    "ConfigMaps",
                                    "Secrets",
                                    "Ingress"
                                ],
                                "learning_objectives": [
                                    "Deploy applications to Kubernetes",
                                    "Scale applications",
                                    "Manage application configuration"
                                ],
                                "difficulty_level": "intermediate",
                                "estimated_time": "40 hours"
                            }
                        }
                    ],
                    "consolidated": {
                        "prerequisites": ["Docker", "Linux", "Networking", "YAML", "Git"],
                        "key_concepts": [
                            "Containers",
                            "Orchestration",
                            "Microservices",
                            "Service Mesh",
                            "CI/CD",
                            "Infrastructure as Code"
                        ],
                        "sources_processed": 7,
                        "sources_failed": 1
                    }
                }
            }
        }
        
        return await self._make_request(request_data)
    
    async def test_minimal_data(self) -> Dict[str, Any]:
        """Test with minimal data to check fallback behavior"""
        print("\n" + "="*60)
        print("TEST 4: Minimal Data (Fallback Test)")
        print("="*60)
        
        request_data = {
            "topic": "Blockchain Development",
            "depth": 3,
            "provider": "vertex_ai",
            "temperature": 0.3,
            "research_results": {
                "prerequisites": [],
                "prerequisite_topics": [],
                "learning_structure": {
                    "subtopics": [],
                    "core_concepts": []
                }
            }
        }
        
        return await self._make_request(request_data)
    
    async def _make_request(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Make HTTP request to the endpoint"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.endpoint,
                    json=data,
                    headers={"Content-Type": "application/json"},
                    timeout=aiohttp.ClientTimeout(total=60)
                ) as response:
                    result = await response.json()
                    
                    if response.status == 200:
                        self._print_success_result(result)
                    else:
                        self._print_error_result(result, response.status)
                    
                    return result
                    
        except asyncio.TimeoutError:
            print("❌ Request timed out")
            return {"error": "timeout"}
        except Exception as e:
            print(f"❌ Request failed: {e}")
            return {"error": str(e)}
    
    def _print_success_result(self, result: Dict[str, Any]):
        """Print successful test result"""
        print(f"✅ Test passed - Node: {result.get('node_name', 'unknown')}")
        
        output_state = result.get("output_state", {})
        research_results = output_state.get("research_results", {})
        extracted = research_results.get("extracted_structure", {})
        
        if extracted:
            print("\n📊 Extraction Results:")
            
            # Hierarchical breakdown
            if "hierarchical_breakdown" in extracted:
                breakdown = extracted["hierarchical_breakdown"]
                major_areas = breakdown.get("major_areas", [])
                print(f"  • Major Areas: {len(major_areas)}")
                for area in major_areas[:3]:
                    print(f"    - {area.get('name', 'Unknown')}: {area.get('importance', 'medium')}")
                
                core_concepts = breakdown.get("core_concepts", {})
                print(f"  • Core Concepts: {len(core_concepts)} areas")
                
                specific_skills = breakdown.get("specific_skills", {})
                print(f"  • Specific Skills: {len(specific_skills)} concepts")
            
            # Prerequisites
            if "prerequisites" in extracted:
                prereqs = extracted["prerequisites"]
                print(f"\n📋 Prerequisites:")
                print(f"  • Direct: {len(prereqs.get('direct', []))}")
                print(f"  • Recommended: {len(prereqs.get('recommended', []))}")
                print(f"  • Co-requisites: {len(prereqs.get('co_requisites', []))}")
            
            # Learning structure
            if "learning_structure" in extracted:
                struct = extracted["learning_structure"]
                sequence = struct.get("sequence", [])
                print(f"\n📅 Learning Structure:")
                print(f"  • Sequence steps: {len(sequence)}")
                if sequence:
                    print(f"  • First step: {sequence[0].get('area', 'Unknown')}")
                duration = struct.get("estimated_duration", {})
                print(f"  • Total duration: {duration.get('total_weeks', 'N/A')} weeks")
        
        # Errors
        errors = output_state.get("errors", [])
        if errors:
            print(f"\n⚠️ Errors encountered: {len(errors)}")
            for error in errors[:2]:
                print(f"  - {error}")
    
    def _print_error_result(self, result: Dict[str, Any], status_code: int):
        """Print error result"""
        print(f"❌ Test failed - Status: {status_code}")
        if "detail" in result:
            print(f"  Error: {result['detail']}")
        elif "errors" in result:
            for error in result["errors"][:3]:
                print(f"  - {error}")
    
    async def run_all_tests(self):
        """Run all test scenarios"""
        print("\n" + "🧪 EXTRACT TOPIC NODE TEST SUITE " + "🧪")
        print(f"Endpoint: {self.endpoint}")
        print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Run tests
        results = []
        
        # Test 1: Basic
        result1 = await self.test_basic_extraction()
        results.append(("Basic Extraction", result1.get("success", False)))
        
        # Test 2: With Firecrawl
        result2 = await self.test_with_firecrawl_content()
        results.append(("Firecrawl Content", result2.get("success", False)))
        
        # Test 3: Comprehensive
        result3 = await self.test_comprehensive_extraction()
        results.append(("Comprehensive", result3.get("success", False)))
        
        # Test 4: Minimal
        result4 = await self.test_minimal_data()
        results.append(("Minimal Data", result4.get("success", False)))
        
        # Summary
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        
        passed = sum(1 for _, success in results if success)
        total = len(results)
        
        for test_name, success in results:
            status = "✅ PASSED" if success else "❌ FAILED"
            print(f"{test_name:.<40} {status}")
        
        print(f"\nTotal: {passed}/{total} tests passed")
        
        return passed == total


async def main():
    """Main function"""
    parser = argparse.ArgumentParser(description="Test extract_topic_node endpoint")
    parser.add_argument(
        "--url",
        default=BASE_URL,
        help=f"Base URL of the API (default: {BASE_URL})"
    )
    parser.add_argument(
        "--test",
        choices=["basic", "firecrawl", "comprehensive", "minimal", "all"],
        default="all",
        help="Which test to run (default: all)"
    )
    
    args = parser.parse_args()
    
    tester = ExtractTopicTester(args.url)
    
    if args.test == "all":
        success = await tester.run_all_tests()
        exit(0 if success else 1)
    elif args.test == "basic":
        await tester.test_basic_extraction()
    elif args.test == "firecrawl":
        await tester.test_with_firecrawl_content()
    elif args.test == "comprehensive":
        await tester.test_comprehensive_extraction()
    elif args.test == "minimal":
        await tester.test_minimal_data()


if __name__ == "__main__":
    asyncio.run(main())