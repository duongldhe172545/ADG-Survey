"""
D2Com Survey System — SQLAlchemy Models (7 tables)
"""
import enum
from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, Enum as SAEnum,
    ForeignKey, JSON, UniqueConstraint, func
)
from sqlalchemy.orm import relationship

from backend.db.database import Base


# ── Enums ──

class UserRole(str, enum.Enum):
    admin = "admin"
    surveyor = "surveyor"


class FormType(str, enum.Enum):
    dealer = "dealer"
    craft = "craft"


class QuestionType(str, enum.Enum):
    short_answer = "short_answer"
    multiple_choice = "multiple_choice"
    checkboxes = "checkboxes"
    linear_scale = "linear_scale"


class SurveyStatus(str, enum.Enum):
    draft = "draft"
    partial = "partial"
    complete = "complete"
    synced = "synced"


class BrandKitStatus(str, enum.Enum):
    pending = "pending"
    generating = "generating"
    done = "done"
    failed = "failed"


# ── Models ──

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), nullable=False, default=UserRole.surveyor)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    surveys = relationship("Survey", back_populates="surveyor", foreign_keys="Survey.surveyed_by")


class SurveyForm(Base):
    __tablename__ = "survey_forms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    type = Column(String(50), nullable=False)
    version = Column(String(10), nullable=False, default="v1")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    questions = relationship("Question", back_populates="form", order_by="Question.display_order")
    surveys = relationship("Survey", back_populates="form")


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey("survey_forms.id"), nullable=False)
    section = Column(String(100), nullable=True)
    q_id = Column(String(10), nullable=False)
    question_text = Column(Text, nullable=False)
    question_type = Column(SAEnum(QuestionType), nullable=False, default=QuestionType.short_answer)
    options = Column(JSON, nullable=True)
    display_order = Column(Integer, nullable=False, default=0)
    is_required = Column(Boolean, default=False)

    # Relationships
    form = relationship("SurveyForm", back_populates="questions")
    responses = relationship("Response", back_populates="question")


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    resp_id = Column(String(20), unique=True, nullable=False, index=True)
    type = Column(String(50), nullable=False)
    name = Column(String(255), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    surveys = relationship("Survey", back_populates="customer", order_by="Survey.created_at.desc()")


class Survey(Base):
    __tablename__ = "surveys"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    form_id = Column(Integer, ForeignKey("survey_forms.id"), nullable=False)
    status = Column(SAEnum(SurveyStatus), nullable=False, default=SurveyStatus.draft)
    pain_cluster = Column(String(100), nullable=True)
    drive_folder_id = Column(String(255), nullable=True)
    surveyed_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    customer = relationship("Customer", back_populates="surveys")
    form = relationship("SurveyForm", back_populates="surveys")
    surveyor = relationship("User", back_populates="surveys", foreign_keys=[surveyed_by])
    responses = relationship("Response", back_populates="survey", cascade="all, delete-orphan")
    brand_kits = relationship("BrandKit", back_populates="survey")
    analysis_results = relationship("AnalysisResult", back_populates="survey")


class Response(Base):
    __tablename__ = "responses"
    __table_args__ = (
        UniqueConstraint("survey_id", "question_id", name="uq_survey_question"),
    )

    id = Column(Integer, primary_key=True, index=True)
    survey_id = Column(Integer, ForeignKey("surveys.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    answer = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    survey = relationship("Survey", back_populates="responses")
    question = relationship("Question", back_populates="responses")


class BrandKit(Base):
    __tablename__ = "brand_kits"

    id = Column(Integer, primary_key=True, index=True)
    survey_id = Column(Integer, ForeignKey("surveys.id"), nullable=False)
    status = Column(SAEnum(BrandKitStatus), nullable=False, default=BrandKitStatus.pending)
    drive_file_id = Column(String(255), nullable=True)
    generation_config = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    survey = relationship("Survey", back_populates="brand_kits")


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, index=True)
    survey_id = Column(Integer, ForeignKey("surveys.id"), nullable=False, index=True)
    pain_cluster = Column(String(255), nullable=True)
    priority = Column(String(10), nullable=True)          # P0, P1, P2, P3
    priority_score = Column(Integer, nullable=True)        # 0-100
    top_pains = Column(JSON, nullable=True)                # [{pain, severity, evidence}]
    retention_score = Column(Integer, nullable=True)       # 0-10
    pilot_readiness = Column(Integer, nullable=True)       # 0-10
    root_cause_map = Column(Text, nullable=True)
    recommendation = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    raw_response = Column(JSON, nullable=True)             # Full Gemini response
    created_at = Column(DateTime, server_default=func.now())
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    survey = relationship("Survey", back_populates="analysis_results")

