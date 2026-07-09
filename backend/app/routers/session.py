from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DbSession

from app.models.db import InterviewSession, get_db
from app.models.schemas import SessionCreateRequest, SessionCreateResponse
from app.routers.llm_override import get_llm_override
from app.services import interview
from app.services.llm import LLMOverride

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("", response_model=SessionCreateResponse)
def create_session(
    payload: SessionCreateRequest,
    db: DbSession = Depends(get_db),
    override: LLMOverride = Depends(get_llm_override),
):
    session = interview.create_session(
        db,
        role=payload.role,
        job_description=payload.job_description,
        num_questions=payload.num_questions,
        override=override,
    )
    return SessionCreateResponse(session_id=session.id, role=session.role, questions=session.questions)


@router.get("/{session_id}", response_model=SessionCreateResponse)
def get_session(session_id: str, db: DbSession = Depends(get_db)):
    session = db.get(InterviewSession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionCreateResponse(session_id=session.id, role=session.role, questions=session.questions)
