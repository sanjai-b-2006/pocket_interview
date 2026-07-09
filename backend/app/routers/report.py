from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DbSession

from app.models.db import InterviewSession, Report, get_db
from app.models.schemas import AnswerFeedbackOut, ReportOut
from app.routers.llm_override import get_llm_override
from app.services import interview
from app.services.llm import LLMOverride

router = APIRouter(prefix="/sessions/{session_id}/report", tags=["report"])


def _to_report_out(session: InterviewSession, report: Report) -> ReportOut:
    answers = [q.answer for q in session.questions if q.answer is not None]
    return ReportOut(
        session_id=session.id,
        summary=report.summary,
        top_actions=report.top_actions,
        avg_content_score=report.avg_content_score,
        avg_delivery_score=report.avg_delivery_score,
        answers=[AnswerFeedbackOut.from_answer(a) for a in answers],
    )


@router.get("", response_model=ReportOut)
def get_report(
    session_id: str,
    db: DbSession = Depends(get_db),
    override: LLMOverride = Depends(get_llm_override),
):
    session = db.get(InterviewSession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    existing = db.query(Report).filter(Report.session_id == session_id).first()
    if existing is not None:
        return _to_report_out(session, existing)

    try:
        report = interview.build_report(db, session, override)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return _to_report_out(session, report)
