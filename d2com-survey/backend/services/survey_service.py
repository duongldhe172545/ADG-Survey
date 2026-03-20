"""
D2Com Survey System — Survey Business Logic Service
Handles: customer creation, survey creation, response saving, submission validation.
Separated from API routes for testability and reuse.
"""
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.models import (
    Survey, SurveyStatus, Customer,
    Response, Question, SurveyForm, User
)
from backend.schemas import SurveyOut


async def generate_resp_id(db: AsyncSession, customer_type: str) -> str:
    """Generate next resp_id: DL-001, DL-002... or TH-001, TH-002...
    Uses first 2 uppercase chars of type as prefix."""
    prefix = customer_type[:2].upper()
    # Get all existing resp_ids for this type
    result = await db.execute(
        select(Customer.resp_id).where(Customer.type == customer_type)
    )
    existing = [r[0] for r in result.all()]
    # Extract max number
    max_num = 0
    for rid in existing:
        try:
            num = int(rid.split("-")[1])
            if num > max_num:
                max_num = num
        except (IndexError, ValueError):
            pass
    return f"{prefix}-{max_num + 1:03d}"


async def build_survey_out(db: AsyncSession, survey: Survey) -> SurveyOut:
    """Build a SurveyOut response from a Survey model."""
    # Count answered
    ans_result = await db.execute(
        select(func.count()).select_from(Response).where(Response.survey_id == survey.id)
    )
    answered = ans_result.scalar() or 0

    # Count total questions in form
    q_result = await db.execute(
        select(func.count()).select_from(Question).where(Question.form_id == survey.form_id)
    )
    total = q_result.scalar() or 0

    # Load related
    cust = (await db.execute(select(Customer).where(Customer.id == survey.customer_id))).scalar_one()
    form = (await db.execute(select(SurveyForm).where(SurveyForm.id == survey.form_id))).scalar_one()

    return SurveyOut(
        id=survey.id,
        customer_id=cust.id,
        customer_resp_id=cust.resp_id,
        customer_name=cust.name,
        customer_type=cust.type,
        form_name=form.name,
        form_version=form.version,
        status=survey.status.value,
        pain_cluster=survey.pain_cluster,
        answered_count=answered,
        total_questions=total,
        created_at=survey.created_at.isoformat() if survey.created_at else "",
        updated_at=survey.updated_at.isoformat() if survey.updated_at else "",
    )


async def update_customer_name_from_responses(
    db: AsyncSession,
    survey: Survey,
    question_id: int,
    answer: str,
):
    """Auto-update customer.name when D01/C01 is answered."""
    q = (await db.execute(select(Question).where(Question.id == question_id))).scalar_one_or_none()
    if q and q.q_id in ("D01", "C01") and answer:
        customer = (await db.execute(select(Customer).where(Customer.id == survey.customer_id))).scalar_one()
        customer.name = answer


async def get_missing_required_questions(
    db: AsyncSession, survey: Survey
) -> list[str]:
    """Return list of q_ids for unanswered required questions."""
    # Get required question IDs
    req_result = await db.execute(
        select(Question).where(
            Question.form_id == survey.form_id,
            Question.is_required == True,
        )
    )
    required = req_result.scalars().all()

    # Get answered question IDs
    resp_result = await db.execute(
        select(Response.question_id).where(Response.survey_id == survey.id)
    )
    answered_ids = {r[0] for r in resp_result.all()}

    return [q.q_id for q in required if q.id not in answered_ids]
