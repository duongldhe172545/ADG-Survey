/**
 * D2Com Survey — Results List Page
 * Pick a survey form to view aggregated results.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Store, Wrench, Loader2, Settings2 } from 'lucide-react';
import { formsApi, type SurveyForm } from '../services/api';

export default function ResultsListPage() {
  const [forms, setForms] = useState<SurveyForm[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    formsApi.list()
      .then(setForms)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-500" size={28} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
          <BarChart3 size={28} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold">Kết quả khảo sát</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Chọn bộ form để xem thống kê phản hồi
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {forms.map((f) => (
          <button
            key={f.id}
            onClick={() => navigate(`/results/${f.id}`)}
            className="relative p-6 rounded-xl border-2 border-[var(--color-border)] bg-white hover:border-blue-300 hover:shadow-lg transition-all duration-200 text-left group"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-sm ${
              f.type === 'dealer'
                ? 'bg-gradient-to-br from-blue-400 to-blue-600'
                : 'bg-gradient-to-br from-violet-400 to-violet-600'
            }`}>
              {f.type === 'dealer' ? (
                <Store size={24} className="text-white" />
              ) : (
                <Wrench size={24} className="text-white" />
              )}
            </div>
            <h3 className="text-lg font-bold mb-1">
              {f.type === 'dealer' ? 'Đại lý (Dealer)' : 'Thợ (Craft)'}
            </h3>
            <p className="text-sm text-[var(--color-text-muted)]">
              {f.name} {f.version} • {f.question_count} câu hỏi
            </p>
            <div className="mt-3 flex items-center justify-between">
              <div className={`text-xs font-medium ${
                f.type === 'dealer' ? 'text-blue-600' : 'text-violet-600'
              }`}>
                Xem kết quả →
              </div>
              <div
                onClick={(e) => { e.stopPropagation(); navigate(`/forms/${f.id}/edit`); }}
                className="text-xs text-gray-400 hover:text-violet-600 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-violet-50 transition-colors"
              >
                <Settings2 size={12} /> Sửa câu hỏi
              </div>
            </div>
          </button>
        ))}
      </div>

      {forms.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-[var(--color-border)]">
          <p className="text-[var(--color-text-muted)]">Chưa có bộ form nào</p>
        </div>
      )}
    </div>
  );
}
