from typing import Any, Dict, List, Optional, TYPE_CHECKING

from pydantic import BaseModel

if TYPE_CHECKING:
    from app.models.db import Answer


class QuestionOut(BaseModel):
    id: str
    order: int
    text: str
    sample_answer: str
    persona: str = ""
    is_dynamic: bool = False

    class Config:
        from_attributes = True


class SessionCreateResponse(BaseModel):
    session_id: str
    role: str
    company: str = ""
    session_type: str = "job_interview"
    persona: str = ""
    panel_mode: bool = False
    drill_focus: str = ""
    questions: List[QuestionOut]


class TimelinePoint(BaseModel):
    t: float
    words_per_minute: float
    pitch_variation: float


class AnswerFeedbackOut(BaseModel):
    question: str
    sample_answer: str
    persona: str = ""
    transcript: str
    duration_sec: float
    words_per_minute: float
    pitch_variation: float
    filler_word_count: int
    pause_ratio: float
    volume_consistency: float
    delivery_timeline: List[Dict[str, Any]] = []
    content_score: int
    delivery_score: int
    content_feedback: str
    delivery_feedback: str
    follow_up_question: Optional[QuestionOut] = None

    class Config:
        from_attributes = True

    @classmethod
    def from_answer(cls, answer: "Answer", follow_up_question: Optional[Any] = None) -> "AnswerFeedbackOut":
        return cls(
            question=answer.question.text,
            sample_answer=answer.question.sample_answer,
            persona=answer.question.persona,
            transcript=answer.transcript,
            duration_sec=answer.duration_sec,
            words_per_minute=answer.words_per_minute,
            pitch_variation=answer.pitch_variation,
            filler_word_count=answer.filler_word_count,
            pause_ratio=answer.pause_ratio,
            volume_consistency=answer.volume_consistency,
            delivery_timeline=answer.delivery_timeline or [],
            content_score=answer.content_score,
            delivery_score=answer.delivery_score,
            content_feedback=answer.content_feedback,
            delivery_feedback=answer.delivery_feedback,
            follow_up_question=QuestionOut.model_validate(follow_up_question) if follow_up_question else None,
        )


class ReportOut(BaseModel):
    session_id: str
    role: str = ""
    company: str = ""
    experience_level: str = ""
    summary: str
    top_actions: List[str]
    avg_content_score: int
    avg_delivery_score: int
    answers: List[AnswerFeedbackOut]


class CheatSheetOut(BaseModel):
    cheat_sheet: str
