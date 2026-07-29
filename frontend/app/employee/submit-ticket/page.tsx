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
  interface CreatedTicket {
    id: string;
    title: string;
    description: string;
    category: string;
    priority: string;
  }
  const [createdTicket, setCreatedTicket] = useState<CreatedTicket | null>(null);
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
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      setError(err.response?.data?.message || err.message || 'Failed to submit ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
          <Send className="w-6 h-6 text-blue-600" />
          Submit Support Ticket
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Report an issue to our IT, HR, or Support team. AI will automatically predict category & priority.
        </p>
      </div>

      {createdTicket ? (
        <div className="glass-panel p-8 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-6 shadow-2xs">
          <div className="flex items-center gap-3 text-emerald-700">
            <CheckCircle2 className="w-7 h-7" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Ticket Created Successfully!</h2>
              <p className="text-xs text-emerald-700/80">Ticket ID: {createdTicket.id}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3 shadow-2xs">
            <h3 className="font-semibold text-slate-900 text-base">{createdTicket.title}</h3>
            <p className="text-sm text-slate-700">{createdTicket.description}</p>

            <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Category:</span>
                <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {createdTicket.category} (AI-suggested)
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Priority:</span>
                <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {createdTicket.priority} (AI-suggested)
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => router.push('/employee/my-tickets')}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-xs cursor-pointer"
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
              className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-xl border border-slate-200 transition-colors shadow-2xs cursor-pointer"
            >
              Submit Another Ticket
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="glass-panel p-8 rounded-2xl space-y-6 shadow-2xs border border-slate-200">
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
              Ticket Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g., VPN fails to connect after macOS update"
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition-colors shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
              Issue Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={5}
              placeholder="Provide exact details of the error message, steps to reproduce, or system affected..."
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition-colors shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
              Attachment Filename (Optional)
            </label>
            <div className="relative">
              <Paperclip className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={attachmentFilename}
                onChange={(e) => setAttachmentFilename(e.target.value)}
                placeholder="vpn-error-screenshot.png"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition-colors shadow-2xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            {loading ? 'Submitting & Classifying with AI...' : 'Submit Ticket'}
          </button>
        </form>
      )}
    </div>
  );
}
