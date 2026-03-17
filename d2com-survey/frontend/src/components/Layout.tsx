/**
 * D2Com Survey — App Layout
 * Sidebar + Header + Main content area.
 */
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, PlusCircle, Users, Settings, LogOut,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/surveys', icon: ClipboardList, label: 'Khảo sát' },
  { to: '/surveys/new', icon: PlusCircle, label: 'Tạo mới' },
];

const ADMIN_ITEMS = [
  { to: '/settings/users', icon: Users, label: 'Người dùng' },
  { to: '/settings', icon: Settings, label: 'Cài đặt' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-[var(--color-bg)]">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-[var(--color-border)] flex flex-col shrink-0">
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
              <span className="text-white text-sm font-bold">D2</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-[var(--color-text)]">D2Com Survey</h1>
              <p className="text-[10px] text-[var(--color-text-muted)]">Hệ thống khảo sát</p>
            </div>
          </div>
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

          {user?.role === 'admin' && (
            <>
              <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider px-3 mt-5 mb-2">
                Quản trị
              </p>
              {ADMIN_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
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
            </>
          )}
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
        <header className="h-16 bg-white border-b border-[var(--color-border)] flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <span>D2Com</span>
            <ChevronRight size={14} />
            <span className="text-[var(--color-text)] font-medium">Survey</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse-dot" />
            <span className="text-xs text-[var(--color-text-muted)]">Online</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
