'use client';

import React from 'react';
import { CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';

interface ComplianceDriftStripProps {
  alerts: Array<{
    id: string;
    detected_at: string;
    previous_value: string;
    current_value: string;
    threshold: string;
    status: 'OPEN' | 'RESOLVED' | 'ACKNOWLEDGED';
    branch_lgd_code: string;
  }>;
  onAcknowledge: (alertId: string) => void;
  userRole?: string;
}

export function ComplianceDriftStrip({ alerts, onAcknowledge, userRole }: ComplianceDriftStripProps) {
  return (
    <div className="space-y-6">
      
      {/* Visual Drift History Strip */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Continuous Compliance Health Checks</span>
        <div className="flex items-center gap-1.5 p-3.5 bg-slate-50 border border-slate-200 rounded-lg overflow-x-auto min-h-[50px]">
          {/* Mock evaluation cycles over time */}
          {Array.from({ length: 15 }).map((_, idx) => {
            // Let's make some fail based on active alerts count
            const isFailingCycle = idx === 12 || idx === 14;
            const hasAlerts = alerts.some(a => a.status === 'OPEN');
            
            const isRed = hasAlerts ? isFailingCycle : false;
            
            return (
              <div 
                key={idx}
                className={`h-6 w-6 rounded shrink-0 flex items-center justify-center text-[9px] font-bold border transition-colors ${
                  isRed 
                    ? 'bg-red-500 border-red-600 text-white animate-pulse'
                    : 'bg-emerald-500 border-emerald-600 text-white'
                }`}
                title={`Cycle #${idx + 1}: ${isRed ? 'Drift Violation Detected' : 'Compliance Pass'}`}
              >
                {idx + 1}
              </div>
            );
          })}
          <span className="text-[10px] text-slate-400 font-bold ml-2 font-mono uppercase tracking-wider shrink-0">
            {alerts.some(a => a.status === 'OPEN') ? '🚨 Drift Warning' : '✅ Active Pass'}
          </span>
        </div>
      </div>

      {/* Alerts list */}
      <div className="space-y-4">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Compliance Drift Alerts ({alerts.length})</span>
        
        {alerts.length === 0 ? (
          <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-lg text-emerald-800 text-xs font-semibold leading-relaxed flex items-start gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <p>Zero Drift Alerts Active</p>
              <p className="text-[10px] text-emerald-600/80 font-medium mt-0.5">Policy enforcement parameters match telemetry metrics across all LGD nodes.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div 
                key={alert.id}
                className={`p-4 rounded-lg border text-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-200 ${
                  alert.status === 'OPEN'
                    ? 'bg-rose-50/60 border-rose-200 text-rose-900'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold font-mono text-[10px] bg-white border border-rose-300/40 text-rose-800 px-2 py-0.5 rounded">
                      Branch {alert.branch_lgd_code}
                    </span>
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                      alert.status === 'OPEN' ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {alert.status}
                    </span>
                  </div>
                  <p className="font-semibold pt-1">
                    Value Drifted: <span className="font-extrabold text-red-600">{alert.current_value}</span> (Expected: <span className="font-bold text-emerald-700">{alert.threshold}</span>)
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Detected: {new Date(alert.detected_at).toLocaleString()}
                  </p>
                </div>

                {alert.status === 'OPEN' && (userRole === 'COMPLIANCE_OFFICER' || userRole === 'REGIONAL_HEAD') && (
                  <button
                    onClick={() => onAcknowledge(alert.id)}
                    className="bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold px-3 py-1.5 rounded shadow-sm text-[10px] transition-all shrink-0"
                  >
                    Acknowledge
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
