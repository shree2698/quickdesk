'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Sparkles,
  PieChart,
  Layers,
  AlertCircle,
} from 'lucide-react';

export default function AgentMetricsPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMetrics = async () => {
    try {
      const res = await api.get('/metrics/overview');
      setMetrics(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load metrics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-blue-400" />
          Metrics & Analytics Dashboard
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Agent analytics tracking ticket status breakdowns, resolution time, and AI override rates.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {metrics && (
        <>
          {/* Top KPI Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-panel p-6 rounded-2xl border border-[#2a364f] space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>Open Tickets</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-3xl font-extrabold text-white">{metrics.openTicketsCount}</div>
              <div className="text-xs text-amber-400/80 font-medium">Currently active</div>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-[#2a364f] space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>Resolved Tickets</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-extrabold text-white">{metrics.resolvedTicketsCount}</div>
              <div className="text-xs text-emerald-400/80 font-medium">Completed cases</div>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-[#2a364f] space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>Median Resolution Time</span>
                <Layers className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-3xl font-extrabold text-white">
                {metrics.medianResolutionTimeMinutes} <span className="text-sm font-normal text-slate-400">mins</span>
              </div>
              <div className="text-xs text-blue-400/80 font-medium">Time-to-resolve</div>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-[#2a364f] space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>AI Override Rate</span>
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-3xl font-extrabold text-white">{metrics.aiOverridePercentage}%</div>
              <div className="text-xs text-indigo-400/80 font-medium">Agent category changes</div>
            </div>
          </div>

          {/* Category Breakdown Table */}
          <div className="glass-panel p-6 rounded-2xl border border-[#2a364f] space-y-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <PieChart className="w-5 h-5 text-blue-400" />
              Tickets by Category Breakdown
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(metrics.volumeByCategory || {}).map(([cat, count]: [string, any]) => (
                <div key={cat} className="p-4 rounded-xl bg-[#131a27] border border-[#2a364f] text-center space-y-1">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{cat}</div>
                  <div className="text-2xl font-bold text-white">{count}</div>
                  <div className="text-[10px] text-slate-500">Tickets</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
