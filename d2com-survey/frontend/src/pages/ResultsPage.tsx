/**
 * D2Com Survey — Form Results Page
 * Google Forms-style response summary with bar charts per question.
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, Loader2, FileText, Users } from 'lucide-react';
import { formsApi, type FormResults, type QuestionResult } from '../services/api';

/* ── Horizontal bar for one option ── */
function Bar({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3 group">
      <span className="text-sm text-[var(--color-text)] w-40 sm:w-56 truncate shrink-0" title={label}>
        {label}
      </span>
      <div className="flex-1 h-7 bg-gray-100 rounded-lg overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-lg transition-all duration-500 flex items-center px-2"
          style={{ width: `${Math.max(pct, 2)}%` }}
        >
          {pct > 15 && <span className="text-white text-xs font-semibold">{count}</span>}
        </div>
      </div>
      <span className="text-xs font-semibold text-[var(--color-text-muted)] w-12 text-right shrink-0">
        {count} ({Math.round(pct)}%)
      </span>
    </div>
  );
}

/* ── Single question card ── */
function QuestionCard({ q, index }: { q: QuestionResult; index: number }) {
  const hasDistribution = Object.keys(q.distribution).length > 0;
  const totalResponses = hasDistribution
    ? Object.values(q.distribution).reduce((a, b) => a + b, 0)
    : q.response_count;

  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] p-5 shadow-sm animate-slideIn"
      style={{ animationDelay: `${index * 30}ms` }}
    >
      {/* Question header */}
      <div className="flex items-start gap-3 mb-4">
        <span className="shrink-0 w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold">
          {q.q_id}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--color-text)]">{q.question_text}</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            {q.response_count} phản hồi
            {q.question_type === 'multiple_choice' && ' • Trắc nghiệm'}
            {q.question_type === 'checkboxes' && ' • Nhiều lựa chọn'}
            {q.question_type === 'linear_scale' && ' • Thang đo'}
            {q.question_type === 'short_answer' && ' • Tự luận'}
          </p>
        </div>
      </div>

      {/* Bar chart for MC / CB / LS */}
      {hasDistribution && (
        <div className="space-y-2">
          {(q.options || Object.keys(q.distribution)).map((opt) => (
            <Bar key={opt} label={opt} count={q.distribution[opt] || 0} max={totalResponses} />
          ))}
        </div>
      )}

      {/* Text answers for short_answer */}
      {!hasDistribution && q.answers.length > 0 && (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {q.answers.map((ans, i) => (
            <div key={i} className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-[var(--color-text)]">
              {ans}
            </div>
          ))}
        </div>
      )}

      {/* No responses */}
      {q.response_count === 0 && (
        <p className="text-sm text-[var(--color-text-muted)] italic">Chưa có phản hồi</p>
      )}
    </div>
  );
}

/* ── Main page ── */
export default function ResultsPage() {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();
  const [results, setResults] = useState<FormResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!formId) return;
    formsApi.getResults(Number(formId))
      .then(setResults)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [formId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-500" size={28} />
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error || 'Không tìm thấy kết quả'}
        </div>
      </div>
    );
  }

  // Group questions by section
  const sections: Record<string, QuestionResult[]> = {};
  results.questions.forEach((q) => {
    const sec = q.section || 'Khác';
    if (!sections[sec]) sections[sec] = [];
    sections[sec].push(q);
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-gray-100 text-[var(--color-text-muted)] transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <BarChart3 size={24} className="text-blue-600" />
            Kết quả: {results.form_name} {results.form_version}
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            {results.form_type === 'dealer' ? 'Đại lý' : 'Thợ'} • {results.questions.length} câu hỏi
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Users size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--color-text)]">{results.total_surveys}</p>
            <p className="text-xs text-[var(--color-text-muted)]">Khảo sát hoàn thành</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
            <FileText size={20} className="text-violet-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--color-text)]">{results.questions.length}</p>
            <p className="text-xs text-[var(--color-text-muted)]">Câu hỏi</p>
          </div>
        </div>
      </div>

      {/* No surveys warning */}
      {results.total_surveys === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-yellow-800 text-sm">
          Chưa có khảo sát hoàn thành nào cho form này. Kết quả sẽ hiện sau khi submit ít nhất 1 khảo sát.
        </div>
      )}

      {/* Questions by section */}
      {Object.entries(sections).map(([section, questions]) => (
        <div key={section}>
          <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
            {section}
          </h2>
          <div className="space-y-3">
            {questions.map((q, i) => (
              <QuestionCard key={q.q_id} q={q} index={i} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
