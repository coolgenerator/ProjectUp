#!/bin/bash

# Web Search Node Test Examples using cURL
# =========================================
# These examples show how to test the web-search node with Vertex AI

BASE_URL="http://localhost:8888"
ENDPOINT="/test/hierarchy/node/web-search"

echo "Web Search Node Test Examples"
echo "=============================="
echo ""

# 1. Basic Vertex AI Request
echo "1. Basic Web Search with Vertex AI:"
echo "------------------------------------"
cat << 'EOF'
curl -X POST http://localhost:8888/test/hierarchy/node/web-search \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Machine Learning Fundamentals",
    "depth": 3,
    "provider": "vertex_ai",
    "temperature": 0.7
  }'
EOF
echo ""

# 2. With Semantic Results
echo "2. Web Search with Semantic Context:"
echo "------------------------------------"
cat << 'EOF'
curl -X POST http://localhost:8888/test/hierarchy/node/web-search \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Deep Learning and Neural Networks",
    "depth": 3,
    "provider": "vertex_ai",
    "temperature": 0.6,
    "semantic_results": {
      "similar_concepts": [
        {
          "name": "Artificial Neural Networks",
          "similarity": 0.92,
          "domain": "Computer Science"
        },
        {
          "name": "Backpropagation Algorithm",
          "similarity": 0.85,
          "domain": "Mathematics"
        }
      ],
      "gap_analysis": {
        "missing_areas": [
          "Transformer Architecture",
          "Attention Mechanisms",
          "Large Language Models"
        ],
        "coverage_score": 0.65
      },
      "domain_distribution": {
        "Computer Science": 0.60,
        "Mathematics": 0.25,
        "Statistics": 0.15
      }
    }
  }'
EOF
echo ""

# 3. Specific Technical Domain
echo "3. Technical Domain Search (Kubernetes):"
echo "----------------------------------------"
cat << 'EOF'
curl -X POST http://localhost:8888/test/hierarchy/node/web-search \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Kubernetes Container Orchestration",
    "depth": 3,
    "provider": "vertex_ai",
    "temperature": 0.5,
    "semantic_results": {
      "similar_concepts": [
        {
          "name": "Docker Containers",
          "similarity": 0.89,
          "domain": "DevOps"
        },
        {
          "name": "Microservices Architecture",
          "similarity": 0.76,
          "domain": "Software Architecture"
        }
      ],
      "gap_analysis": {
        "missing_areas": [
          "Service Mesh",
          "Helm Charts",
          "Custom Resource Definitions"
        ]
      },
      "domain_distribution": {
        "DevOps": 0.70,
        "Cloud Computing": 0.30
      }
    }
  }'
EOF
echo ""

# 4. Beginner Topic
echo "4. Beginner-Level Topic Search:"
echo "-------------------------------"
cat << 'EOF'
curl -X POST http://localhost:8888/test/hierarchy/node/web-search \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Python Programming for Beginners",
    "depth": 3,
    "provider": "vertex_ai",
    "temperature": 0.7,
    "semantic_results": {
      "similar_concepts": [],
      "gap_analysis": {
        "missing_areas": [
          "Basic Syntax",
          "Data Types",
          "Control Flow",
          "Functions"
        ]
      },
      "domain_distribution": {
        "Programming": 1.0
      }
    }
  }'
EOF
echo ""

# 5. Save response to file
echo "5. Execute and Save Response:"
echo "-----------------------------"
cat << 'EOF'
# Execute the request and save response
curl -X POST http://localhost:8888/test/hierarchy/node/web-search \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Machine Learning",
    "depth": 3,
    "provider": "vertex_ai",
    "temperature": 0.7
  }' \
  -o web_search_response.json

# Pretty print the response
python -m json.tool web_search_response.json
EOF
echo ""

# 6. Extract specific fields with jq
echo "6. Extract Specific Fields (using jq):"
echo "--------------------------------------"
cat << 'EOF'
# Get only the research results
curl -s -X POST http://localhost:8888/test/hierarchy/node/web-search \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "React Development",
    "depth": 3,
    "provider": "vertex_ai",
    "temperature": 0.7
  }' | jq '.output_state.research_results'

# Get only prerequisites
curl -s -X POST http://localhost:8888/test/hierarchy/node/web-search \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "React Development",
    "depth": 3,
    "provider": "vertex_ai",
    "temperature": 0.7
  }' | jq '.output_state.research_results.prerequisites'
EOF
echo ""

echo "Notes:"
echo "------"
echo "1. Make sure the AI Agent is running on port 8888"
echo "2. Environment must be set to 'development' for test endpoints"
echo "3. Vertex AI credentials must be configured"
echo "4. Install 'jq' for JSON parsing: brew install jq (macOS) or apt-get install jq (Linux)"