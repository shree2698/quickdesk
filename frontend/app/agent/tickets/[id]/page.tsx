'use client';

import { use, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useSocket } from '@/lib/SocketContext';
import {
  Sparkles,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Send,
  History,
  Bot,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { MarkdownViewer } from '@/components/ui/MarkdownViewer';

export default function AgentTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const ticketId = resolvedParams.id;

  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Agent override controls
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('');
  const [overrideLoading, setOverrideLoading] = useState(false);

  // AI Copilot state
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotDraft, setCopilotDraft] = useState('');
  const [copilotCitations, setCopilotCitations] = useState<any[]>([]);
  const [draftCopied, setDraftCopied] = useState(false);
  // Reply state
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [resolveLoading, setResolveLoading] = useState(false);

  // Audit log history
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const { socket } = useSocket();

  const fetchTicketDetail = async () => {
    try {
      const res = await api.get(`/tickets/${ticketId}`);
      setTicket(res.data);
      setCategory(res.data.category);
      setPriority(res.data.priority);
      if (res.data.aiDraftReply) setCopilotDraft(res.data.aiDraftReply);
      fetchAuditLogs();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load ticket detail');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await api.get(`/tickets/${ticketId}/audit-log`);
      setAuditLogs(res.data);
    } catch (err) {
      // Non-critical
    }
  };

  useEffect(() => {
    fetchTicketDetail();
  }, [ticketId]);

  // Join ticket room on mount for socket events
  useEffect(() => {
    if (!socket || !ticketId) return;

    socket.emit('join_ticket', { ticketId });

    return () => {
      socket.emit('leave_ticket', { ticketId });
    };
  }, [socket, ticketId]);

  const handleCategoryChange = async (newCat: string) => {
    setCategory(newCat);
    setOverrideLoading(true);
    try {
      await api.patch(`/tickets/${ticketId}/category`, { category: newCat });
      fetchAuditLogs();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update category');
    } finally {
      setOverrideLoading(false);
    }
  };

  const handlePriorityChange = async (newPrio: string) => {
    setPriority(newPrio);
    setOverrideLoading(true);
    try {
      await api.patch(`/tickets/${ticketId}/priority`, { priority: newPrio });
      fetchAuditLogs();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update priority');
    } finally {
      setOverrideLoading(false);
    }
  };

  const handleUseDraft = (draftText?: string) => {
    const textToUse = draftText || copilotDraft;
    if (!textToUse) return;

    setReplyText(textToUse);
    setDraftCopied(true);
    setTimeout(() => setDraftCopied(false), 3000);

    setTimeout(() => {
      const editor = document.getElementById('reply-editor') as HTMLTextAreaElement;
      if (editor) {
        editor.scrollIntoView({ behavior: 'smooth', block: 'center' });
        editor.focus();
      }
    }, 100);
  };

  const handleGenerateCopilot = async () => {
    setCopilotLoading(true);
    try {
      const res = await api.post(`/tickets/${ticketId}/copilot-suggest`);
      const newSuggestion = res.data.suggestion || '';
      setCopilotDraft(newSuggestion);
      const rawCitations = res.data.citations || res.data.ragCitations || [];
      setCopilotCitations(rawCitations);
      handleUseDraft(newSuggestion);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate AI copilot draft');
    } finally {
      setCopilotLoading(false);
    }
  };

  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyText.trim()) return;

    const citationsList =
      copilotCitations?.map((c) => (typeof c === 'string' ? c : c.title)).filter(Boolean) ||
      ticket?.ragCitations ||
      [];

    setReplyLoading(true);
    try {
      const res = await api.post(`/tickets/${ticketId}/reply`, {
        finalReply: replyText,
        ragCitations: citationsList,
      });
      setTicket(res.data);
      setReplyText('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send reply message');
    } finally {
      setReplyLoading(false);
    }
  };

  const handleResolveTicket = async () => {
    const citationsList =
      copilotCitations?.map((c) => (typeof c === 'string' ? c : c.title)).filter(Boolean) ||
      ticket?.ragCitations ||
      [];

    setResolveLoading(true);
    try {
      const res = await api.post(`/tickets/${ticketId}/resolve`, {
        finalReply: replyText.trim() ? replyText : undefined,
        ragCitations: citationsList,
      });
      setTicket(res.data);
      setReplyText('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resolve ticket');
    } finally {
      setResolveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-slate-400">
        Ticket not found.
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <Link
          href="/agent/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-400 transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Ticket Queue
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white tracking-tight">{ticket.title}</h1>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
              ticket.status === 'RESOLVED'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}
          >
            {ticket.status === 'RESOLVED' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
            {ticket.status}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Ticket Original Info + Copilot + Reply */}
        <div className="lg:col-span-2 space-y-6">
          {/* Original Ticket Description Card */}
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-3 text-xs text-slate-400 border-b border-[#2a364f] pb-3">
              <User className="w-4 h-4 text-blue-400" />
              <span>
                Employee: <strong className="text-white">{ticket.employee?.name}</strong> ({ticket.employee?.email})
              </span>
            </div>

            <p className="text-sm text-slate-200 whitespace-pre-wrap">{ticket.description}</p>

            {ticket.attachmentFilename && (
              <div className="pt-3 text-xs text-slate-400">
                Attachment: <span className="text-blue-400 font-medium">📎 {ticket.attachmentFilename}</span>
              </div>
            )}
          </div>

          {/* AI Copilot Suggestion Pane */}
          <div className="glass-panel p-6 rounded-2xl border border-blue-500/30 bg-blue-500/5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm">
                <Bot className="w-5 h-5" />
                AI Copilot Draft Assistant
              </div>

              <button
                onClick={handleGenerateCopilot}
                disabled={copilotLoading}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors shadow flex items-center gap-1.5 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {copilotLoading ? 'Generating...' : 'Generate AI Draft'}
              </button>
            </div>

            {copilotDraft ? (
              <div className="p-4 rounded-xl bg-[#131a27] border border-[#2a364f] space-y-3">
                <MarkdownViewer content={copilotDraft} className="text-xs text-slate-300" />

                {((copilotCitations && copilotCitations.length > 0) || (ticket?.ragCitations && ticket.ragCitations.length > 0)) && (
                  <div className="pt-2 border-t border-[#2a364f] space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-blue-400 tracking-wider">
                      Grounding Citations:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {(copilotCitations.length > 0 ? copilotCitations : ticket.ragCitations).map((c: any, i: number) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-300 flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {typeof c === 'string' ? c : c.title || 'Knowledge Base'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleUseDraft(copilotDraft)}
                  className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors cursor-pointer bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg"
                >
                  {draftCopied ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">Copied to reply editor below!</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Use this draft in reply editor ↓</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Click "Generate AI Draft" to use RAG grounding over internal Knowledge Base guides.
              </p>
            )}
          </div>

          {/* Reply Editor & Separate Actions */}
          {ticket.status !== 'RESOLVED' ? (
            <form onSubmit={handleSendReply} className="glass-panel p-6 rounded-2xl space-y-4">
              <h3 className="font-semibold text-white text-sm flex items-center justify-between">
                <span>Agent Reply Editor</span>
                {draftCopied && (
                  <span className="text-xs text-emerald-400 font-medium animate-pulse">
                    ✓ Populated from AI Draft
                  </span>
                )}
              </h3>

              <textarea
                id="reply-editor"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={4}
                placeholder="Type a chat reply or edit AI draft here..."
                className="w-full px-4 py-3 bg-[#131a27] border border-[#2a364f] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm transition-all"
              />

              <div className="flex items-center gap-3 pt-2">
                {/* Action 1: Send Chat Message */}
                <button
                  type="submit"
                  disabled={replyLoading || !replyText.trim()}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors shadow-lg shadow-blue-600/20 text-xs disabled:opacity-50 flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  {replyLoading ? 'Sending Reply...' : 'Send Reply Message'}
                </button>

                {/* Action 2: Resolve Ticket */}
                <button
                  type="button"
                  onClick={handleResolveTicket}
                  disabled={resolveLoading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors shadow-lg shadow-emerald-600/20 text-xs disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {resolveLoading ? 'Resolving...' : 'Mark Ticket Resolved'}
                </button>
              </div>
            </form>
          ) : (
            <div className="glass-panel p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">
                Final Sent Resolution Reply:
              </span>
              <MarkdownViewer content={ticket.finalReply || 'Ticket resolved.'} className="text-sm text-slate-200" />

              {ticket.ragCitations && ticket.ragCitations.length > 0 && (
                <div className="pt-2 border-t border-emerald-500/20 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-emerald-400 tracking-wider">
                    Resolved Grounding Citations:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {ticket.ragCitations.map((c: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-300 flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Col: Category / Priority Overrides + Audit Log */}
        <div className="space-y-6">
          {/* Agent Override Controls */}
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="font-semibold text-white text-sm">AI Override Controls</h3>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                disabled={overrideLoading}
                className="w-full px-3 py-2 bg-[#131a27] border border-[#2a364f] rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="IT">IT</option>
                <option value="HR">HR</option>
                <option value="FINANCE">FINANCE</option>
                <option value="GENERAL">GENERAL</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Priority</label>
              <select
                value={priority}
                onChange={(e) => handlePriorityChange(e.target.value)}
                disabled={overrideLoading}
                className="w-full px-3 py-2 bg-[#131a27] border border-[#2a364f] rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </select>
            </div>
          </div>

          {/* Audit Trail Section */}
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <History className="w-4 h-4 text-blue-400" />
              Override Audit Trail
            </h3>

            {auditLogs.length === 0 ? (
              <p className="text-xs text-slate-500">No category or priority overrides recorded.</p>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-xl bg-[#131a27] border border-[#2a364f] text-xs space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>{log.changedBy?.name}</span>
                      <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-white">
                      Changed <strong className="text-blue-400">{log.field}</strong> from{' '}
                      <span className="text-slate-400">{log.oldValue}</span> →{' '}
                      <span className="text-emerald-400">{log.newValue}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
