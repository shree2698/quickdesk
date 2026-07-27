'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useSocket } from '@/lib/SocketContext';
import Link from 'next/link';
import {
  LayoutDashboard,
  Search,
  Filter,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function AgentDashboardPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [search, setSearch] = useState('');
  const { socket } = useSocket();

  const fetchTickets = async () => {
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (search) params.search = search;

      const res = await api.get('/tickets', { params });
      setTickets(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load ticket queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, categoryFilter, priorityFilter, search]);

  // Real-time listener for new tickets submitted by employees
  useEffect(() => {
    if (!socket) return;

    socket.on('ticket:new', (newTicket: any) => {
      setTickets((prev) => [newTicket, ...prev]);
    });

    socket.on('ticket_updated', (updated: any) => {
      setTickets((prev) =>
        prev.map((t) => (t.id === updated.ticketId ? { ...t, ...updated } : t)),
      );
    });

    return () => {
      socket.off('ticket:new');
      socket.off('ticket_updated');
    };
  }, [socket]);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
          <LayoutDashboard className="w-6 h-6 text-blue-600" />
          Agent Ticket Queue
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Support agent workspace. New tickets appear live in real-time.
        </p>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center gap-4 shadow-2xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ticket title..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 text-sm shadow-2xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5" />
            Filters:
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600 shadow-2xs"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600 shadow-2xs"
          >
            <option value="">All Categories</option>
            <option value="IT">IT</option>
            <option value="HR">HR</option>
            <option value="FINANCE">FINANCE</option>
            <option value="GENERAL">GENERAL</option>
            <option value="OTHER">OTHER</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600 shadow-2xs"
          >
            <option value="">All Priorities</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="URGENT">URGENT</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-12 text-slate-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : tickets.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl text-slate-500">
          No tickets found matching the selected filters.
        </div>
      ) : (
        <div className="grid gap-4">
          {tickets.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/agent/tickets/${ticket.id}`}
              className="glass-panel glass-panel-hover p-6 rounded-2xl border border-slate-200 transition-all block space-y-3 shadow-2xs hover:shadow-xs"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                    <span className="font-medium text-slate-700">Raised by {ticket.employee?.name}</span>
                    <span>•</span>
                    <span>{new Date(ticket.createdAt).toLocaleString()}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 hover:text-blue-600 transition-colors">
                    {ticket.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                      ticket.status === 'RESOLVED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {ticket.status === 'RESOLVED' ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                    {ticket.status}
                  </span>
                </div>
              </div>

              <p className="text-sm text-slate-600 line-clamp-2">{ticket.description}</p>

              <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 text-xs">
                <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Category: {ticket.category}
                </span>

                <span
                  className={`px-2.5 py-1 rounded-md font-medium border ${
                    ticket.priority === 'URGENT' || ticket.priority === 'HIGH'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  }`}
                >
                  Priority: {ticket.priority}
                </span>

                {ticket.attachmentFilename && (
                  <span className="text-slate-500 font-medium">
                    📎 {ticket.attachmentFilename}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
