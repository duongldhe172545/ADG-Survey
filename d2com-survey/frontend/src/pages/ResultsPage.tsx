/**
 * D2Com Survey — Form Results Page
 * Google Forms-style response summary with bar charts per question.
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, Loader2, FileText, Users, BrainCircuit } from 'lucide-react';
import { formsApi, aiApi, type FormResults, type QuestionResult, type FormAnalysisResult } from '../services/api';

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
  const [formAnalysis, setFormAnalysis] = useState<FormAnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

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
        {results.total_surveys > 0 && (
          <button
            onClick={async () => {
              setAnalyzing(true); setError('');
              try {
                const r = await aiApi.analyzeForm(Number(formId));
                setFormAnalysis(r);
              } catch (e: any) { setError(e.message); }
              finally { setAnalyzing(false); }
            }}
            disabled={analyzing}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:from-violet-700 hover:to-purple-700 transition-all disabled:opacity-50 shadow-sm shrink-0"
          >
            {analyzing ? <Loader2 size={14} className="animate-spin" /> : <BrainCircuit size={14} />}
            AI Phân tích tổng hợp
          </button>
        )}
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

      {/* AI Analysis Card */}
      {formAnalysis && <FormAnalysisCard data={formAnalysis} />}

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

// ── Form Analysis Card ──

const SEVERITY_DOT: Record<string, string> = {
  high: 'bg-red-500', medium: 'bg-orange-400', low: 'bg-green-400',
};
const PRIORITY_BADGE: Record<string, string> = {
  high: 'bg-red-100 text-red-700', medium: 'bg-yellow-100 text-yellow-700', low: 'bg-green-100 text-green-700',
};

function FormAnalysisCard({ data }: { data: FormAnalysisResult }) {
  return (
    <div className="bg-gradient-to-br from-violet-50 via-white to-purple-50 rounded-xl border border-violet-200 shadow-sm overflow-hidden animate-slideIn">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-violet-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <BrainCircuit size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold">AI Phân tích tổng hợp</h3>
            <p className="text-xs text-[var(--color-text-muted)]">
              {data.total_surveys} khảo sát • {data.form_type === 'dealer' ? 'Đại lý' : 'Thợ'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Score bars */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex justify-between text-xs"><span className="font-medium">Retention Maturity</span><span className="font-bold text-blue-600">{data.retention_avg}/10</span></div>
            <div className="w-full h-2 bg-gray-100 rounded-full"><div className="h-full bg-blue-500 rounded-full transition-all duration-700" style={{ width: `${data.retention_avg * 10}%` }} /></div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs"><span className="font-medium">Pilot Readiness</span><span className="font-bold text-violet-600">{data.readiness_avg}/10</span></div>
            <div className="w-full h-2 bg-gray-100 rounded-full"><div className="h-full bg-violet-500 rounded-full transition-all duration-700" style={{ width: `${data.readiness_avg * 10}%` }} /></div>
          </div>
        </div>

        {/* Top 3 Pains */}
        {data.top_3_pains.length > 0 && (
          <div>
            <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2">Top 3 Pains</p>
            <div className="space-y-2">
              {data.top_3_pains.map((p) => (
                <div key={p.rank} className="flex items-start gap-3 bg-white/70 rounded-lg p-3 border border-gray-100">
                  <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold shrink-0">#{p.rank}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{p.pain}</p>
                      <div className={`w-2 h-2 rounded-full ${SEVERITY_DOT[p.severity] || 'bg-gray-400'}`} />
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{p.percentage}% • {p.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Insights */}
        {data.key_insights.length > 0 && (
          <div>
            <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2">Key Insights</p>
            <ul className="space-y-1.5">
              {data.key_insights.map((insight, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-violet-500 mt-0.5 shrink-0">•</span>
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommended Pilots */}
        {data.recommended_pilots.length > 0 && (
          <div>
            <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2">Recommended Pilots</p>
            <div className="space-y-2">
              {data.recommended_pilots.map((p, i) => (
                <div key={i} className="bg-white/70 rounded-lg p-3 border border-gray-100">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold">{p.pilot_name}</p>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${PRIORITY_BADGE[p.priority] || 'bg-gray-100 text-gray-600'}`}>{p.priority}</span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)]">{p.description}</p>
                  <p className="text-xs text-violet-600 mt-1">→ {p.expected_impact}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Executive Summary */}
        {data.executive_summary && (
          <div className="bg-violet-50/50 rounded-lg p-4 border border-violet-100">
            <p className="text-xs font-medium text-violet-600 mb-1">📄 Executive Summary</p>
            <p className="text-sm text-[var(--color-text)] leading-relaxed">{data.executive_summary}</p>
          </div>
        )}
      </div>
    </div>
  );
}
