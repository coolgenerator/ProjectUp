"""
Quiz API Routes

Endpoints for quiz generation, retrieval, and submission.
"""

import logging
from fastapi import APIRouter, HTTPException, Depends, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID

from database.database import get_db
from models.database.quiz_models import Quiz, QuizAttempt
from services.quiz.quiz_generation_service import QuizGenerationService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai-api/quizzes", tags=["Quizzes"])


# Request/Response Models
class QuizGenerationRequest(BaseModel):
    course_id: str
    section_id: Optional[str] = None
    content: str
    difficulty: str = "intermediate"
    num_questions: int = 5


class QuizResponse(BaseModel):
    id: str
    course_id: str
    section_id: Optional[str]
    title: str
    difficulty: str
    total_questions: int
    total_points: int
    questions: List[dict]
    created_at: str


class QuizSubmissionRequest(BaseModel):
    quiz_id: str
    responses: List[dict]  # List of {question_index: int, answer: List[str]}


class QuizSubmissionResponse(BaseModel):
    attempt_id: str
    score: int
    max_score: int
    percentage: int
    feedback: List[dict]  # Per-question feedback


# Initialize services
quiz_service = QuizGenerationService(llm_provider="vertex_ai")


@router.post("/generate", response_model=QuizResponse)
async def generate_quiz(
    request: QuizGenerationRequest = Body(...),
    db: Session = Depends(get_db)
):
    """
    Generate a quiz based on learning content.

    Args:
        request: Quiz generation request with content and parameters
        db: Database session

    Returns:
        Generated quiz with questions
    """
    try:
        logger.info(f"Generating quiz for course {request.course_id}")

        # TODO: Get user_id from authentication
        user_id = "1"  # Placeholder

        # Generate quiz using AI
        quiz_data = await quiz_service.generate_quiz(
            content=request.content,
            difficulty=request.difficulty,
            num_questions=request.num_questions,
            title=f"Quiz - Section {request.section_id or 'General'}"
        )

        # Save quiz to database
        quiz = Quiz(
            course_id=UUID(request.course_id),
            section_id=int(request.section_id) if request.section_id else None,
            user_id=user_id,
            title=quiz_data['title'],
            difficulty=quiz_data['difficulty'],
            total_questions=quiz_data['total_questions'],
            total_points=quiz_data['total_points'],
            questions=quiz_data['questions'],
            status='published'
        )

        db.add(quiz)
        db.commit()
        db.refresh(quiz)

        logger.info(f"✅ Quiz {quiz.id} saved to database")

        return QuizResponse(
            id=str(quiz.id),
            course_id=str(quiz.course_id),
            section_id=str(quiz.section_id) if quiz.section_id else None,
            title=quiz.title,
            difficulty=quiz.difficulty,
            total_questions=quiz.total_questions,
            total_points=quiz.total_points,
            questions=quiz.questions,
            created_at=quiz.created_at.isoformat()
        )

    except Exception as e:
        logger.error(f"Error generating quiz: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to generate quiz: {str(e)}")


@router.get("/{quiz_id}", response_model=QuizResponse)
async def get_quiz(
    quiz_id: str,
    db: Session = Depends(get_db)
):
    """
    Get a quiz by ID.

    Args:
        quiz_id: Quiz UUID
        db: Database session

    Returns:
        Quiz data
    """
    try:
        quiz = db.query(Quiz).filter(Quiz.id == UUID(quiz_id)).first()

        if not quiz:
            raise HTTPException(status_code=404, detail="Quiz not found")

        return QuizResponse(
            id=str(quiz.id),
            course_id=str(quiz.course_id),
            section_id=str(quiz.section_id) if quiz.section_id else None,
            title=quiz.title,
            difficulty=quiz.difficulty,
            total_questions=quiz.total_questions,
            total_points=quiz.total_points,
            questions=quiz.questions,
            created_at=quiz.created_at.isoformat()
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting quiz: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve quiz")


@router.post("/submit", response_model=QuizSubmissionResponse)
async def submit_quiz(
    submission: QuizSubmissionRequest = Body(...),
    db: Session = Depends(get_db)
):
    """
    Submit quiz answers and get graded results.

    Args:
        submission: User's quiz responses
        db: Database session

    Returns:
        Grading results with score and feedback
    """
    try:
        # TODO: Get user_id from authentication
        user_id = "1"  # Placeholder

        # Get quiz
        quiz = db.query(Quiz).filter(Quiz.id == UUID(submission.quiz_id)).first()

        if not quiz:
            raise HTTPException(status_code=404, detail="Quiz not found")

        # Grade the quiz
        score = 0
        feedback = []

        for response in submission.responses:
            question_index = response['question_index']
            user_answer = response['answer']  # List of selected options

            if question_index >= len(quiz.questions):
                continue

            question = quiz.questions[question_index]
            correct_answer = question['correct_answer']

            # Check if answer is correct
            is_correct = sorted(user_answer) == sorted(correct_answer)

            if is_correct:
                score += question['points']

            feedback.append({
                'question_index': question_index,
                'is_correct': is_correct,
                'user_answer': user_answer,
                'correct_answer': correct_answer,
                'explanation': question['explanation'],
                'points_earned': question['points'] if is_correct else 0,
                'points_possible': question['points']
            })

        # Calculate percentage
        percentage = int((score / quiz.total_points) * 100) if quiz.total_points > 0 else 0

        # Save attempt to database
        attempt = QuizAttempt(
            quiz_id=quiz.id,
            user_id=user_id,
            responses=submission.responses,
            score=score,
            max_score=quiz.total_points,
            percentage=percentage,
            status='completed'
        )

        db.add(attempt)
        db.commit()
        db.refresh(attempt)

        logger.info(f"✅ Quiz attempt {attempt.id} saved: {score}/{quiz.total_points} ({percentage}%)")

        return QuizSubmissionResponse(
            attempt_id=str(attempt.id),
            score=score,
            max_score=quiz.total_points,
            percentage=percentage,
            feedback=feedback
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting quiz: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to submit quiz")


@router.get("/course/{course_id}/list")
async def list_course_quizzes(
    course_id: str,
    db: Session = Depends(get_db)
):
    """
    List all quizzes for a course.

    Args:
        course_id: Course UUID
        db: Database session

    Returns:
        List of quizzes
    """
    try:
        quizzes = db.query(Quiz).filter(
            Quiz.course_id == UUID(course_id)
        ).order_by(Quiz.created_at.desc()).all()

        return [
            {
                'id': str(q.id),
                'title': q.title,
                'difficulty': q.difficulty,
                'total_questions': q.total_questions,
                'total_points': q.total_points,
                'section_id': str(q.section_id) if q.section_id else None,
                'created_at': q.created_at.isoformat()
            }
            for q in quizzes
        ]

    except Exception as e:
        logger.error(f"Error listing quizzes: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to list quizzes")
