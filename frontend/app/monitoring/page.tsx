'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import {
  Radio,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Activity,
  Check,
  X,
  ChevronRight,
  Wifi,
  WifiOff
} from 'lucide-react';

interface MonitoringSource {
  id: string;
  name: string;
  url: string;
  feed_type: string;
  is_active: boolean;
  last_polled_at: string | null;
  last_success_at: string | null;
  consecutive_failures: number;
}

interface MonitoringRun {
  id: string;
  source_id: string;
  started_at: string;
  finished_at: string | null;
  items_fetched: number;
  items_new: number;
  items_ingested: number;
  items_skipped: number;
  status: 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED';
  error_message: string | null;
}

interface PendingTriageItem {
  id: string;
  title: string;
  link: string;
  pub_date: string | null;
  first_seen_at: string;
  triage_confidence: number | null;
  triage_reason: string | null;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    SUCCESS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    PARTIAL: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    FAILED: 'bg-red-50 text-red-700 border-red-200',
    RUNNING: 'bg-blue-50 text-blue-700 border-blue-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide ${styles[status] || 'bg-slate-50 text-slate-500 border-slate-200'}`}>
      {status}
    </span>
  );
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function MonitoringPage() {
  const [sources, setSources] = useState<MonitoringSource[]>([]);
  const [runs, setRuns] = useState<MonitoringRun[]>([]);
  const [pending, setPending] = useState<PendingTriageItem[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pollResult, setPollResult] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [srcRes, runRes, triageRes] = await Promise.all([
        api.get('/api/v1/monitoring/sources'),
        api.get('/api/v1/monitoring/runs?limit=20'),
        api.get('/api/v1/monitoring/pending-triage'),
      ]);
      setSources(srcRes.data);
      setRuns(runRes.data);
      setPending(triageRes.data);
    } catch (e) {
      console.error('Failed to fetch monitoring data', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    // Refresh every 30 seconds
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const handlePollNow = async () => {
    setIsPolling(true);
    setPollResult(null);
    try {
      const res = await api.post('/api/v1/monitoring/poll-now');
      const results = res.data.results as { source: string; items_new?: number; items_ingested?: number; status: string }[];
      const summary = results.map(r =>
        r.status === 'SUCCESS' || r.status === 'PARTIAL'
          ? `${r.source}: ${r.items_new ?? 0} new, ${r.items_ingested ?? 0} auto-ingested`
          : `${r.source}: ${r.status}`
      ).join(' | ');
      setPollResult(summary);
      await fetchAll();
    } catch (e) {
      setPollResult('Poll failed — check backend logs.');
    } finally {
      setIsPolling(false);
    }
  };

  const handleAccept = async (id: string) => {
    try {
      await api.post(`/api/v1/monitoring/pending-triage/${id}/accept`);
      await fetchAll();
    } catch (e) {
      alert('Failed to ingest notification. It may already exist.');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.post(`/api/v1/monitoring/pending-triage/${id}/reject`);
      await fetchAll();
    } catch (e) {
      alert('Failed to reject notification.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-lg border border-neutral-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Radio className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-bold text-slate-800">Regulatory Sentinel</h2>
          </div>
          <p className="text-xs text-slate-500">Live monitoring of RBI regulatory feeds. Scheduler polls every 15 minutes.</p>
        </div>
        <div className="flex items-center gap-3">
          {pollResult && (
            <p className="text-xs text-slate-500 max-w-xs text-right">{pollResult}</p>
          )}
          <button
            onClick={handlePollNow}
            disabled={isPolling}
            className="flex items-center gap-1.5 text-xs font-semibold bg-[#1A3A6B] hover:bg-slate-800 text-white px-4 py-2.5 rounded-lg shadow active:scale-95 transition-all disabled:opacity-60"
          >
            {isPolling ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span>Poll Now</span>
          </button>
        </div>
      </div>

      {/* Source Health Cards */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 mb-3">Feed Sources</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sources.map(source => {
            const degraded = source.consecutive_failures > 0;
            return (
              <Card key={source.id} className={degraded ? 'border-orange-300 bg-orange-50/30' : ''}>
                <div className="flex justify-between items-start">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {degraded
                        ? <WifiOff className="h-4 w-4 text-orange-500 shrink-0" />
                        : <Wifi className="h-4 w-4 text-emerald-500 shrink-0" />
                      }
                      <span className="text-sm font-bold text-slate-800 truncate">{source.name}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono truncate">{source.url}</p>
                  </div>
                  {degraded && (
                    <span className="ml-2 shrink-0 text-[10px] bg-orange-100 border border-orange-300 text-orange-700 font-bold px-2 py-0.5 rounded-full">
                      {source.consecutive_failures} failure{source.consecutive_failures > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Last Polled</span>
                    <span className="text-slate-700 font-medium flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />{timeAgo(source.last_polled_at)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Last Success</span>
                    <span className={`font-medium flex items-center gap-1 mt-0.5 ${degraded ? 'text-orange-600' : 'text-slate-700'}`}>
                      <Activity className="h-3 w-3" />{timeAgo(source.last_success_at)}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Pending Triage */}
      {pending.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-bold text-slate-700">Pending Triage</h3>
            <span className="bg-orange-100 text-orange-700 border border-orange-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {pending.length}
            </span>
          </div>
          <div className="space-y-3">
            {pending.map(item => (
              <div key={item.id} className="bg-white border border-amber-200 rounded-lg p-4 shadow-sm space-y-2">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 leading-snug">{item.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo(item.first_seen_at)} · Confidence: {item.triage_confidence != null ? `${(item.triage_confidence * 100).toFixed(0)}%` : 'N/A'}</p>
                    {item.triage_reason && (
                      <p className="text-[11px] text-slate-500 mt-1 italic">{item.triage_reason}</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleAccept(item.id)}
                      className="flex items-center gap-1 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded active:scale-95 transition-all"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Accept
                    </button>
                    <button
                      onClick={() => handleReject(item.id)}
                      className="flex items-center gap-1 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded active:scale-95 transition-all"
                    >
                      <X className="h-3.5 w-3.5" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Runs */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 mb-3">Recent Monitoring Runs</h3>
        {runs.length === 0 ? (
          <Card>
            <div className="text-center py-6 text-slate-400">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No monitoring runs yet. Click "Poll Now" to trigger the first run.</p>
            </div>
          </Card>
        ) : (
          <div className="bg-white rounded-lg border border-neutral-200 shadow-sm overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase text-[10px] tracking-wide">Started</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase text-[10px] tracking-wide">Status</th>
                  <th className="text-right px-4 py-3 font-bold text-slate-500 uppercase text-[10px] tracking-wide">Fetched</th>
                  <th className="text-right px-4 py-3 font-bold text-slate-500 uppercase text-[10px] tracking-wide">New</th>
                  <th className="text-right px-4 py-3 font-bold text-slate-500 uppercase text-[10px] tracking-wide">Ingested</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase text-[10px] tracking-wide">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {runs.map(run => (
                  <tr key={run.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-600">{timeAgo(run.started_at)}</td>
                    <td className="px-4 py-3"><StatusBadge status={run.status} /></td>
                    <td className="px-4 py-3 text-right text-slate-600 font-mono">{run.items_fetched}</td>
                    <td className="px-4 py-3 text-right text-slate-600 font-mono">{run.items_new}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">{run.items_ingested}</td>
                    <td className="px-4 py-3 text-slate-400 italic truncate max-w-[180px]">{run.error_message || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
