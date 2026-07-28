'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpenText,
  Ticket,
  PlusCircle,
  LayoutDashboard,
  BarChart3,
  LogOut,
  User,
  UserCog,
  Bot,
  AlertTriangle,
} from 'lucide-react';

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Do not render layout shell on auth pages
  if (!user || pathname === '/login' || pathname === '/register') {
    return <>{children}</>;
  }

  const isAgentOrAdmin = user.role === 'AGENT' || user.role === 'ADMIN';

  // Generate dynamic breadcrumbs based on current pathname
  const getBreadcrumbs = () => {
    const segments = pathname.split('/').filter(Boolean);
    const crumbs = [{ label: 'Home', href: '/' }];

    let currentPath = '';
    segments.forEach((segment) => {
      currentPath += `/${segment}`;
      let label = segment.replace(/-/g, ' ');
      if (segment.length > 20) {
        label = `#${segment.substring(0, 8)}...`;
      } else {
        label = label.charAt(0).toUpperCase() + label.slice(1);
      }
      crumbs.push({ label, href: currentPath });
    });

    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* 1. FIXED / STICKY SIDEBAR (h-screen sticky top-0) */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 h-screen sticky top-0 z-40 shadow-sm">
        {/* Brand Header */}
        <div className="px-7 py-2 border-b border-slate-200">
          <Link href="/" className="flex items-center gap-3">
            <div>
              <span className="font-bold text-slate-900 tracking-tight text-base block">QuickDesk</span>
              <span className="block text-[10px] uppercase font-bold text-blue-600 tracking-wider">
                AI Helpdesk
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {!isAgentOrAdmin ? (
            <>
              <Link
                href="/employee/my-tickets"
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  pathname.startsWith('/employee/my-tickets')
                    ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-xs font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Ticket className="w-4 h-4" />
                My Tickets
              </Link>

              <Link
                href="/employee/submit-ticket"
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  pathname === '/employee/submit-ticket'
                    ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-xs font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                Submit Ticket
              </Link>

              <Link
                href="/employee/ai-assistant"
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  pathname === '/employee/ai-assistant'
                    ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-xs font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  pathname.startsWith('/agent/dashboard')
                    ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-xs font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Ticket Queue
              </Link>

              <Link
                href="/agent/metrics"
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  pathname.startsWith('/agent/metrics')
                    ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-xs font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Metrics Dashboard
              </Link>

              {user.role === 'ADMIN' && (
                <>
                  <Link
                    href="/admin/agents"
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      pathname.startsWith('/admin/agents')
                        ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-xs font-semibold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <UserCog className="w-4 h-4" />
                    Agent & User Mgmt
                  </Link>

                  <Link
                    href="/admin/knowledge"
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      pathname.startsWith('/admin/knowledge')
                        ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-xs font-semibold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <BookOpenText className="w-4 h-4" />
                    Knowledge Base
                  </Link>
                </>
              )}
            </>
          )}
        </nav>

        {/* User Profile & Logout Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-900 truncate">{user.name}</div>
                <div className="text-[10px] text-slate-500 uppercase font-medium tracking-wider">
                  {user.role}
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowLogoutConfirm(true)}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 2. STICKY HEADER & BREADCRUMBS (sticky top-0 z-30) */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-8 py-3.5 flex items-center justify-end shadow-2xs">
          {/* Breadcrumbs
          <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 overflow-x-auto">
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={crumb.href}>
                {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                {i === breadcrumbs.length - 1 ? (
                  <span className="text-slate-900 font-semibold truncate">{crumb.label}</span>
                ) : (
                  <Link href={crumb.href} className="hover:text-blue-600 transition-colors shrink-0">
                    {crumb.label}
                  </Link>
                )}
              </React.Fragment>
            ))}
          </nav> */}

          {/* User Badge / Status */}
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {user.role} Portal
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white border border-slate-200 p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Sign Out</h3>
                <p className="text-xs text-slate-500 mt-0.5">Are you sure you want to log out of QuickDesk?</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
