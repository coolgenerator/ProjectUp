"""
Quiz Database Models

Stores generated quizzes and user responses.
"""

from sqlalchemy import Column, String, Integer, JSON, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from database.connection import Base


class Quiz(Base):
    """
    Quiz model for storing generated quizzes.
    """
    __tablename__ = "quizzes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey('course_requests.id'), nullable=False)
    section_id = Column(Integer, nullable=True)  # Optional: specific section/task
    user_id = Column(String, nullable=False)

    # Quiz metadata
    title = Column(String, nullable=False)
    difficulty = Column(String, nullable=False)  # beginner, intermediate, advanced
    total_questions = Column(Integer, nullable=False)
    total_points = Column(Integer, nullable=False)

    # Questions stored as JSON array
    # Each question has: type, question, options, correct_answer, points, explanation
    questions = Column(JSON, nullable=False)

    # Quiz status
    status = Column(String, default='draft')  # draft, published

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    attempts = relationship("QuizAttempt", back_populates="quiz", cascade="all, delete-orphan")


class QuizAttempt(Base):
    """
    Quiz attempt model for storing user quiz attempts and responses.
    """
    __tablename__ = "quiz_attempts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quiz_id = Column(UUID(as_uuid=True), ForeignKey('quizzes.id'), nullable=False)
    user_id = Column(String, nullable=False)

    # Attempt data
    responses = Column(JSON, nullable=False)  # User's answers for each question
    score = Column(Integer, nullable=False)  # Total points earned
    max_score = Column(Integer, nullable=False)  # Maximum possible points
    percentage = Column(Integer, nullable=False)  # Score percentage

    # Attempt status
    status = Column(String, default='in_progress')  # in_progress, completed

    # Timing
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    time_spent_seconds = Column(Integer, nullable=True)  # Total time spent

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    quiz = relationship("Quiz", back_populates="attempts")
