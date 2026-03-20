/**
 * D2Com Survey — New Survey Page
 * Dynamically shows all active forms, lets user pick one, then creates a survey.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Store, Wrench, ArrowRight, Loader2 } from 'lucide-react';
import { surveysApi, formsApi, type SurveyForm } from '../services/api';

export default function SurveyNewPage() {
  const [forms, setForms] = useState<SurveyForm[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<number | null>(null);
  const [loadingForms, setLoadingForms] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    formsApi.list()
      .then(f => {
        setForms(f);
        // Auto-select if only one of each type
        if (f.length === 1) setSelectedFormId(f[0].id);
      })
      .catch(() => {})
      .finally(() => setLoadingForms(false));
  }, []);

  const selectedForm = forms.find(f => f.id === selectedFormId);

  const handleCreate = async () => {
    if (!selectedForm) return;
    setCreating(true);
    setError('');

    try {
      const survey = await surveysApi.create({
        customer_type: selectedForm.type,
        form_id: selectedFormId!,
      });
      navigate(`/surveys/${survey.id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  if (loadingForms) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-500" size={28} />
      </div>
    );
  }

  // Group by type
  const dealerForms = forms.filter(f => f.type === 'dealer');
  const craftForms = forms.filter(f => f.type === 'craft');

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
          <ClipboardList size={28} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold">Tạo khảo sát mới</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Chọn bộ form để bắt đầu khảo sát
        </p>
      </div>

      {/* Form selection */}
      <div className="space-y-4">
        {/* Dealer forms */}
        {dealerForms.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-1.5">
              <Store size={14} /> Đại lý (Dealer)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {dealerForms.map(form => (
                <button
                  key={form.id}
                  onClick={() => setSelectedFormId(form.id)}
                  className={`relative p-5 rounded-xl border-2 transition-all duration-200 text-left ${
                    selectedFormId === form.id
                      ? 'border-blue-500 bg-blue-50/50 shadow-lg shadow-blue-500/10'
                      : 'border-[var(--color-border)] bg-white hover:border-blue-200 hover:shadow-md'
                  }`}
                >
                  {selectedFormId === form.id && (
                    <div className="absolute top-3 right-3 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mb-3 shadow-sm">
                    <Store size={20} className="text-white" />
                  </div>
                  <h3 className="text-base font-bold mb-0.5">{form.name}</h3>
                  <div className="text-xs text-blue-600 font-medium">
                    {form.question_count} câu hỏi • {form.version}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Craft forms */}
        {craftForms.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-1.5">
              <Wrench size={14} /> Thợ (Craft)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {craftForms.map(form => (
                <button
                  key={form.id}
                  onClick={() => setSelectedFormId(form.id)}
                  className={`relative p-5 rounded-xl border-2 transition-all duration-200 text-left ${
                    selectedFormId === form.id
                      ? 'border-violet-500 bg-violet-50/50 shadow-lg shadow-violet-500/10'
                      : 'border-[var(--color-border)] bg-white hover:border-violet-200 hover:shadow-md'
                  }`}
                >
                  {selectedFormId === form.id && (
                    <div className="absolute top-3 right-3 w-5 h-5 bg-violet-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center mb-3 shadow-sm">
                    <Wrench size={20} className="text-white" />
                  </div>
                  <h3 className="text-base font-bold mb-0.5">{form.name}</h3>
                  <div className="text-xs text-violet-600 font-medium">
                    {form.question_count} câu hỏi • {form.version}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">{error}</div>
      )}

      {/* Create button */}
      <button
        onClick={handleCreate}
        disabled={!selectedFormId || creating}
        className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-blue-600/25"
      >
        {creating ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <>
            Bắt đầu khảo sát
            <ArrowRight size={18} />
          </>
        )}
      </button>
    </div>
  );
}
