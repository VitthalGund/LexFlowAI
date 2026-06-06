'use client';

import React, { useEffect, useState, use } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { MAPStatusBadge } from '@/components/maps/MAPStatusBadge';
import { 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  FileText,
  AlertTriangle,
  Fingerprint
} from 'lucide-react';
import Link from 'next/link';

interface BranchMAPItem {
  id: string;
  circular_id: string;
  title: string;
  description: string;
  localized_description: string;
  kpi: string;
  deadline_days: number;
  deadline: string;
  department: string;
  evidence_type: string;
  geographic_scope: string;
  status: string;
  evidence_hash?: string;
}

interface BranchInfo {
  lgd_code: string;
  branch_name: string;
  district: string;
  state: string;
  language_code: string;
}

interface PageProps {
  params: Promise<{ lgd: string }>;
}

export default function BranchMapsPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const lgdCode = resolvedParams.lgd;
  
  const [maps, setMaps] = useState<BranchMAPItem[]>([]);
  const [branch, setBranch] = useState<BranchInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBranchData = async () => {
      try {
        setLoading(true);
        const [mapsRes, branchRes] = await Promise.all([
          api.get(`/api/v1/maps/branch/${lgdCode}`),
          api.get(`/api/v1/branches/${lgdCode}`)
        ]);
        setMaps(mapsRes.data);
        setBranch(branchRes.data);
      } catch (err) {
        console.error('Failed to retrieve branch portals:', err);
      } finally {
        setLoading(false);
      }
    };
    Promise.resolve().then(() => {
      fetchBranchData();
    });
  }, [lgdCode]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="text-center py-20 bg-white border border-slate-200 rounded-lg text-slate-500">
        <h3 className="font-bold text-sm">Branch Portal Access Denied</h3>
        <p className="text-xs mt-1">LGD code is not in-scope or branch does not exist.</p>
      </div>
    );
  }

  // Branch Localization Headers
  const localizationHeaders: Record<string, { welcome: string; sub: string; pending: string; completed: string }> = {
    kn: {
      welcome: "ಶಾಖಾ ಅನುಸರಣೆ ಪೋರ್ಟಲ್",
      sub: "ನಿಮ್ಮ ಶಾಖೆಗೆ ನಿಯೋಜಿಸಲಾದ ಸಕ್ರಿಯ ರಿಸರ್ವ್ ಬ್ಯಾಂಕ್ ನಿರ್ದೇಶನಗಳು ಮತ್ತು ಕಾರ್ಯಾಚರಣೆಗಳು.",
      pending: "ಬಾಕಿ ಉಳಿದಿರುವ ಕಾರ್ಯಗಳು",
      completed: "ಪೂರ್ಣಗೊಂಡ ಕಾರ್ಯಗಳು"
    },
    ta: {
      welcome: "கிளை இணக்க போர்டல்",
      sub: "உங்கள் கிளைக்கு ஒதுக்கப்பட்ட செயலில் உள்ள இந்திய ரிசர்வ் வங்கி உத்தரவுகள் மற்றும் பணிகள்.",
      pending: "நிலுவையில் உள்ள பணிகள்",
      completed: "முடிந்த பணிகள்"
    },
    ml: {
      welcome: "ബ്രാഞ്ച് കംപ്ലയൻസ് പോർട്ടൽ",
      sub: "നിങ്ങളുടെ ബ്രാഞ്ചിനായി നിശ്ചയിച്ചിട്ടുള്ള സജീവ ആർ.ബി.ഐ നിർദ്ദേശങ്ങളും ചുമതലകളും.",
      pending: "തീർച്ചപ്പെടുത്താത്ത ചുമതലകൾ",
      completed: "പൂർത്തിയായവ"
    },
    hi: {
      welcome: "शाखा अनुपालन पोर्टल",
      sub: "आपकी शाखा को आवंटित सक्रिय भारतीय रिज़र्व बैंक निर्देश एवं अनुपालन कार्य।",
      pending: "लंबित कार्य",
      completed: "पूर्ण कार्य"
    },
    en: {
      welcome: "Branch Compliance Portal",
      sub: "Active RBI directions and operational compliance action points assigned to your branch.",
      pending: "Pending Mandates",
      completed: "Completed Audits"
    }
  };

  const text = localizationHeaders[branch.language_code] || localizationHeaders.en;
  
  const pendingTasks = maps.filter((m) => m.status === 'PENDING' || m.status === 'IN_PROGRESS' || m.status === 'QUARANTINED');
  const completedTasks = maps.filter((m) => m.status === 'VERIFIED' || m.status === 'ACCEPTED' || m.status === 'SUBMITTED');

  return (
    <div className="max-w-4xl mx-auto space-y-8 select-none">
      
      {/* Branch Header */}
      <div className="bg-slate-900 text-white p-6 rounded-lg shadow-md border border-slate-800 relative overflow-hidden">
        {/* Subtle grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:15px_15px] pointer-events-none"></div>
        <div className="relative z-10 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded border border-emerald-500/20">
              LGD Code: {branch.lgd_code}
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-300 font-semibold">{branch.district}, {branch.state}</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">{text.welcome} - {branch.branch_name}</h2>
          <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">{text.sub}</p>
        </div>
      </div>

      {/* Overview stats cards */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="flex items-center justify-between border-l-4 border-l-warning-500">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">{text.pending}</span>
            <span className="text-2xl font-bold text-slate-800 mt-1 block">{pendingTasks.length}</span>
          </div>
          <div className="p-2.5 bg-warning-50 text-warning-600 rounded-full shrink-0">
            <Clock className="h-5 w-5" />
          </div>
        </Card>

        <Card className="flex items-center justify-between border-l-4 border-l-success-500">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">{text.completed}</span>
            <span className="text-2xl font-bold text-slate-800 mt-1 block">{completedTasks.length}</span>
          </div>
          <div className="p-2.5 bg-success-50 text-success-600 rounded-full shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Task List */}
      <div className="space-y-6">
        <h3 className="font-bold text-slate-800 text-sm tracking-tight flex items-center gap-2">
          <FileText className="h-4.5 w-4.5 text-primary-500" />
          <span>Active Compliance Requirements</span>
        </h3>

        {maps.length > 0 ? (
          <div className="space-y-4">
            {maps.map((item) => {
              const isQuarantined = item.status === 'QUARANTINED';
              const isCompleted = item.status === 'VERIFIED' || item.status === 'ACCEPTED' || item.status === 'SUBMITTED';

              return (
                <div 
                  key={item.id} 
                  className={`bg-white border rounded-lg p-5 shadow-sm space-y-4 transition-all ${
                    isQuarantined 
                      ? 'border-red-300 bg-red-50/10' 
                      : 'border-neutral-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-800 text-base">{item.title}</h4>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold font-mono">
                        <span>Ref: {item.id}</span>
                        <span>|</span>
                        <span>Circular: {item.circular_id}</span>
                      </div>
                    </div>
                    <MAPStatusBadge status={item.status} />
                  </div>

                  {/* Localized translation of instruction */}
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded font-medium border border-slate-100">
                    {item.localized_description}
                  </p>

                  {/* Quarantine alert context */}
                  {isQuarantined && (
                    <div className="p-3 rounded bg-red-100/50 border border-red-200 text-red-800 text-xs font-semibold leading-relaxed flex items-start gap-2 animate-pulse">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                      <p>
                        Submission rejected by BehaviorGuard security scan due to telemetry validation anomalies.
                        Please re-read compliance instructions carefully and submit authentic file evidence.
                      </p>
                    </div>
                  )}

                  {/* Task details bar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex flex-wrap gap-4 text-slate-500 font-semibold">
                      <div>
                        <span>Required Format: </span>
                        <span className="text-slate-700">{item.evidence_type}</span>
                      </div>
                      <div>
                        <span>Department: </span>
                        <span className="text-slate-700">{item.department}</span>
                      </div>
                      <div>
                        <span>Deadline days: </span>
                        <span className="text-red-600">{item.deadline_days} days remaining</span>
                      </div>
                    </div>

                    {!isCompleted ? (
                      <Link
                        href={`/branch/${lgdCode}/submit/${item.id}`}
                        className="bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs py-2 px-4 rounded shadow-sm flex items-center gap-1 active:scale-95 transition-all"
                      >
                        <span>Submit Evidence</span>
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    ) : (
                      item.evidence_hash && (
                        <div className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded flex items-center gap-1 font-mono font-bold select-all">
                          <Fingerprint className="h-3 w-3 text-emerald-600" />
                          <span>Ledger Hash: {item.evidence_hash.substring(0, 16)}...</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-white border border-slate-200 rounded-lg text-slate-400">
            <CheckCircle2 className="h-12 w-12 mx-auto text-slate-300 stroke-[1.5] mb-2" />
            <p className="text-xs font-semibold">Excellent! No active tasks for this branch.</p>
          </div>
        )}
      </div>

    </div>
  );
}
