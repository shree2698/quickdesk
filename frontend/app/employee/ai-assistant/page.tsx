'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Bot, Send, FileText, PlusCircle,MessageCircleQuestionMark } from 'lucide-react';
import Link from 'next/link';
import { MarkdownViewer } from '@/components/ui/MarkdownViewer';

interface Citation {
  title: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  citations?: Citation[];
  canCreateTicket?: boolean;
}

export default function AiAssistantPage() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    const userMessage: ChatMessage = { role: 'user', text: query };
    setMessages((prev) => [...prev, userMessage]);
    setQuery('');
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', { message: userMessage.text });
      const aiMessage: ChatMessage = {
        role: 'assistant',
        text: res.data.answer,
        citations: res.data.citations,
        canCreateTicket: res.data.canCreateTicket,
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      const serverMsg = err.response?.data?.message || err.message || '';
      let displayError = 'Sorry, I ran into an error connecting to AI services. Please try again.';
      if (serverMsg) {
        displayError += ` (${serverMsg})`;
      }
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: displayError,
        } as ChatMessage,
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-7rem)] flex flex-col space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
          <Bot className="w-6 h-6 text-blue-600" />
          Virtual Assistant
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Ask policy or setup questions grounded in internal company documentation with verified citations.
        </p>
      </div>

      <div className="flex-1 glass-panel rounded-2xl p-6 flex flex-col min-h-0 shadow-2xs border border-slate-200">
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-3">
              <MessageCircleQuestionMark className="w-10 h-10 text-blue-600 opacity-60" />
              <p className="text-sm max-w-sm">
                Ask questions like &quot;How do I setup VPN?&quot;, &quot;What is the password reset policy?&quot;, or &quot;How do I claim expenses?&quot;
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xl p-4 rounded-2xl text-sm space-y-3 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none shadow-2xs'
                      : 'bg-slate-50 text-slate-800 border border-slate-200 rounded-bl-none shadow-2xs'
                  }`}
                >
                  <MarkdownViewer content={msg.text} />

                  {msg.citations && msg.citations.length > 0 && (
                    <div className="pt-2 border-t border-slate-200 space-y-1.5">
                      <span className="text-[11px] uppercase font-semibold text-blue-600 tracking-wider block">
                        Source Citations:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {msg.citations.map((c: Citation, cIdx: number) => (
                          <span
                            key={cIdx}
                            className="px-2 py-1 rounded bg-blue-50 border border-blue-200 text-[11px] text-blue-700 flex items-center gap-1 font-medium"
                          >
                            <FileText className="w-3 h-3" />
                            {c.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {msg.canCreateTicket && (
                    <div className="pt-2">
                      <Link
                        href="/employee/submit-ticket"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors shadow-2xs"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        Create Support Ticket
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl rounded-bl-none text-slate-500 text-sm flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                Retrieving knowledge base articles...
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSend} className="mt-4 flex gap-3 pt-4 border-t border-slate-200">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type your question..."
            className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition-colors text-sm shadow-2xs"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
