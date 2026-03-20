/**
 * D2Com Survey — Form Editor Page
 * Edit questions in a form → save as new version.
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Plus, Trash2, GripVertical, Loader2,
  ChevronUp, ChevronDown, Settings2
} from 'lucide-react';
import { formsApi, type Question, type QuestionEditData } from '../services/api';

const QUESTION_TYPES = [
  { value: 'short_answer', label: 'Tự luận' },
  { value: 'multiple_choice', label: 'Trắc nghiệm' },
  { value: 'checkboxes', label: 'Nhiều lựa chọn' },
  { value: 'linear_scale', label: 'Thang đo' },
];

interface EditableQuestion {
  q_id: string;
  section: string;
  question_text: string;
  question_type: string;
  options: string[];
  is_required: boolean;
  _collapsed: boolean;
}

function toEditable(q: Question): EditableQuestion {
  return {
    q_id: q.q_id,
    section: q.section || '',
    question_text: q.question_text,
    question_type: q.question_type,
    options: q.options || [],
    is_required: q.is_required,
    _collapsed: true,
  };
}

export default function FormEditorPage() {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();
  const [formName, setFormName] = useState('');
  const [formVersion, setFormVersion] = useState('');
  const [questions, setQuestions] = useState<EditableQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!formId) return;
    const fid = Number(formId);
    Promise.all([formsApi.list(), formsApi.getQuestions(fid)])
      .then(([forms, qs]) => {
        const form = forms.find(f => f.id === fid);
        if (form) {
          setFormName(form.name);
          setFormVersion(form.version);
        }
        setQuestions(qs.map(toEditable));
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [formId]);

  const updateQuestion = (idx: number, patch: Partial<EditableQuestion>) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, ...patch } : q));
  };

  const moveQuestion = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= questions.length) return;
    setQuestions(prev => {
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  };

  const addQuestion = () => {
    const lastQ = questions[questions.length - 1];
    const lastSection = lastQ?.section || '';
    // Auto-generate next q_id
    const prefix = lastQ?.q_id?.charAt(0) || 'Q';
    const lastNum = parseInt(lastQ?.q_id?.slice(1) || '0');
    const newQId = `${prefix}${String(lastNum + 1).padStart(2, '0')}`;

    setQuestions(prev => [...prev, {
      q_id: newQId,
      section: lastSection,
      question_text: '',
      question_type: 'short_answer',
      options: [],
      is_required: false,
      _collapsed: false,
    }]);
  };

  const removeQuestion = (idx: number) => {
    if (!confirm(`Xóa câu ${questions[idx].q_id}?`)) return;
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const addOption = (idx: number) => {
    updateQuestion(idx, { options: [...questions[idx].options, ''] });
  };

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    const opts = [...questions[qIdx].options];
    opts[oIdx] = value;
    updateQuestion(qIdx, { options: opts });
  };

  const removeOption = (qIdx: number, oIdx: number) => {
    updateQuestion(qIdx, { options: questions[qIdx].options.filter((_, i) => i !== oIdx) });
  };

  const handleSave = async () => {
    if (!formId) return;
    const empty = questions.find(q => !q.question_text.trim());
    if (empty) {
      setError(`Câu ${empty.q_id} chưa có nội dung`);
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload: QuestionEditData[] = questions.map((q, i) => ({
        q_id: q.q_id,
        section: q.section || null,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options.length > 0 ? q.options : null,
        display_order: i + 1,
        is_required: q.is_required,
      }));
      const newForm = await formsApi.createNewVersion(Number(formId), payload);
      setSuccess(`✅ Đã tạo ${newForm.name} ${newForm.version} (${newForm.question_count} câu)`);
      setTimeout(() => navigate(`/forms/${newForm.id}/edit`), 1500);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-500" size={28} />
      </div>
    );
  }

  // Group by section
  const sections = [...new Set(questions.map(q => q.section || 'Khác'))];

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-fadeIn">
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
            <Settings2 size={24} className="text-violet-600" />
            Sửa câu hỏi: {formName} {formVersion}
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            {questions.length} câu hỏi • Lưu sẽ tạo version mới
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || questions.length === 0}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:from-violet-700 hover:to-purple-700 transition-all disabled:opacity-50 shadow-sm"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Lưu version mới
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-green-700 text-sm">{success}</div>
      )}

      {/* Questions */}
      <div className="space-y-2">
        {questions.map((q, idx) => (
          <div
            key={idx}
            className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden shadow-sm transition-all"
          >
            {/* Question header (collapsed row) */}
            <div
              className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => updateQuestion(idx, { _collapsed: !q._collapsed })}
            >
              <GripVertical size={14} className="text-gray-300" />
              <span className="w-10 text-xs font-bold text-violet-600 shrink-0">{q.q_id}</span>
              <span className="flex-1 text-sm truncate">{q.question_text || '(chưa có nội dung)'}</span>
              <span className="text-[10px] px-2 py-0.5 bg-gray-100 rounded-full text-gray-500 shrink-0">
                {QUESTION_TYPES.find(t => t.value === q.question_type)?.label}
              </span>
              {q.is_required && <span className="text-red-400 text-xs shrink-0">*</span>}
              <div className="flex gap-1 shrink-0">
                <button onClick={e => { e.stopPropagation(); moveQuestion(idx, -1); }}
                  className="p-1 hover:bg-gray-200 rounded" disabled={idx === 0}>
                  <ChevronUp size={14} className={idx === 0 ? 'text-gray-200' : 'text-gray-400'} />
                </button>
                <button onClick={e => { e.stopPropagation(); moveQuestion(idx, 1); }}
                  className="p-1 hover:bg-gray-200 rounded" disabled={idx === questions.length - 1}>
                  <ChevronDown size={14} className={idx === questions.length - 1 ? 'text-gray-200' : 'text-gray-400'} />
                </button>
              </div>
            </div>

            {/* Question detail (expanded) */}
            {!q._collapsed && (
              <div className="px-4 pb-4 pt-1 space-y-3 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Mã câu</label>
                    <input
                      value={q.q_id}
                      onChange={e => updateQuestion(idx, { q_id: e.target.value })}
                      className="w-full px-3 py-1.5 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Section</label>
                    <input
                      value={q.section}
                      onChange={e => updateQuestion(idx, { section: e.target.value })}
                      className="w-full px-3 py-1.5 border rounded-lg text-sm"
                      placeholder="VD: A. Hồ sơ nhanh"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Nội dung câu hỏi</label>
                  <textarea
                    value={q.question_text}
                    onChange={e => updateQuestion(idx, { question_text: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm min-h-[60px] resize-y"
                    placeholder="Nhập câu hỏi..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Loại câu hỏi</label>
                    <select
                      value={q.question_type}
                      onChange={e => updateQuestion(idx, { question_type: e.target.value })}
                      className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white"
                    >
                      {QUESTION_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={q.is_required}
                        onChange={e => updateQuestion(idx, { is_required: e.target.checked })}
                        className="accent-violet-600"
                      />
                      Bắt buộc
                    </label>
                  </div>
                </div>

                {/* Options editor (for MC, CB, LS) */}
                {q.question_type !== 'short_answer' && (
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Lựa chọn</label>
                    <div className="space-y-1.5">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 w-5">{oIdx + 1}.</span>
                          <input
                            value={opt}
                            onChange={e => updateOption(idx, oIdx, e.target.value)}
                            className="flex-1 px-3 py-1.5 border rounded-lg text-sm"
                            placeholder="Nhập lựa chọn..."
                          />
                          <button onClick={() => removeOption(idx, oIdx)}
                            className="p-1 text-red-400 hover:bg-red-50 rounded">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                      <button onClick={() => addOption(idx)}
                        className="text-xs text-violet-600 hover:text-violet-700 font-medium mt-1">
                        + Thêm lựa chọn
                      </button>
                    </div>
                  </div>
                )}

                {/* Delete button */}
                <div className="pt-2 border-t border-gray-100 flex justify-end">
                  <button onClick={() => removeQuestion(idx)}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 px-3 py-1.5 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={12} /> Xóa câu hỏi
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add question button */}
      <button
        onClick={addQuestion}
        className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-violet-300 hover:text-violet-500 hover:bg-violet-50/30 transition-all flex items-center justify-center gap-2"
      >
        <Plus size={16} /> Thêm câu hỏi
      </button>
    </div>
  );
}
