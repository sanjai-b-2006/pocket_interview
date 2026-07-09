from typing import List, Optional

from sqlalchemy.orm import Session as DbSession

from app.models.db import Answer, InterviewSession, Question, Report
from app.services import asr, prosody
from app.services.llm import LLMOverride, gemma_client


def create_session(
    db: DbSession,
    role: str,
    job_description: str,
    num_questions: int,
    company: str = "",
    experience_level: str = "",
    resume_text: str = "",
    override: Optional[LLMOverride] = None,
) -> InterviewSession:
    questions_data = gemma_client.generate_questions(
        role,
        job_description,
        num_questions,
        company=company,
        experience_level=experience_level,
        resume_text=resume_text,
        override=override,
    )

    session = InterviewSession(
        role=role,
        company=company,
        experience_level=experience_level,
        job_description=job_description,
    )
    db.add(session)
    db.flush()

    for i, q in enumerate(questions_data):
        db.add(
            Question(
                session_id=session.id,
                order=i,
                text=q["text"],
                sample_answer=q["sample_answer"],
            )
        )

    db.commit()
    db.refresh(session)
    return session


def process_answer(
    db: DbSession,
    question: Question,
    audio_path: str,
    override: Optional[LLMOverride] = None,
) -> Answer:
    transcript = asr.transcribe(audio_path)
    features = prosody.compute_prosody(audio_path, transcript)

    feedback = gemma_client.generate_answer_feedback(
        question=question.text, transcript=transcript.text, prosody=features, override=override
    )

    answer = Answer(
        question_id=question.id,
        transcript=transcript.text,
        duration_sec=transcript.duration_sec,
        words_per_minute=features["words_per_minute"],
        pitch_variation=features["pitch_variation"],
        filler_word_count=features["filler_word_count"],
        pause_ratio=features["pause_ratio"],
        volume_consistency=features["volume_consistency"],
        content_score=int(feedback["content_score"]),
        delivery_score=int(feedback["delivery_score"]),
        content_feedback=feedback["content_feedback"],
        delivery_feedback=feedback["delivery_feedback"],
    )
    db.add(answer)
    db.commit()
    db.refresh(answer)
    return answer


def build_report(
    db: DbSession, session: InterviewSession, override: Optional[LLMOverride] = None
) -> Report:
    answers: List[Answer] = [q.answer for q in session.questions if q.answer is not None]
    if not answers:
        raise ValueError("Cannot build a report for a session with no answered questions")

    avg_content = round(sum(a.content_score for a in answers) / len(answers))
    avg_delivery = round(sum(a.delivery_score for a in answers) / len(answers))

    qa_pairs = [
        {
            "question": q.text,
            "transcript": q.answer.transcript,
            "content_score": q.answer.content_score,
            "delivery_score": q.answer.delivery_score,
        }
        for q in session.questions
        if q.answer is not None
    ]

    llm_report = gemma_client.generate_report(
        role=session.role,
        qa_pairs=qa_pairs,
        avg_content_score=avg_content,
        avg_delivery_score=avg_delivery,
        override=override,
    )

    report = Report(
        session_id=session.id,
        summary=llm_report["summary"],
        top_actions=list(llm_report["top_actions"]),
        avg_content_score=avg_content,
        avg_delivery_score=avg_delivery,
    )
    db.add(report)
    session.status = "completed"
    db.commit()
    db.refresh(report)
    return report
