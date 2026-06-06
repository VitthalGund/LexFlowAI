'use client';

import React, { useEffect, useState, use } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { MAPStatusBadge } from '@/components/maps/MAPStatusBadge';
import { 
  Building, 
  Calendar, 
  ArrowLeft, 
  Fingerprint, 
  CheckCircle,
  Globe2,
  ListTodo
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
  
  const [mapDetail, setMapDetail] = useState<MAPDetail | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [ledger, setLedger] = useState<EvidenceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Translation tab state
  const [activeLang, setActiveLang] = useState('en');

  useEffect(() => {
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
      } catch (err) {
        console.error('Failed to load MAP details:', err);
      } finally {
        setLoading(false);
      }
    };
    Promise.resolve().then(() => {
      fetchDetails();
    });
  }, [mapId]);

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

      {/* Main Detail Header */}
      <Card className="relative overflow-hidden">
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

      {/* Assigned Branches List */}
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

    </div>
  );
}
