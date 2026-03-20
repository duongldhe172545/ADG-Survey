/**
 * D2Com Survey — App Layout
 * Responsive: sidebar on desktop, bottom nav + slide-out menu on mobile.
 */
import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, PlusCircle, Users, LogOut,
  ChevronRight, Menu, X, BarChart3, Settings2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/surveys', icon: ClipboardList, label: 'Khảo sát' },
  { to: '/surveys/new', icon: PlusCircle, label: 'Tạo mới' },
  { to: '/results', icon: BarChart3, label: 'Kết quả' },
  { to: '/forms', icon: Settings2, label: 'Bộ câu hỏi' },
  { to: '/settings/users', icon: Users, label: 'Người dùng' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen flex bg-[var(--color-bg)]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar — hidden on mobile, slide-out when open */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        w-64 bg-white border-r border-[var(--color-border)] flex flex-col shrink-0
        transform transition-transform duration-200 ease-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
              <span className="text-white text-sm font-bold">D2</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-[var(--color-text)]">D2Com Survey</h1>
              <p className="text-[10px] text-[var(--color-text-muted)]">Hệ thống khảo sát</p>
            </div>
          </div>
          {/* Close button (mobile only) */}
          <button
            onClick={closeSidebar}
            className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 text-[var(--color-text-muted)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-3 space-y-0.5">
          <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider px-3 mb-2">
            Menu chính
          </p>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-[var(--color-text-muted)] hover:bg-gray-50 hover:text-[var(--color-text)]'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User info + Logout */}
        <div className="border-t border-[var(--color-border)] p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-[var(--color-text-muted)] truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-red-50 text-[var(--color-text-muted)] hover:text-red-500 transition-colors"
              title="Đăng xuất"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 bg-white border-b border-[var(--color-border)] flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="flex items-center gap-3">
            {/* Hamburger (mobile only) */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 text-[var(--color-text-muted)]"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
              <span>D2Com</span>
              <ChevronRight size={14} />
              <span className="text-[var(--color-text)] font-medium">Survey</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse-dot" />
            <span className="text-xs text-[var(--color-text-muted)]">Online</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
