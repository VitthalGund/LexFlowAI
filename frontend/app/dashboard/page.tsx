'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { 
  FileText, 
  Clock, 
  RefreshCw, 
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle,
  Hash
} from 'lucide-react';
import { MAP } from '@/types/map';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

interface StatOverview {
  compliance_rate: number;
  active_circulars: number;
  pending_tasks: number;
  quarantined_alerts: number;
  recent_alerts: Array<{
    id: string;
    map_id: string;
    branch_lgd_code: string;
    uploader_name: string;
    file_name: string;
    uploaded_at: string;
    behavioral_risk_score: number;
    quarantine_reason: string;
  }>;
}

interface StateHeatmapData {
  [stateCode: string]: {
    state_name: string;
    compliance_rate: number;
    total_assigned: number;
    total_completed: number;
  };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<StatOverview | null>(null);
  const [heatmap, setHeatmap] = useState<StateHeatmapData | null>(null);
  const [allMaps, setAllMaps] = useState<MAP[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAuditMap, setSelectedAuditMap] = useState<MAP | null>(null);

  const { t } = useTranslation();

  const fetchDashboardData = async () => {
    try {
      const [overviewRes, heatmapRes, mapsRes] = await Promise.all([
        api.get('/api/v1/dashboard/overview'),
        api.get('/api/v1/dashboard/heatmap'),
        api.get('/api/v1/maps')
      ]);
      setStats(overviewRes.data);
      setHeatmap(heatmapRes.data);
      setAllMaps(mapsRes.data);
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchDashboardData();
    });
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20">
        <div className="h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm text-slate-500 mt-4 font-semibold">Consolidating Canara Bank telemetry streams...</span>
      </div>
    );
  }

  // Get state names from heatmap data
  const karnataka = heatmap?.['29'] || { state_name: 'Karnataka', compliance_rate: 78.0, total_assigned: 0, total_completed: 0 };
  const tamilNadu = heatmap?.['33'] || { state_name: 'Tamil Nadu', compliance_rate: 45.0, total_assigned: 0, total_completed: 0 };
  const kerala = heatmap?.['32'] || { state_name: 'Kerala', compliance_rate: 12.0, total_assigned: 0, total_completed: 0 };
  const maharashtra = heatmap?.['27'] || { state_name: 'Maharashtra', compliance_rate: 0.0, total_assigned: 0, total_completed: 0 };

  const getHeatmapColor = (rate: number) => {
    if (rate >= 75) return 'fill-success-500 hover:fill-success-600';
    if (rate >= 40) return 'fill-warning-500 hover:fill-warning-600';
    return 'fill-danger-500 hover:fill-danger-600';
  };

  return (
    <div className="space-y-8 select-none">
      {/* Welcome Bar */}
      <div className="flex justify-between items-center bg-white p-6 rounded-lg border border-neutral-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-800">{t('Compliance Officer Workspace')}</h2>
          <p className="text-xs text-slate-500 mt-1">{t('Real-time cryptographic audit coverage for Canara Bank regional networks.')}</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 text-xs font-semibold bg-primary-50 hover:bg-primary-100 text-primary-700 px-3 py-2 border border-primary-100 rounded-lg active:scale-95 transition-all"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : t('Refresh Feed')}</span>
        </button>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">{t('Compliance Rate')}</span>
            <span className="text-3xl font-bold text-primary-600 block mt-1">{stats?.compliance_rate}%</span>
            <span className="text-xs text-slate-500 mt-1 block">847 active assignments</span>
          </div>
          <div className="relative w-14 h-14 shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path 
                className="text-neutral-100" 
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="3.5"
              />
              <path 
                className="text-primary-500" 
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                fill="none" 
                stroke="currentColor" 
                strokeDasharray={`${stats?.compliance_rate || 0}, 100`} 
                strokeWidth="3.5"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-primary-600">
              OK
            </div>
          </div>
        </Card>

        <Card className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">{t('Active Circulars')}</span>
            <span className="text-3xl font-bold text-slate-800 block mt-1">{stats?.active_circulars}</span>
            <span className="text-xs text-slate-500 mt-1 block">Ingested from RBI portal</span>
          </div>
          <div className="p-3 bg-primary-50 text-primary-600 rounded-full">
            <FileText className="h-6 w-6" />
          </div>
        </Card>

        <Card className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">{t('Outstanding MAPs')}</span>
            <span className="text-3xl font-bold text-warning-600 block mt-1">{stats?.pending_tasks}</span>
            <span className="text-xs text-slate-500 mt-1 block">Pending branch actions</span>
          </div>
          <div className="p-3 bg-warning-50 text-warning-600 rounded-full">
            <Clock className="h-6 w-6" />
          </div>
        </Card>

        <Card className={`flex items-center justify-between ${(stats?.quarantined_alerts || 0) > 0 ? 'bg-red-50/50 border-red-200' : ''}`}>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">{t('Quarantined Uploads')}</span>
            <span className={`text-3xl font-bold block mt-1 ${(stats?.quarantined_alerts || 0) > 0 ? 'text-red-600' : 'text-slate-800'}`}>
              {stats?.quarantined_alerts}
            </span>
            <span className="text-xs text-slate-500 mt-1 block">BehaviorGuard alarms</span>
          </div>
          <div className={`p-3 rounded-full ${(stats?.quarantined_alerts || 0) > 0 ? 'bg-red-100 text-red-600' : 'bg-neutral-100 text-neutral-600'}`}>
            <ShieldAlert className="h-6 w-6" />
          </div>
        </Card>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Geographic Heatmap */}
        <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-neutral-200 bg-neutral-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-sm tracking-tight">{t('Geographic Compliance Heatmap')}</h3>
            <span className="text-xs font-bold text-slate-400">Regional Branch Outlets</span>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-between">
            {/* SVG Visual States */}
            <div className="w-full h-80 bg-slate-50 border border-slate-200 rounded-lg flex relative items-center justify-center p-4">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.01)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>
              
              {/* SVG Mock Map representing Southern and Western India states */}
              <svg viewBox="0 0 600 400" className="w-full h-full max-w-md drop-shadow-md">
                {/* Maharashtra (LGD 27) */}
                <path 
                  d="M 120,40 L 220,50 L 250,120 L 170,160 L 110,130 Z" 
                  className={`transition-colors duration-300 stroke-white stroke-2 cursor-pointer ${getHeatmapColor(maharashtra.compliance_rate)}`}
                />
                <text x="160" y="90" className="fill-slate-900 font-bold text-xs pointer-events-none text-center">MH</text>

                {/* Karnataka (LGD 29) */}
                <path 
                  d="M 170,160 L 250,120 L 290,190 L 260,300 L 180,260 L 150,190 Z" 
                  className={`transition-colors duration-300 stroke-white stroke-2 cursor-pointer ${getHeatmapColor(karnataka.compliance_rate)}`}
                />
                <text x="210" y="200" className="fill-slate-900 font-bold text-xs pointer-events-none">KA</text>

                {/* Kerala (LGD 32) */}
                <path 
                  d="M 180,260 L 260,300 L 230,380 L 210,380 Z" 
                  className={`transition-colors duration-300 stroke-white stroke-2 cursor-pointer ${getHeatmapColor(kerala.compliance_rate)}`}
                />
                <text x="210" y="325" className="fill-white font-bold text-[10px] pointer-events-none">KL</text>

                {/* Tamil Nadu (LGD 33) */}
                <path 
                  d="M 260,300 L 290,190 L 340,240 L 330,350 L 270,360 Z" 
                  className={`transition-colors duration-300 stroke-white stroke-2 cursor-pointer ${getHeatmapColor(tamilNadu.compliance_rate)}`}
                />
                <text x="290" y="290" className="fill-slate-900 font-bold text-xs pointer-events-none">TN</text>
              </svg>

              {/* Map Info Legend */}
              <div className="absolute bottom-4 right-4 bg-white/90 border border-slate-200 p-2.5 rounded shadow-sm text-[10px] space-y-1 backdrop-blur-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 bg-success-500 rounded-sm"></div>
                  <span>High (≥75%): Optimal</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 bg-warning-500 rounded-sm"></div>
                  <span>Medium (40-74%): Review</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 bg-danger-500 rounded-sm"></div>
                  <span>Low (&lt;40%): Critical</span>
                </div>
              </div>
            </div>

            {/* State Stats Table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="pb-2 font-bold text-slate-500 uppercase tracking-wider">State</th>
                    <th className="pb-2 font-bold text-slate-500 uppercase tracking-wider text-center">Assigned</th>
                    <th className="pb-2 font-bold text-slate-500 uppercase tracking-wider text-center">Completed</th>
                    <th className="pb-2 font-bold text-slate-500 uppercase tracking-wider text-right">Compliance</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2.5 font-medium text-slate-800 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-success-500"></div>
                      <span>{karnataka.state_name}</span>
                    </td>
                    <td className="py-2.5 text-center text-slate-600 font-semibold">{karnataka.total_assigned || 3}</td>
                    <td className="py-2.5 text-center text-slate-600 font-semibold">{karnataka.total_completed || 2}</td>
                    <td className="py-2.5 text-right font-bold text-success-600">{karnataka.compliance_rate}%</td>
                  </tr>
                  <tr className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2.5 font-medium text-slate-800 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-warning-500"></div>
                      <span>{tamilNadu.state_name}</span>
                    </td>
                    <td className="py-2.5 text-center text-slate-600 font-semibold">{tamilNadu.total_assigned || 3}</td>
                    <td className="py-2.5 text-center text-slate-600 font-semibold">{tamilNadu.total_completed || 1}</td>
                    <td className="py-2.5 text-right font-bold text-warning-600">{tamilNadu.compliance_rate}%</td>
                  </tr>
                  <tr className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2.5 font-medium text-slate-800 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-danger-500"></div>
                      <span>{kerala.state_name}</span>
                    </td>
                    <td className="py-2.5 text-center text-slate-600 font-semibold">{kerala.total_assigned || 3}</td>
                    <td className="py-2.5 text-center text-slate-600 font-semibold">{kerala.total_completed || 0}</td>
                    <td className="py-2.5 text-right font-bold text-danger-600">{kerala.compliance_rate}%</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 font-medium text-slate-800 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-danger-500"></div>
                      <span>{maharashtra.state_name}</span>
                    </td>
                    <td className="py-2.5 text-center text-slate-600 font-semibold">{maharashtra.total_assigned || 3}</td>
                    <td className="py-2.5 text-center text-slate-600 font-semibold">{maharashtra.total_completed || 0}</td>
                    <td className="py-2.5 text-right font-bold text-danger-600">{maharashtra.compliance_rate}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* BehaviorGuard Sidebar Risk Queue */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden flex flex-col flex-1">
            <div className="p-5 border-b border-neutral-200 bg-neutral-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary-500" />
                <span>{t('BehaviorGuard Risk Alerts')}</span>
              </h3>
              <span className="bg-red-100 text-red-700 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                Quarantined
              </span>
            </div>

            <div className="p-5 flex flex-col gap-4 flex-grow overflow-y-auto">
              {stats?.recent_alerts && stats.recent_alerts.length > 0 ? (
                stats.recent_alerts.map((alert) => (
                  <div key={alert.id} className="border-2 border-red-200 bg-red-50/30 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-sm text-slate-800">Branch LGD {alert.branch_lgd_code}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Uploader: {alert.uploader_name}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-red-600 text-base">{alert.behavioral_risk_score}</span>
                        <div className="text-[9px] font-bold text-red-500 uppercase tracking-widest mt-0.5">Risk Score</div>
                      </div>
                    </div>

                    <div className="p-2.5 bg-white border border-red-100 rounded text-xs text-red-800 space-y-1">
                      <div className="font-semibold flex items-center gap-1">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        <span>Quarantine Reason:</span>
                      </div>
                      <p className="leading-relaxed text-slate-600 text-[11px] mt-1">
                        {alert.quarantine_reason}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Link 
                        href="/risk-review"
                        className="flex-1 text-center bg-white border border-slate-200 text-slate-700 font-semibold py-1.5 rounded text-xs hover:bg-slate-50 active:scale-95 transition-all"
                      >
                        Investigate Telemetry
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-10 text-slate-400">
                  <ShieldCheck className="h-12 w-12 text-slate-300 stroke-[1.5] mb-2" />
                  <span className="text-xs font-semibold">No high-risk compliance fraud detected.</span>
                  <span className="text-[10px] text-slate-400 mt-1">Telemetry scoring engine is scanning uploads.</span>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Active MAPs Audit Trail */}
      <div className="bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden mt-8">
        <div className="p-5 border-b border-neutral-200 bg-neutral-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Search className="h-5 w-5 text-primary-500" />
            <span>{t('Active MAPs Audit Trail')}</span>
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-slate-50">
                <th className="p-4 font-bold text-slate-500 uppercase tracking-wider">MAP ID</th>
                <th className="p-4 font-bold text-slate-500 uppercase tracking-wider">Title</th>
                <th className="p-4 font-bold text-slate-500 uppercase tracking-wider">Department</th>
                <th className="p-4 font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-right">Audit Action</th>
              </tr>
            </thead>
            <tbody>
              {allMaps.map(map => (
                <tr key={map.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-4 font-mono font-bold text-slate-600">{map.id}</td>
                  <td className="p-4 font-semibold text-slate-800">{map.title}</td>
                  <td className="p-4 text-slate-500">{map.department}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${map.status === 'VERIFIED' ? 'bg-success-100 text-success-700' : map.status === 'QUARANTINED' ? 'bg-red-100 text-red-700' : 'bg-warning-100 text-warning-700'}`}>
                      {map.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {map.status === 'VERIFIED' && map.evidence_hash && (
                      <button 
                        onClick={() => setSelectedAuditMap(map)}
                        className="text-primary-600 hover:text-primary-800 font-bold"
                      >
                        View Audit Trail
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {allMaps.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">No active MAPs found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Modal */}
      {selectedAuditMap && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl max-w-xl w-full overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success-500" />
                Immutable Audit Record
              </h3>
              <button 
                onClick={() => setSelectedAuditMap(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">MAP Title</span>
                <span className="block font-semibold text-slate-800">{selectedAuditMap.title}</span>
              </div>
              
              <div className="bg-slate-900 rounded p-4">
                <div className="flex items-center gap-2 text-slate-400 mb-2 border-b border-slate-800 pb-2">
                  <Hash className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">SHA-256 WORM Vault Hash</span>
                </div>
                <div className="font-mono text-success-400 text-xs break-all select-all">
                  {selectedAuditMap.evidence_hash}
                </div>
              </div>
              
              <p className="text-xs text-slate-500 italic">
                This cryptographic signature ensures the uploaded evidence cannot be tampered with. It is locked in the append-only ledger.
              </p>
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 text-right">
              <button 
                onClick={() => setSelectedAuditMap(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
