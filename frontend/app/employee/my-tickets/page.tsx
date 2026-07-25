'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useSocket } from '@/lib/SocketContext';
import { Sparkles, Ticket, CheckCircle2, Clock, MessageSquare, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { socket } = useSocket();

  const fetchTickets = async () => {
    try {
      const res = await api.get('/tickets');
      setTickets(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // Listen for real-time status changes via Socket.io
  useEffect(() => {
    if (!socket) return;

    socket.on('ticket:resolved', (resolvedTicket: any) => {
      setTickets((prev) =>
        prev.map((t) => (t.id === resolvedTicket.id ? resolvedTicket : t)),
      );
    });

    return () => {
      socket.off('ticket:resolved');
    };
  }, [socket]);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <Ticket className="w-6 h-6 text-blue-400" />
            My Tickets
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track and view status of support tickets submitted by you. Updates flip live without refresh.
          </p>
        </div>

        <Link
          href="/employee/submit-ticket"
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-blue-600/25 flex items-center gap-2"
        >
          Submit Ticket
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-12 text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : tickets.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl space-y-4">
          <Ticket className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-semibold text-white">No Tickets Raised Yet</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            You haven't submitted any support requests yet. Click below to submit a ticket.
          </p>
          <Link
            href="/employee/submit-ticket"
            className="inline-flex px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-blue-600/25"
          >
            Submit Ticket
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="glass-panel glass-panel-hover p-6 rounded-2xl border border-[#2a364f] transition-all space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{ticket.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Submitted on {new Date(ticket.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                      ticket.status === 'RESOLVED'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {ticket.status === 'RESOLVED' ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 animate-pulse" />
                    )}
                    {ticket.status}
                  </span>
                </div>
              </div>

              <p className="text-sm text-slate-300 line-clamp-2">{ticket.description}</p>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#2a364f]/60 text-xs">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {ticket.category}
                  </span>

                  <span className="px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                    Priority: {ticket.priority}
                  </span>
                </div>

                {ticket.finalReply && (
                  <div className="text-emerald-400 flex items-center gap-1.5 font-medium">
                    <MessageSquare className="w-4 h-4" />
                    Agent Replied
                  </div>
                )}
              </div>

              {ticket.finalReply && (
                <div className="mt-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1.5">
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">
                    Agent Resolution Response:
                  </span>
                  <p className="text-sm text-slate-200 whitespace-pre-wrap">{ticket.finalReply}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
