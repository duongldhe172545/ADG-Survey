"""
D2Com Survey System — Dashboard API
Aggregated statistics for the dashboard view.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.database import get_db
from backend.db.models import Survey, SurveyStatus, Customer, FormType
from backend.schemas import DashboardStats
from backend.middleware.auth_guard import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    """Dashboard stats: survey counts by status/type, pain cluster distribution."""
    # By status
    by_status = {}
    for s in SurveyStatus:
        count = (await db.execute(
            select(func.count()).select_from(Survey).where(Survey.status == s)
        )).scalar() or 0
        by_status[s.value] = count

    # By customer type
    by_type = {}
    for t in FormType:
        count = (await db.execute(
            select(func.count()).select_from(Survey).join(Customer).where(Customer.type == t)
        )).scalar() or 0
        by_type[t.value] = count

    # Pain cluster distribution
    pain_rows = (await db.execute(
        select(Survey.pain_cluster, func.count())
        .where(Survey.pain_cluster.isnot(None))
        .group_by(Survey.pain_cluster)
    )).all()
    pain_dist = {row[0]: row[1] for row in pain_rows}

    # Total customers
    total_cust = (await db.execute(select(func.count()).select_from(Customer))).scalar() or 0

    return DashboardStats(
        total_surveys=sum(by_status.values()),
        by_status=by_status,
        by_type=by_type,
        total_customers=total_cust,
        pain_distribution=pain_dist,
    )
