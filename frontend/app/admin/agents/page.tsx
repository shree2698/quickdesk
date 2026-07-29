'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Pagination } from '@/components/ui/Pagination';
import { UserPlus, Trash2, Edit2, Shield, UserCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: 'EMPLOYEE' | 'AGENT' | 'ADMIN';
  createdAt: string;
}

export default function AdminAgentsPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<string>('AGENT');
  const [loading, setLoading] = useState(true);

  // Form / Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'EMPLOYEE' | 'AGENT' | 'ADMIN'>('AGENT');
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const pageSize = 10;

  const fetchUsers = useCallback(async (page: number, role: string) => {
    setLoading(true);
    try {
      const queryRole = role !== 'ALL' ? `&role=${role}` : '';
      const res = await api.get(`/users?page=${page}&limit=${pageSize}${queryRole}`);
      setUsers(res.data.data);
      setTotalUsers(res.data.total);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(currentPage, roleFilter);
  }, [currentPage, roleFilter, fetchUsers]);

  const openCreateModal = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('AGENT');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (user: UserItem) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setPassword('');
    setRole(user.role);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      if (editingUser) {
        // Update user
        interface UserPayload { name: string; email: string; role: string; password?: string; }
        const payload: UserPayload = { name, email, role };
        if (password.trim()) {
          payload.password = password;
        }
        await api.patch(`/users/${editingUser.id}`, payload);
        setSuccessMsg(`User ${name} updated successfully!`);
      } else {
        // Create user
        await api.post('/users', { name, email, password, role });
        setSuccessMsg(`Support Agent ${name} created successfully!`);
      }

      setIsModalOpen(false);
      fetchUsers(currentPage, roleFilter);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      setFormError(err.response?.data?.message || err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (user: UserItem) => {
    if (!confirm(`Are you sure you want to delete user ${user.name} (${user.email})?`)) return;

    try {
      await api.delete(`/users/${user.id}`);
      setSuccessMsg(`User ${user.name} deleted`);
      fetchUsers(currentPage, roleFilter);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      alert(err.response?.data?.message || err.message || 'Failed to delete user');
    }
  };

  const totalPages = Math.ceil(totalUsers / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            User & Agent Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create, update, and manage support agents, administrators, and employee credentials.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Add Support Agent</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-xl flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Role Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-3">
        {['AGENT', 'EMPLOYEE', 'ADMIN', 'ALL'].map((r) => (
          <button
            key={r}
            onClick={() => {
              setRoleFilter(r);
              setCurrentPage(1);
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
              roleFilter === r
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {r === 'ALL' ? 'All Roles' : `${r}s`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto glass-panel border border-slate-200 rounded-2xl shadow-2xs">
        <table className="w-full text-left text-sm text-slate-800">
          <thead className="bg-slate-50/80 text-xs uppercase text-slate-500 font-semibold border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Created Date</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500 text-xs">
                  Loading users list...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500 text-xs">
                  No users found for selected role filter.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-900">{u.name}</td>
                  <td className="px-6 py-4 text-slate-600 font-mono text-xs">{u.email}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold border rounded-md ${
                        u.role === 'ADMIN'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : u.role === 'AGENT'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {u.role === 'ADMIN' && <Shield className="w-3 h-3" />}
                      {u.role === 'AGENT' && <UserCheck className="w-3 h-3" />}
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {new Date(u.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => openEditModal(u)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(u)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium border border-rose-200 transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalUsers}
        pageSize={pageSize}
        onPageChange={(page) => setCurrentPage(page)}
      />

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingUser ? 'Edit User Credentials' : 'Add Support Agent / User'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Agent Sarah Jenkins"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 text-sm shadow-2xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="agent@company.com"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 text-sm shadow-2xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  {editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editingUser ? '••••••••' : 'Minimum 6 characters'}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 text-sm shadow-2xs"
                  required={!editingUser}
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Assigned Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'EMPLOYEE' | 'AGENT' | 'ADMIN')}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600 text-sm shadow-2xs"
                >
                  <option value="AGENT">Support Agent (Can resolve tickets)</option>
                  <option value="ADMIN">Administrator (Full Access)</option>
                  <option value="EMPLOYEE">Employee (Can submit tickets)</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white transition-colors text-xs font-semibold disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-2xs"
                >
                  {submitting ? 'Saving...' : editingUser ? 'Update User' : 'Create Agent Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
