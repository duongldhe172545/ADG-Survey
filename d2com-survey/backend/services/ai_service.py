"""
D2Com Survey System — AI Analysis Service
Uses Gemini API to analyze individual survey responses.
Produces structured analysis: pain cluster, priority, top pains,
retention score, pilot readiness, root cause map, recommendation.
"""
import json
import logging
from typing import Optional

from google import genai
from google.genai import types

from backend.config import settings

logger = logging.getLogger(__name__)

# ── Gemini client (lazy init) ──
_client: Optional[genai.Client] = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        if not settings.GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY chưa được cấu hình")
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client


# ── Analysis JSON schema ──
ANALYSIS_SCHEMA = types.Schema(
    type=types.Type.OBJECT,
    properties={
        "pain_cluster": types.Schema(type=types.Type.STRING, description="Nhóm pain chính, ví dụ: 'Công nợ + Lợi nhuận bào mòn'"),
        "priority": types.Schema(type=types.Type.STRING, description="Mức ưu tiên: P0 (cấp bách nhất), P1, P2, P3 (thấp nhất)"),
        "priority_score": types.Schema(type=types.Type.INTEGER, description="Điểm ưu tiên 0-100, càng cao càng cần xử lý gấp"),
        "top_pains": types.Schema(
            type=types.Type.ARRAY,
            items=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "pain": types.Schema(type=types.Type.STRING, description="Mô tả pain cụ thể"),
                    "severity": types.Schema(type=types.Type.STRING, description="high / medium / low"),
                    "evidence": types.Schema(type=types.Type.STRING, description="Bằng chứng từ câu trả lời, ví dụ: D10: >90 ngày"),
                },
                required=["pain", "severity", "evidence"],
            ),
            description="Top 2-3 pain chính",
        ),
        "retention_score": types.Schema(type=types.Type.INTEGER, description="Điểm trưởng thành quản lý khách cũ, 0 (không quản lý) đến 10 (rất tốt)"),
        "pilot_readiness": types.Schema(type=types.Type.INTEGER, description="Mức sẵn sàng thử pilot, 0-10"),
        "root_cause_map": types.Schema(type=types.Type.STRING, description="Chuỗi: Triệu chứng → Gốc → Đề xuất xử lý"),
        "recommendation": types.Schema(type=types.Type.STRING, description="1 đề xuất hành động cụ thể, ngắn gọn"),
        "summary": types.Schema(type=types.Type.STRING, description="Tóm tắt 2-3 câu về người được khảo sát"),
    },
    required=[
        "pain_cluster", "priority", "priority_score", "top_pains",
        "retention_score", "pilot_readiness", "root_cause_map",
        "recommendation", "summary",
    ],
)


def _build_prompt(form_type: str, qa_pairs: list[dict]) -> str:
    """Build the analysis prompt with all Q&A data."""
    type_label = "Đại lý (Dealer)" if form_type == "dealer" else "Thợ (Craft)"

    qa_text = "\n".join(
        f"- [{q['q_id']}] {q['question_text']}\n  → Trả lời: {q['answer'] or '(không trả lời)'}"
        for q in qa_pairs
    )

    return f"""Bạn là chuyên gia phân tích dữ liệu khảo sát ngành vật liệu xây dựng (VLXD) tại Việt Nam.

Dưới đây là kết quả khảo sát 1 {type_label}. Hãy phân tích theo 5 chiều:

1. **Profile/Scale**: Quy mô kinh doanh, kinh nghiệm, segment
2. **Core Pain**: Pain chính — xoay quanh 4 biến: Doanh thu, Lợi nhuận, Tồn kho, Công nợ (dealer) hoặc: Không việc đều, Bị ép giá, Mất niềm tin, Chậm tiền (thợ)
3. **Retention Maturity**: Quản lý khách cũ tốt cỡ nào, khai thác được bao nhiêu
4. **Evidence/QC Readiness**: Sẵn sàng chơi theo luật evidence + QC-pass cỡ nào
5. **Pilot Readiness**: Sẵn sàng thử hệ thống trong 30 ngày, kỳ vọng ROI gì

═══ DỮ LIỆU KHẢO SÁT ({type_label}) ═══

{qa_text}

═══ YÊU CẦU ═══

Phân tích và trả về kết quả theo đúng JSON schema. Đặc biệt chú ý:
- priority: P0 = cần xử lý ngay (score 80-100), P1 = ưu tiên cao (60-79), P2 = theo dõi (40-59), P3 = chưa cấp bách (0-39)
- top_pains: chọn 2-3 pain quan trọng nhất, kèm bằng chứng cụ thể từ câu trả lời (ghi rõ mã câu + nội dung trả lời)
- retention_score: 0 = không quản lý khách cũ, 10 = có CRM + chăm sóc bài bản
- pilot_readiness: dựa vào câu trả lời về sẵn sàng thử + mức khả thi
- root_cause_map: viết 1 chuỗi ngắn dạng "Triệu chứng → Gốc → Đề xuất xử lý"
- summary: tóm tắt ngắn gọn 2-3 câu bằng tiếng Việt
"""


async def analyze_survey(
    form_type: str,
    qa_pairs: list[dict],
) -> dict:
    """
    Call Gemini API to analyze survey responses.
    Returns structured analysis dict.
    """
    client = _get_client()
    prompt = _build_prompt(form_type, qa_pairs)

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ANALYSIS_SCHEMA,
                temperature=0.3,
            ),
        )

        result = json.loads(response.text)
        return result

    except Exception as e:
        logger.error(f"Gemini analysis failed: {e}")
        raise RuntimeError(f"AI phân tích thất bại: {e}")


# ═══════════════════════════════════════════════
# ██  FORM-LEVEL AGGREGATE ANALYSIS            ██
# ═══════════════════════════════════════════════

FORM_ANALYSIS_SCHEMA = types.Schema(
    type=types.Type.OBJECT,
    properties={
        "top_3_pains": types.Schema(
            type=types.Type.ARRAY,
            items=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "rank": types.Schema(type=types.Type.INTEGER, description="Thứ hạng 1-3"),
                    "pain": types.Schema(type=types.Type.STRING, description="Mô tả pain"),
                    "percentage": types.Schema(type=types.Type.INTEGER, description="Phần trăm người chọn (0-100)"),
                    "severity": types.Schema(type=types.Type.STRING, description="high / medium / low"),
                    "action": types.Schema(type=types.Type.STRING, description="Đề xuất hành động cụ thể"),
                },
                required=["rank", "pain", "percentage", "severity", "action"],
            ),
            description="Top 3 pain phổ biến nhất",
        ),
        "key_insights": types.Schema(
            type=types.Type.ARRAY,
            items=types.Schema(type=types.Type.STRING),
            description="3-5 insight quan trọng nhất, mỗi cái là 1 câu ngắn gọn",
        ),
        "recommended_pilots": types.Schema(
            type=types.Type.ARRAY,
            items=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "pilot_name": types.Schema(type=types.Type.STRING, description="Tên pilot"),
                    "description": types.Schema(type=types.Type.STRING, description="Mô tả ngắn"),
                    "priority": types.Schema(type=types.Type.STRING, description="high / medium / low"),
                    "expected_impact": types.Schema(type=types.Type.STRING, description="Tác động kỳ vọng"),
                },
                required=["pilot_name", "description", "priority", "expected_impact"],
            ),
            description="2-3 pilot khuyến nghị triển khai",
        ),
        "retention_avg": types.Schema(type=types.Type.INTEGER, description="Điểm retention trung bình nhóm (0-10)"),
        "readiness_avg": types.Schema(type=types.Type.INTEGER, description="Điểm sẵn sàng pilot trung bình nhóm (0-10)"),
        "executive_summary": types.Schema(type=types.Type.STRING, description="Tóm tắt 3-5 câu cho lãnh đạo đọc trong 30 giây, bằng tiếng Việt"),
    },
    required=[
        "top_3_pains", "key_insights", "recommended_pilots",
        "retention_avg", "readiness_avg", "executive_summary",
    ],
)


def _build_form_prompt(form_type: str, total_surveys: int, questions_data: list[dict]) -> str:
    """Build aggregate analysis prompt with distribution data per question."""
    type_label = "Đại lý (Dealer)" if form_type == "dealer" else "Thợ (Craft)"

    q_text_parts = []
    for q in questions_data:
        part = f"- [{q['q_id']}] {q['question_text']} ({q['question_type']}, {q['response_count']} phản hồi)"
        if q.get("distribution"):
            dist_lines = [f"    • {k}: {v} ({round(v/max(q['response_count'],1)*100)}%)" for k, v in q["distribution"].items()]
            part += "\n" + "\n".join(dist_lines)
        elif q.get("answers"):
            part += f"\n    Câu trả lời: {', '.join(q['answers'][:10])}"
        q_text_parts.append(part)

    q_text = "\n".join(q_text_parts)

    return f"""Bạn là chuyên gia phân tích dữ liệu khảo sát ngành vật liệu xây dựng (VLXD) tại Việt Nam.

Dưới đây là dữ liệu TỔNG HỢP từ {total_surveys} bài khảo sát {type_label} đã hoàn thành.
Mỗi câu hỏi kèm phân phối câu trả lời (số lượng + tỷ lệ %).

Phân tích theo 5 chiều:
1. **Core Pain**: Pain nào phổ biến nhất, nghiêm trọng nhất trong nhóm
2. **Retention Maturity**: Nhóm này quản lý khách cũ tốt cỡ nào tổng thể
3. **Evidence/QC Readiness**: Nhóm có sẵn sàng chơi theo luật evidence không
4. **Pilot Readiness**: Mức sẵn sàng thử hệ thống của nhóm
5. **Pattern & Correlation**: Tương quan giữa các câu trả lời, pattern đặc biệt

═══ DỮ LIỆU TỔNG HỢP ({type_label}) — {total_surveys} khảo sát ═══

{q_text}

═══ YÊU CẦU ═══

Phân tích và trả về JSON theo schema. Chú ý:
- top_3_pains: chọn 3 pain phổ biến/nghiêm trọng nhất, kèm % và đề xuất hành động cụ thể
- key_insights: 3-5 insight quan trọng, mỗi cái 1 câu ngắn gọn có dữ liệu cụ thể (VD: "72% đại lý không có CRM")
- recommended_pilots: 2-3 pilot cụ thể cho ban lãnh đạo, kèm priority và tác động kỳ vọng
- retention_avg: chấm điểm trung bình nhóm 0-10 dựa trên câu trả lời về quản lý khách cũ
- readiness_avg: chấm điểm trung bình nhóm 0-10 dựa trên câu sẵn sàng thử
- executive_summary: viết cho sếp đọc trong 30 giây, bằng tiếng Việt, có con số cụ thể
"""


async def analyze_form(
    form_type: str,
    total_surveys: int,
    questions_data: list[dict],
) -> dict:
    """
    Call Gemini API to analyze aggregated form results.
    Returns structured form analysis dict.
    """
    client = _get_client()
    prompt = _build_form_prompt(form_type, total_surveys, questions_data)

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=FORM_ANALYSIS_SCHEMA,
                temperature=0.3,
            ),
        )

        result = json.loads(response.text)
        return result

    except Exception as e:
        logger.error(f"Gemini form analysis failed: {e}")
        raise RuntimeError(f"AI phân tích tổng hợp thất bại: {e}")

