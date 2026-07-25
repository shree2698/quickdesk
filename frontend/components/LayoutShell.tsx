'use client';

import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sparkles,
  Ticket,
  PlusCircle,
  LayoutDashboard,
  BarChart3,
  LogOut,
  User,
  Bot,
} from 'lucide-react';

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0f17] text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Do not render layout shell on auth pages
  if (!user || pathname === '/login' || pathname === '/register') {
    return <>{children}</>;
  }

  const isAgentOrAdmin = user.role === 'AGENT' || user.role === 'ADMIN';

  return (
    <div className="min-h-screen flex bg-[#0b0f17]">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#131a27] border-r border-[#2a364f] flex flex-col shrink-0">
        <div className="p-6 border-b border-[#2a364f]">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white tracking-tight">QuickDesk</span>
              <span className="block text-[10px] uppercase font-semibold text-blue-400 tracking-wider">
                AI Copilot Helpdesk
              </span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {!isAgentOrAdmin ? (
            <>
              <Link
                href="/employee/my-tickets"
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  pathname.startsWith('/employee/my-tickets')
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:bg-[#1a2332] hover:text-white'
                }`}
              >
                <Ticket className="w-4 h-4" />
                My Tickets
              </Link>

              <Link
                href="/employee/submit-ticket"
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  pathname === '/employee/submit-ticket'
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:bg-[#1a2332] hover:text-white'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                Submit Ticket
              </Link>

              <Link
                href="/employee/ai-assistant"
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  pathname === '/employee/ai-assistant'
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:bg-[#1a2332] hover:text-white'
                }`}
              >
                <Bot className="w-4 h-4" />
                AI Assistant
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/agent/dashboard"
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  pathname.startsWith('/agent/dashboard')
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:bg-[#1a2332] hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Ticket Queue
              </Link>

              <Link
                href="/agent/metrics"
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  pathname.startsWith('/agent/metrics')
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:bg-[#1a2332] hover:text-white'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Metrics Dashboard
              </Link>
            </>
          )}
        </nav>

        {/* User Profile & Logout Footer */}
        <div className="p-4 border-t border-[#2a364f]">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#1a2332] border border-[#2a364f]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">{user.name}</div>
                <div className="text-[10px] text-slate-400 uppercase font-medium tracking-wider">
                  {user.role}
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
    </div>
  );
}
