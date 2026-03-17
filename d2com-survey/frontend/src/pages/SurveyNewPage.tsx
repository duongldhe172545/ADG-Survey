/**
 * D2Com Survey — New Survey Page
 * Select customer type and start a new survey.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Store, Wrench, ArrowRight, Loader2 } from 'lucide-react';
import { surveysApi } from '../services/api';

export default function SurveyNewPage() {
  const [selectedType, setSelectedType] = useState<'dealer' | 'craft' | ''>('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!selectedType) return;
    setCreating(true);
    setError('');

    try {
      const survey = await surveysApi.create({ customer_type: selectedType });
      navigate(`/surveys/${survey.id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
          <ClipboardList size={28} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold">Tạo khảo sát mới</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Chọn loại khách hàng để bắt đầu
        </p>
      </div>

      {/* Type selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Dealer */}
        <button
          onClick={() => setSelectedType('dealer')}
          className={`relative p-6 rounded-xl border-2 transition-all duration-200 text-left group ${
            selectedType === 'dealer'
              ? 'border-blue-500 bg-blue-50/50 shadow-lg shadow-blue-500/10'
              : 'border-[var(--color-border)] bg-white hover:border-blue-200 hover:shadow-md'
          }`}
        >
          {selectedType === 'dealer' && (
            <div className="absolute top-3 right-3 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mb-4 shadow-sm">
            <Store size={24} className="text-white" />
          </div>
          <h3 className="text-lg font-bold mb-1">Đại lý (Dealer)</h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            Khảo sát dành cho đại lý phân phối, bao gồm 20 câu hỏi về kinh doanh, thị trường, và nhu cầu.
          </p>
          <div className="mt-3 text-xs text-blue-600 font-medium">20 câu hỏi • Dealer Form v1</div>
        </button>

        {/* Craft */}
        <button
          onClick={() => setSelectedType('craft')}
          className={`relative p-6 rounded-xl border-2 transition-all duration-200 text-left group ${
            selectedType === 'craft'
              ? 'border-violet-500 bg-violet-50/50 shadow-lg shadow-violet-500/10'
              : 'border-[var(--color-border)] bg-white hover:border-violet-200 hover:shadow-md'
          }`}
        >
          {selectedType === 'craft' && (
            <div className="absolute top-3 right-3 w-5 h-5 bg-violet-500 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center mb-4 shadow-sm">
            <Wrench size={24} className="text-white" />
          </div>
          <h3 className="text-lg font-bold mb-1">Thợ (Craft)</h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            Khảo sát dành cho thợ thi công, bao gồm 18 câu hỏi về kỹ năng, vật liệu, và nhu cầu.
          </p>
          <div className="mt-3 text-xs text-violet-600 font-medium">18 câu hỏi • Craft Form v1</div>
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">{error}</div>
      )}

      {/* Create button */}
      <button
        onClick={handleCreate}
        disabled={!selectedType || creating}
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
