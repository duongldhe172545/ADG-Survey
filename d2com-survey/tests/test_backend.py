"""
D2Com Survey System — Backend Verification Script
Tests: imports, model integrity, schema validation, seed data, API routes.
Does NOT require a database connection — tests code structure only.
"""
import sys
import traceback

tests_passed = 0
tests_failed = 0


def test(name, fn):
    global tests_passed, tests_failed
    try:
        fn()
        print(f"  ✅ {name}")
        tests_passed += 1
    except Exception as e:
        print(f"  ❌ {name}: {e}")
        traceback.print_exc()
        tests_failed += 1


# ── 1. Import Tests ──
print("\n🔍 1. Testing imports...")


def test_config_import():
    from backend.config import Settings
    s = Settings(DATABASE_URL="postgresql+asyncpg://test:test@localhost/test")
    assert s.APP_NAME == "D2Com Survey"
    assert s.JWT_EXPIRE_MINUTES == 1440


def test_models_import():
    from backend.db.models import (
        User, SurveyForm, Question, Customer, Survey, Response, BrandKit,
        UserRole, FormType, QuestionType, SurveyStatus, BrandKitStatus
    )
    assert UserRole.admin.value == "admin"
    assert UserRole.surveyor.value == "surveyor"
    assert FormType.dealer.value == "dealer"
    assert FormType.craft.value == "craft"
    assert QuestionType.short_answer.value == "short_answer"
    assert QuestionType.multiple_choice.value == "multiple_choice"
    assert QuestionType.checkboxes.value == "checkboxes"
    assert QuestionType.linear_scale.value == "linear_scale"
    assert SurveyStatus.draft.value == "draft"
    assert SurveyStatus.partial.value == "partial"
    assert SurveyStatus.complete.value == "complete"
    assert SurveyStatus.synced.value == "synced"
    assert BrandKitStatus.pending.value == "pending"


def test_schemas_import():
    from backend.schemas import (
        GoogleLoginRequest, TokenResponse, UserOut, UserCreate, UserUpdate,
        FormOut, QuestionOut, SurveyCreate, SurveyOut, SubmitRequest,
        ResponseSave, ResponsesBatch, ResponseOut, DashboardStats,
        CustomerOut
    )
    # Test schema construction
    user = UserOut(id=1, email="test@test.com", name="Test", role="admin")
    assert user.id == 1

    form = FormOut(id=1, name="Test", type="dealer", version="v1", is_active=True, question_count=5)
    assert form.question_count == 5

    survey = SurveyCreate(customer_type="dealer")
    assert survey.customer_type == "dealer"
    assert survey.form_id is None

    batch = ResponsesBatch(responses=[
        ResponseSave(question_id=1, answer="test"),
        ResponseSave(question_id=2, answer="value"),
    ])
    assert len(batch.responses) == 2

    stats = DashboardStats(
        total_surveys=10, by_status={"draft": 5}, by_type={"dealer": 7},
        total_customers=3, pain_distribution={"pain1": 2}
    )
    assert stats.total_surveys == 10


def test_database_import():
    from backend.db.database import Base
    assert Base is not None


def test_auth_service_import():
    from backend.services.auth_service import (
        verify_google_token, authenticate_user, create_jwt_token, decode_jwt_token
    )


def test_survey_service_import():
    from backend.services.survey_service import (
        generate_resp_id, build_survey_out,
        update_customer_name_from_responses,
        get_missing_required_questions
    )


def test_auth_guard_import():
    from backend.middleware.auth_guard import get_current_user, require_admin, security
    assert security is not None


test("config import & defaults", test_config_import)
test("models import & enums", test_models_import)
test("schemas import & construction", test_schemas_import)
test("database import", test_database_import)
test("auth_service import", test_auth_service_import)
test("survey_service import", test_survey_service_import)
test("auth_guard import", test_auth_guard_import)


# ── 2. Model Integrity ──
print("\n🔍 2. Testing model integrity...")


def test_model_tables():
    from backend.db.database import Base
    tables = list(Base.metadata.tables.keys())
    expected = ["users", "survey_forms", "questions", "customers", "surveys", "responses", "brand_kits"]
    for t in expected:
        assert t in tables, f"Missing table: {t}"
    assert len(tables) == 7, f"Expected 7 tables, got {len(tables)}: {tables}"


def test_model_relationships():
    from backend.db.models import User, SurveyForm, Question, Customer, Survey, Response, BrandKit
    # Check foreign keys exist
    assert any(c.name == "form_id" for c in Question.__table__.columns)
    assert any(c.name == "customer_id" for c in Survey.__table__.columns)
    assert any(c.name == "form_id" for c in Survey.__table__.columns)
    assert any(c.name == "surveyed_by" for c in Survey.__table__.columns)
    assert any(c.name == "survey_id" for c in Response.__table__.columns)
    assert any(c.name == "question_id" for c in Response.__table__.columns)
    assert any(c.name == "survey_id" for c in BrandKit.__table__.columns)


def test_unique_constraints():
    from backend.db.models import Response
    constraints = [c.name for c in Response.__table__.constraints if hasattr(c, 'name') and c.name]
    assert "uq_survey_question" in constraints, f"Missing unique constraint, found: {constraints}"


def test_user_columns():
    from backend.db.models import User
    cols = [c.name for c in User.__table__.columns]
    assert "email" in cols
    assert "name" in cols
    assert "role" in cols
    assert "is_active" in cols
    assert "created_at" in cols


def test_customer_columns():
    from backend.db.models import Customer
    cols = [c.name for c in Customer.__table__.columns]
    assert "resp_id" in cols
    assert "type" in cols
    assert "name" in cols
    # Should NOT have: form_id, status, pain_cluster (those moved to surveys)
    assert "form_id" not in cols, "customers should not have form_id — it belongs to surveys"
    assert "status" not in cols, "customers should not have status — it belongs to surveys"


def test_survey_columns():
    from backend.db.models import Survey
    cols = [c.name for c in Survey.__table__.columns]
    assert "customer_id" in cols
    assert "form_id" in cols
    assert "status" in cols
    assert "pain_cluster" in cols
    assert "drive_folder_id" in cols
    assert "surveyed_by" in cols


test("7 tables exist", test_model_tables)
test("foreign keys present", test_model_relationships)
test("unique constraint on responses", test_unique_constraints)
test("user columns correct", test_user_columns)
test("customer columns clean (no form/status)", test_customer_columns)
test("survey columns correct", test_survey_columns)


# ── 3. Seed Data Validation ──
print("\n🔍 3. Testing seed data...")


def test_seed_data_dealer():
    from backend.db.seed import DEALER_QUESTIONS, SEED_FORMS
    assert len(DEALER_QUESTIONS) == 20, f"Expected 20 dealer questions, got {len(DEALER_QUESTIONS)}"
    # Check D01-D20 sequence
    q_ids = [q["q_id"] for q in DEALER_QUESTIONS]
    for i in range(1, 21):
        assert f"D{i:02d}" in q_ids, f"Missing D{i:02d}"


def test_seed_data_craft():
    from backend.db.seed import CRAFT_QUESTIONS
    assert len(CRAFT_QUESTIONS) == 18, f"Expected 18 craft questions, got {len(CRAFT_QUESTIONS)}"
    q_ids = [q["q_id"] for q in CRAFT_QUESTIONS]
    for i in range(1, 19):
        assert f"C{i:02d}" in q_ids, f"Missing C{i:02d}"


def test_seed_required_fields():
    from backend.db.seed import DEALER_QUESTIONS, CRAFT_QUESTIONS
    # D01 (name) must be required
    d01 = next(q for q in DEALER_QUESTIONS if q["q_id"] == "D01")
    assert d01["required"] == True, "D01 must be required"
    c01 = next(q for q in CRAFT_QUESTIONS if q["q_id"] == "C01")
    assert c01["required"] == True, "C01 must be required"


def test_seed_question_types():
    from backend.db.seed import DEALER_QUESTIONS
    from backend.db.models import QuestionType
    valid_types = {t.value for t in QuestionType}
    for q in DEALER_QUESTIONS:
        assert q["type"].value in valid_types, f"Invalid type for {q['q_id']}: {q['type']}"


def test_seed_dropdown_has_options():
    from backend.db.seed import DEALER_QUESTIONS, CRAFT_QUESTIONS
    for q in DEALER_QUESTIONS + CRAFT_QUESTIONS:
        if q["type"].value == "multiple_choice" or q["type"].value == "checkboxes":
            assert q.get("options"), f"{q['q_id']} is {q['type'].value} but has no options"
            assert len(q["options"]) >= 2, f"{q['q_id']} needs >= 2 options"


def test_seed_forms():
    from backend.db.seed import SEED_FORMS
    assert len(SEED_FORMS) == 2
    types = [f["type"].value for f in SEED_FORMS]
    assert "dealer" in types
    assert "craft" in types


test("20 dealer questions (D01-D20)", test_seed_data_dealer)
test("18 craft questions (C01-C18)", test_seed_data_craft)
test("D01/C01 required", test_seed_required_fields)
test("question types valid", test_seed_question_types)
test("dropdown questions have options", test_seed_dropdown_has_options)
test("2 seed forms (dealer/craft)", test_seed_forms)


# ── 4. API Router Tests ──
print("\n🔍 4. Testing API routes...")


def test_api_router():
    from backend.api.router import api_router
    routes = [r.path for r in api_router.routes]
    # Check key routes exist
    expected_paths = [
        "/api/v1/auth/login/google",
        "/api/v1/auth/me",
        "/api/v1/users/",
        "/api/v1/forms/",
        "/api/v1/surveys/",
        "/api/v1/dashboard/stats",
    ]
    for path in expected_paths:
        assert path in routes, f"Missing route: {path}. Available: {routes}"


def test_fastapi_app():
    from backend.main import app
    assert app.title == "D2Com Survey"
    routes = [r.path for r in app.routes]
    assert "/health" in routes


def test_health_endpoint():
    """Test health endpoint directly."""
    from fastapi.testclient import TestClient
    from backend.main import app
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["app"] == "D2Com Survey"


test("API routes registered", test_api_router)
test("FastAPI app configured", test_fastapi_app)
test("health endpoint works", test_health_endpoint)


# ── 5. JWT Tests ──
print("\n🔍 5. Testing JWT...")


def test_jwt_roundtrip():
    from types import SimpleNamespace
    from backend.db.models import UserRole
    from backend.services.auth_service import create_jwt_token, decode_jwt_token
    # Mock user (SimpleNamespace avoids SQLAlchemy instrumented attributes)
    user = SimpleNamespace(
        id=42, email="test@adg.com", name="Test User", role=UserRole.admin
    )
    
    token = create_jwt_token(user)
    assert isinstance(token, str)
    assert len(token) > 20
    
    payload = decode_jwt_token(token)
    assert payload is not None
    assert payload["sub"] == "42"
    assert payload["email"] == "test@adg.com"
    assert payload["role"] == "admin"


def test_jwt_invalid():
    from backend.services.auth_service import decode_jwt_token
    result = decode_jwt_token("invalid.token.here")
    assert result is None


test("JWT create → decode roundtrip", test_jwt_roundtrip)
test("JWT invalid token returns None", test_jwt_invalid)


# ── Summary ──
print(f"\n{'='*50}")
print(f"  ✅ Passed: {tests_passed}")
print(f"  ❌ Failed: {tests_failed}")
print(f"  Total: {tests_passed + tests_failed}")
print(f"{'='*50}")

sys.exit(0 if tests_failed == 0 else 1)
