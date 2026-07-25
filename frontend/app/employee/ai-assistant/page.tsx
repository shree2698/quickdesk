'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Bot, Send, Sparkles, FileText, PlusCircle } from 'lucide-react';
import Link from 'next/link';

export default function AiAssistantPage() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    const userMessage = { role: 'user', text: query };
    setMessages((prev) => [...prev, userMessage]);
    setQuery('');
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', { message: userMessage.text });
      const aiMessage = {
        role: 'assistant',
        text: res.data.answer,
        citations: res.data.citations,
        canCreateTicket: res.data.canCreateTicket,
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Sorry, I ran into an error connecting to AI services. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto h-[calc(100vh-2rem)] flex flex-col space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
          <Bot className="w-6 h-6 text-blue-400" />
          RAG AI Virtual Assistant
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Ask policy or setup questions grounded in internal company documentation with verified citations.
        </p>
      </div>

      <div className="flex-1 glass-panel rounded-2xl p-6 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-3">
              <Sparkles className="w-10 h-10 text-blue-400 opacity-60" />
              <p className="text-sm max-w-sm">
                Ask questions like "How do I setup VPN?", "What is the password reset policy?", or "How do I claim expenses?"
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
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-[#131a27] text-slate-200 border border-[#2a364f] rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {msg.citations && msg.citations.length > 0 && (
                    <div className="pt-2 border-t border-[#2a364f] space-y-1.5">
                      <span className="text-[11px] uppercase font-semibold text-blue-400 tracking-wider block">
                        Source Citations:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {msg.citations.map((c: any, cIdx: number) => (
                          <span
                            key={cIdx}
                            className="px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300 flex items-center gap-1"
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
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-500 transition-colors"
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
              <div className="bg-[#131a27] border border-[#2a364f] p-4 rounded-2xl rounded-bl-none text-slate-400 text-sm flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                Retrieving knowledge base articles...
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSend} className="mt-4 flex gap-3 pt-4 border-t border-[#2a364f]">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type your question..."
            className="flex-1 px-4 py-3 bg-[#131a27] border border-[#2a364f] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors text-sm"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors shadow-lg shadow-blue-600/25 disabled:opacity-50 flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
