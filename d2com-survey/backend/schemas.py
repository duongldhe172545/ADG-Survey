"""
D2Com Survey System — Pydantic Schemas
Centralized request/response models for all API endpoints.
"""
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ── Auth ──

class GoogleLoginRequest(BaseModel):
    token: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


# ── Users ──

class UserOut(BaseModel):
    id: int
    email: str
    name: str
    role: str
    is_active: bool = True

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    email: EmailStr
    name: str
    role: str = "surveyor"


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


# ── Forms & Questions ──

class QuestionOut(BaseModel):
    id: int
    q_id: str
    section: Optional[str] = None
    question_text: str
    question_type: str
    options: Optional[list] = None
    display_order: int
    is_required: bool

    class Config:
        from_attributes = True


class FormOut(BaseModel):
    id: int
    name: str
    type: str
    version: str
    is_active: bool
    question_count: int = 0

    class Config:
        from_attributes = True


class QuestionEdit(BaseModel):
    """Schema for creating/editing a question in a new form version."""
    q_id: str
    section: Optional[str] = None
    question_text: str
    question_type: str = "short_answer"
    options: Optional[list] = None
    display_order: int = 0
    is_required: bool = False


class NewVersionRequest(BaseModel):
    """Request body for creating a new form version with edited questions."""
    questions: List[QuestionEdit]


# ── Customers ──

class CustomerOut(BaseModel):
    id: int
    resp_id: str
    type: str
    name: Optional[str]
    created_at: str
    survey_count: int = 0

    class Config:
        from_attributes = True


# ── Surveys ──

class SurveyCreate(BaseModel):
    customer_type: str  # "dealer" or "craft"
    customer_name: Optional[str] = None
    form_id: Optional[int] = None


class SurveyOut(BaseModel):
    id: int
    customer_id: int
    customer_resp_id: str
    customer_name: Optional[str]
    customer_type: str
    form_name: str
    form_version: str
    status: str
    pain_cluster: Optional[str]
    answered_count: int
    total_questions: int
    created_at: str
    updated_at: str


class SubmitRequest(BaseModel):
    pain_cluster: Optional[str] = None


# ── Responses ──

class ResponseSave(BaseModel):
    question_id: int
    answer: str


class ResponsesBatch(BaseModel):
    responses: List[ResponseSave]


class ResponseOut(BaseModel):
    id: int
    question_id: int
    q_id: str
    section: Optional[str] = None
    question_text: str
    question_type: str
    options: Optional[list] = None
    answer: Optional[str] = None
    is_required: bool


# ── Dashboard ──

class DashboardStats(BaseModel):
    total_surveys: int
    by_status: dict
    by_type: dict
    total_customers: int
    pain_distribution: dict


# ── AI Analysis ──

class PainItem(BaseModel):
    pain: str
    severity: str
    evidence: str


class AnalysisOut(BaseModel):
    id: int
    survey_id: int
    pain_cluster: Optional[str] = None
    priority: Optional[str] = None
    priority_score: Optional[int] = None
    top_pains: List[PainItem] = []
    retention_score: Optional[int] = None
    pilot_readiness: Optional[int] = None
    root_cause_map: Optional[str] = None
    recommendation: Optional[str] = None
    summary: Optional[str] = None
    created_at: Optional[str] = None

