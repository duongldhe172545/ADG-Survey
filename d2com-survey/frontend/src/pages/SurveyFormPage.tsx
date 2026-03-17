/**
 * D2Com Survey — Survey Form Page
 * Dynamic form rendered from DB questions.
 * Supports: short_answer, multiple_choice, checkboxes, linear_scale.
 * Groups questions by section. Mobile responsive.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Save, Send, ArrowLeft, Loader2, CheckCircle2, AlertCircle
} from 'lucide-react';
import { surveysApi, type SurveyItem, type ResponseItem } from '../services/api';

export default function SurveyFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const surveyId = Number(id);

  const [survey, setSurvey] = useState<SurveyItem | null>(null);
  const [responses, setResponses] = useState<ResponseItem[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [saveMsg, setSaveMsg] = useState('');

  // Load survey + responses
  useEffect(() => {
    const load = async () => {
      try {
        const [s, r] = await Promise.all([
          surveysApi.get(surveyId),
          surveysApi.getResponses(surveyId),
        ]);
        setSurvey(s);
        setResponses(r);
        const existing: Record<number, string> = {};
        r.forEach((resp) => {
          if (resp.answer) existing[resp.question_id] = resp.answer;
        });
        setAnswers(existing);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [surveyId]);

  // Group questions by section
  const sections = useMemo(() => {
    const map: Record<string, ResponseItem[]> = {};
    responses.forEach((r) => {
      const sec = r.section || 'Câu hỏi';
      if (!map[sec]) map[sec] = [];
      map[sec].push(r);
    });
    return Object.entries(map);
  }, [responses]);

  // Update answer
  const setAnswer = useCallback((questionId: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setSaveMsg('');
  }, []);

  // Save draft
  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const changed = Object.entries(answers)
        .filter(([, v]) => v.trim() !== '')
        .map(([qId, answer]) => ({ question_id: Number(qId), answer }));

      if (changed.length === 0) {
        setSaveMsg('Chưa có câu trả lời nào');
        setSaving(false);
        return;
      }

      const result = await surveysApi.saveResponses(surveyId, changed);
      setSaveMsg(`✓ ${result.message}`);
      const fresh = await surveysApi.get(surveyId);
      setSurvey(fresh);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // Submit
  const handleSubmit = async () => {
    await handleSave();
    setSubmitting(true);
    setError('');
    try {
      await surveysApi.submit(surveyId);
      navigate('/surveys');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  if (!survey || responses.length === 0) {
    return (
      <div className="text-center py-16">
        <AlertCircle size={40} className="mx-auto text-gray-300 mb-3" />
        <p className="text-[var(--color-text-muted)]">Không tìm thấy khảo sát</p>
      </div>
    );
  }

  const answeredCount = Object.values(answers).filter((v) => v.trim() !== '').length;
  const progress = responses.length ? Math.round((answeredCount / responses.length) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-fadeIn px-0 sm:px-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/surveys')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded-md text-xs font-bold shrink-0 ${
                survey.customer_type === 'dealer'
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-violet-50 text-violet-700'
              }`}>
                {survey.customer_resp_id}
              </span>
              <h1 className="text-base sm:text-lg font-bold truncate">
                {survey.customer_name || 'Khảo sát mới'}
              </h1>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              {survey.form_name} {survey.form_version} • {answeredCount}/{responses.length} câu
            </p>
          </div>
        </div>

        {/* Actions — stack on mobile */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 border border-[var(--color-border)] rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span className="hidden sm:inline">Lưu nháp</span>
            <span className="sm:hidden">Lưu</span>
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-sm"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Gửi
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">Tiến độ</span>
          <span className="text-xs font-bold text-blue-600">{progress}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}
      {saveMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-700 text-sm flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0" /> {saveMsg}
        </div>
      )}

      {/* Questions grouped by section */}
      {sections.map(([sectionName, sectionResponses]) => (
        <div key={sectionName} className="space-y-3">
          {/* Section header */}
          <div className="sticky top-0 z-10 bg-[var(--color-bg)] pt-2 pb-1">
            <h2 className="text-sm font-bold text-[var(--color-text)] bg-gradient-to-r from-blue-50 to-transparent px-3 py-2 rounded-lg border-l-3 border-blue-500">
              {sectionName}
            </h2>
          </div>

          {sectionResponses.map((resp) => (
            <QuestionField
              key={resp.question_id}
              response={resp}
              value={answers[resp.question_id] || ''}
              onChange={(v) => setAnswer(resp.question_id, v)}
            />
          ))}
        </div>
      ))}

      {/* Bottom actions — mobile friendly */}
      <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 pb-6 border-t border-[var(--color-border)]">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-1.5 px-5 py-3 sm:py-2.5 border border-[var(--color-border)] rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <Save size={16} /> Lưu nháp
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex items-center justify-center gap-1.5 px-5 py-3 sm:py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <Send size={16} /> Gửi khảo sát
        </button>
      </div>
    </div>
  );
}

// ── Question Field Component ──

function QuestionField({
  response, value, onChange,
}: {
  response: ResponseItem;
  value: string;
  onChange: (v: string) => void;
}) {
  const { question_type, options } = response;

  // For checkboxes: answer is stored as comma-separated values
  const checkedValues = question_type === 'checkboxes' && value
    ? value.split(';;').filter(Boolean)
    : [];

  const toggleCheckbox = (opt: string) => {
    const newValues = checkedValues.includes(opt)
      ? checkedValues.filter((v) => v !== opt)
      : [...checkedValues, opt];
    onChange(newValues.join(';;'));
  };

  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 sm:p-5 hover:shadow-sm transition-shadow">
      {/* Label */}
      <label className="flex items-start gap-2 mb-3">
        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded mt-0.5 shrink-0">
          {response.q_id}
        </span>
        <span className="text-sm font-medium leading-relaxed">
          {response.question_text}
          {response.is_required && <span className="text-red-500 ml-1">*</span>}
        </span>
      </label>

      {/* ── Short Answer ── */}
      {question_type === 'short_answer' && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Nhập câu trả lời..."
          className="w-full px-3 sm:px-4 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
        />
      )}

      {question_type === 'multiple_choice' && options && (() => {
        const isOtherSelected = value.startsWith('Khác:') || value === 'Khác';
        return (
          <div className="space-y-2">
            {options.map((opt) => {
              const isKhac = opt === 'Khác';
              const isSelected = isKhac ? isOtherSelected : value === opt;
              return (
                <div key={opt}>
                  <label
                    onClick={() => onChange(isKhac ? 'Khác:' : opt)}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all text-sm ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/50'
                        : 'border-[var(--color-border)] hover:border-blue-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                      isSelected ? 'border-blue-500' : 'border-gray-300'
                    }`}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                    </div>
                    <span>{opt}</span>
                  </label>
                  {isKhac && isOtherSelected && (
                    <input
                      type="text"
                      value={value.startsWith('Khác: ') ? value.slice(6) : value.startsWith('Khác:') ? value.slice(5) : ''}
                      onChange={(e) => onChange(`Khác: ${e.target.value}`)}
                      placeholder="Nhập câu trả lời khác..."
                      autoFocus
                      className="mt-2 w-full px-4 py-2.5 border border-blue-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* ── Checkboxes (multi-select) ── */}
      {question_type === 'checkboxes' && options && (() => {
        // Khác values stored as "Khác: custom text" in the ;; separated list
        const hasOtherChecked = checkedValues.some(v => v === 'Khác' || v.startsWith('Khác:'));
        const otherText = checkedValues.find(v => v.startsWith('Khác:'))?.slice(5).trimStart() || '';

        return (
          <div className="space-y-2">
            {options.map((opt) => {
              const isKhac = opt === 'Khác';
              const isChecked = isKhac ? hasOtherChecked : checkedValues.includes(opt);

              const handleToggle = () => {
                if (isKhac) {
                  if (hasOtherChecked) {
                    // uncheck Khác
                    const newVals = checkedValues.filter(v => v !== 'Khác' && !v.startsWith('Khác:'));
                    onChange(newVals.join(';;'));
                  } else {
                    onChange([...checkedValues, 'Khác:'].join(';;'));
                  }
                } else {
                  toggleCheckbox(opt);
                }
              };

              return (
                <div key={opt}>
                  <label
                    onClick={handleToggle}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all text-sm ${
                      isChecked
                        ? 'border-blue-500 bg-blue-50/50'
                        : 'border-[var(--color-border)] hover:border-blue-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded shrink-0 border-2 flex items-center justify-center transition-all ${
                      isChecked ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                    }`}>
                      {isChecked && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span>{opt}</span>
                  </label>
                  {isKhac && hasOtherChecked && (
                    <input
                      type="text"
                      value={otherText}
                      onChange={(e) => {
                        const newVals = checkedValues
                          .filter(v => v !== 'Khác' && !v.startsWith('Khác:'))
                          .concat([`Khác: ${e.target.value}`]);
                        onChange(newVals.join(';;'));
                      }}
                      placeholder="Nhập câu trả lời khác..."
                      autoFocus
                      className="mt-2 w-full px-4 py-2.5 border border-blue-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* ── Linear Scale ── */}
      {question_type === 'linear_scale' && options && (() => {
        const scaleValues = options.map(String);
        return (
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              {scaleValues.map((n) => (
                <button
                  key={n}
                  onClick={() => onChange(n)}
                  className={`flex-1 h-11 sm:h-12 rounded-xl border-2 text-sm font-bold transition-all ${
                    value === n
                      ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                      : 'border-[var(--color-border)] hover:border-blue-200 text-[var(--color-text-muted)]'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex justify-between mt-1.5 text-xs text-[var(--color-text-muted)] px-1">
              <span>{scaleValues[0] === '0' ? 'Không sẵn sàng' : 'Rất thấp'}</span>
              <span>{scaleValues[0] === '0' ? 'Sẵn sàng thử ngay' : 'Rất cao'}</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
