/**
 * D2Com Survey — Survey List Page
 * Filterable list of all surveys with status badges and progress.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, PlusCircle, ChevronRight, Loader2, ClipboardList,
  Clock
} from 'lucide-react';
import { surveysApi, type SurveyItem } from '../services/api';

const STATUS_CONFIG: Record<string, { badge: string; label: string }> = {
  draft: { badge: 'badge-draft', label: 'Nháp' },
  partial: { badge: 'badge-partial', label: 'Đang làm' },
  complete: { badge: 'badge-complete', label: 'Hoàn thành' },
  synced: { badge: 'badge-synced', label: 'Đã đồng bộ' },
};

export default function SurveyListPage() {
  const [surveys, setSurveys] = useState<SurveyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const fetchSurveys = () => {
    setLoading(true);
    surveysApi.list({
      status: statusFilter || undefined,
      customer_type: typeFilter || undefined,
      search: search || undefined,
    })
      .then(setSurveys)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSurveys(); }, [statusFilter, typeFilter]);

  const handleSearch = () => { fetchSurveys(); };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Danh sách khảo sát</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {surveys.length} khảo sát
          </p>
        </div>
        <button
          onClick={() => navigate('/surveys/new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/25"
        >
          <PlusCircle size={18} />
          Tạo mới
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[200px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Tìm theo tên khách..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-[var(--color-border)] rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
          />
        </div>
        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-white border border-[var(--color-border)] rounded-xl text-sm focus:border-blue-500 outline-none cursor-pointer"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="draft">Nháp</option>
          <option value="partial">Đang làm</option>
          <option value="complete">Hoàn thành</option>
          <option value="synced">Đã đồng bộ</option>
        </select>
        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2.5 bg-white border border-[var(--color-border)] rounded-xl text-sm focus:border-blue-500 outline-none cursor-pointer"
        >
          <option value="">Tất cả loại</option>
          <option value="dealer">Đại lý</option>
          <option value="craft">Thợ</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="animate-spin text-blue-500" size={28} />
        </div>
      )}

      {/* Empty state */}
      {!loading && surveys.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-[var(--color-border)]">
          <ClipboardList size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-[var(--color-text-muted)]">Chưa có khảo sát nào</p>
          <button
            onClick={() => navigate('/surveys/new')}
            className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Tạo khảo sát đầu tiên →
          </button>
        </div>
      )}

      {/* Survey list */}
      {!loading && surveys.length > 0 && (
        <div className="space-y-2">
          {surveys.map((s, i) => (
            <div
              key={s.id}
              onClick={() => navigate(`/surveys/${s.id}`)}
              className="bg-white rounded-xl border border-[var(--color-border)] p-4 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group animate-slideIn"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  {/* Resp ID badge */}
                  <div className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 ${
                    s.customer_type === 'dealer'
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-violet-50 text-violet-700'
                  }`}>
                    {s.customer_resp_id}
                  </div>

                  {/* Info */}
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {s.customer_name || <span className="text-[var(--color-text-muted)] italic">Chưa có tên</span>}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-[var(--color-text-muted)]">
                      <span>{s.form_name} {s.form_version}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(s.updated_at).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  {/* Progress */}
                  <div className="text-right">
                    <p className="text-sm font-semibold">{s.answered_count}/{s.total_questions}</p>
                    <div className="w-20 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${s.total_questions ? (s.answered_count / s.total_questions) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Status */}
                  <span className={`badge ${STATUS_CONFIG[s.status]?.badge || 'badge-draft'}`}>
                    {STATUS_CONFIG[s.status]?.label || s.status}
                  </span>

                  <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
