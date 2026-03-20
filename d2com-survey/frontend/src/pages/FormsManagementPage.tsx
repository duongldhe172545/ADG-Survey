/**
 * D2Com Survey — Forms Management Page
 * List all forms (active + inactive), edit questions, create new form.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings2, Store, Wrench, Loader2, Pencil, CheckCircle2, XCircle
} from 'lucide-react';
import { formsApi, type SurveyForm } from '../services/api';

export default function FormsManagementPage() {
  const [forms, setForms] = useState<SurveyForm[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadForms = () => {
    setLoading(true);
    formsApi.listAll()
      .then(setForms)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadForms(); }, []);

  // Group by type
  const dealerForms = forms.filter(f => f.type === 'dealer').sort((a, b) => b.version.localeCompare(a.version));
  const craftForms = forms.filter(f => f.type === 'craft').sort((a, b) => b.version.localeCompare(a.version));

  const FormCard = ({ form }: { form: SurveyForm }) => (
    <div className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
      form.is_active
        ? 'border-[var(--color-border)] bg-white'
        : 'border-gray-100 bg-gray-50/50 opacity-60'
    }`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
        form.type === 'dealer'
          ? 'bg-gradient-to-br from-blue-400 to-blue-600'
          : 'bg-gradient-to-br from-violet-400 to-violet-600'
      }`}>
        {form.type === 'dealer' ? <Store size={20} className="text-white" /> : <Wrench size={20} className="text-white" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
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

      <button
        onClick={() => navigate(`/forms/${form.id}/edit`)}
        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-violet-600 hover:bg-violet-50 rounded-lg transition-colors border border-violet-200"
      >
        <Pencil size={12} /> Sửa câu hỏi
      </button>
    </div>
  );

  const FormGroup = ({ title, icon: Icon, forms: groupForms, color }: {
    title: string; icon: typeof Store; forms: SurveyForm[]; color: string;
  }) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon size={18} className={color} />
        <h2 className="font-bold text-lg">{title}</h2>
        <span className="text-xs text-[var(--color-text-muted)]">({groupForms.length} version)</span>
      </div>
      {groupForms.length > 0 ? (
        <div className="space-y-2">
          {groupForms.map(f => <FormCard key={f.id} form={f} />)}
        </div>
      ) : (
        <p className="text-sm text-[var(--color-text-muted)] py-4 text-center bg-gray-50 rounded-xl">
          Chưa có form nào
        </p>
      )}
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
      </div>

      {/* Info */}
      <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 text-sm text-violet-700">
        💡 Bấm <strong>"Sửa câu hỏi"</strong> để chỉnh sửa câu hỏi. Khi lưu sẽ tự tạo <strong>version mới</strong>, version cũ và data cũ được giữ nguyên.
      </div>

      {/* Dealer Forms */}
      <FormGroup title="Dealer Form" icon={Store} forms={dealerForms} color="text-blue-600" />

      {/* Craft Forms */}
      <FormGroup title="Craft Form" icon={Wrench} forms={craftForms} color="text-violet-600" />
    </div>
  );
}
