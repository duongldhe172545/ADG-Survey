"""
D2Com Survey System — Forms & Questions API
Read-only endpoints to get survey forms and their questions.
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.database import get_db
from backend.db.models import SurveyForm, Question
from backend.schemas import FormOut, QuestionOut
from backend.middleware.auth_guard import get_current_user

router = APIRouter(prefix="/forms", tags=["forms"])


@router.get("/", response_model=List[FormOut])
async def list_forms(
    active_only: bool = True,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    """List survey forms. Default: active only."""
    query = select(SurveyForm).order_by(SurveyForm.type, SurveyForm.version.desc())
    if active_only:
        query = query.where(SurveyForm.is_active == True)

    result = await db.execute(query)
    forms = result.scalars().all()

    out = []
    for f in forms:
        q_count = (await db.execute(
            select(func.count()).select_from(Question).where(Question.form_id == f.id)
        )).scalar() or 0

        out.append(FormOut(
            id=f.id, name=f.name, type=f.type.value,
            version=f.version, is_active=f.is_active,
            question_count=q_count,
        ))
    return out


@router.get("/{form_id}/questions", response_model=List[QuestionOut])
async def get_form_questions(
    form_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    """Get all questions for a form, ordered by display_order."""
    # Verify form exists
    form = (await db.execute(select(SurveyForm).where(SurveyForm.id == form_id))).scalar_one_or_none()
    if not form:
        raise HTTPException(status_code=404, detail="Form không tồn tại")

    result = await db.execute(
        select(Question).where(Question.form_id == form_id).order_by(Question.display_order)
    )
    return [
        QuestionOut(
            id=q.id, q_id=q.q_id, question_text=q.question_text,
            question_type=q.question_type.value, options=q.options,
            display_order=q.display_order, is_required=q.is_required,
        )
        for q in result.scalars().all()
    ]
