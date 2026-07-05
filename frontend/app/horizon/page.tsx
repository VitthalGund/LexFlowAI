'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { 
  Telescope, 
  Play, 
  Trash2, 
  ExternalLink, 
  Cpu, 
  AlertCircle, 
  CheckCircle2, 
  CalendarClock,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';

interface HorizonSignal {
  id: string;
  source_item_id: string;
  source_name: string;
  feed_type: string;
  title: string;
  link: string;
  theme: string;
  confidence: number;
  rationale: string;
  estimated_action_window_days: number | null;
  detected_at: string;
  status: 'NEW' | 'PREP_STARTED' | 'DISMISSED';
  prep_map_id?: string;
}

export default function HorizonScannerPage() {
  const [signals, setSignals] = useState<HorizonSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const fetchSignals = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    try {
      const res = await api.get('/api/v1/horizon/signals');
      setSignals(res.data);
    } catch (err) {
      console.error('Failed to load horizon signals:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchSignals();
    });
  }, []);

  const handleStartPrep = async (id: string) => {
    setActioningId(id);
    try {
      const res = await api.post(`/api/v1/horizon/signals/${id}/start-prep`);
      alert(`Anticipatory MAP draft successfully created! ID: ${res.data.map_id}`);
      fetchSignals();
    } catch (err: any) {
      alert(`Error starting prep: ${err.response?.data?.detail || err.message}`);
    } finally {
      setActioningId(null);
    }
  };

  const handleDismiss = async (id: string) => {
    if (!confirm('Are you sure you want to dismiss this signal?')) return;
    setActioningId(id);
    try {
      await api.post(`/api/v1/horizon/signals/${id}/dismiss`);
      fetchSignals();
    } catch (err: any) {
      alert(`Error dismissing signal: ${err.response?.data?.detail || err.message}`);
    } finally {
      setActioningId(null);
    }
  };

  // Group signals by status
  const activeSignals = signals.filter(s => s.status === 'NEW');
  const actionedSignals = signals.filter(s => s.status !== 'NEW');

  return (
    <div className="space-y-8 select-none">
      
      {/* Premium Header Accent Card */}
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-500 via-orange-600 to-amber-700 text-white rounded-xl p-8 shadow-lg border border-amber-400/20">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-white/10 px-3.5 py-1.5 rounded-full border border-white/20 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
            <Sparkles className="h-4.5 w-4.5 text-amber-300 animate-pulse" />
            <span>AI Horizon Scanning System</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            LexFlow Horizon — Regulatory Foresight
          </h2>
          <p className="text-sm text-amber-50/90 leading-relaxed font-medium">
            Continuously monitors RBI speeches, executive briefings, and publications to forecast upcoming policy shifts. 
            Allows compliance officers to build <b>Anticipatory MAP blueprints</b> before official directives are issued.
          </p>
          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={() => fetchSignals(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 bg-white text-orange-700 hover:bg-amber-50 active:bg-amber-100 font-bold px-4 py-2 rounded-lg text-xs shadow-sm transition-all duration-200 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Signals</span>
            </button>
            <span className="text-xs text-amber-100/80 font-medium">
              Last scanned: Just now (auto-polling active)
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Section: Active Foresight Signals */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-sm tracking-tight flex items-center gap-2">
              <Telescope className="h-5 w-5 text-amber-500" />
              <span>Active Horizon Signals ({activeSignals.length})</span>
            </h3>
            <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
              Proactive Action Mode
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-10 w-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : activeSignals.length === 0 ? (
            <Card className="text-center py-16 text-slate-400 border-dashed border-2 border-slate-200">
              <CheckCircle2 className="h-12 w-12 mx-auto text-slate-300 stroke-[1.5] mb-2" />
              <p className="text-xs font-bold text-slate-600">No new anticipatory signals detected</p>
              <p className="text-[11px] text-slate-400 mt-1">Check back later or refresh regulatory sources.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeSignals.map((sig) => (
                <div 
                  key={sig.id} 
                  className="bg-white border-l-4 border-l-amber-500 border border-slate-200 rounded-r-lg p-6 shadow-sm hover:shadow-md transition-all duration-200 space-y-4"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded border border-slate-200">
                          {sig.feed_type}
                        </span>
                        <span className="text-xs text-slate-400 font-semibold">{sig.source_name}</span>
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-800 pt-1 leading-snug">{sig.title}</h4>
                    </div>

                    <div className="flex items-center gap-1.5 bg-amber-50/50 border border-amber-100 text-amber-700 px-2.5 py-1 rounded-full shrink-0 font-bold text-[10px]">
                      <Cpu className="h-3.5 w-3.5" />
                      <span>{Math.round(sig.confidence * 100)}% Confidence</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-medium bg-slate-50 p-3 rounded border border-slate-100">
                    <span className="font-bold text-amber-700 uppercase tracking-wide text-[9px] block mb-1">AI Rationale</span>
                    {sig.rationale}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-50 text-[10px] text-slate-400 font-semibold">
                    <div className="flex items-center gap-4">
                      {sig.estimated_action_window_days && (
                        <span className="flex items-center gap-1 text-slate-600">
                          <CalendarClock className="h-4.5 w-4.5 text-amber-500" />
                          <span>Estimated Window: {sig.estimated_action_window_days} Days</span>
                        </span>
                      )}
                      <span>Detected: {new Date(sig.detected_at).toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {sig.link && (
                        <a 
                          href={sig.link} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-slate-400 hover:text-primary-600"
                        >
                          <span>View Source</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      <button
                        onClick={() => handleDismiss(sig.id)}
                        disabled={actioningId !== null}
                        className="inline-flex items-center gap-1 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Dismiss</span>
                      </button>
                      <button
                        onClick={() => handleStartPrep(sig.id)}
                        disabled={actioningId !== null}
                        className="inline-flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-1.5 rounded transition-all duration-200 shadow-sm disabled:opacity-50"
                      >
                        <Play className="h-3 w-3 fill-white" />
                        <span>Start Prep</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Section: Triage History / Dismissed or Actioned */}
        <div className="lg:col-span-4 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm tracking-tight">
              Foresight Log
            </h3>
            <span className="text-[10px] text-slate-400 font-semibold">Past decisions</span>
          </div>

          <Card className="p-0 overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 border-b border-neutral-200 font-bold text-[10px] text-slate-500 uppercase tracking-wider">
              Preparation History
            </div>
            
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="h-6 w-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : actionedSignals.length === 0 ? (
                <p className="text-xs text-slate-400 italic p-6 text-center">No historical entries</p>
              ) : (
                actionedSignals.map((sig) => (
                  <div key={sig.id} className="p-4 space-y-2 hover:bg-slate-50/50">
                    <div className="flex justify-between items-start gap-2">
                      <h5 className="font-bold text-xs text-slate-700 line-clamp-2 leading-snug">{sig.title}</h5>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded shrink-0 ${
                        sig.status === 'PREP_STARTED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {sig.status === 'PREP_STARTED' ? 'PREP ACTIVE' : 'DISMISSED'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-slate-400 font-semibold font-mono">
                      <span>{sig.theme}</span>
                      {sig.prep_map_id && (
                        <Link 
                          href={`/maps/${sig.prep_map_id}`}
                          className="text-primary-600 hover:underline flex items-center gap-0.5"
                        >
                          <span>{sig.prep_map_id}</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}
