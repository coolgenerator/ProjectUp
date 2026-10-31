#!/bin/bash

# Test script for extract_topic_node endpoint using curl
# Usage: ./test_extract_topic_curl.sh [test_number]

BASE_URL="http://localhost:8888"
ENDPOINT="/test/hierarchy/node/extract-topic"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_colored() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to print test header
print_test_header() {
    local test_name=$1
    echo ""
    print_colored "$BLUE" "============================================================"
    print_colored "$BLUE" "$test_name"
    print_colored "$BLUE" "============================================================"
}

# Test 1: Basic extraction with minimal data
test_basic() {
    print_test_header "TEST 1: Basic Extraction"
    
    curl -X POST "${BASE_URL}${ENDPOINT}" \
        -H "Content-Type: application/json" \
        -d '{
            "topic": "React Development",
            "depth": 3,
            "provider": "vertex_ai",
            "temperature": 0.3,
            "research_results": {
                "prerequisites": [
                    {
                        "description": "JavaScript ES6+ knowledge required",
                        "source": "React Documentation"
                    },
                    {
                        "description": "Understanding of HTML and CSS",
                        "source": "MDN Web Docs"
                    }
                ],
                "prerequisite_topics": ["javascript", "html", "css", "npm", "webpack"],
                "learning_structure": {
                    "subtopics": [
                        {"title": "React Components", "description": "Functional and Class components"},
                        {"title": "State Management", "description": "useState, Redux, Context API"},
                        {"title": "React Router", "description": "Client-side routing"}
                    ],
                    "core_concepts": [
                        {"concept": "JSX", "description": "JavaScript XML syntax"},
                        {"concept": "Props", "description": "Component properties"},
                        {"concept": "Hooks", "description": "State and lifecycle in functional components"}
                    ]
                }
            }
        }' | jq '.'
}

# Test 2: With Firecrawl extracted content
test_firecrawl() {
    print_test_header "TEST 2: With Firecrawl Content"
    
    curl -X POST "${BASE_URL}${ENDPOINT}" \
        -H "Content-Type: application/json" \
        -d '{
            "topic": "Deep Learning",
            "depth": 4,
            "provider": "vertex_ai",
            "temperature": 0.3,
            "research_results": {
                "prerequisites": [
                    {"description": "Strong math background needed", "source": "Fast.ai"}
                ],
                "prerequisite_topics": ["python", "linear_algebra", "calculus", "statistics"],
                "learning_structure": {
                    "subtopics": [
                        {"title": "Neural Networks", "description": "Fundamentals of deep learning"},
                        {"title": "CNNs", "description": "Convolutional Neural Networks"},
                        {"title": "RNNs", "description": "Recurrent Neural Networks"}
                    ],
                    "core_concepts": [
                        {"concept": "Backpropagation", "source": "firecrawl_extraction"},
                        {"concept": "Gradient Descent", "source": "firecrawl_extraction"},
                        {"concept": "Transfer Learning", "source": "firecrawl_extraction"}
                    ]
                },
                "learning_objectives": [
                    "Understand neural network architectures",
                    "Implement deep learning models",
                    "Fine-tune pre-trained models"
                ],
                "firecrawl_extracted_content": {
                    "extracted_content": [
                        {
                            "url": "https://www.deeplearning.ai/",
                            "title": "Deep Learning Specialization",
                            "summary": "Comprehensive deep learning course by Andrew Ng",
                            "extraction": {
                                "prerequisites": ["Python", "Linear Algebra", "Calculus"],
                                "key_concepts": ["Neural Networks", "CNNs", "RNNs", "GANs"],
                                "learning_objectives": [
                                    "Build neural networks",
                                    "Understand deep learning theory",
                                    "Apply DL to computer vision and NLP"
                                ],
                                "difficulty_level": "intermediate",
                                "estimated_time": "16 weeks"
                            }
                        }
                    ],
                    "consolidated": {
                        "prerequisites": ["Python", "Mathematics", "Machine Learning Basics"],
                        "key_concepts": ["Neural Networks", "Deep Learning", "Computer Vision", "NLP"],
                        "sources_processed": 3,
                        "sources_failed": 0
                    }
                }
            }
        }' | jq '.'
}

# Test 3: Comprehensive test with all fields
test_comprehensive() {
    print_test_header "TEST 3: Comprehensive Extraction"
    
    curl -X POST "${BASE_URL}${ENDPOINT}" \
        -H "Content-Type: application/json" \
        -d '{
            "topic": "DevOps Engineering",
            "depth": 4,
            "provider": "vertex_ai",
            "temperature": 0.3,
            "semantic_results": {
                "similar_concepts": [
                    {"name": "CI/CD", "similarity": 0.9},
                    {"name": "Infrastructure as Code", "similarity": 0.85}
                ]
            },
            "research_results": {
                "prerequisites": [
                    {"description": "Linux system administration", "source": "DevOps Handbook"},
                    {"description": "Scripting knowledge (Bash, Python)", "source": "SRE Book"},
                    {"description": "Version control with Git", "source": "GitHub Docs"}
                ],
                "prerequisite_topics": [
                    "linux", "bash", "python", "git", "networking", "docker", "kubernetes"
                ],
                "learning_structure": {
                    "subtopics": [
                        {"title": "CI/CD Pipelines", "description": "Jenkins, GitLab CI, GitHub Actions"},
                        {"title": "Infrastructure as Code", "description": "Terraform, Ansible, Pulumi"},
                        {"title": "Container Orchestration", "description": "Kubernetes, Docker Swarm"},
                        {"title": "Monitoring & Logging", "description": "Prometheus, Grafana, ELK Stack"}
                    ],
                    "core_concepts": [
                        {"concept": "Continuous Integration", "source": "firecrawl_extraction"},
                        {"concept": "Continuous Deployment", "source": "firecrawl_extraction"},
                        {"concept": "Infrastructure Automation", "source": "web_search"},
                        {"concept": "Site Reliability", "source": "web_search"}
                    ],
                    "learning_path": [
                        "Linux & Scripting Basics",
                        "Version Control & CI/CD",
                        "Containerization",
                        "Orchestration & IaC",
                        "Monitoring & Operations"
                    ]
                },
                "learning_objectives": [
                    "Design and implement CI/CD pipelines",
                    "Automate infrastructure provisioning",
                    "Deploy and manage containerized applications",
                    "Implement monitoring and alerting",
                    "Practice incident response and postmortems"
                ],
                "resources_found": [
                    {"url": "https://devops.com", "title": "DevOps.com"},
                    {"url": "https://sre.google/books/", "title": "Google SRE Books"}
                ],
                "firecrawl_extracted_content": {
                    "extracted_content": [
                        {
                            "url": "https://roadmap.sh/devops",
                            "title": "DevOps Roadmap",
                            "summary": "Complete DevOps learning path",
                            "extraction": {
                                "prerequisites": ["Linux", "Networking", "Programming"],
                                "key_concepts": [
                                    "CI/CD", "IaC", "Containers", "Orchestration",
                                    "Monitoring", "Cloud Platforms"
                                ],
                                "learning_objectives": [
                                    "Master DevOps tools and practices",
                                    "Automate everything",
                                    "Build reliable systems"
                                ]
                            }
                        }
                    ],
                    "consolidated": {
                        "prerequisites": ["Linux", "Programming", "Networking", "Git"],
                        "key_concepts": ["CI/CD", "IaC", "Containers", "Kubernetes", "Monitoring"],
                        "sources_processed": 5,
                        "sources_failed": 0
                    }
                }
            }
        }' | jq '.'
}

# Test 4: Minimal data (fallback test)
test_minimal() {
    print_test_header "TEST 4: Minimal Data (Fallback)"
    
    curl -X POST "${BASE_URL}${ENDPOINT}" \
        -H "Content-Type: application/json" \
        -d '{
            "topic": "Quantum Computing",
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
        }' | jq '.'
}

# Quick test with simple data
test_quick() {
    print_test_header "QUICK TEST: Simple Python Topic"
    
    curl -X POST "${BASE_URL}${ENDPOINT}" \
        -H "Content-Type: application/json" \
        -d '{
            "topic": "Python Data Science",
            "depth": 3,
            "provider": "vertex_ai",
            "temperature": 0.3,
            "research_results": {
                "prerequisites": [
                    {"description": "Basic Python knowledge", "source": "DataCamp"}
                ],
                "prerequisite_topics": ["python", "statistics"],
                "learning_structure": {
                    "subtopics": [
                        {"title": "Pandas", "description": "Data manipulation"},
                        {"title": "NumPy", "description": "Numerical computing"}
                    ],
                    "core_concepts": [
                        {"concept": "DataFrames", "description": "Tabular data structure"}
                    ]
                }
            }
        }' | jq '.output_state.research_results.extracted_structure | {
            major_areas: (.hierarchical_breakdown.major_areas | length),
            prerequisites: .prerequisites,
            learning_duration: .learning_structure.estimated_duration
        }'
}

# Function to run all tests
run_all_tests() {
    print_colored "$YELLOW" "\n🧪 RUNNING ALL EXTRACT TOPIC NODE TESTS 🧪"
    print_colored "$YELLOW" "Endpoint: ${BASE_URL}${ENDPOINT}"
    print_colored "$YELLOW" "Time: $(date)"
    
    test_basic
    sleep 2
    test_firecrawl
    sleep 2
    test_comprehensive
    sleep 2
    test_minimal
    
    print_colored "$GREEN" "\n✅ All tests completed!"
}

# Main script logic
case "${1:-all}" in
    1|basic)
        test_basic
        ;;
    2|firecrawl)
        test_firecrawl
        ;;
    3|comprehensive)
        test_comprehensive
        ;;
    4|minimal)
        test_minimal
        ;;
    quick)
        test_quick
        ;;
    all)
        run_all_tests
        ;;
    *)
        print_colored "$RED" "Usage: $0 [1|2|3|4|basic|firecrawl|comprehensive|minimal|quick|all]"
        echo ""
        echo "Tests available:"
        echo "  1, basic         - Basic extraction test"
        echo "  2, firecrawl     - Test with Firecrawl content"
        echo "  3, comprehensive - Comprehensive test with all fields"
        echo "  4, minimal       - Minimal data (fallback test)"
        echo "  quick            - Quick test with simple output"
        echo "  all              - Run all tests (default)"
        exit 1
        ;;
esac