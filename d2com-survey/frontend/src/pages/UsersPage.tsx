/**
 * D2Com Survey — Users Management Page
 * Admin page to add/manage user emails for project access.
 */
import { useState, useEffect, useCallback } from 'react';
import { UserPlus, ToggleLeft, ToggleRight, Search } from 'lucide-react';
import { usersApi, type User } from '../services/api';

const ROLES = [
  { value: 'admin', label: 'Admin', color: 'bg-violet-100 text-violet-700' },
  { value: 'surveyor', label: 'Surveyor', color: 'bg-blue-100 text-blue-700' },
];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('surveyor');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      const data = await usersApi.list();
      setUsers(data);
    } catch {
      setError('Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleAdd = async () => {
    if (!newEmail.trim()) return;
    setAdding(true);
    setError('');
    try {
      await usersApi.create({
        email: newEmail.trim(),
        name: newName.trim() || newEmail.split('@')[0],
        role: newRole,
      });
      setNewEmail('');
      setNewName('');
      setNewRole('surveyor');
      setShowAdd(false);
      await fetchUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi thêm người dùng');
    } finally {
      setAdding(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await usersApi.update(user.id, { is_active: !user.is_active });
      await fetchUsers();
    } catch {
      setError('Lỗi cập nhật trạng thái');
    }
  };

  const handleRoleChange = async (user: User, role: string) => {
    try {
      await usersApi.update(user.id, { role });
      await fetchUsers();
    } catch {
      setError('Lỗi cập nhật role');
    }
  };

  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Người dùng</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Quản lý tài khoản truy cập hệ thống ({users.length} người)
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200 active:scale-95"
        >
          <UserPlus size={16} />
          Thêm người dùng
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-bold">✕</button>
        </div>
      )}

      {/* Add Form */}
      {showAdd && (
        <div className="mb-6 bg-white rounded-2xl border border-[var(--color-border)] p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
            <UserPlus size={16} className="text-blue-600" />
            Thêm người dùng mới
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="email"
              placeholder="Email *"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="px-4 py-2.5 border border-[var(--color-border)] rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <input
              type="text"
              placeholder="Tên (tự động từ email)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="px-4 py-2.5 border border-[var(--color-border)] rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
            <div className="flex gap-2">
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="flex-1 px-3 py-2.5 border border-[var(--color-border)] rounded-xl text-sm focus:border-blue-500 outline-none bg-white"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <button
                onClick={handleAdd}
                disabled={adding || !newEmail.trim()}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {adding ? '...' : 'Thêm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <input
          type="text"
          placeholder="Tìm theo email hoặc tên..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-[var(--color-border)] rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-gray-50/50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Người dùng</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Role</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Trạng thái</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-sm text-[var(--color-text-muted)]">
                  {search ? 'Không tìm thấy người dùng' : 'Chưa có người dùng nào'}
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-gray-50/50 transition-colors">
                  {/* User info */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {u.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--color-text)]">{u.name}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">{u.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-5 py-4">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u, e.target.value)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--color-border)] bg-white cursor-pointer focus:border-blue-500 outline-none"
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                      u.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {u.is_active ? 'Hoạt động' : 'Vô hiệu'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => handleToggleActive(u)}
                      className={`p-2 rounded-lg transition-colors ${
                        u.is_active
                          ? 'hover:bg-orange-50 text-[var(--color-text-muted)] hover:text-orange-600'
                          : 'hover:bg-green-50 text-[var(--color-text-muted)] hover:text-green-600'
                      }`}
                      title={u.is_active ? 'Vô hiệu hóa' : 'Kích hoạt'}
                    >
                      {u.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
