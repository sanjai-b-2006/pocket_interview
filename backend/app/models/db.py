import datetime
import uuid

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, JSON, String, create_engine
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

from app.core.config import settings

engine = create_engine(
    settings.database_url, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def gen_id() -> str:
    return uuid.uuid4().hex


class InterviewSession(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, default=gen_id)
    role = Column(String, nullable=False)
    company = Column(String, default="")
    experience_level = Column(String, default="")
    job_description = Column(String, default="")
    session_type = Column(String, default="job_interview")  # job_interview | salary_negotiation | performance_review | difficult_feedback
    persona = Column(String, default="")  # interviewer persona key, ignored if panel_mode
    panel_mode = Column(Boolean, default=False)
    drill_focus = Column(String, default="")  # non-empty for a weakness-drill session
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String, default="active")  # active | completed

    questions = relationship("Question", back_populates="session", order_by="Question.order")


class Question(Base):
    __tablename__ = "questions"

    id = Column(String, primary_key=True, default=gen_id)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False)
    order = Column(Integer, nullable=False)
    text = Column(String, nullable=False)
    sample_answer = Column(String, default="")
    persona = Column(String, default="")  # which persona asks this question (panel mode rotates this)
    is_dynamic = Column(Boolean, default=False)  # True for AI-inserted follow-up questions
    parent_question_id = Column(String, default="")  # id of the question this follows up on, if any

    session = relationship("InterviewSession", back_populates="questions")
    answer = relationship("Answer", back_populates="question", uselist=False)


class Answer(Base):
    __tablename__ = "answers"

    id = Column(String, primary_key=True, default=gen_id)
    question_id = Column(String, ForeignKey("questions.id"), nullable=False)
    transcript = Column(String, default="")

    duration_sec = Column(Float, default=0.0)
    words_per_minute = Column(Float, default=0.0)
    pitch_variation = Column(Float, default=0.0)
    filler_word_count = Column(Integer, default=0)
    pause_ratio = Column(Float, default=0.0)
    volume_consistency = Column(Float, default=0.0)
    delivery_timeline = Column(JSON, default=list)  # [{t, wpm, pitch_variation}, ...] over the answer

    content_score = Column(Integer, default=0)
    delivery_score = Column(Integer, default=0)
    content_feedback = Column(String, default="")
    delivery_feedback = Column(String, default="")

    question = relationship("Question", back_populates="answer")


class Report(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True, default=gen_id)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False)
    summary = Column(String, default="")
    top_actions = Column(JSON, default=list)
    avg_content_score = Column(Integer, default=0)
    avg_delivery_score = Column(Integer, default=0)
    cheat_sheet = Column(String, default="")  # lazily generated on first request


def init_db() -> None:
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
