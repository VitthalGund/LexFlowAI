'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { 
  ShieldAlert, 
  Clock, 
  MousePointerClick, 
  MousePointer, 
  User, 
  AlertTriangle,
  CheckCircle,
  TrendingUp
} from 'lucide-react';

interface TelemetrySnapshot {
  time_on_page_seconds: number;
  max_scroll_percent: number;
  word_count: number;
  click_count?: number;
  tab_switches?: number;
  submitted_at: string;
}

interface EvidenceLedgerEntry {
  id: string;
  map_id: string;
  circular_id: string;
  branch_lgd_code: string;
  uploader_name: string;
  file_name: string;
  file_size_bytes: number;
  sha256_hash: string;
  uploaded_at: string;
  behavioral_risk_score: number;
  vault_status: string;
  quarantine_reason: string;
  telemetry_snapshot: TelemetrySnapshot;
}

export default function RiskReviewPage() {
  const [quarantineQueue, setQuarantineQueue] = useState<EvidenceLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState<EvidenceLedgerEntry | null>(null);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/evidence/ledger');
      // Filter quarantined entries
      const quarantined = res.data.filter((e: EvidenceLedgerEntry) => e.vault_status === 'QUARANTINED');
      setQuarantineQueue(quarantined);
      if (quarantined.length > 0) {
        setActiveItem(quarantined[0]);
      } else {
        setActiveItem(null);
      }
    } catch (err) {
      console.error('Failed to load risk review queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchQueue();
    });
  }, []);

  const handleOverrideAccept = async (itemId: string) => {
    try {
      await api.post(`/api/v1/risk-review/${itemId}/override`);
      alert(`Compliance override executed for ${itemId}. Status updated to ACCEPTED in ledger.`);
      fetchQueue();
    } catch (err) {
      alert('Failed to override quarantine');
    }
  };

  const handleEscalate = async (itemId: string) => {
    try {
      await api.post(`/api/v1/risk-review/${itemId}/escalate`);
      alert(`Security report for ${itemId} escalated to Regional IT Head & Ho-Bengaluru Compliance Team.`);
    } catch (err) {
      alert('Failed to escalate');
    }
  };

  const handleReject = async (itemId: string) => {
    try {
      await api.post(`/api/v1/risk-review/${itemId}/reject`);
      alert(`Evidence permanently rejected for ${itemId}. MAP reopened for branch.`);
      fetchQueue();
    } catch (err) {
      alert('Failed to reject');
    }
  };

  return (
    <div className="space-y-8 select-none">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-lg border border-neutral-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">BehaviorGuard Risk Review Queue</h2>
          <p className="text-xs text-slate-500 mt-1">
            Analyzing interaction telemetry logs to flag box-ticking behavior and prevent regulatory compliance fraud.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold bg-red-50 px-3.5 py-2 border border-red-100 rounded text-red-700">
          <ShieldAlert className="h-4.5 w-4.5 text-red-500 animate-pulse" />
          <span>Quarantined: {quarantineQueue.length} alerts pending</span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : quarantineQueue.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Alerts List */}
          <div className="lg:col-span-5 space-y-4">
            <h3 className="font-bold text-slate-500 text-[10px] uppercase tracking-wider">Quarantine Inbox</h3>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {quarantineQueue.map((item) => {
                const isActive = activeItem?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setActiveItem(item)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      isActive
                        ? 'border-red-500 bg-red-50/20 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs">Branch LGD {item.branch_lgd_code}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{item.map_id}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-red-600 text-sm">{item.behavioral_risk_score}</span>
                        <div className="text-[8px] text-slate-400 uppercase tracking-widest font-bold">Risk Score</div>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-500 mt-2 truncate">File: {item.file_name}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Telemetry Inspect Panel */}
          {activeItem && (
            <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden">
              <div className="p-5 border-b border-neutral-200 bg-neutral-50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-red-500" />
                  <span className="font-bold text-slate-800 text-sm">Telemetry Audit: {activeItem.id.substring(0, 8)}</span>
                </div>
                <span className="bg-red-50 text-red-700 border border-red-100 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                  Quarantine Locked
                </span>
              </div>

              <div className="p-6 space-y-6">
                
                {/* Meta details */}
                <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded border border-slate-100">
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[9px] block">Branch Code / Outlet</span>
                    <span className="text-slate-700 font-semibold mt-0.5 block">{activeItem.branch_lgd_code}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[9px] block">Responsible Manager</span>
                    <span className="text-slate-700 font-semibold mt-0.5 block flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      {activeItem.uploader_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[9px] block">Compliance Action ID</span>
                    <span className="text-slate-700 font-semibold font-mono mt-0.5 block">{activeItem.map_id}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[9px] block">Upload Checksum</span>
                    <span className="text-slate-700 font-semibold font-mono mt-0.5 block truncate">{activeItem.sha256_hash.substring(0, 16)}...</span>
                  </div>
                </div>

                {/* Score bar */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-bold uppercase text-[9px]">Calculated Telemetry Risk Profile</span>
                    <span className="font-bold text-red-600 font-mono text-sm">{activeItem.behavioral_risk_score} / 1.0</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500 rounded-full" 
                      style={{ width: `${activeItem.behavioral_risk_score * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Quarantine Reason */}
                <div className="p-4 bg-red-50 border border-red-200 rounded text-xs text-red-800 space-y-1 leading-relaxed">
                  <div className="font-bold flex items-center gap-1 mb-1">
                    <AlertTriangle className="h-4.5 w-4.5 text-red-600 shrink-0" />
                    <span>Behavioral Anomalies Flagged:</span>
                  </div>
                  <p className="text-slate-700 text-[11px] leading-relaxed">
                    {activeItem.quarantine_reason}
                  </p>
                </div>

                {/* Telemetry Snapshot stats */}
                <div className="space-y-3">
                  <span className="text-slate-400 font-bold uppercase text-[9px] block">Granular Sensor Metrics</span>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                      <Clock className="h-5 w-5 mx-auto text-slate-400 mb-1" />
                      <span className="text-[10px] text-slate-400 block font-bold">Active Time</span>
                      <span className="text-xs font-semibold text-slate-700 mt-0.5 block">
                        {activeItem.telemetry_snapshot.time_on_page_seconds} seconds
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                      <MousePointer className="h-5 w-5 mx-auto text-slate-400 mb-1" />
                      <span className="text-[10px] text-slate-400 block font-bold">Scroll Depth</span>
                      <span className="text-xs font-semibold text-slate-700 mt-0.5 block">
                        {activeItem.telemetry_snapshot.max_scroll_percent}%
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                      <MousePointerClick className="h-5 w-5 mx-auto text-slate-400 mb-1" />
                      <span className="text-[10px] text-slate-400 block font-bold">Active Clicks</span>
                      <span className="text-xs font-semibold text-slate-700 mt-0.5 block">
                        {activeItem.telemetry_snapshot.click_count || 0} clicks
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                      <TrendingUp className="h-5 w-5 mx-auto text-slate-400 mb-1" />
                      <span className="text-[10px] text-slate-400 block font-bold">Tab Switches</span>
                      <span className="text-xs font-semibold text-slate-700 mt-0.5 block text-red-500">
                        {activeItem.telemetry_snapshot.tab_switches || 0} times
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-slate-100 flex gap-3 justify-end">
                  <button
                    onClick={() => handleOverrideAccept(activeItem.id)}
                    className="bg-white border border-slate-200 text-slate-700 font-bold text-xs py-2.5 px-4 rounded hover:bg-slate-50 active:scale-95 transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle className="h-4 w-4 text-success-500" />
                    <span>Override Accept</span>
                  </button>
                  <button
                    onClick={() => handleReject(activeItem.id)}
                    className="bg-white border border-slate-200 text-slate-700 font-bold text-xs py-2.5 px-4 rounded hover:bg-slate-50 active:scale-95 transition-colors flex items-center gap-1.5"
                  >
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <span>Confirm Reject</span>
                  </button>
                  <button
                    onClick={() => handleEscalate(activeItem.id)}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2.5 px-4 rounded shadow active:scale-95 transition-colors flex items-center gap-1.5"
                  >
                    <ShieldAlert className="h-4 w-4" />
                    <span>Escalate Violation</span>
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>
      ) : (
        <div className="text-center py-20 bg-white border border-slate-200 rounded-lg text-slate-400">
          <CheckCircle className="h-12 w-12 mx-auto text-emerald-500 stroke-[1.5] mb-2" />
          <p className="text-xs font-semibold">Zero compliance violations pending review.</p>
        </div>
      )}

    </div>
  );
}
