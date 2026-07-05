'use client';

import React, { useEffect, useState, use } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { MAPStatusBadge } from '@/components/maps/MAPStatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { ComplianceDriftStrip } from '@/components/maps/ComplianceDriftStrip';
import { 
  Building, 
  Calendar, 
  ArrowLeft, 
  Fingerprint, 
  CheckCircle,
  Globe2,
  ListTodo,
  ChevronDown,
  ChevronRight,
  Bot,
  AlertTriangle,
  Telescope,
  ShieldAlert,
  Settings,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';

interface MAPDetail {
  id: string;
  circular_id: string;
  title: string;
  description: string;
  kpi: string;
  deadline_days: number;
  deadline: string;
  department: string;
  evidence_type: string;
  geographic_scope: string;
  target_lgd_codes: string[];
  status: string;
  translations: Record<string, string>;
  evidence_hash?: string;
  behavioral_risk_score?: number;
  penalty_category?: string;
  penalty_precedent_display?: string;
  penalty_precedent_entity?: string;
  is_anticipatory?: boolean;
  horizon_signal_id?: string;
}

interface DriftAlert {
  id: string;
  map_id: string;
  policy_id: string;
  branch_lgd_code: string;
  detected_at: string;
  previous_value: string;
  current_value: string;
  threshold: string;
  status: 'OPEN' | 'RESOLVED' | 'ACKNOWLEDGED';
}


interface DecisionLogEntry {
  id: string;
  graph_name: string;
  node_name: string;
  iteration: number;
  input_summary: string;
  output_summary: string;
  validation_errors: string[];
  timestamp: string;
}

interface Branch {
  lgd_code: string;
  branch_name: string;
  district: string;
  state: string;
  classification: string;
  language_code: string;
}

interface EvidenceEntry {
  id: string;
  map_id: string;
  branch_lgd_code: string;
  uploader_name: string;
  file_name: string;
  sha256_hash: string;
  uploaded_at: string;
  behavioral_risk_score: number;
  vault_status: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function MapDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const mapId = resolvedParams.id;
  const { user } = useAuth();
  
  const [mapDetail, setMapDetail] = useState<MAPDetail | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [ledger, setLedger] = useState<EvidenceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [decisionLog, setDecisionLog] = useState<DecisionLogEntry[]>([]);
  const [showDecisionLog, setShowDecisionLog] = useState(false);
  
  // Translation tab state
  const [activeLang, setActiveLang] = useState('en');

  // Continuous compliance states
  const [activeTab, setActiveTab] = useState<'branches' | 'compliance'>('branches');
  const [driftAlerts, setDriftAlerts] = useState<DriftAlert[]>([]);
  const [simulatingDrift, setSimulatingDrift] = useState(false);

  const fetchDriftAlerts = async () => {
    try {
      const res = await api.get('/api/v1/continuum/drift-alerts', { params: { map_id: mapId } });
      setDriftAlerts(res.data);
    } catch (err) {
      console.error('Failed to fetch drift alerts:', err);
    }
  };

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const [mapRes, branchesRes, ledgerRes] = await Promise.all([
        api.get(`/api/v1/maps/${mapId}`),
        api.get('/api/v1/branches'),
        api.get('/api/v1/evidence/ledger')
      ]);
      setMapDetail(mapRes.data);
      setBranches(branchesRes.data);
      setLedger(ledgerRes.data);
      // Fetch Glass-Box Ledger (non-blocking)
      try {
        const logRes = await api.get(`/api/v1/maps/${mapId}/decision-log`);
        setDecisionLog(logRes.data);
      } catch {
        // Decision log not available
      }
      // Fetch drift alerts
      await fetchDriftAlerts();
    } catch (err) {
      console.error('Failed to load MAP details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchDetails();
    });
  }, [mapId]);

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await api.post(`/api/v1/continuum/drift-alerts/${alertId}/acknowledge`);
      alert('Drift alert acknowledged.');
      fetchDriftAlerts();
    } catch (err: any) {
      alert(`Failed to acknowledge: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleSimulateDrift = async (key: string, value: string) => {
    if (!mapDetail || !mapDetail.target_lgd_codes?.length) {
      alert('Cannot simulate drift on a MAP with no assigned branches.');
      return;
    }
    // Use the first assigned branch for simulation
    const targetBranch = mapDetail.target_lgd_codes[0];
    setSimulatingDrift(true);
    try {
      await api.post('/api/v1/continuum/simulate-drift', null, {
        params: {
          branch_lgd_code: targetBranch,
          key,
          value
        }
      });
      alert(`Drift simulated: ${key} set to ${value} for branch ${targetBranch}. Running compliance check...`);
      await fetchDriftAlerts();
    } catch (err: any) {
      alert(`Simulation failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setSimulatingDrift(false);
    }
  };


  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!mapDetail) {
    return (
      <div className="text-center py-20 bg-white border border-slate-200 rounded-lg text-slate-500">
        <h3 className="font-bold text-sm">MAP Task Not Found</h3>
        <p className="text-xs mt-1">Verify that the MAP ID is correct.</p>
      </div>
    );
  }

  // Filter assigned branches
  const assignedBranches = branches.filter((b) => 
    mapDetail.target_lgd_codes.includes(b.lgd_code)
  );

  // Map evidence entries by branch lgd_code
  const evidenceMap = ledger.reduce((acc, entry) => {
    if (entry.map_id === mapId) {
      acc[entry.branch_lgd_code] = entry;
    }
    return acc;
  }, {} as Record<string, EvidenceEntry>);

  const languageTabs = [
    { code: 'en', label: 'English' },
    { code: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
    { code: 'ta', label: 'தமிழ் (Tamil)' },
    { code: 'ml', label: 'മലയാളം (Malayalam)' },
    { code: 'hi', label: 'हिंदी (Hindi)' }
  ];

  const getLocalizedDescription = (lang: string) => {
    if (lang === 'en') return mapDetail.description;
    return mapDetail.translations?.[lang] || `[Offline translation for ${lang} not preseeded for this item]`;
  };

  return (
    <div className="space-y-8 select-none">
      
      {/* Back button */}
      <Link
        href="/maps"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary-600 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Action Points Ledger</span>
      </Link>

      {mapDetail.is_anticipatory && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-4 flex items-start gap-3 text-xs leading-relaxed font-semibold shadow-sm">
          <Telescope className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-800">Anticipatory Blueprint Mode</p>
            <p className="text-amber-700 mt-0.5 font-medium">
              This action point was generated proactively via LexFlow Horizon scanning. It is advisory for risk pre-mitigation and policy drafting — not a binding RBI circular instruction.
            </p>
          </div>
        </div>
      )}


      {/* Main Detail Header */}
      <Card className={`relative overflow-hidden ${mapDetail.is_anticipatory ? 'border-dashed border-2 border-amber-300' : ''}`}>
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary-100/30 rounded-bl-full pointer-events-none"></div>
        
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-slate-100 text-slate-600 font-mono font-bold px-2 py-0.5 rounded border border-slate-200">
                  {mapDetail.id}
                </span>
                <span className="text-xs text-slate-400 font-semibold">Ref: Circular {mapDetail.circular_id}</span>
                {mapDetail.is_anticipatory && (
                  <span className="text-[9px] bg-amber-500 text-white font-bold px-2 py-0.5 rounded flex items-center gap-1 shadow-sm uppercase tracking-wide">
                    <Telescope className="h-3 w-3" />
                    <span>Anticipatory</span>
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-800 mt-2">{mapDetail.title}</h2>
            </div>
            <MAPStatusBadge status={mapDetail.status} />
          </div>


          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs bg-slate-50 p-4 rounded border border-slate-100">
            <div>
              <span className="text-slate-400 font-bold uppercase text-[9px] block">Owner Department</span>
              <span className="text-slate-700 font-semibold mt-1 block">{mapDetail.department}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold uppercase text-[9px] block">Evidence Expected</span>
              <span className="text-slate-700 font-semibold mt-1 block">{mapDetail.evidence_type}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold uppercase text-[9px] block">Scope</span>
              <span className="text-slate-700 font-semibold mt-1 block flex items-center gap-1">
                <Building className="h-4 w-4 text-slate-400" />
                {mapDetail.geographic_scope} ({assignedBranches.length} branches)
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-bold uppercase text-[9px] block">Implementation Timeline</span>
              <span className="text-red-600 font-semibold mt-1 block flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {mapDetail.deadline_days} Days (Pending)
              </span>
            </div>
          </div>

          {/* Translation Tab panel */}
          <div className="space-y-4 border-t border-neutral-100 pt-6">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-2">
              <Globe2 className="h-4 w-4 text-primary-400" />
              <span>MULTILINGUAL BHARATVOICE LOCALIZATIONS (TRANSLATED FOR BRANCH MANAGERS)</span>
            </div>
            
            <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-2">
              {languageTabs.map((tab) => (
                <button
                  key={tab.code}
                  onClick={() => setActiveLang(tab.code)}
                  className={`text-xs px-3 py-1.5 rounded font-semibold transition-all ${
                    activeLang === tab.code
                      ? 'bg-primary-50 text-primary-700 border border-primary-200'
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="bg-slate-50 p-4 rounded text-xs text-slate-600 leading-relaxed font-medium font-sans min-h-[60px]">
              {getLocalizedDescription(activeLang)}
            </div>
          </div>

          {/* KPI */}
          <div className="space-y-2 border-t border-neutral-100 pt-6">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Verifiable success criteria (KPI)</span>
            <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded text-xs text-emerald-800 font-semibold leading-relaxed flex items-start gap-2.5">
              <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <p>{mapDetail.kpi}</p>
            </div>
          </div>

        </div>
      </Card>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('branches')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'branches'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Branch Compliance Scope
        </button>
        <button
          onClick={() => setActiveTab('compliance')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'compliance'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Settings className="h-4 w-4" />
          <span>ContinuumGuard Policy-as-Code</span>
          {driftAlerts.some(a => a.status === 'OPEN') && (
            <span className="h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
          )}
        </button>
      </div>

      {activeTab === 'branches' ? (
        <div className="space-y-4">
          <h3 className="font-bold text-slate-800 text-sm tracking-tight flex items-center gap-2">
            <ListTodo className="h-4.5 w-4.5 text-primary-500" />
            <span>Branch Compliance Ingress (LGD Scope)</span>
          </h3>
          
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-neutral-200">
                    <th className="p-4 font-bold text-slate-500 uppercase tracking-wider">Branch LGD</th>
                    <th className="p-4 font-bold text-slate-500 uppercase tracking-wider">Branch Name</th>
                    <th className="p-4 font-bold text-slate-500 uppercase tracking-wider">Regional Node</th>
                    <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                    <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-center">Behavioral Risk</th>
                    <th className="p-4 font-bold text-slate-500 uppercase tracking-wider">Evidence Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {assignedBranches.map((branch) => {
                    const upload = evidenceMap[branch.lgd_code];
                    
                    return (
                      <tr key={branch.lgd_code} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-4 font-mono text-slate-800 font-bold">{branch.lgd_code}</td>
                        <td className="p-4 font-semibold text-slate-700">{branch.branch_name}</td>
                        <td className="p-4 text-slate-500 font-medium">{branch.district}, {branch.state}</td>
                        <td className="p-4 text-center">
                          <MAPStatusBadge status={upload ? upload.vault_status : 'PENDING'} />
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-slate-600">
                          {upload ? (
                            <span className={upload.behavioral_risk_score >= 0.6 ? 'text-red-500' : 'text-emerald-600'}>
                              {upload.behavioral_risk_score}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="p-4 text-slate-500 font-mono text-[10px] break-all max-w-[200px]">
                          {upload && upload.vault_status === 'ACCEPTED' ? (
                            <span className="bg-emerald-50 text-emerald-800 px-2 py-1 rounded border border-emerald-100 flex items-center gap-1 w-max font-bold">
                              <Fingerprint className="h-3 w-3 shrink-0 text-emerald-600" />
                              {upload.sha256_hash.substring(0, 12)}...
                            </span>
                          ) : upload && upload.vault_status === 'QUARANTINED' ? (
                            <span className="text-red-500 font-semibold">[Quarantined in Vault]</span>
                          ) : (
                            <span className="text-slate-300">No submission</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        <Card className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
            <div>
              <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-500 animate-pulse" />
                <span>ContinuumGuard Continuous Compliance Policy</span>
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Real-time policy execution engine evaluates live branch telemetry settings against compliance rules.
              </p>
            </div>
            {(user?.role === 'COMPLIANCE_OFFICER' || user?.role === 'IT_ENGINEER') && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSimulateDrift('tls_version', '1.2')}
                  disabled={simulatingDrift}
                  className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold px-3 py-1.5 rounded text-[10px] transition-all"
                >
                  {simulatingDrift ? 'Simulating...' : 'Simulate TLS Drift (1.2)'}
                </button>
                <button
                  onClick={() => handleSimulateDrift('tls_version', '1.3')}
                  disabled={simulatingDrift}
                  className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold px-3 py-1.5 rounded text-[10px] transition-all"
                >
                  Restore TLS (1.3)
                </button>
              </div>
            )}
          </div>
          <ComplianceDriftStrip 
            alerts={driftAlerts}
            onAcknowledge={handleAcknowledgeAlert}
            userRole={user?.role}
          />
        </Card>
      )}


      {/* Penalty Precedent Warning */}
      {mapDetail.penalty_category && mapDetail.penalty_precedent_display && (
        <Card>
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-slate-800">Penalty Precedent Warning</p>
              <p className="text-xs text-slate-600 mt-1">
                Non-compliance with <span className="font-semibold">{mapDetail.penalty_category.replace('_', ' ')}</span> requirements
                has cost regulated entities up to <span className="font-bold text-red-700">{mapDetail.penalty_precedent_display}</span> in recent RBI enforcement actions
                {mapDetail.penalty_precedent_entity ? ` (e.g., ${mapDetail.penalty_precedent_entity})` : ''}.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Glass-Box Ledger — AI Decision Trace */}
      <Card>
        <button
          onClick={() => setShowDecisionLog(!showDecisionLog)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary-600" />
            <span className="text-sm font-bold text-slate-800">Why did the AI decide this?</span>
            {decisionLog.length > 0 && (
              <span className="text-[10px] bg-primary-50 border border-primary-200 text-primary-700 font-bold px-2 py-0.5 rounded-full">
                {decisionLog.length} steps
              </span>
            )}
          </div>
          {showDecisionLog
            ? <ChevronDown className="h-4 w-4 text-slate-400" />
            : <ChevronRight className="h-4 w-4 text-slate-400" />
          }
        </button>

        {showDecisionLog && (
          <div className="mt-4 space-y-3">
            {decisionLog.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No decision log available for this MAP. Logs are generated for newly ingested circulars.</p>
            ) : (
              decisionLog.map((entry, idx) => (
                <div key={entry.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      entry.node_name === 'pipeline_complete' ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                      : entry.node_name === 'red_team' ? 'bg-red-50 text-red-700 border border-red-300 animate-pulse'
                      : entry.validation_errors?.length > 0 ? 'bg-orange-100 text-orange-700 border border-orange-300'
                      : 'bg-primary-50 text-primary-700 border border-primary-200'
                    }`}>
                      {idx + 1}
                    </div>
                    {idx < decisionLog.length - 1 && (
                      <div className="w-px flex-1 bg-slate-100 mt-1" />
                    )}
                  </div>
                  <div className="pb-4 flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-bold text-slate-700 font-mono">
                        {entry.node_name === 'red_team' ? '🔴 Red-Team Auditor Critique' : entry.node_name}
                      </span>
                      <span className="text-[9px] text-slate-400">iter {entry.iteration}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">In: {entry.input_summary}</p>
                    <p className="text-[11px] text-slate-700 mt-0.5 font-medium">Out: {entry.output_summary}</p>
                    {entry.validation_errors?.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {entry.validation_errors.slice(0, 3).map((e, i) => (
                          <p key={i} className={`text-[10px] px-2 py-0.5 rounded ${
                            entry.node_name === 'red_team'
                              ? 'text-red-700 bg-red-50 font-bold border border-red-100/50'
                              : 'text-orange-600 bg-orange-50'
                          }`}>{e}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </Card>

    </div>
  );
}
