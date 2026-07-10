import os
import tempfile
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session as DbSession

from app.models.db import InterviewSession, get_db
from app.models.schemas import SessionCreateResponse
from app.routers.llm_override import get_llm_override
from app.services import interview
from app.services import resume as resume_service
from app.services.llm import LLMOverride

router = APIRouter(prefix="/sessions", tags=["sessions"])


def _to_response(session: InterviewSession) -> SessionCreateResponse:
    return SessionCreateResponse(
        session_id=session.id,
        role=session.role,
        company=session.company,
        session_type=session.session_type,
        persona=session.persona,
        panel_mode=session.panel_mode,
        drill_focus=session.drill_focus,
        questions=session.questions,
    )


@router.post("", response_model=SessionCreateResponse)
async def create_session(
    role: str = Form(...),
    company: str = Form(""),
    job_description: str = Form(""),
    experience_level: str = Form(""),
    num_questions: int = Form(5),
    session_type: str = Form("job_interview"),
    persona: str = Form(""),
    panel_mode: bool = Form(False),
    drill_focus: str = Form(""),
    resume: Optional[UploadFile] = File(None),
    db: DbSession = Depends(get_db),
    override: LLMOverride = Depends(get_llm_override),
):
    resume_text = ""
    if resume is not None and resume.filename:
        suffix = os.path.splitext(resume.filename)[1] or ".txt"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(await resume.read())
            tmp_path = tmp.name
        try:
            resume_text = resume_service.extract_text(tmp_path, resume.filename)
        finally:
            os.unlink(tmp_path)

    session = interview.create_session(
        db,
        role=role,
        job_description=job_description,
        num_questions=num_questions,
        company=company,
        experience_level=experience_level,
        resume_text=resume_text,
        session_type=session_type,
        persona=persona,
        panel_mode=panel_mode,
        drill_focus=drill_focus,
        override=override,
    )
    return _to_response(session)


@router.get("/{session_id}", response_model=SessionCreateResponse)
def get_session(session_id: str, db: DbSession = Depends(get_db)):
    session = db.get(InterviewSession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return _to_response(session)
