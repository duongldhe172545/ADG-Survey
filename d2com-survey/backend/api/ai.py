"""
D2Com Survey System — AI Analysis API
Endpoints for AI-powered survey analysis using Gemini.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.database import get_db
from backend.db.models import (
    Survey, SurveyStatus, SurveyForm, Question, Response,
    Customer, User, AnalysisResult
)
from backend.middleware.auth_guard import get_current_user
from backend.services.ai_service import analyze_survey, analyze_form

router = APIRouter(prefix="/ai", tags=["ai"])


def _format_analysis(a: AnalysisResult) -> dict:
    """Format AnalysisResult model to API response dict."""
    return {
        "id": a.id,
        "survey_id": a.survey_id,
        "pain_cluster": a.pain_cluster,
        "priority": a.priority,
        "priority_score": a.priority_score,
        "top_pains": a.top_pains or [],
        "retention_score": a.retention_score,
        "pilot_readiness": a.pilot_readiness,
        "root_cause_map": a.root_cause_map,
        "recommendation": a.recommendation,
        "summary": a.summary,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


@router.post("/analyze-survey/{survey_id}")
async def run_analysis(
    survey_id: int,
    force: bool = Query(False, description="Force re-analyze even if cached"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Analyze a completed survey using Gemini AI.
    Returns cached result if available (use force=true to re-analyze).
    """
    # 1. Validate survey exists and is complete
    survey = (await db.execute(
        select(Survey).where(Survey.id == survey_id)
    )).scalar_one_or_none()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey không tồn tại")

    if survey.status not in (SurveyStatus.complete, SurveyStatus.synced):
        raise HTTPException(
            status_code=400,
            detail="Chỉ phân tích được survey đã hoàn thành (status: complete/synced)"
        )

    # 2. Check for cached result
    if not force:
        existing = (await db.execute(
            select(AnalysisResult)
            .where(AnalysisResult.survey_id == survey_id)
            .order_by(AnalysisResult.created_at.desc())
        )).scalar_one_or_none()
        if existing:
            return _format_analysis(existing)

    # 3. Get form type
    form = (await db.execute(
        select(SurveyForm).where(SurveyForm.id == survey.form_id)
    )).scalar_one_or_none()
    if not form:
        raise HTTPException(status_code=404, detail="Không tìm thấy form")

    # 4. Get all questions + responses
    questions = (await db.execute(
        select(Question)
        .where(Question.form_id == survey.form_id)
        .order_by(Question.display_order)
    )).scalars().all()

    responses = {
        r.question_id: r.answer
        for r in (await db.execute(
            select(Response).where(Response.survey_id == survey_id)
        )).scalars().all()
    }

    # Build Q&A pairs
    qa_pairs = [
        {
            "q_id": q.q_id,
            "question_text": q.question_text,
            "answer": responses.get(q.id, ""),
        }
        for q in questions
    ]

    # 5. Call Gemini AI
    try:
        result = await analyze_survey(
            form_type=form.type.value,
            qa_pairs=qa_pairs,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    # 6. Save to DB
    analysis = AnalysisResult(
        survey_id=survey_id,
        pain_cluster=result.get("pain_cluster"),
        priority=result.get("priority"),
        priority_score=result.get("priority_score"),
        top_pains=result.get("top_pains"),
        retention_score=result.get("retention_score"),
        pilot_readiness=result.get("pilot_readiness"),
        root_cause_map=result.get("root_cause_map"),
        recommendation=result.get("recommendation"),
        summary=result.get("summary"),
        raw_response=result,
        created_by=current_user.id,
    )
    db.add(analysis)
    await db.flush()

    return _format_analysis(analysis)


@router.get("/analysis/{survey_id}")
async def get_analysis(
    survey_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get cached analysis result for a survey (if exists)."""
    analysis = (await db.execute(
        select(AnalysisResult)
        .where(AnalysisResult.survey_id == survey_id)
        .order_by(AnalysisResult.created_at.desc())
    )).scalar_one_or_none()

    if not analysis:
        return None

    return _format_analysis(analysis)


@router.post("/analyze-form/{form_id}")
async def run_form_analysis(
    form_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """
    Analyze aggregated results for a form using Gemini AI.
    Collects all completed survey responses and sends distribution data.
    """
    from sqlalchemy import func

    # 1. Get form
    form = (await db.execute(
        select(SurveyForm).where(SurveyForm.id == form_id)
    )).scalar_one_or_none()
    if not form:
        raise HTTPException(status_code=404, detail="Form không tồn tại")

    # 2. Count completed surveys
    completed_statuses = [SurveyStatus.complete, SurveyStatus.synced]
    total_surveys = (await db.execute(
        select(func.count()).select_from(Survey)
        .where(Survey.form_id == form_id, Survey.status.in_(completed_statuses))
    )).scalar() or 0

    if total_surveys == 0:
        raise HTTPException(
            status_code=400,
            detail="Chưa có khảo sát hoàn thành nào cho form này"
        )

    # 3. Get survey IDs
    survey_ids = [
        r[0] for r in (await db.execute(
            select(Survey.id)
            .where(Survey.form_id == form_id, Survey.status.in_(completed_statuses))
        )).all()
    ]

    # 4. Get questions
    questions = (await db.execute(
        select(Question)
        .where(Question.form_id == form_id)
        .order_by(Question.display_order)
    )).scalars().all()

    # 5. Build aggregate data per question
    questions_data = []
    for q in questions:
        q_data = {
            "q_id": q.q_id,
            "question_text": q.question_text,
            "question_type": q.question_type.value,
            "response_count": 0,
            "distribution": {},
            "answers": [],
        }

        raw_answers = [
            r[0] for r in (await db.execute(
                select(Response.answer).where(
                    Response.question_id == q.id,
                    Response.survey_id.in_(survey_ids),
                    Response.answer.isnot(None),
                    Response.answer != "",
                )
            )).all()
        ]
        q_data["response_count"] = len(raw_answers)

        if q.question_type.value in ("multiple_choice", "linear_scale"):
            dist: dict[str, int] = {}
            for ans in raw_answers:
                dist[ans] = dist.get(ans, 0) + 1
            q_data["distribution"] = dist
        elif q.question_type.value == "checkboxes":
            dist = {}
            for ans in raw_answers:
                for item in ans.split(","):
                    item = item.strip()
                    if item:
                        dist[item] = dist.get(item, 0) + 1
            q_data["distribution"] = dist
        else:
            q_data["answers"] = raw_answers

        questions_data.append(q_data)

    # 6. Call Gemini AI
    try:
        result = await analyze_form(
            form_type=form.type.value,
            total_surveys=total_surveys,
            questions_data=questions_data,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "form_id": form.id,
        "form_name": form.name,
        "form_type": form.type.value,
        "total_surveys": total_surveys,
        **result,
    }

