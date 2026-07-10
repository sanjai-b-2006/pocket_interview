import os
import tempfile

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session as DbSession

from app.models.db import Question, get_db
from app.models.schemas import AnswerFeedbackOut
from app.routers.llm_override import get_llm_override
from app.services import interview
from app.services.llm import LLMOverride

router = APIRouter(prefix="/sessions/{session_id}/questions/{question_id}/answer", tags=["answers"])


@router.post("", response_model=AnswerFeedbackOut)
async def submit_answer(
    session_id: str,
    question_id: str,
    audio: UploadFile,
    db: DbSession = Depends(get_db),
    override: LLMOverride = Depends(get_llm_override),
):
    question = db.get(Question, question_id)
    if question is None or question.session_id != session_id:
        raise HTTPException(status_code=404, detail="Question not found for this session")
    if question.answer is not None:
        raise HTTPException(status_code=409, detail="This question has already been answered")

    suffix = os.path.splitext(audio.filename or "")[1] or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await audio.read())
        tmp_path = tmp.name

    try:
        answer, follow_up_question = interview.process_answer(db, question, tmp_path, override)
    finally:
        os.unlink(tmp_path)

    return AnswerFeedbackOut.from_answer(answer, follow_up_question)
