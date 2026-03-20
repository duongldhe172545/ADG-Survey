"""
D2Com Survey System — Forms & Questions API
Read-only endpoints to get survey forms and their questions.
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.database import get_db
from backend.db.models import SurveyForm, Question, QuestionType
from backend.schemas import FormOut, QuestionOut, QuestionEdit, NewVersionRequest
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
            section=q.section,
        )
        for q in result.scalars().all()
    ]


@router.post("/{form_id}/new-version")
async def create_new_version(
    form_id: int,
    body: NewVersionRequest,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    """
    Create a new version of a form with edited questions.
    - Clones the form with incremented version
    - Creates new questions
    - Deactivates the old form
    """
    # 1. Get current form
    old_form = (await db.execute(
        select(SurveyForm).where(SurveyForm.id == form_id)
    )).scalar_one_or_none()
    if not old_form:
        raise HTTPException(status_code=404, detail="Form không tồn tại")

    if not body.questions:
        raise HTTPException(status_code=400, detail="Cần ít nhất 1 câu hỏi")

    # 2. Increment version (v1 → v2, v2 → v3, etc.)
    old_v = old_form.version  # e.g. "v1"
    try:
        v_num = int(old_v.replace("v", "").replace("V", ""))
    except ValueError:
        v_num = 1
    new_version = f"v{v_num + 1}"

    # 3. Create new form
    new_form = SurveyForm(
        name=old_form.name.replace(old_v, new_version) if old_v in old_form.name else old_form.name,
        type=old_form.type,
        version=new_version,
        is_active=True,
    )
    db.add(new_form)
    await db.flush()  # get new_form.id

    # 4. Create questions for new form
    for i, q in enumerate(body.questions):
        try:
            q_type = QuestionType(q.question_type)
        except ValueError:
            q_type = QuestionType.short_answer

        db.add(Question(
            form_id=new_form.id,
            section=q.section,
            q_id=q.q_id,
            question_text=q.question_text,
            question_type=q_type,
            options=q.options,
            display_order=i + 1,
            is_required=q.is_required,
        ))

    # 5. Deactivate old form
    old_form.is_active = False

    q_count = len(body.questions)

    # 6. Create Google Sheet tab for new version (non-blocking)
    try:
        from backend.services.sheets_service import create_version_tab
        q_ids = [q.q_id for q in body.questions]
        create_version_tab(
            form_type=new_form.type.value,
            form_version=new_version,
            q_ids=q_ids,
        )
    except Exception as e:
        import logging
        logging.warning(f"Sheet tab creation failed (non-blocking): {e}")

    return FormOut(
        id=new_form.id,
        name=new_form.name,
        type=new_form.type.value,
        version=new_form.version,
        is_active=True,
        question_count=q_count,
    )
