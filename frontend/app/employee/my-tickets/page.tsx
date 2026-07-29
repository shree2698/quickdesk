'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Sparkles,
  Ticket,
  CheckCircle2,
  Clock,
  MessageSquare,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  User,
  Send,
} from 'lucide-react';
import Link from 'next/link';
import { MarkdownViewer } from '@/components/ui/MarkdownViewer';
import { Pagination } from '@/components/ui/Pagination';

interface MessageItem {
  id: string;
  text: string;
  createdAt: string;
  sender?: { name: string; role: string };
}

interface TicketItem {
  id: string;
  title: string;
  description: string;
  status: string;
  category: string;
  priority: string;
  createdAt: string;
  finalReply?: string;
  ragCitations?: string[];
  messages?: MessageItem[];
}

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [totalTickets, setTotalTickets] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [detailedTickets, setDetailedTickets] = useState<Record<string, TicketItem>>({});
  const [replyInput, setReplyInput] = useState<Record<string, string>>({});
  const [replyLoading, setReplyLoading] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const fetchTickets = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const res = await api.get('/tickets', {
        params: { page, limit: pageSize },
      });
      if (res.data && Array.isArray(res.data.data)) {
        setTickets(res.data.data);
        setTotalTickets(res.data.total);
      } else if (Array.isArray(res.data)) {
        setTickets(res.data);
        setTotalTickets(res.data.length);
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      setError(err.response?.data?.message || err.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTicketDetails = async (ticketId: string) => {
    try {
      const res = await api.get(`/tickets/${ticketId}`);
      setDetailedTickets((prev) => ({ ...prev, [ticketId]: res.data }));
    } catch (_err) {
      // Non-critical
    }
  };

  const toggleExpand = (ticketId: string) => {
    if (expandedTicketId === ticketId) {
      setExpandedTicketId(null);
    } else {
      setExpandedTicketId(ticketId);
      if (!detailedTickets[ticketId]) {
        fetchTicketDetails(ticketId);
      }
    }
  };

  const handleSendEmployeeReply = async (ticketId: string) => {
    const text = replyInput[ticketId];
    if (!text || !text.trim()) return;

    setReplyLoading((prev) => ({ ...prev, [ticketId]: true }));
    try {
      const res = await api.post(`/tickets/${ticketId}/reply`, {
        finalReply: text,
      });
      setDetailedTickets((prev) => ({ ...prev, [ticketId]: res.data }));
      setReplyInput((prev) => ({ ...prev, [ticketId]: '' }));
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      setError(err.response?.data?.message || err.message || 'Failed to send reply message');
    } finally {
      setReplyLoading((prev) => ({ ...prev, [ticketId]: false }));
    }
  };

  useEffect(() => {
    fetchTickets(currentPage);
  }, [currentPage, fetchTickets]);

  const totalPages = Math.ceil(totalTickets / pageSize);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Ticket className="w-6 h-6 text-blue-600" />
            My Tickets
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track and view live resolution updates and send replies to the support team.
          </p>
        </div>

        <Link
          href="/employee/submit-ticket"
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
        >
          Submit Ticket
        </Link>
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
        <div className="glass-panel p-12 text-center rounded-2xl space-y-4 border border-slate-200 shadow-2xs">
          <Ticket className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-lg font-semibold text-slate-900">No Tickets Raised Yet</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            You haven&apos;t submitted any support requests yet. Click below to submit a ticket.
          </p>
          <Link
            href="/employee/submit-ticket"
            className="inline-flex px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-xs"
          >
            Submit Ticket
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4">
            {tickets.map((ticket) => {
              const isExpanded = expandedTicketId === ticket.id;
              const detail = detailedTickets[ticket.id] || ticket;
              const messagesList = detail.messages || [];

              return (
                <div
                  key={ticket.id}
                  className="glass-panel p-6 rounded-2xl border border-slate-200 transition-all space-y-4 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{ticket.title}</h3>
                      <p className="text-xs text-slate-500 mt-1 font-medium">
                        Submitted on {new Date(ticket.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
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
                          <Clock className="w-3.5 h-3.5 animate-pulse" />
                        )}
                        {ticket.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{ticket.description}</p>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-medium flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Category: {ticket.category}
                      </span>

                      <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                        Priority: {ticket.priority}
                      </span>
                    </div>

                    <button
                      onClick={() => toggleExpand(ticket.id)}
                      className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>
                        {isExpanded ? 'Hide Conversation' : 'View Conversation & Replies'}
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {ticket.finalReply && (
                    <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                      <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block">
                        ✓ Final Resolution Response:
                      </span>
                      <MarkdownViewer content={ticket.finalReply} className="text-sm text-slate-800" />

                      {ticket.ragCitations && ticket.ragCitations.length > 0 && (
                        <div className="pt-2 border-t border-emerald-200 space-y-1">
                          <span className="text-[10px] uppercase font-semibold text-emerald-700 tracking-wider block">
                            Grounding Knowledge Citations:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {ticket.ragCitations.map((c: string, i: number) => (
                              <span key={i} className="px-2 py-0.5 rounded bg-emerald-100 border border-emerald-300 text-[10px] text-emerald-800 flex items-center gap-1 font-medium">
                                <FileText className="w-3 h-3" />
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {isExpanded && (
                    <div className="pt-4 border-t border-slate-200 space-y-4">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-blue-600" />
                        Live Support Conversation History
                      </h4>

                      {messagesList.length === 0 && !ticket.finalReply ? (
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
                          An agent is reviewing your ticket. You can type a message below to reach out.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {messagesList.map((msg: MessageItem) => (
                            <div
                              key={msg.id}
                              className={`p-4 rounded-xl border text-sm space-y-1.5 shadow-2xs ${
                                msg.sender?.role === 'EMPLOYEE'
                                  ? 'bg-blue-50/70 border-blue-200 text-slate-900 ml-6'
                                  : 'bg-slate-50 border-slate-200 text-slate-900 mr-6'
                              }`}
                            >
                              <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-200/60 pb-1.5 font-medium">
                                <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                                  <User className="w-3.5 h-3.5 text-blue-600" />
                                  {msg.sender?.name || 'User'} ({msg.sender?.role || 'EMPLOYEE'})
                                </span>
                                <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                              </div>
                              <MarkdownViewer content={msg.text} className="text-slate-800 text-sm" />
                            </div>
                          ))}
                        </div>
                      )}

                      {ticket.status !== 'RESOLVED' && (
                        <div className="pt-3 flex gap-2">
                          <input
                            type="text"
                            value={replyInput[ticket.id] || ''}
                            onChange={(e) =>
                              setReplyInput((prev) => ({ ...prev, [ticket.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendEmployeeReply(ticket.id);
                              }
                            }}
                            placeholder="Type a reply or follow-up message to the support team..."
                            className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 text-sm shadow-2xs"
                          />
                          <button
                            onClick={() => handleSendEmployeeReply(ticket.id)}
                            disabled={replyLoading[ticket.id] || !(replyInput[ticket.id] || '').trim()}
                            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            {replyLoading[ticket.id] ? 'Sending...' : 'Send Reply'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalTickets}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      )}
    </div>
  );
}
