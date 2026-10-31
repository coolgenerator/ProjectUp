"""
Unified AI-Guided Project Onboarding Service

Intelligent service with progressive enhancement:
- Basic Mode: Fast, simple AI responses (~5 seconds)
- Enhanced Mode: RAG + Chain-of-Thought reasoning (~20 seconds)

Automatically adapts based on:
- Available features (RAG, document analysis)
- Provided context (project_id, uploaded documents)
- Performance requirements

No duplicate code - single source of truth with optional features.
"""

import json
import logging
from typing import Dict, Any, List, Optional
from pathlib import Path

from prompts.onboarding_prompts import (
    get_topic_suggestion_prompt,
    get_topic_elaboration_prompt,
    get_project_details_prompt,
    get_research_elaboration_chunked_prompts
)
from core.ai_provider import AIProvider

logger = logging.getLogger(__name__)


class OnboardingService:
    """
    Unified onboarding service with progressive enhancement.

    Features:
    - Automatic RAG integration when available
    - Chain-of-thought reasoning when context provided
    - Document analysis for uploaded materials
    - Graceful fallback to simple mode when features unavailable
    - Multi-step validation and refinement (optional)
    """

    def __init__(self):
        self.ai_provider = AIProvider()

        # Optional features - gracefully handle if not available
        self.rag_service = None
        self.document_processor = None
        self.has_rag = False

        # Try to initialize optional services
        try:
            from services.rag.rag_service import RAGService
            from services.rag.document_processor import DocumentProcessor
            from prompts.chain_of_thought_prompts import (
                get_analysis_prompt,
                get_validation_prompt,
                get_refinement_prompt
            )

            self.rag_service = RAGService()
            self.document_processor = DocumentProcessor()
            self.has_rag = True

            # Import CoT prompts
            self.get_analysis_prompt = get_analysis_prompt
            self.get_validation_prompt = get_validation_prompt
            self.get_refinement_prompt = get_refinement_prompt

            logger.info("✓ Onboarding service initialized with RAG + CoT (Enhanced Mode)")
        except Exception as e:
            logger.warning(f"RAG/CoT features unavailable: {str(e)}")
            logger.info("✓ Onboarding service initialized in Basic Mode")

    async def analyze_uploaded_documents(
        self,
        project_id: str,
        documents: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Analyze uploaded documents (syllabus, papers, requirements) using RAG.

        Falls back gracefully if RAG not available.
        """
        if not self.has_rag:
            return {
                "success": False,
                "error": "Document analysis requires RAG service"
            }

        try:
            analyzed_docs = []

            for doc in documents:
                doc_path = doc.get("path")
                doc_type = doc.get("type", "document")

                if not doc_path or not Path(doc_path).exists():
                    logger.warning(f"Document not found: {doc_path}")
                    continue

                # Index document in RAG
                result = self.rag_service.index_document(
                    project_id=project_id,
                    file_path=doc_path,
                    metadata={
                        "document_type": doc_type,
                        "uploaded_at": doc.get("uploaded_at")
                    },
                    collection_type="onboarding_materials"
                )

                if result.get("success"):
                    analyzed_docs.append({
                        "path": doc_path,
                        "type": doc_type,
                        "chunks_indexed": result.get("chunks_indexed"),
                        "summary": result.get("summary")
                    })

            # Deep analysis with chain-of-thought
            analysis = await self._deep_analyze_documents(project_id, analyzed_docs)

            return {
                "success": True,
                "documents_processed": len(analyzed_docs),
                "analysis": analysis
            }

        except Exception as e:
            logger.error(f"Error analyzing documents: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    async def suggest_topics(
        self,
        project_type: str,
        context: Dict[str, Any],
        project_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate project topic suggestions.

        Automatically uses enhanced mode when:
        - project_id provided (enables RAG retrieval)
        - RAG service available
        - Documents uploaded for this project

        Falls back to fast simple mode otherwise.
        """
        try:
            # Decide mode: Enhanced vs Basic
            use_enhanced = self.has_rag and project_id is not None

            if use_enhanced:
                logger.info(f"[ENHANCED] Generating topics for {project_type} with RAG+CoT")
                return await self._suggest_topics_enhanced(project_type, context, project_id)
            else:
                logger.info(f"[BASIC] Generating topics for {project_type}")
                return await self._suggest_topics_basic(project_type, context)

        except Exception as e:
            logger.error(f"Error suggesting topics for {project_type}: {str(e)}")
            # Fallback to basic if enhanced fails
            if use_enhanced:
                logger.warning("Enhanced mode failed, falling back to basic mode")
                return await self._suggest_topics_basic(project_type, context)
            raise

    async def elaborate_topic(
        self,
        project_type: str,
        selected_topic: Dict[str, Any],
        context: Dict[str, Any],
        project_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Elaborate on selected topic with detailed planning.

        Automatically uses enhanced mode when available.
        """
        try:
            # Decide mode
            use_enhanced = self.has_rag and project_id is not None

            if use_enhanced:
                logger.info(f"[ENHANCED] Elaborating topic for {project_type} with RAG+CoT")
                return await self._elaborate_topic_enhanced(
                    project_type, selected_topic, context, project_id
                )
            else:
                logger.info(f"[BASIC] Elaborating topic for {project_type}")
                return await self._elaborate_topic_basic(project_type, selected_topic, context)

        except Exception as e:
            logger.error(f"Error elaborating topic for {project_type}: {str(e)}")
            # Fallback to basic if enhanced fails
            if use_enhanced:
                logger.warning("Enhanced mode failed, falling back to basic mode")
                return await self._elaborate_topic_basic(project_type, selected_topic, context)
            raise

    async def generate_project_details(
        self,
        project_type: str,
        elaboration: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate project name options, description, and tags.
        """
        try:
            # Get prompt template
            prompt_template = get_project_details_prompt(project_type)

            # Extract key info from elaboration based on project type
            if project_type == "research":
                # Research projects have different structure
                context = {
                    "topic_name": elaboration.get("topic_name", elaboration.get("name", "Research Project")),
                    "background": str(elaboration.get("research_background", {})),
                    "research_background": str(elaboration.get("research_background", {})),
                }
            else:
                # Other project types
                context = {
                    "topic_name": elaboration.get("name", ""),
                    "background": str(elaboration.get("background", {})),
                    "core_features": str(elaboration.get("core_features", [])),
                    "demo_goal": elaboration.get("objectives", {}).get("demo_goal", ""),
                    "research_background": elaboration.get("research_background", {}),
                    "innovation": elaboration.get("innovation_points", [])
                }

            # Format prompt
            prompt = prompt_template.format(**context)

            # Call AI
            response = await self.ai_provider.generate_completion(
                prompt=prompt,
                system_prompt=self._get_system_prompt(project_type, "details"),
                response_format="json"
            )

            result = self._extract_json(response)

            return result

        except Exception as e:
            logger.error(f"Error generating details for {project_type}: {str(e)}")
            raise

    async def refine_topic(
        self,
        project_type: str,
        base_topic: Dict[str, Any],
        modification_request: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Refine/customize a topic based on user modification requests.

        Allows users to keep parts they like while modifying specific aspects.
        """
        try:
            logger.info(f"[REFINE] Customizing topic '{base_topic.get('name')}' for {project_type}")

            # Flatten context for prompt formatting
            flattened_context = self._flatten_context(context)

            # Build refinement prompt
            prompt = f"""You are customizing an existing project topic based on user feedback.

**Original Topic:**
{json.dumps(base_topic, indent=2)}

**Project Context:**
- Course: {flattened_context.get('course_name', 'N/A')}
- School: {flattened_context.get('school', 'N/A')}
- Team Size: {flattened_context.get('team_size', 'N/A')} people
- Duration: {flattened_context.get('duration_weeks', 'N/A')} weeks
- Required Technologies: {flattened_context.get('required_tech', 'N/A')}

**User's Customization Request:**
{modification_request}

**Instructions:**
1. Read the user's request carefully to understand what they want to CHANGE
2. Keep everything else from the original topic UNCHANGED
3. Apply the requested modifications while maintaining the same JSON structure
4. Ensure the modifications are realistic and compatible with project constraints
5. Preserve the same topic_id to indicate this is a refinement

**Common modification patterns:**
- "Use [tech stack] instead of [old tech]" → Change suggested_tech only
- "Add [feature]" → Add to key_features
- "Make it more/less challenging" → Adjust difficulty and difficulty_reason
- "Focus on [aspect]" → Adjust tagline and key_features emphasis

Return ONLY the refined topic in the exact same JSON format:
{{
  "topic_id": "{base_topic.get('topic_id', 't1')}",
  "name": "Project Name (modify only if user requests)",
  "tagline": "One-sentence tagline (modify if needed based on changes)",
  "suggested_tech": ["Tech 1", "Tech 2", "..."],
  "difficulty": "beginner/intermediate/advanced",
  "difficulty_reason": "Brief explanation (update if difficulty changed)",
  "estimated_weeks": {base_topic.get('estimated_weeks', 10)},
  "key_features": ["Feature 1", "Feature 2", "..."]
}}

Output JSON only, no explanations."""

            # Call AI
            response = await self.ai_provider.generate_completion(
                prompt=prompt,
                system_prompt=f"You are an expert {project_type} project advisor who helps refine projects based on user feedback. Apply changes precisely while preserving what the user likes.",
                response_format="json"
            )

            refined_topic = self._extract_json(response)

            # Ensure topic_id is preserved
            refined_topic["topic_id"] = base_topic.get("topic_id", "t1")

            logger.info(f"[REFINE] Successfully customized topic")

            return refined_topic

        except Exception as e:
            logger.error(f"Error refining topic for {project_type}: {str(e)}")
            raise

    async def refine_elaboration(
        self,
        project_type: str,
        base_elaboration: Dict[str, Any],
        section: str,
        modification_request: str,
        context: Dict[str, Any],
        selected_topic: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Refine/customize a specific section of elaboration based on user modification requests.

        Allows users to refine individual sections while keeping other sections unchanged.
        """
        try:
            logger.info(f"[REFINE] Customizing elaboration section '{section}' for {project_type}")

            # Flatten context for prompt formatting
            flattened_context = self._flatten_context(context)

            # Map section names to user-friendly display names
            section_display_names = {
                'background': 'Project Background',
                'objectives': 'Project Objectives',
                'core_features': 'Core Features (MVP)',
                'enhanced_features': 'Enhanced Features (Optional)',
                'architecture': 'Technical Architecture',
                'milestones': 'Project Milestones',
                'success': 'Success Criteria',
                'challenges': 'Challenges & Risk Mitigation'
            }

            section_name = section_display_names.get(section, section)

            # Build refinement prompt
            prompt = f"""You are customizing a specific section of a project elaboration based on user feedback.

**Project Topic:**
{json.dumps(selected_topic, indent=2)}

**Original Elaboration (Complete):**
{json.dumps(base_elaboration, indent=2)}

**Section to Refine:**
{section_name} (key: {section})

**Project Context:**
- Course: {flattened_context.get('course_name', 'N/A')}
- School: {flattened_context.get('school', 'N/A')}
- Team Size: {flattened_context.get('team_size', 'N/A')} people
- Duration: {flattened_context.get('duration_weeks', 'N/A')} weeks
- Required Technologies: {flattened_context.get('required_tech', 'N/A')}

**User's Refinement Request:**
{modification_request}

**Instructions:**
1. Read the user's request carefully to understand what they want to CHANGE in the {section_name} section
2. Keep ALL other sections (background, objectives, core_features, enhanced_features, technical_architecture, milestones, success_criteria, challenges_and_risks) EXACTLY the same
3. Apply ONLY the requested modifications to the {section_name} section
4. Ensure the modifications are realistic and compatible with:
   - Project constraints (team size, duration)
   - Selected topic
   - Other sections (maintain consistency)
5. Maintain the exact same JSON structure

**Common refinement patterns by section:**
- background: Adjust problem statement, value proposition, or target users
- objectives: Add/modify primary, secondary, or learning objectives
- core_features: Add/remove/modify core MVP features
- enhanced_features: Add/remove/modify optional enhancement features
- architecture (technical_architecture key): Change tech stack, database, or architecture approach
- milestones: Adjust timeline, phases, goals, or deliverables
- success (success_criteria key): Modify functional, code quality, UX, or grading criteria
- challenges (challenges_and_risks key): Add/modify challenges and mitigation strategies

Return the COMPLETE elaboration with the SAME structure, but with ONLY the {section_name} section modified:
{{
  "background": {{ ... }},
  "objectives": {{ ... }},
  "core_features": [ ... ],
  "enhanced_features": [ ... ],
  "technical_architecture": {{ ... }},
  "milestones": [ ... ],
  "success_criteria": {{ ... }},
  "challenges_and_risks": [ ... ]
}}

Output JSON only, no explanations."""

            # Call AI
            response = await self.ai_provider.generate_completion(
                prompt=prompt,
                system_prompt=f"You are an expert {project_type} project advisor who helps refine project plans based on user feedback. Apply changes precisely to the requested section while preserving all other sections exactly as they are.",
                response_format="json"
            )

            refined_elaboration = self._extract_json(response)

            logger.info(f"[REFINE] Successfully customized {section_name} section")

            return refined_elaboration

        except Exception as e:
            logger.error(f"Error refining elaboration section '{section}' for {project_type}: {str(e)}")
            raise

    # ========================================================================
    # BASIC MODE (Fast, Simple)
    # ========================================================================

    def _flatten_context(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Flatten nested context structures for prompt formatting.

        Handles common patterns like constraints.teamSize -> team_size
        """
        flattened = dict(context)

        # Handle constraints object (common in frontend requests)
        if 'constraints' in context:
            constraints = context['constraints']
            # Map camelCase to snake_case
            if 'teamSize' in constraints:
                flattened['team_size'] = constraints['teamSize']
            if 'durationWeeks' in constraints:
                flattened['duration_weeks'] = constraints['durationWeeks']
            if 'startDate' in constraints:
                flattened['start_date'] = constraints['startDate']
            if 'deadline' in constraints:
                flattened['deadline'] = constraints['deadline']
            if 'requiredTech' in constraints:
                flattened['required_tech'] = ', '.join(constraints['requiredTech']) if isinstance(constraints['requiredTech'], list) else constraints['requiredTech']
            if 'required_skills' in constraints:
                flattened['required_skills'] = ', '.join(constraints['required_skills']) if isinstance(constraints['required_skills'], list) else constraints['required_skills']
            if 'required_expertise' in constraints:
                flattened['required_expertise'] = ', '.join(constraints['required_expertise']) if isinstance(constraints['required_expertise'], list) else constraints['required_expertise']

        # Ensure defaults for common fields if not provided
        if 'team_size' not in flattened:
            flattened['team_size'] = 4
        if 'duration_weeks' not in flattened:
            flattened['duration_weeks'] = 10
        if 'required_tech' not in flattened:
            flattened['required_tech'] = 'No specific requirements'
        if 'team_members' not in flattened:
            flattened['team_members'] = 'Not specified'
        if 'start_date' not in flattened:
            flattened['start_date'] = 'Not specified'
        if 'deadline' not in flattened:
            flattened['deadline'] = 'Not specified'

        # Research-specific fields
        if 'advisor_name' not in flattened:
            flattened['advisor_name'] = 'Not specified'
        if 'funding_available' not in flattened:
            flattened['funding_available'] = 'Not specified'
        if 'requires_ethics_approval' not in flattened:
            flattened['requires_ethics_approval'] = 'Not specified'
        if 'required_methods' not in flattened:
            flattened['required_methods'] = 'No specific requirements'

        return flattened

    async def _suggest_topics_basic(
        self,
        project_type: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Basic mode: Single AI call, fast response."""

        # Get prompt template
        prompt_template = get_topic_suggestion_prompt(project_type)

        # Flatten context for prompt formatting
        flattened_context = self._flatten_context(context)

        # Format prompt with context
        prompt = prompt_template.format(**flattened_context)

        # Call AI provider
        response = await self.ai_provider.generate_completion(
            prompt=prompt,
            system_prompt=self._get_system_prompt(project_type, "suggest"),
            response_format="json"
        )

        # Parse and return
        return self._extract_json(response)

    async def _elaborate_topic_basic(
        self,
        project_type: str,
        selected_topic: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Basic mode: Single AI call, fast response. Uses chunked approach for research."""

        # Use chunked approach for research projects to handle token limits
        if project_type == "research":
            return await self._elaborate_research_chunked(selected_topic, context)

        # Get prompt template for other project types
        prompt_template = get_topic_elaboration_prompt(project_type)

        # Flatten context first
        flattened_context = self._flatten_context(context)

        # Merge topic and flattened context
        full_context = {
            "topic_name": selected_topic.get("name"),
            "topic_description": selected_topic.get("description"),
            **flattened_context
        }

        # Format prompt
        prompt = prompt_template.format(**full_context)

        # Call AI with max allowed tokens (8192 is the Gemini limit)
        response = await self.ai_provider.generate_completion(
            prompt=prompt,
            system_prompt=self._get_system_prompt(project_type, "elaborate"),
            response_format="json",
            max_tokens=8192
        )

        result = self._extract_json(response)

        # Preserve the topic name in the result for later use
        result["topic_name"] = selected_topic.get("name")

        return result

    async def _elaborate_research_chunked(
        self,
        selected_topic: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Chunked elaboration for research projects to handle token limits.

        Makes two API calls:
        1. Core research plan (background, methodology, etc.)
        2. Timeline with detailed tasks

        Then merges the results.
        """
        logger.info("[CHUNKED] Starting chunked research elaboration")

        # Get chunked prompts
        chunk1_template, chunk2_template = get_research_elaboration_chunked_prompts()

        # Flatten context
        flattened_context = self._flatten_context(context)

        # Build full context
        full_context = {
            "topic_name": selected_topic.get("name"),
            "topic_description": selected_topic.get("description"),
            **flattened_context
        }

        system_prompt = self._get_system_prompt("research", "elaborate")

        # Chunk 1: Core research plan
        logger.info("[CHUNKED] Generating core research plan (chunk 1/2)")
        chunk1_prompt = chunk1_template.format(**full_context)
        chunk1_response = await self.ai_provider.generate_completion(
            prompt=chunk1_prompt,
            system_prompt=system_prompt,
            response_format="json",
            max_tokens=8192
        )
        chunk1_result = self._extract_json(chunk1_response)
        logger.info("[CHUNKED] Core research plan generated successfully")

        # Chunk 2: Timeline with tasks
        logger.info("[CHUNKED] Generating timeline with tasks (chunk 2/2)")
        chunk2_prompt = chunk2_template.format(**full_context)
        chunk2_response = await self.ai_provider.generate_completion(
            prompt=chunk2_prompt,
            system_prompt=system_prompt,
            response_format="json",
            max_tokens=8192
        )
        chunk2_result = self._extract_json(chunk2_response)
        logger.info("[CHUNKED] Timeline generated successfully")

        # Merge results
        merged_result = {**chunk1_result, **chunk2_result}

        # Preserve the topic name
        merged_result["topic_name"] = selected_topic.get("name")

        logger.info("[CHUNKED] Research elaboration complete - merged both chunks")

        return merged_result

    # ========================================================================
    # ENHANCED MODE (RAG + Chain-of-Thought)
    # ========================================================================

    async def _suggest_topics_enhanced(
        self,
        project_type: str,
        context: Dict[str, Any],
        project_id: str
    ) -> Dict[str, Any]:
        """
        Enhanced mode: Multi-step reasoning with RAG.

        Steps:
        1. RAG retrieval of similar projects
        2. Chain-of-thought analysis
        3. Generate initial topics
        4. Validate and critique
        5. Refine based on validation
        """

        # Step 1: Retrieve context from RAG
        rag_context = await self._retrieve_relevant_context(
            project_id,
            context,
            retrieval_type="similar_projects"
        )

        # Step 2: Deep analysis with chain-of-thought
        analysis = await self._analyze_requirements_with_cot(
            project_type,
            context,
            rag_context
        )

        # Step 3: Generate initial topics
        initial_topics = await self._generate_initial_topics(
            project_type,
            context,
            analysis
        )

        # Step 4: Validate and critique
        validated_topics = await self._validate_topics(
            project_type,
            initial_topics,
            context,
            analysis
        )

        # Step 5: Refine based on validation
        final_topics = await self._refine_topics(
            project_type,
            validated_topics,
            context
        )

        return {
            "topics": final_topics.get("topics", []),
            "analysis_summary": analysis.get("summary"),
            "reasoning": {
                "initial_analysis": analysis.get("key_insights"),
                "validation_notes": validated_topics.get("validation_notes"),
                "refinements_made": final_topics.get("refinements")
            },
            "context_used": {
                "rag_sources": rag_context.get("sources", []) if rag_context else [],
                "similar_projects_found": len(rag_context.get("similar_projects", [])) if rag_context else 0
            },
            "mode": "enhanced"
        }

    async def _elaborate_topic_enhanced(
        self,
        project_type: str,
        selected_topic: Dict[str, Any],
        context: Dict[str, Any],
        project_id: str
    ) -> Dict[str, Any]:
        """
        Enhanced mode: Multi-step elaboration with feasibility and risk analysis.

        Steps:
        1. RAG retrieval of technical knowledge
        2. Feasibility analysis with chain-of-thought
        3. Generate detailed plan
        4. Risk assessment
        5. Refine plan with risk mitigation
        """

        # Step 1: Retrieve technical context
        tech_context = await self._retrieve_relevant_context(
            project_id,
            {**context, "topic": selected_topic},
            retrieval_type="technical_knowledge"
        )

        # Step 2: Feasibility analysis
        feasibility = await self._analyze_feasibility_with_cot(
            project_type,
            selected_topic,
            context,
            tech_context
        )

        # Step 3: Generate detailed plan
        initial_plan = await self._generate_detailed_plan(
            project_type,
            selected_topic,
            context,
            feasibility
        )

        # Step 4: Risk assessment
        risk_analysis = await self._assess_risks_with_cot(
            project_type,
            initial_plan,
            context
        )

        # Step 5: Refine plan with risks
        final_plan = await self._refine_plan_with_risks(
            initial_plan,
            risk_analysis
        )

        return {
            **final_plan,
            "feasibility_analysis": feasibility,
            "risk_assessment": risk_analysis,
            "reasoning": {
                "technical_considerations": feasibility.get("considerations"),
                "critical_risks": risk_analysis.get("critical_risks"),
                "mitigation_strategies": risk_analysis.get("mitigation_strategies")
            },
            "context_used": {
                "technical_sources": tech_context.get("sources", []) if tech_context else []
            },
            "mode": "enhanced"
        }

    # ========================================================================
    # CHAIN-OF-THOUGHT REASONING (Enhanced Mode Only)
    # ========================================================================

    async def _analyze_requirements_with_cot(
        self,
        project_type: str,
        context: Dict[str, Any],
        rag_context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Deep analysis with chain-of-thought reasoning."""

        prompt = self.get_analysis_prompt(project_type).format(
            context=json.dumps(context, indent=2),
            rag_context=json.dumps(rag_context, indent=2) if rag_context else "No additional context",
            analysis_steps="""
            Let's think step by step:

            1. First, understand the core requirements and constraints
            2. Identify key priorities (must-have vs nice-to-have)
            3. Assess team capabilities and skill gaps
            4. Evaluate feasibility given timeline and resources
            5. Synthesize into actionable insights
            """
        )

        response = await self.ai_provider.generate_completion(
            prompt=prompt,
            system_prompt=f"You are an expert analyst specializing in {project_type} projects. Think deeply and systematically.",
            response_format="json"
        )

        return self._extract_json(response)

    async def _validate_topics(
        self,
        project_type: str,
        topics: Dict[str, Any],
        context: Dict[str, Any],
        analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Validate topics with critical self-assessment."""

        prompt = self.get_validation_prompt(project_type).format(
            topics=json.dumps(topics, indent=2),
            context=json.dumps(context, indent=2),
            analysis=json.dumps(analysis, indent=2),
            validation_questions="""
            For each topic, critically evaluate:
            1. FEASIBILITY: Can this be done? Confidence level?
            2. SCOPE: Too ambitious or too simple?
            3. VALUE: Is this impressive/useful?
            4. RISKS: What could go wrong?
            5. HONEST CRITIQUE: What are the weaknesses?
            """
        )

        response = await self.ai_provider.generate_completion(
            prompt=prompt,
            system_prompt="You are a critical reviewer who honestly assesses feasibility.",
            response_format="json"
        )

        return self._extract_json(response)

    async def _refine_topics(
        self,
        project_type: str,
        validated_topics: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Refine topics based on validation feedback."""

        prompt = self.get_refinement_prompt(project_type).format(
            validated_topics=json.dumps(validated_topics, indent=2),
            context=json.dumps(context, indent=2),
            refinement_instructions="""
            Based on validation, improve each topic:
            1. LOW confidence: Reduce scope or remove
            2. MEDIUM confidence: Address concerns, add mitigations
            3. HIGH confidence: Keep core, add optional goals
            4. ALL topics: Ensure realistic scope, clear first steps
            """
        )

        response = await self.ai_provider.generate_completion(
            prompt=prompt,
            system_prompt="You are an improvement specialist who makes projects more actionable.",
            response_format="json"
        )

        return self._extract_json(response)

    async def _analyze_feasibility_with_cot(
        self,
        project_type: str,
        topic: Dict[str, Any],
        context: Dict[str, Any],
        tech_context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze technical and practical feasibility."""

        prompt = f"""Analyze feasibility of this project with step-by-step reasoning:

Topic: {json.dumps(topic, indent=2)}
Context: {json.dumps(context, indent=2)}
Technical Knowledge: {json.dumps(tech_context, indent=2) if tech_context else "None"}

Think through:
1. Technical complexity analysis
2. Skill requirements vs team capabilities
3. Time estimate with learning curve
4. Resource requirements
5. Integration complexity
6. Final assessment

Return JSON with detailed analysis."""

        response = await self.ai_provider.generate_completion(
            prompt=prompt,
            system_prompt="You are a technical architect who does deep feasibility analysis.",
            response_format="json"
        )

        return self._extract_json(response)

    async def _assess_risks_with_cot(
        self,
        project_type: str,
        plan: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Comprehensive risk assessment."""

        prompt = f"""Conduct comprehensive risk assessment:

Plan: {json.dumps(plan, indent=2)}
Context: {json.dumps(context, indent=2)}

Analyze risks:
1. Technical risks
2. Schedule risks
3. Team risks
4. Scope risks
5. External risks

For each risk: likelihood, impact, mitigation, contingency

Return JSON with complete risk assessment."""

        response = await self.ai_provider.generate_completion(
            prompt=prompt,
            system_prompt="You are a risk management expert.",
            response_format="json"
        )

        return self._extract_json(response)

    # ========================================================================
    # RAG RETRIEVAL (Enhanced Mode Only)
    # ========================================================================

    async def _retrieve_relevant_context(
        self,
        project_id: str,
        context: Dict[str, Any],
        retrieval_type: str = "similar_projects"
    ) -> Optional[Dict[str, Any]]:
        """Retrieve relevant context from RAG."""

        if not self.rag_service:
            return None

        try:
            # Build query
            query_parts = []

            if retrieval_type == "similar_projects":
                query_parts.append(f"Project type: {context.get('project_type', '')}")
                query_parts.append(f"Requirements: {context.get('requirements', '')}")
                query_parts.append(f"Technologies: {context.get('required_tech', '')}")

            elif retrieval_type == "technical_knowledge":
                topic = context.get('topic', {})
                query_parts.append(f"Topic: {topic.get('name', '')}")
                query_parts.append(f"Tech stack: {topic.get('suggested_tech', '')}")

            query = " ".join(query_parts)

            # Retrieve from RAG
            results = self.rag_service.search(
                project_id=project_id,
                query=query,
                k=5,
                collection_type="onboarding_materials"
            )

            if results and results.get("results"):
                return {
                    "sources": [r.get("metadata") for r in results["results"]],
                    "similar_projects": results["results"],
                    "relevance_scores": [r.get("score") for r in results["results"]]
                }

        except Exception as e:
            logger.warning(f"RAG retrieval failed: {str(e)}")

        return None

    async def _deep_analyze_documents(
        self,
        project_id: str,
        analyzed_docs: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Holistic analysis of uploaded documents."""

        prompt = f"""Analyze these uploaded documents comprehensively:

Documents: {json.dumps(analyzed_docs, indent=2)}

Perform deep analysis:
1. Extract key requirements (explicit and implicit)
2. Identify deadlines and milestones
3. Understand context and expectations
4. Extract useful concepts and technologies
5. Synthesize insights for project planning

Return comprehensive JSON analysis."""

        response = await self.ai_provider.generate_completion(
            prompt=prompt,
            system_prompt="You are an expert analyst who extracts actionable insights.",
            response_format="json"
        )

        return self._extract_json(response)

    async def _generate_initial_topics(
        self,
        project_type: str,
        context: Dict[str, Any],
        analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate initial topics based on analysis."""

        prompt_template = get_topic_suggestion_prompt(project_type)

        enhanced_context = {
            **context,
            "analysis_insights": analysis.get("key_insights", ""),
            "priorities": analysis.get("priorities", ""),
            "constraints": analysis.get("constraints", "")
        }

        prompt = prompt_template.format(**enhanced_context)

        response = await self.ai_provider.generate_completion(
            prompt=prompt,
            system_prompt=self._get_system_prompt(project_type, "suggest"),
            response_format="json"
        )

        return self._extract_json(response)

    async def _generate_detailed_plan(
        self,
        project_type: str,
        topic: Dict[str, Any],
        context: Dict[str, Any],
        feasibility: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate detailed project plan."""

        prompt_template = get_topic_elaboration_prompt(project_type)

        full_context = {
            "topic_name": topic.get("name"),
            "topic_description": topic.get("description"),
            **context,
            "feasibility_rating": feasibility.get("overall_rating", ""),
            "key_challenges": json.dumps(feasibility.get("key_challenges", []))
        }

        prompt = prompt_template.format(**full_context)

        response = await self.ai_provider.generate_completion(
            prompt=prompt,
            system_prompt=self._get_system_prompt(project_type, "elaborate"),
            response_format="json"
        )

        return self._extract_json(response)

    async def _refine_plan_with_risks(
        self,
        plan: Dict[str, Any],
        risk_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Refine plan incorporating risk mitigation."""

        prompt = f"""Enhance this plan with risk mitigation:

Plan: {json.dumps(plan, indent=2)}
Risks: {json.dumps(risk_analysis, indent=2)}

Integrate:
1. Risk mitigation into milestones
2. Contingency plans
3. Monitoring checkpoints
4. Fallback options

Return enhanced plan."""

        response = await self.ai_provider.generate_completion(
            prompt=prompt,
            system_prompt="You are a project manager expert at risk-aware planning.",
            response_format="json"
        )

        return self._extract_json(response)

    # ========================================================================
    # SYSTEM PROMPTS & UTILITIES
    # ========================================================================

    def _get_system_prompt(self, project_type: str, step: str) -> str:
        """Get appropriate system prompt."""

        base_prompts = {
            "course": "You are an expert course project advisor with deep knowledge of software engineering education.",
            "hackathon": "You are an experienced hackathon mentor specializing in rapid prototyping and demo-driven development.",
            "capstone": "You are an expert capstone project advisor who helps students create academically rigorous and innovative graduation projects.",
            "competition": "You are a competition strategy expert who helps teams design winning project proposals.",
            "internship": "You are a professional project manager who helps interns deliver real-world business value.",
            "opensource": "You are an open source community expert who helps contributors make meaningful contributions.",
            "portfolio": "You are a career advisor who helps developers create impressive portfolio projects.",
            "coursenote": "You are an educational content expert who helps create comprehensive course notes and study guides.",
            "examprep": "You are an exam preparation specialist who helps students create effective study materials."
        }

        step_suffix = {
            "suggest": " Generate project ideas that are practical, achievable, and aligned with requirements.",
            "elaborate": " Create detailed, actionable plans with clear milestones and deliverables.",
            "details": " Generate compelling names and descriptions that capture project essence."
        }

        base = base_prompts.get(project_type, base_prompts["course"])
        suffix = step_suffix.get(step, "")

        return base + suffix

    def _extract_json(self, text: str) -> Dict[str, Any]:
        """Extract JSON from AI response, handling markdown code blocks and truncation."""
        text = text.strip()

        # Remove markdown code blocks
        if text.startswith("```"):
            lines = text.split("\n")
            if len(lines) > 2:
                text = "\n".join(lines[1:-1])
                text = text.replace("```json", "").replace("```", "").strip()

        # Parse JSON
        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {text[:500]}...")
            logger.error(f"Full response length: {len(text)} characters")
            logger.error(f"Last 200 characters: ...{text[-200:]}")

            # Try to repair truncated JSON by closing open brackets
            repaired_text = self._try_repair_json(text)
            if repaired_text:
                try:
                    result = json.loads(repaired_text)
                    logger.warning("Successfully repaired truncated JSON response")
                    return result
                except json.JSONDecodeError:
                    pass

            raise ValueError(f"Invalid JSON response: {str(e)}")

    def _try_repair_json(self, text: str) -> Optional[str]:
        """Attempt to repair truncated JSON by closing open brackets."""
        # Count open brackets
        open_braces = text.count('{') - text.count('}')
        open_brackets = text.count('[') - text.count(']')

        if open_braces <= 0 and open_brackets <= 0:
            return None  # Not a truncation issue

        # Find the last complete key-value pair and truncate there
        # Remove trailing incomplete content (after last comma or colon)
        repaired = text.rstrip()

        # Remove trailing incomplete value
        while repaired and repaired[-1] not in '{}[],"0123456789nulltruefalse':
            repaired = repaired[:-1]

        # If ends with comma, remove it
        if repaired.endswith(','):
            repaired = repaired[:-1]

        # If ends with colon (incomplete key-value), remove the key too
        if repaired.endswith(':'):
            # Find and remove the incomplete key
            last_quote = repaired.rfind('"', 0, -1)
            if last_quote > 0:
                second_last_quote = repaired.rfind('"', 0, last_quote)
                if second_last_quote >= 0:
                    repaired = repaired[:second_last_quote].rstrip()
                    if repaired.endswith(','):
                        repaired = repaired[:-1]

        # Close open brackets
        repaired += ']' * open_brackets
        repaired += '}' * open_braces

        return repaired
