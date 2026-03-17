/**
 * D2Com Survey — Dashboard Page
 * Overview stats: survey counts, types, pain clusters.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, ClipboardList, Users, FileCheck, PlusCircle,
  ArrowUpRight, Loader2, TrendingUp
} from 'lucide-react';
import { dashboardApi, type DashboardStats } from '../services/api';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Nháp', color: 'bg-gray-100 text-gray-600' },
  partial: { label: 'Đang làm', color: 'bg-amber-50 text-amber-700' },
  complete: { label: 'Hoàn thành', color: 'bg-emerald-50 text-emerald-700' },
  synced: { label: 'Đã đồng bộ', color: 'bg-blue-50 text-blue-700' },
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    dashboardApi.getStats()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
        {error}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Dashboard</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Tổng quan hệ thống khảo sát</p>
        </div>
        <button
          onClick={() => navigate('/surveys/new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/25"
        >
          <PlusCircle size={18} />
          Tạo khảo sát mới
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={ClipboardList}
          label="Tổng khảo sát"
          value={stats.total_surveys}
          color="blue"
        />
        <KPICard
          icon={Users}
          label="Tổng khách hàng"
          value={stats.total_customers}
          color="violet"
        />
        <KPICard
          icon={FileCheck}
          label="Hoàn thành"
          value={(stats.by_status.complete || 0) + (stats.by_status.synced || 0)}
          color="emerald"
        />
        <KPICard
          icon={TrendingUp}
          label="Đang làm"
          value={(stats.by_status.draft || 0) + (stats.by_status.partial || 0)}
          color="amber"
        />
      </div>

      {/* Detail grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Status */}
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-blue-500" />
            Theo trạng thái
          </h2>
          <div className="space-y-3">
            {Object.entries(stats.by_status).map(([status, count]) => {
              const info = STATUS_LABELS[status] || { label: status, color: 'bg-gray-100 text-gray-600' };
              const pct = stats.total_surveys ? Math.round((count / stats.total_surveys) * 100) : 0;
              return (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${info.color}`}>
                      {info.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm font-semibold w-8 text-right">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Type */}
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-violet-500" />
            Theo loại khách hàng
          </h2>
          <div className="space-y-4">
            {Object.entries(stats.by_type).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-sm font-medium capitalize">{type === 'dealer' ? 'Đại lý' : 'Thợ'}</span>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {type === 'dealer' ? 'Dealer Survey' : 'Craft Survey'}
                  </p>
                </div>
                <span className="text-2xl font-bold text-[var(--color-text)]">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── KPI Card Component ──

function KPICard({
  icon: Icon, label, value, color,
}: {
  icon: typeof ClipboardList;
  label: string;
  value: number;
  color: string;
}) {
  const colors: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    violet: 'from-violet-500 to-violet-600',
    emerald: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
  };

  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center shadow-sm`}>
          <Icon size={20} className="text-white" />
        </div>
        <ArrowUpRight size={16} className="text-[var(--color-text-muted)]" />
      </div>
      <p className="text-3xl font-bold mt-3">{value}</p>
      <p className="text-sm text-[var(--color-text-muted)] mt-1">{label}</p>
    </div>
  );
}
