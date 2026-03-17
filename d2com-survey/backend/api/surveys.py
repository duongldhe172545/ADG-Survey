"""
D2Com Survey System — Surveys & Responses API
Core endpoints for survey lifecycle: create → save responses → submit.
Business logic delegated to survey_service.py.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.database import get_db
from backend.db.models import (
    Survey, SurveyStatus, Customer, FormType,
    Response, Question, SurveyForm, User
)
from backend.schemas import (
    SurveyCreate, SurveyOut, SubmitRequest,
    ResponsesBatch, ResponseOut
)
from backend.services.survey_service import (
    generate_resp_id, build_survey_out,
    update_customer_name_from_responses,
    get_missing_required_questions
)
from backend.middleware.auth_guard import get_current_user

router = APIRouter(prefix="/surveys", tags=["surveys"])


# ── Create ──

@router.post("/", response_model=SurveyOut, status_code=201)
async def create_survey(
    body: SurveyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create new survey: auto-creates customer + survey in draft status."""
    customer_type = FormType(body.customer_type)

    # Find active form
    if body.form_id:
        form = (await db.execute(
            select(SurveyForm).where(SurveyForm.id == body.form_id)
        )).scalar_one_or_none()
    else:
        form = (await db.execute(
            select(SurveyForm)
            .where(SurveyForm.type == customer_type, SurveyForm.is_active == True)
            .order_by(SurveyForm.created_at.desc())
        )).scalar_one_or_none()

    if not form:
        raise HTTPException(status_code=404, detail="Không tìm thấy bộ form phù hợp")

    # Create customer
    resp_id = await generate_resp_id(db, customer_type)
    customer = Customer(resp_id=resp_id, type=customer_type, name=body.customer_name)
    db.add(customer)
    await db.flush()

    # Create survey
    survey = Survey(
        customer_id=customer.id,
        form_id=form.id,
        status=SurveyStatus.draft,
        surveyed_by=current_user.id,
    )
    db.add(survey)
    await db.flush()

    return await build_survey_out(db, survey)


# ── List & Get ──

@router.get("/", response_model=List[SurveyOut])
async def list_surveys(
    status: Optional[str] = None,
    customer_type: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """List surveys with optional filters: status, type, name search."""
    query = select(Survey).order_by(Survey.updated_at.desc())

    if status:
        query = query.where(Survey.status == SurveyStatus(status))
    if customer_type:
        query = query.join(Customer).where(Customer.type == FormType(customer_type))
    if search:
        if Customer not in [c.entity for c in query.columns_clause_froms]:
            query = query.join(Customer)
        query = query.where(Customer.name.ilike(f"%{search}%"))

    result = await db.execute(query.limit(limit).offset(offset))
    return [await build_survey_out(db, s) for s in result.scalars().all()]


@router.get("/{survey_id}", response_model=SurveyOut)
async def get_survey(
    survey_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    """Get survey details."""
    survey = (await db.execute(select(Survey).where(Survey.id == survey_id))).scalar_one_or_none()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey không tồn tại")
    return await build_survey_out(db, survey)


# ── Responses ──

@router.get("/{survey_id}/responses", response_model=List[ResponseOut])
async def get_survey_responses(
    survey_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    """Get all questions for this survey's form, merged with existing answers."""
    survey = (await db.execute(select(Survey).where(Survey.id == survey_id))).scalar_one_or_none()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey không tồn tại")

    # All questions for this form
    questions = (await db.execute(
        select(Question).where(Question.form_id == survey.form_id).order_by(Question.display_order)
    )).scalars().all()

    # Existing responses (indexed by question_id)
    responses = {
        r.question_id: r
        for r in (await db.execute(
            select(Response).where(Response.survey_id == survey_id)
        )).scalars().all()
    }

    return [
        ResponseOut(
            id=responses[q.id].id if q.id in responses else 0,
            question_id=q.id,
            q_id=q.q_id,
            section=q.section,
            question_text=q.question_text,
            question_type=q.question_type.value,
            options=q.options,
            answer=responses[q.id].answer if q.id in responses else None,
            is_required=q.is_required,
        )
        for q in questions
    ]


@router.post("/{survey_id}/responses")
async def save_responses(
    survey_id: int,
    body: ResponsesBatch,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Save/update batch of responses. Supports partial saves (draft)."""
    survey = (await db.execute(select(Survey).where(Survey.id == survey_id))).scalar_one_or_none()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey không tồn tại")

    for resp in body.responses:
        # Upsert: update existing or insert new
        existing = (await db.execute(
            select(Response).where(
                Response.survey_id == survey_id,
                Response.question_id == resp.question_id,
            )
        )).scalar_one_or_none()

        if existing:
            existing.answer = resp.answer
            existing.updated_by = current_user.id
        else:
            db.add(Response(
                survey_id=survey_id,
                question_id=resp.question_id,
                answer=resp.answer,
                updated_by=current_user.id,
            ))

        # Auto-update customer name from D01/C01
        await update_customer_name_from_responses(db, survey, resp.question_id, resp.answer)

    # Update status: draft → partial when first response saved
    if survey.status == SurveyStatus.draft:
        survey.status = SurveyStatus.partial

    answered = (await db.execute(
        select(func.count()).select_from(Response).where(Response.survey_id == survey_id)
    )).scalar() or 0

    return {"message": f"Đã lưu {len(body.responses)} câu trả lời", "answered_count": answered}


# ── Submit ──

@router.post("/{survey_id}/submit")
async def submit_survey(
    survey_id: int,
    body: SubmitRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit survey: set status=complete, export to Google Sheet."""
    survey = (await db.execute(select(Survey).where(Survey.id == survey_id))).scalar_one_or_none()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey không tồn tại")

    # Set complete (no required validation — allow partial submit)
    survey.status = SurveyStatus.complete
    if body.pain_cluster:
        survey.pain_cluster = body.pain_cluster

    # ── Export to Google Sheets ──
    sheet_exported = False
    try:
        from backend.services.sheets_service import append_survey_row

        # Get customer info
        customer = (await db.execute(
            select(Customer).where(Customer.id == survey.customer_id)
        )).scalar_one_or_none()

        # Get form type
        form = (await db.execute(
            select(SurveyForm).where(SurveyForm.id == survey.form_id)
        )).scalar_one_or_none()

        # Get all questions (ordered) + responses
        questions = (await db.execute(
            select(Question).where(Question.form_id == survey.form_id).order_by(Question.display_order)
        )).scalars().all()

        responses = {
            r.question_id: r.answer
            for r in (await db.execute(
                select(Response).where(Response.survey_id == survey_id)
            )).scalars().all()
        }

        if customer and form:
            q_ids = [q.q_id for q in questions]
            answers = {q.q_id: responses.get(q.id, "") for q in questions}

            sheet_exported = append_survey_row(
                form_type=form.type.value,
                customer_name=customer.name or customer.resp_id,
                surveyor_name=current_user.name or current_user.email,
                q_ids=q_ids,
                answers=answers,
            )
    except Exception as e:
        import logging
        logging.error(f"Sheet export failed (non-blocking): {e}")

    return {
        "message": "Đã gửi survey thành công",
        "status": "complete",
        "sheet_exported": sheet_exported,
    }
