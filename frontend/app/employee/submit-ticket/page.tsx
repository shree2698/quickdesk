'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Sparkles, Paperclip, Send, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SubmitTicketPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [attachmentFilename, setAttachmentFilename] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdTicket, setCreatedTicket] = useState<any>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/tickets', {
        title,
        description,
        attachmentFilename: attachmentFilename.trim() || undefined,
      });

      setCreatedTicket(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
          <Send className="w-6 h-6 text-blue-400" />
          Submit Support Ticket
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Report an issue to our IT, HR, or Support team. AI will automatically predict category & priority.
        </p>
      </div>

      {createdTicket ? (
        <div className="glass-panel p-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-6">
          <div className="flex items-center gap-3 text-emerald-400">
            <CheckCircle2 className="w-7 h-7" />
            <div>
              <h2 className="text-lg font-semibold text-white">Ticket Created Successfully!</h2>
              <p className="text-xs text-emerald-400/80">Ticket ID: {createdTicket.id}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#131a27] border border-[#2a364f] space-y-3">
            <h3 className="font-semibold text-white text-base">{createdTicket.title}</h3>
            <p className="text-sm text-slate-300">{createdTicket.description}</p>

            <div className="pt-3 border-t border-[#2a364f] flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Category:</span>
                <span className="px-2.5 py-1 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30 font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {createdTicket.category} (AI-suggested)
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Priority:</span>
                <span className="px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {createdTicket.priority} (AI-suggested)
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => router.push('/employee/my-tickets')}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-blue-600/25"
            >
              View My Tickets
            </button>
            <button
              onClick={() => {
                setCreatedTicket(null);
                setTitle('');
                setDescription('');
                setAttachmentFilename('');
              }}
              className="px-5 py-2.5 bg-[#1a2332] hover:bg-[#222d40] text-slate-300 text-sm font-medium rounded-xl border border-[#2a364f] transition-colors"
            >
              Submit Another Ticket
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="glass-panel p-8 rounded-2xl space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Ticket Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g., VPN fails to connect after macOS update"
              className="w-full px-4 py-3 bg-[#131a27] border border-[#2a364f] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Issue Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={5}
              placeholder="Provide exact details of the error message, steps to reproduce, or system affected..."
              className="w-full px-4 py-3 bg-[#131a27] border border-[#2a364f] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Attachment Filename (Optional)
            </label>
            <div className="relative">
              <Paperclip className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={attachmentFilename}
                onChange={(e) => setAttachmentFilename(e.target.value)}
                placeholder="vpn-error-screenshot.png"
                className="w-full pl-10 pr-4 py-2.5 bg-[#131a27] border border-[#2a364f] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors shadow-lg shadow-blue-600/25 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {loading ? 'Submitting & Classifying with AI...' : 'Submit Ticket'}
          </button>
        </form>
      )}
    </div>
  );
}
