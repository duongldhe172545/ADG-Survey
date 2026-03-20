/**
 * D2Com Survey — Forms Management Page
 * List all forms (active + inactive), edit questions, create new form.
 * Groups forms dynamically by type (not hardcoded dealer/craft).
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings2, Loader2, Pencil, CheckCircle2, XCircle, Plus, ClipboardList, X
} from 'lucide-react';
import { formsApi, type SurveyForm, type QuestionEditData } from '../services/api';

export default function FormsManagementPage() {
  const [forms, setForms] = useState<SurveyForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  const loadForms = () => {
    setLoading(true);
    formsApi.listAll()
      .then(setForms)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadForms(); }, []);

  const handleToggle = async (formId: number) => {
    try {
      await formsApi.toggleActive(formId);
      loadForms();
    } catch {}
  };

  // Group forms by type dynamically
  const types = [...new Set(forms.map(f => f.type))];
  const groupedForms = types.map(t => ({
    type: t,
    forms: forms.filter(f => f.type === t).sort((a, b) => b.version.localeCompare(a.version)),
  }));

  const FormCard = ({ form }: { form: SurveyForm }) => (
    <div className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
      form.is_active
        ? 'border-[var(--color-border)] bg-white'
        : 'border-gray-100 bg-gray-50/50 opacity-60'
    }`}>
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-violet-600 flex items-center justify-center shrink-0">
        <ClipboardList size={20} className="text-white" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm">{form.name}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-mono">{form.version}</span>
          {form.is_active ? (
            <span className="flex items-center gap-0.5 text-[10px] text-green-600">
              <CheckCircle2 size={10} /> Active
            </span>
          ) : (
            <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
              <XCircle size={10} /> Inactive
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
          {form.question_count} câu hỏi
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => handleToggle(form.id)}
          className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
            form.is_active
              ? 'text-orange-600 border-orange-200 hover:bg-orange-50'
              : 'text-green-600 border-green-200 hover:bg-green-50'
          }`}
        >
          {form.is_active ? 'Tắt' : 'Bật'}
        </button>
        <button
          onClick={() => navigate(`/forms/${form.id}/edit`)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-600 hover:bg-violet-50 rounded-lg transition-colors border border-violet-200"
        >
          <Pencil size={12} /> Sửa câu hỏi
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-500" size={28} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Settings2 size={24} className="text-violet-600" />
            Bộ câu hỏi
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            Quản lý form khảo sát và câu hỏi
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:from-violet-700 hover:to-purple-700 transition-all shadow-sm"
        >
          <Plus size={16} /> Tạo form mới
        </button>
      </div>

      {/* Info */}
      <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 text-sm text-violet-700">
        💡 Bấm <strong>"Sửa câu hỏi"</strong> để chỉnh sửa. Khi lưu sẽ tạo <strong>version mới</strong>. Bấm <strong>"Tạo form mới"</strong> để thêm đối tượng khảo sát mới.
      </div>

      {/* Dynamic form groups */}
      {groupedForms.map(group => (
        <div key={group.type} className="space-y-3">
          <div className="flex items-center gap-2">
            <ClipboardList size={18} className="text-blue-600" />
            <h2 className="font-bold text-lg capitalize">{group.type}</h2>
            <span className="text-xs text-[var(--color-text-muted)]">({group.forms.length} version)</span>
          </div>
          <div className="space-y-2">
            {group.forms.map(f => <FormCard key={f.id} form={f} />)}
          </div>
        </div>
      ))}

      {forms.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-[var(--color-border)]">
          <p className="text-[var(--color-text-muted)]">Chưa có form nào. Bấm "Tạo form mới" để bắt đầu.</p>
        </div>
      )}

      {/* Create Form Dialog */}
      {showCreate && (
        <CreateFormDialog
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadForms(); }}
        />
      )}
    </div>
  );
}


/* ── Create Form Dialog ── */
function CreateFormDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [questions, setQuestions] = useState<QuestionEditData[]>([
    { q_id: 'Q01', question_text: '', question_type: 'short_answer', display_order: 1, is_required: false },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateQ = (idx: number, patch: Partial<QuestionEditData>) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, ...patch } : q));
  };

  const addQ = () => {
    const num = questions.length + 1;
    setQuestions(prev => [...prev, {
      q_id: `Q${String(num).padStart(2, '0')}`,
      question_text: '',
      question_type: 'short_answer',
      display_order: num,
      is_required: false,
    }]);
  };

  const removeQ = (idx: number) => {
    if (questions.length <= 1) return;
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!name.trim()) return setError('Chưa nhập tên form');
    if (!type.trim()) return setError('Chưa nhập loại đối tượng');
    const empty = questions.find(q => !q.question_text.trim());
    if (empty) return setError(`Câu ${empty.q_id} chưa có nội dung`);

    setSaving(true);
    setError('');
    try {
      await formsApi.createForm({
        name: name.trim(),
        type: type.trim().toLowerCase(),
        questions: questions.map((q, i) => ({ ...q, display_order: i + 1 })),
      });
      onCreated();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Dialog header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold">Tạo form mới</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Form info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Tên form</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="VD: Contractor_Form"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Loại đối tượng</label>
              <input
                value={type}
                onChange={e => setType(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="VD: contractor"
              />
            </div>
          </div>

          {/* Questions */}
          <div>
            <label className="text-xs text-gray-500 mb-2 block">Câu hỏi ({questions.length})</label>
            <div className="space-y-2">
              {questions.map((q, idx) => (
                <div key={idx} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                  <input
                    value={q.q_id}
                    onChange={e => updateQ(idx, { q_id: e.target.value })}
                    className="w-14 px-2 py-1.5 border rounded text-xs font-mono text-center shrink-0"
                  />
                  <input
                    value={q.question_text}
                    onChange={e => updateQ(idx, { question_text: e.target.value })}
                    className="flex-1 px-3 py-1.5 border rounded-lg text-sm"
                    placeholder="Nhập câu hỏi..."
                  />
                  <select
                    value={q.question_type}
                    onChange={e => updateQ(idx, { question_type: e.target.value })}
                    className="px-2 py-1.5 border rounded-lg text-xs bg-white shrink-0"
                  >
                    <option value="short_answer">Tự luận</option>
                    <option value="multiple_choice">Trắc nghiệm</option>
                    <option value="checkboxes">Nhiều chọn</option>
                    <option value="linear_scale">Thang đo</option>
                  </select>
                  <button
                    onClick={() => removeQ(idx)}
                    className="p-1.5 text-red-400 hover:bg-red-50 rounded shrink-0"
                    disabled={questions.length <= 1}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addQ}
              className="mt-2 text-xs text-violet-600 hover:text-violet-700 font-medium"
            >
              + Thêm câu hỏi
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-red-700 text-xs">{error}</div>
          )}

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:from-violet-700 hover:to-purple-700 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Tạo form'}
          </button>
        </div>
      </div>
    </div>
  );
}
