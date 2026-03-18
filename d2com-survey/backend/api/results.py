"""
D2Com Survey System — Form Results API
Aggregated response statistics per survey form (like Google Forms summary).
"""
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.database import get_db
from backend.db.models import (
    SurveyForm, Question, Response, Survey, SurveyStatus
)
from backend.middleware.auth_guard import get_current_user

router = APIRouter(prefix="/forms", tags=["forms"])


@router.get("/{form_id}/results")
async def get_form_results(
    form_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    """
    Aggregate all responses for a given form across all completed surveys.
    Returns per-question answer distribution.
    """
    # Get form info
    form = (await db.execute(
        select(SurveyForm).where(SurveyForm.id == form_id)
    )).scalar_one_or_none()
    if not form:
        return {"error": "Form not found"}

    # Count completed/synced surveys for this form
    completed_statuses = [SurveyStatus.complete, SurveyStatus.synced]
    total_surveys = (await db.execute(
        select(func.count()).select_from(Survey)
        .where(Survey.form_id == form_id, Survey.status.in_(completed_statuses))
    )).scalar() or 0

    # Get all questions for this form
    questions = (await db.execute(
        select(Question)
        .where(Question.form_id == form_id)
        .order_by(Question.display_order)
    )).scalars().all()

    # Get survey IDs that are completed/synced
    survey_ids_result = await db.execute(
        select(Survey.id)
        .where(Survey.form_id == form_id, Survey.status.in_(completed_statuses))
    )
    survey_ids = [r[0] for r in survey_ids_result.all()]

    # Build per-question stats
    results = []
    for q in questions:
        q_data = {
            "q_id": q.q_id,
            "question_text": q.question_text,
            "question_type": q.question_type.value,
            "section": q.section,
            "options": q.options,
            "answers": [],
            "distribution": {},
            "response_count": 0,
        }

        if not survey_ids:
            results.append(q_data)
            continue

        # Get all answers for this question from completed surveys
        answers_result = await db.execute(
            select(Response.answer)
            .where(
                Response.question_id == q.id,
                Response.survey_id.in_(survey_ids),
                Response.answer.isnot(None),
                Response.answer != "",
            )
        )
        raw_answers = [r[0] for r in answers_result.all()]
        q_data["response_count"] = len(raw_answers)

        if q.question_type.value in ("multiple_choice", "linear_scale"):
            # Count occurrences of each answer
            dist: dict[str, int] = {}
            for ans in raw_answers:
                dist[ans] = dist.get(ans, 0) + 1
            q_data["distribution"] = dist

        elif q.question_type.value == "checkboxes":
            # Answers are comma-separated, split and count each
            dist = {}
            for ans in raw_answers:
                for item in ans.split(","):
                    item = item.strip()
                    if item:
                        dist[item] = dist.get(item, 0) + 1
            q_data["distribution"] = dist

        else:
            # short_answer — return all answers
            q_data["answers"] = raw_answers

        results.append(q_data)

    return {
        "form_id": form.id,
        "form_name": form.name,
        "form_type": form.type.value,
        "form_version": form.version,
        "total_surveys": total_surveys,
        "questions": results,
    }
