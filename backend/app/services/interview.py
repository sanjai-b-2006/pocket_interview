from typing import List, Optional, Tuple

from sqlalchemy.orm import Session as DbSession

from app.models.db import Answer, InterviewSession, Question, Report
from app.services import asr, prosody
from app.services.llm import LLMOverride, PANEL_ROTATION, gemma_client


def create_session(
    db: DbSession,
    role: str,
    job_description: str,
    num_questions: int,
    company: str = "",
    experience_level: str = "",
    resume_text: str = "",
    session_type: str = "job_interview",
    persona: str = "",
    panel_mode: bool = False,
    drill_focus: str = "",
    override: Optional[LLMOverride] = None,
) -> InterviewSession:
    questions_data = gemma_client.generate_questions(
        role,
        job_description,
        num_questions,
        company=company,
        experience_level=experience_level,
        resume_text=resume_text,
        session_type=session_type,
        persona=persona,
        panel_mode=panel_mode,
        drill_focus=drill_focus,
        override=override,
    )

    session = InterviewSession(
        role=role,
        company=company,
        experience_level=experience_level,
        job_description=job_description,
        session_type=session_type,
        persona=persona,
        panel_mode=panel_mode,
        drill_focus=drill_focus,
    )
    db.add(session)
    db.flush()

    for i, q in enumerate(questions_data):
        persona_for_q = q.get("persona") or (PANEL_ROTATION[i % len(PANEL_ROTATION)] if panel_mode else persona)
        db.add(
            Question(
                session_id=session.id,
                order=i,
                text=q["text"],
                sample_answer=q["sample_answer"],
                persona=persona_for_q,
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
) -> Tuple[Answer, Optional[Question]]:
    transcript = asr.transcribe(audio_path)
    features = prosody.compute_prosody(audio_path, transcript)

    effective_persona = question.persona or question.session.persona

    feedback = gemma_client.generate_answer_feedback(
        question=question.text,
        transcript=transcript.text,
        prosody=features,
        persona=effective_persona,
        override=override,
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
        delivery_timeline=features.get("delivery_timeline", []),
        content_score=int(feedback["content_score"]),
        delivery_score=int(feedback["delivery_score"]),
        content_feedback=feedback["content_feedback"],
        delivery_feedback=feedback["delivery_feedback"],
    )
    db.add(answer)
    db.flush()

    follow_up_question: Optional[Question] = None
    follow_up_text = feedback.get("follow_up")
    if follow_up_text:
        db.query(Question).filter(
            Question.session_id == question.session_id, Question.order > question.order
        ).update({Question.order: Question.order + 1})
        follow_up_question = Question(
            session_id=question.session_id,
            order=question.order + 1,
            text=follow_up_text,
            sample_answer="",
            persona=effective_persona,
            is_dynamic=True,
            parent_question_id=question.id,
        )
        db.add(follow_up_question)

    db.commit()
    db.refresh(answer)
    if follow_up_question:
        db.refresh(follow_up_question)
    return answer, follow_up_question


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
        session_type=session.session_type,
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


def build_cheat_sheet(
    db: DbSession, session: InterviewSession, report: Report, override: Optional[LLMOverride] = None
) -> str:
    if report.cheat_sheet:
        return report.cheat_sheet

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
    cheat_sheet = gemma_client.generate_cheat_sheet(role=session.role, qa_pairs=qa_pairs, override=override)
    report.cheat_sheet = cheat_sheet
    db.commit()
    db.refresh(report)
    return cheat_sheet
