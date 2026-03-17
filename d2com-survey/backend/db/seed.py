"""
D2Com Survey System — Idempotent Seed Script
Seeds: admin user, survey forms, and real questions from ADG_D2Com_Survey_v8_3_Production.
Questions match actual production survey: Section, Q_ID, Type, Options, Required.

Usage: python -m backend.db.seed
"""
import asyncio
from sqlalchemy import select
from backend.db.database import engine, async_session, Base
from backend.db.models import (
    User, UserRole, SurveyForm, FormType, Question, QuestionType
)

# ── Shorthand ──
SA = QuestionType.short_answer
MC = QuestionType.multiple_choice
CB = QuestionType.checkboxes
LS = QuestionType.linear_scale

# ── Seed Data ──

SEED_USERS = [
    {"email": "ledinhduongltn@gmail.com", "name": "Lê Đình Dương", "role": UserRole.admin},
]

SEED_FORMS = [
    {"name": "Dealer_Form", "type": FormType.dealer, "version": "v1"},
    {"name": "Craft_Form", "type": FormType.craft, "version": "v1"},
]

# ═══════════════════════════════════════════════════════
# ██  DEALER FORM: D01–D20 (bỏ D00 consent gate)     ██
# ═══════════════════════════════════════════════════════

DEALER_QUESTIONS = [
    # ── A. Hồ sơ nhanh ──
    {"section": "A. Hồ sơ nhanh", "q_id": "D01", "text": "Tên đại lý/showroom", "type": SA, "required": True},
    {"section": "A. Hồ sơ nhanh", "q_id": "D02", "text": "Loại hình", "type": MC, "required": True,
     "options": ["Đại lý VLXD", "Showroom gạch/TBVS", "Cửa/Nhôm kính", "Bếp/Nội thất", "Khác"]},
    {"section": "A. Hồ sơ nhanh", "q_id": "D03", "text": "Số năm làm nghề", "type": MC, "required": True,
     "options": ["<3 năm", "3-5 năm", "5-10 năm", "10-20 năm", ">20 năm", "Khác"]},
    {"section": "A. Hồ sơ nhanh", "q_id": "D04", "text": "Số công trình/đơn hàng mỗi năm khoảng bao nhiêu?", "type": MC, "required": True,
     "options": ["<50", "50-100", "100-300", "300-500", ">500", "Khác"]},
    {"section": "A. Hồ sơ nhanh", "q_id": "D05", "text": "Số khách hàng/công trình cũ hiện còn lưu được thông tin", "type": MC, "required": True,
     "options": ["<100", "100-300", "300-1,000", ">1,000", "Khác"]},

    # ── B. Pain 4 biến ──
    {"section": "B. Pain 4 biến", "q_id": "D06", "text": "Trong 4 vấn đề này, cái nào đang đau nhất?", "type": CB, "required": True,
     "options": ["Doanh thu không đều", "Lợi nhuận thấp/dễ bị bào mòn", "Tồn kho cao/chậm quay vòng", "Công nợ", "Khác"]},
    {"section": "B. Pain 4 biến", "q_id": "D07", "text": "Doanh thu hiện tại phụ thuộc nhiều nhất vào đâu?", "type": MC, "required": True,
     "options": ["Khách mới", "Khách cũ quay lại", "Quan hệ giới thiệu", "Giá khuyến mãi", "Đội thợ kéo việc về", "Khác"]},
    {"section": "B. Pain 4 biến", "q_id": "D08", "text": "Lợi nhuận bị mất nhiều nhất vì đâu?", "type": MC, "required": True,
     "options": ["Phải giảm giá để chốt đơn", "Làm lại/bảo hành", "Chi phí đội thợ/QC", "Tồn kho", "Công nợ chậm kéo dòng tiền", "Khác"]},
    {"section": "B. Pain 4 biến", "q_id": "D09", "text": "Tồn kho hiện tại ở mức nào?", "type": MC, "required": True,
     "options": ["Không đáng kể", "Có áp lực nhưng kiểm soát được", "Cao và ảnh hưởng dòng tiền", "Rất cao, thành gánh", "Khác"]},
    {"section": "B. Pain 4 biến", "q_id": "D10", "text": "Công nợ trung bình hiện tại khoảng bao lâu?", "type": MC, "required": True,
     "options": ["Thu ngay / rất ngắn", "15-30 ngày", "30-60 ngày", "60-90 ngày", ">90 ngày", "Khác"]},

    # ── C. Khách cũ & tài sản cũ ──
    {"section": "C. Khách cũ & tài sản cũ", "q_id": "D11", "text": "Đại lý hiện quản trị khách cũ bằng cách nào?", "type": CB, "required": True,
     "options": ["Không có hệ thống, nhờ bằng người", "Sổ tay/Excel", "Zalo cá nhân/Zalo OA", "Facebook/Messenger", "Phần mềm/CRM", "Khác"]},
    {"section": "C. Khách cũ & tài sản cũ", "q_id": "D12", "text": "Hiện đang khai thác lại khách cũ chủ yếu theo cách nào?", "type": CB, "required": True,
     "options": ["Gọi lại khi nhớ ra", "Chờ khách tự quay lại", "Có danh sách nhắc định kỳ", "Gửi tin nhắn/chăm sóc qua Zalo", "Có chương trình bảo hành/bảo trì/nâng cấp", "Hầu như chưa làm gì", "Khác"]},
    {"section": "C. Khách cũ & tài sản cũ", "q_id": "D13", "text": "Với công trình/tài sản cũ đã thi công, hiện đại lý theo dõi được những thông tin nào?", "type": CB, "required": True,
     "options": ["Năm làm công trình", "Địa chỉ công trình", "Hình ảnh hiện trạng", "Loại sản phẩm đã lắp", "Thể loại/đời đã thi công", "Lịch sử bảo hành/bảo trì", "Hầu như không", "Khác"]},
    {"section": "C. Khách cũ & tài sản cũ", "q_id": "D14", "text": "Hiện đại lý có dịch vụ nào sau đây cho khách cũ?", "type": CB, "required": True,
     "options": ["Bảo hành", "Bảo trì định kỳ", "Sửa chữa", "Nâng cấp/thay mới", "Bán chéo sản phẩm khác", "Chưa có", "Khác"]},
    {"section": "C. Khách cũ & tài sản cũ", "q_id": "D15", "text": "Việc từ khách cũ/tài sản cũ hiện chiếm khoảng bao nhiêu % tổng doanh thu?", "type": MC, "required": True,
     "options": ["0-10%", "10-30%", "30-50%", ">50%", "Khác"]},
    {"section": "C. Khách cũ & tài sản cũ", "q_id": "D16", "text": "Nếu có template cộng đồng cho mỗi đại lý để quản trị khách cũ + công trình cũ + bảo hành/bảo trì/nâng cấp sản khách mới trên Zalo, giá trị lớn nhất là gì?", "type": MC, "required": True,
     "options": ["Giữ khách cũ quay lại", "Tăng doanh thu không phải săn khách mới", "Tăng lợi nhuận do bán thêm theo vòng đời", "Giảm công nợ/tranh chấp", "Giảm lệ thuộc", "Khác"]},

    # ── D. Trust-Job-Cash với thợ ──
    {"section": "D. Trust-Job-Cash với thợ", "q_id": "D17", "text": "Cái làm đại lý đau nhất khi quản lý thợ là gì?", "type": CB, "required": True,
     "options": ["Không kiểm soát được chất lượng", "Không có bằng chứng hiện trường", "Tranh chấp khó xử", "Payout khó bạch", "Thợ chỉ chạy theo giá", "Khác"]},
    {"section": "D. Trust-Job-Cash với thợ", "q_id": "D18", "text": "Nếu yêu cầu thợ nộp ảnh/video hiện trường trong 24h và chỉ QC-pass mới được tính/chi trả, anh/chị thấy mức khả thi thế nào?", "type": LS, "required": True,
     "options": ["1", "2", "3", "4", "5"]},
    {"section": "D. Trust-Job-Cash với thợ", "q_id": "D19", "text": "Nếu có hệ zalo + evidence + QC + payout ledger + dispute SOP, mức sẵn sàng thử trong 30 ngày là bao nhiêu?", "type": LS, "required": True,
     "options": ["0", "1", "2", "3", "4", "5"]},
    {"section": "D. Trust-Job-Cash với thợ", "q_id": "D20", "text": "Nếu chỉ chọn 1 giá trị lớn nhất hệ này phải tạo ra trong 90 ngày, anh/chị chọn gì?", "type": MC, "required": True,
     "options": ["Tăng doanh thu", "Tăng lợi nhuận", "Giảm tồn kho", "Giảm công nợ", "Giữ khách cũ quay lại", "Kiểm soát thợ tốt hơn", "Khác"]},
]

# ═══════════════════════════════════════════════════════
# ██  CRAFT FORM: C01–C18 (bỏ C00 consent gate)      ██
# ═══════════════════════════════════════════════════════

CRAFT_QUESTIONS = [
    # ── A. Hồ sơ nhanh ──
    {"section": "A. Hồ sơ nhanh", "q_id": "C01", "text": "Tên thợ/đội thợ", "type": SA, "required": True},
    {"section": "A. Hồ sơ nhanh", "q_id": "C02", "text": "Nghề chính", "type": MC, "required": True,
     "options": ["Cửa", "Nhôm kính", "Gạch/TBVS", "Bếp/Nội thất", "Điện nước", "Khác"]},
    {"section": "A. Hồ sơ nhanh", "q_id": "C03", "text": "Số năm làm nghề", "type": MC, "required": True,
     "options": ["<3 năm", "3-5 năm", "5-10 năm", "10-20 năm", ">20 năm", "Khác"]},
    {"section": "A. Hồ sơ nhanh", "q_id": "C04", "text": "Mỗi năm làm khoảng bao nhiêu công trình?", "type": MC, "required": True,
     "options": ["<50", "50-100", "100-300", "300-500", ">500", "Khác"]},
    {"section": "A. Hồ sơ nhanh", "q_id": "C05", "text": "Hiện còn giữ được khoảng bao nhiều khách hàng/công trình cũ?", "type": MC, "required": True,
     "options": ["<50", "50-100", "100-300", ">300", "Khác"]},

    # ── B. Pain thật ──
    {"section": "B. Pain thật", "q_id": "C06", "text": "Cái đau nhất hiện nay là gì?", "type": CB, "required": True,
     "options": ["Không có việc đều", "Bị ép giá", "Khách không tin ngay từ đầu", "Làm xong bị chậm/khất tiền", "Bị cãi vì không chứng cớ", "Bảo hành/bảo trì rất mất", "Khác"]},
    {"section": "B. Pain thật", "q_id": "C07", "text": "Khi đi chốt việc, cái làm anh/em khó lấy niềm tin nhất là gì?", "type": MC, "required": True,
     "options": ["Không có hồ sơ năng lực", "Không có ảnh/video công trình cũ", "Không có bảo chứng/bảo hành rõ", "Khác"]},
    {"section": "B. Pain thật", "q_id": "C08", "text": "Việc hiện tại đến từ đâu là chủ yếu?", "type": MC, "required": True,
     "options": ["Người quen giới thiệu", "Đại lý/showroom", "Khách cũ quay lại", "Facebook/Zalo", "Tự đi tìm", "Khác"]},
    {"section": "B. Pain thật", "q_id": "C09", "text": "Tiền về hiện tại thường chậm bao lâu?", "type": MC, "required": True,
     "options": ["Không chậm", "1-3 ngày", "4-7 ngày", ">7 ngày", ">30 ngày", "Khác"]},

    # ── C. Khách cũ & tài sản cũ ──
    {"section": "C. Khách cũ & tài sản cũ", "q_id": "C10", "text": "Sau khi làm xong công trình, anh/em đang quản lý lại khách cũ theo cách nào?", "type": CB, "required": True,
     "options": ["Không quản lý", "Lưu số điện thoại", "Lưu Zalo", "Lưu ảnh công trình", "Có gọi lại/chăm lại", "Có nhận bảo hành", "Khác"]},
    {"section": "C. Khách cũ & tài sản cũ", "q_id": "C11", "text": "Việc từ khách cũ/tài sản cũ hiện chiếm khoảng bao nhiêu % tổng việc?", "type": MC, "required": True,
     "options": ["0-10%", "10-30%", "30-50%", ">50%", "Khác"]},
    {"section": "C. Khách cũ & tài sản cũ", "q_id": "C12", "text": "Với khách cũ, anh/em thường kiếm thêm việc từ đâu?", "type": CB, "required": True,
     "options": ["Bảo hành", "Bảo trì", "Sửa chữa", "Nâng cấp/thay mới", "Khách giới thiệu người khác", "Hầu như không khai thác lại được", "Khác"]},
    {"section": "C. Khách cũ & tài sản cũ", "q_id": "C13", "text": "Nếu có công cụ giúp lưu ảnh hiện trạng + lịch sử công trình + bảo hành/bảo trì trên Zalo, thứ giúp nhất là gì?", "type": MC, "required": True,
     "options": ["Dễ lấy lại việc khách cũ", "Dễ lấy niềm tin khách mới", "Ít cãi nhau hơn", "Được trả tiền nhanh hơn", "Khác"]},

    # ── D. Evidence discipline ──
    {"section": "D. Evidence discipline", "q_id": "C14", "text": "Anh/em có sẵn sàng nộp ảnh/video hiện trường trong 24h cho mỗi job không?", "type": MC, "required": True,
     "options": ["Có", "Có nếu thao tác rất đơn giản", "Có nếu gắn với trả tiền nhanh", "Không", "Khác"]},
    {"section": "D. Evidence discipline", "q_id": "C15", "text": "Cái khó nhất khi nộp evidence là gì?", "type": MC, "required": True,
     "options": ["Không quen chụp", "Mất thời gian", "Sóng/mạng yếu", "Không thấy lợi ích", "Sợ bị soi lỗi", "Khác"]},
    {"section": "D. Evidence discipline", "q_id": "C16", "text": "Nếu chỉ khi QC-pass mới được tính/chi trả, anh/em thấy thế nào?", "type": MC, "required": True,
     "options": ["Hợp lý", "Hợp lý nếu có hướng dẫn rõ", "Không hợp lý", "Phải xem thử mới biết", "Khác"]},

    # ── E. ADG Pro ──
    {"section": "E. ADG Pro", "q_id": "C17", "text": "Nếu có lộ trình lên ADG Pro, quyền lợi nào đáng giá nhất?", "type": CB, "required": True,
     "options": ["Được khách tin hơn", "Được ưu tiên việc", "Được trả nhanh hơn", "Ít tranh chấp hơn", "Giá/thu nhập tốt", "Khác"]},
    {"section": "E. ADG Pro", "q_id": "C18", "text": "Nếu hệ này chạy thử 30 ngày, anh/em sẵn sàng ở mức nào?", "type": LS, "required": True,
     "options": ["0", "1", "2", "3", "4", "5"]},
]


async def seed():
    """Idempotent seed: create if missing, skip if exists."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        # ── Seed Users ──
        for user_data in SEED_USERS:
            result = await session.execute(
                select(User).where(User.email == user_data["email"])
            )
            existing = result.scalar_one_or_none()
            if not existing:
                session.add(User(**user_data))
                print(f"  + Created user: {user_data['email']}")
            else:
                print(f"  = User exists: {user_data['email']}")

        # ── Seed Survey Forms ──
        form_map = {}
        for form_data in SEED_FORMS:
            result = await session.execute(
                select(SurveyForm).where(
                    SurveyForm.name == form_data["name"],
                    SurveyForm.version == form_data["version"],
                )
            )
            existing = result.scalar_one_or_none()
            if not existing:
                form = SurveyForm(**form_data)
                session.add(form)
                await session.flush()
                form_map[form_data["name"]] = form.id
                print(f"  + Created form: {form_data['name']} {form_data['version']}")
            else:
                form_map[form_data["name"]] = existing.id
                print(f"  = Form exists: {form_data['name']} {form_data['version']}")

        # ── Seed Questions ──
        async def seed_questions(form_name, questions_data):
            form_id = form_map.get(form_name)
            if not form_id:
                print(f"  ! Form not found: {form_name}")
                return

            count_new = 0
            for i, q in enumerate(questions_data):
                result = await session.execute(
                    select(Question).where(
                        Question.form_id == form_id,
                        Question.q_id == q["q_id"],
                    )
                )
                existing = result.scalar_one_or_none()
                if not existing:
                    session.add(Question(
                        form_id=form_id,
                        section=q.get("section"),
                        q_id=q["q_id"],
                        question_text=q["text"],
                        question_type=q["type"],
                        options=q.get("options"),
                        display_order=i + 1,
                        is_required=q.get("required", False),
                    ))
                    count_new += 1

            print(f"  + Seeded {count_new} new / {len(questions_data)} total questions for {form_name}")

        await seed_questions("Dealer_Form", DEALER_QUESTIONS)
        await seed_questions("Craft_Form", CRAFT_QUESTIONS)

        await session.commit()
        print("\n  Done! Seed complete.")


if __name__ == "__main__":
    asyncio.run(seed())
