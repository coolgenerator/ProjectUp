"""
Quiz Generation Service

Generates quizzes with various question types using AI.
"""

import logging
import json
from typing import Dict, Any, List
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_vertexai import ChatVertexAI

from config.settings import settings

logger = logging.getLogger(__name__)


class QuizGenerationService:
    """Service for generating quizzes from learning content."""

    def __init__(self, llm_provider: str = "vertex_ai"):
        """Initialize the quiz generation service."""
        # Use Vertex AI for quiz generation
        self.llm = ChatVertexAI(
            model_name=settings.default_llm_model,
            project=settings.VERTEX_PROJECT_ID,
            location=settings.VERTEX_LOCATION,
            max_output_tokens=4096,
            temperature=0.7,
        )

    def _get_quiz_generation_prompt(
        self,
        content: str,
        difficulty: str,
        num_questions: int
    ) -> str:
        """Generate prompt for quiz generation."""

        return f"""Generate a comprehensive quiz with {num_questions} questions based on the following learning content.

**Difficulty Level**: {difficulty}

**Learning Content**:
{content[:4000]}  # Limit content to avoid token limits

**Question Types to Include**:
1. **Single Choice** (multiple choice with one correct answer)
2. **Multiple Choice** (multiple correct answers)
3. **True/False** (judge questions)
4. **Open-Ended** (short answer questions)

**Requirements**:
- Mix different question types
- Ensure questions test understanding, not just memorization
- Include explanations for correct answers
- Questions should be clear and unambiguous
- For multiple choice, include 4 options (A, B, C, D)
- Assign points: Single/True-False=10, Multiple=15, Open-Ended=20

Return a JSON object with this EXACT structure:
{{
  "questions": [
    {{
      "type": "single_choice",
      "question": "What is...",
      "options": [
        {{"label": "A", "text": "Option 1"}},
        {{"label": "B", "text": "Option 2"}},
        {{"label": "C", "text": "Option 3"}},
        {{"label": "D", "text": "Option 4"}}
      ],
      "correct_answer": ["A"],
      "points": 10,
      "explanation": "The correct answer is A because..."
    }},
    {{
      "type": "multiple_choice",
      "question": "Which of the following are...",
      "options": [
        {{"label": "A", "text": "Option 1"}},
        {{"label": "B", "text": "Option 2"}},
        {{"label": "C", "text": "Option 3"}},
        {{"label": "D", "text": "Option 4"}}
      ],
      "correct_answer": ["A", "C"],
      "points": 15,
      "explanation": "Options A and C are correct because..."
    }},
    {{
      "type": "true_false",
      "question": "Statement to judge...",
      "options": [
        {{"label": "True", "text": "True"}},
        {{"label": "False", "text": "False"}}
      ],
      "correct_answer": ["True"],
      "points": 10,
      "explanation": "This statement is true because..."
    }},
    {{
      "type": "open_ended",
      "question": "Explain...",
      "options": [],
      "correct_answer": ["Keywords: concept1, concept2, concept3"],
      "points": 20,
      "explanation": "A good answer should include: concept1, concept2, concept3..."
    }}
  ]
}}

IMPORTANT:
- Return ONLY valid JSON, no other text
- Use double quotes for strings
- Ensure all arrays are properly closed
- correct_answer is ALWAYS an array of strings"""

    async def generate_quiz(
        self,
        content: str,
        difficulty: str = "intermediate",
        num_questions: int = 5,
        title: str = None
    ) -> Dict[str, Any]:
        """
        Generate a quiz from learning content.

        Args:
            content: The learning material to create quiz from
            difficulty: Difficulty level (beginner, intermediate, advanced)
            num_questions: Number of questions to generate
            title: Optional quiz title

        Returns:
            Dict containing quiz data with questions
        """
        try:
            logger.info(f"Generating quiz with {num_questions} questions at {difficulty} level")

            # Generate quiz questions
            prompt = self._get_quiz_generation_prompt(content, difficulty, num_questions)

            messages = [
                SystemMessage(content="You are an expert educational content creator. Generate clear, fair, and educational quiz questions. Always return valid JSON."),
                HumanMessage(content=prompt)
            ]

            response = await self.llm.ainvoke(messages)

            # Handle both string and list responses
            if isinstance(response.content, list):
                response_text = ' '.join(str(item) for item in response.content).strip()
            else:
                response_text = response.content.strip()

            # Extract JSON from response
            quiz_data = self._extract_json(response_text)

            if not quiz_data or 'questions' not in quiz_data:
                raise ValueError("Invalid quiz data structure")

            # Calculate total points
            total_points = sum(q.get('points', 10) for q in quiz_data['questions'])

            # Build final quiz object
            quiz = {
                "title": title or f"{difficulty.title()} Quiz",
                "difficulty": difficulty,
                "total_questions": len(quiz_data['questions']),
                "total_points": total_points,
                "questions": quiz_data['questions']
            }

            logger.info(f"✅ Generated quiz with {len(quiz_data['questions'])} questions, {total_points} total points")

            return quiz

        except Exception as e:
            logger.error(f"Error generating quiz: {e}", exc_info=True)
            raise

    def _extract_json(self, text: str) -> Dict[str, Any]:
        """Extract JSON from AI response."""
        try:
            # Remove markdown code blocks if present
            cleaned = text.strip()
            if cleaned.startswith('```json'):
                cleaned = cleaned[7:]
            elif cleaned.startswith('```'):
                cleaned = cleaned[3:]

            if cleaned.endswith('```'):
                cleaned = cleaned[:-3]

            cleaned = cleaned.strip()

            # Parse JSON
            return json.loads(cleaned)

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {e}")
            logger.error(f"Response text: {text[:500]}")
            raise ValueError(f"Failed to parse quiz JSON: {str(e)}")
