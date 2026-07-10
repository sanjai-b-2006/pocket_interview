from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DbSession

from app.models.db import InterviewSession, Report, get_db
from app.models.schemas import AnswerFeedbackOut, CheatSheetOut, ReportOut
from app.routers.llm_override import get_llm_override
from app.services import interview
from app.services.llm import LLMOverride

router = APIRouter(prefix="/sessions/{session_id}/report", tags=["report"])


def _to_report_out(session: InterviewSession, report: Report) -> ReportOut:
    answers = [q.answer for q in session.questions if q.answer is not None]
    return ReportOut(
        session_id=session.id,
        role=session.role,
        company=session.company,
        experience_level=session.experience_level,
        summary=report.summary,
        top_actions=report.top_actions,
        avg_content_score=report.avg_content_score,
        avg_delivery_score=report.avg_delivery_score,
        answers=[AnswerFeedbackOut.from_answer(a) for a in answers],
    )


def _get_or_build_report(session: InterviewSession, db: DbSession, override: LLMOverride) -> Report:
    existing = db.query(Report).filter(Report.session_id == session.id).first()
    if existing is not None:
        return existing
    return interview.build_report(db, session, override)


@router.get("", response_model=ReportOut)
def get_report(
    session_id: str,
    db: DbSession = Depends(get_db),
    override: LLMOverride = Depends(get_llm_override),
):
    session = db.get(InterviewSession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    try:
        report = _get_or_build_report(session, db, override)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return _to_report_out(session, report)


@router.get("/cheatsheet", response_model=CheatSheetOut)
def get_cheat_sheet(
    session_id: str,
    db: DbSession = Depends(get_db),
    override: LLMOverride = Depends(get_llm_override),
):
    session = db.get(InterviewSession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    try:
        report = _get_or_build_report(session, db, override)
        cheat_sheet = interview.build_cheat_sheet(db, session, report, override)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return CheatSheetOut(cheat_sheet=cheat_sheet)
