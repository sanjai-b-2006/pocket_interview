from typing import TYPE_CHECKING, List

from pydantic import BaseModel

if TYPE_CHECKING:
    from app.models.db import Answer


class SessionCreateRequest(BaseModel):
    role: str
    job_description: str = ""
    num_questions: int = 5


class QuestionOut(BaseModel):
    id: str
    order: int
    text: str
    sample_answer: str

    class Config:
        from_attributes = True


class SessionCreateResponse(BaseModel):
    session_id: str
    role: str
    questions: List[QuestionOut]


class AnswerFeedbackOut(BaseModel):
    question: str
    sample_answer: str
    transcript: str
    duration_sec: float
    words_per_minute: float
    pitch_variation: float
    filler_word_count: int
    pause_ratio: float
    volume_consistency: float
    content_score: int
    delivery_score: int
    content_feedback: str
    delivery_feedback: str

    class Config:
        from_attributes = True

    @classmethod
    def from_answer(cls, answer: "Answer") -> "AnswerFeedbackOut":
        return cls(
            question=answer.question.text,
            sample_answer=answer.question.sample_answer,
            transcript=answer.transcript,
            duration_sec=answer.duration_sec,
            words_per_minute=answer.words_per_minute,
            pitch_variation=answer.pitch_variation,
            filler_word_count=answer.filler_word_count,
            pause_ratio=answer.pause_ratio,
            volume_consistency=answer.volume_consistency,
            content_score=answer.content_score,
            delivery_score=answer.delivery_score,
            content_feedback=answer.content_feedback,
            delivery_feedback=answer.delivery_feedback,
        )


class ReportOut(BaseModel):
    session_id: str
    summary: str
    top_actions: List[str]
    avg_content_score: int
    avg_delivery_score: int
    answers: List[AnswerFeedbackOut]
