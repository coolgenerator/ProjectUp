"""
API Examples for ProjectUp AI Agent

This module contains example requests and responses for Swagger documentation.
"""

from typing import Dict, Any, List
from pydantic import BaseModel, Field

# IdeaTree Examples
IDEA_TREE_QUERY_EXAMPLE = {
    "node_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Build a Mobile Task Management App",
    "description": "Create a cross-platform mobile application for personal task management with AI-powered features",
    "query_type": "expand_idea",
    "query": "Focus on user experience, AI integration, and cross-platform compatibility",
    "context": {
        "target_audience": "professionals",
        "platform": "iOS and Android",
        "timeline": "6 months"
    }
}

IDEA_TREE_RESPONSE_EXAMPLE = {
    "node_id": "550e8400-e29b-41d4-a716-446655440000",
    "query_type": "expand_idea",
    "response": "I've broken down your mobile task management app into key components focusing on UX, AI, and cross-platform development.",
    "suggestions": [
        {
            "title": "Core Task Management Features",
            "description": "Implement fundamental task creation, editing, categorization, and scheduling",
            "type": "idea",
            "priority": 1,
            "connection": "Foundation for all other features",
            "challenges": ["Data synchronization", "Offline functionality"],
            "solutions": ["Use SQLite for local storage", "Implement sync queue"]
        },
        {
            "title": "AI-Powered Smart Suggestions",
            "description": "Integrate AI for task prioritization, time estimation, and smart categorization",
            "type": "idea",
            "priority": 2,
            "connection": "Enhances user productivity through intelligent assistance",
            "challenges": ["AI model integration", "Privacy concerns"],
            "solutions": ["Use on-device ML models", "Implement privacy-first design"]
        },
        {
            "title": "Cross-Platform UI/UX Design",
            "description": "Design intuitive, responsive interface that works seamlessly on iOS and Android",
            "type": "idea",
            "priority": 1,
            "connection": "Ensures consistent user experience across platforms",
            "challenges": ["Platform-specific guidelines", "Performance optimization"],
            "solutions": ["Use React Native or Flutter", "Follow Material Design and iOS HIG"]
        }
    ],
    "resources": [],
    "actions": [],
    "metadata": {
        "estimated_complexity": "medium-high",
        "recommended_team_size": 3,
        "key_technologies": ["React Native", "TensorFlow Lite", "Firebase"]
    }
}

BATCH_QUERY_EXAMPLE = {
    "queries": [
        {
            "node_id": "node-1",
            "title": "User Authentication System",
            "description": "Implement secure authentication",
            "query_type": "generate_tasks",
            "query": "Focus on security and user experience"
        },
        {
            "node_id": "node-2",
            "title": "React Native Development",
            "description": "Learn React Native for mobile development",
            "query_type": "find_resources",
            "query": "Beginner to intermediate level resources"
        }
    ]
}

# Agent Examples
AGENT_CREATE_EXAMPLE = {
    "name": "project-assistant",
    "description": "AI assistant for project management and planning",
    "capabilities": ["task_generation", "resource_finding", "feasibility_analysis"],
    "config": {
        "temperature": 0.7,
        "max_tokens": 2000,
        "model": "gemini-1.5-flash"
    }
}

AGENT_CHAT_EXAMPLE = {
    "message": "Help me plan a new e-commerce website project",
    "context": {
        "project_type": "e-commerce",
        "budget": "medium",
        "timeline": "3 months"
    }
}

# Workflow Examples
WORKFLOW_EXECUTE_EXAMPLE = {
    "workflow_type": "project_planning",
    "input_data": {
        "project_name": "E-commerce Platform",
        "requirements": [
            "Product catalog with search",
            "Shopping cart and checkout",
            "User accounts and order history",
            "Admin dashboard"
        ],
        "constraints": {
            "budget": 50000,
            "timeline": "3 months",
            "team_size": 4
        }
    },
    "config": {
        "max_iterations": 10,
        "include_resources": True,
        "generate_timeline": True
    }
}

WORKFLOW_RESPONSE_EXAMPLE = {
    "workflow_id": "wf-123456",
    "status": "completed",
    "result": {
        "project_plan": {
            "phases": [
                {
                    "name": "Planning & Design",
                    "duration": "2 weeks",
                    "deliverables": ["Requirements doc", "UI/UX designs", "Technical architecture"]
                },
                {
                    "name": "Development Sprint 1",
                    "duration": "3 weeks",
                    "deliverables": ["Product catalog", "Search functionality", "Basic UI"]
                }
            ],
            "team_allocation": {
                "frontend": 2,
                "backend": 1,
                "design": 1
            },
            "risk_assessment": {
                "level": "medium",
                "factors": ["Tight timeline", "Integration complexity"],
                "mitigation": ["Agile methodology", "Regular reviews"]
            }
        }
    },
    "metadata": {
        "execution_time": 4.5,
        "tokens_used": 3500,
        "model": "gemini-1.5-pro"
    }
}

# Learning Path Examples
LEARNING_PATH_REQUEST_EXAMPLE = {
    "topic": "Machine Learning for Web Developers",
    "current_level": "beginner",
    "target_level": "intermediate",
    "time_commitment": "10 hours/week",
    "learning_style": "hands-on",
    "prerequisites": ["JavaScript", "Basic Python"]
}

LEARNING_PATH_RESPONSE_EXAMPLE = {
    "learning_path": {
        "title": "Machine Learning for Web Developers",
        "total_duration": "12 weeks",
        "modules": [
            {
                "week": 1,
                "title": "ML Fundamentals",
                "topics": ["What is ML", "Types of learning", "Basic concepts"],
                "resources": [
                    {
                        "title": "Introduction to Machine Learning",
                        "type": "video",
                        "url": "https://example.com/ml-intro",
                        "duration": "2 hours"
                    }
                ],
                "exercises": ["Implement linear regression from scratch"],
                "assessment": "Quiz on ML concepts"
            }
        ],
        "projects": [
            {
                "title": "Build a Recommendation System",
                "description": "Create a movie recommendation system using collaborative filtering",
                "skills": ["Data preprocessing", "Model training", "API integration"],
                "estimated_hours": 20
            }
        ]
    },
    "metadata": {
        "difficulty_progression": "gradual",
        "total_hours": 120,
        "certification_available": True
    }
}

# Tool Examples
TOOL_REQUEST_EXAMPLE = {
    "tool_name": "web_search",
    "parameters": {
        "query": "best practices for React Native performance optimization",
        "max_results": 10,
        "date_range": "last_year"
    }
}

TOOL_RESPONSE_EXAMPLE = {
    "tool_name": "web_search",
    "status": "success",
    "results": [
        {
            "title": "React Native Performance: Best Practices Guide",
            "url": "https://example.com/rn-performance",
            "snippet": "Comprehensive guide to optimizing React Native app performance...",
            "relevance_score": 0.95
        }
    ],
    "metadata": {
        "query_time": 0.8,
        "total_results": 42
    }
}

# Project Examples
PROJECT_INIT_EXAMPLE = {
    "name": "TaskMaster Pro",
    "description": "AI-powered task management application",
    "type": "mobile_app",
    "team_size": 5,
    "duration": "6 months",
    "technologies": ["React Native", "Node.js", "PostgreSQL", "TensorFlow"],
    "goals": [
        "Launch MVP in 3 months",
        "Achieve 10k users in first year",
        "Integrate with popular productivity tools"
    ]
}

PROJECT_RESPONSE_EXAMPLE = {
    "project_id": "proj-789",
    "status": "initialized",
    "generated_artifacts": {
        "roadmap": "link_to_roadmap",
        "task_list": "link_to_tasks",
        "resource_list": "link_to_resources",
        "risk_matrix": "link_to_risks"
    },
    "next_steps": [
        "Review generated roadmap",
        "Assign team members to tasks",
        "Set up development environment",
        "Schedule kickoff meeting"
    ],
    "ai_insights": {
        "success_probability": 0.75,
        "key_challenges": ["Technical complexity", "Market competition"],
        "recommendations": ["Start with core features", "Focus on user feedback"]
    }
}

# Error Response Examples
ERROR_404_EXAMPLE = {
    "detail": "Resource not found",
    "type": "not_found_error",
    "status": 404
}

ERROR_500_EXAMPLE = {
    "detail": "Internal server error during AI processing",
    "type": "processing_error",
    "status": 500,
    "error_code": "AI_PROCESSING_FAILED"
}

ERROR_VALIDATION_EXAMPLE = {
    "detail": [
        {
            "loc": ["body", "query_type"],
            "msg": "field required",
            "type": "value_error.missing"
        }
    ],
    "type": "validation_error",
    "status": 422
}