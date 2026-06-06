'use client';

import React, { useEffect, useState, use } from 'react';
import { api } from '@/lib/api';
import { useTelemetry } from '@/hooks/useTelemetry';
import { Card } from '@/components/ui/Card';
import { 
  ArrowLeft, 
  Upload, 
  FileText, 
  CheckCircle2, 
  Fingerprint, 
  ShieldAlert,
  Loader2
} from 'lucide-react';
import Link from 'next/link';

interface MAPDetail {
  id: string;
  circular_id: string;
  title: string;
  description: string;
  kpi: string;
  deadline_days: number;
  department: string;
  evidence_type: string;
  geographic_scope: string;
  status: string;
  translations: Record<string, string>;
}

interface BranchInfo {
  lgd_code: string;
  branch_name: string;
  language_code: string;
}

interface PageProps {
  params: Promise<{ lgd: string; mapId: string }>;
}

export default function EvidenceSubmissionPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const { lgd: lgdCode, mapId } = resolvedParams;

  const [mapDetail, setMapDetail] = useState<MAPDetail | null>(null);
  const [branch, setBranch] = useState<BranchInfo | null>(null);
  const [loading, setLoading] = useState(true);
  
  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<'idle' | 'success' | 'quarantined' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [receiptHash, setReceiptHash] = useState('');

  // Localized submission page text
  const submitTranslations: Record<string, { title: string; instruction: string; uploadArea: string; selected: string; submitBtn: string }> = {
    kn: {
      title: "ಸಾಕ್ಷ್ಯ ಸಲ್ಲಿಕೆ ಗೇಟ್",
      instruction: "ಕೆಳಗಿನ ಅಧಿಕೃತ ಸೂಚನೆಗಳನ್ನು ಎಚ್ಚರಿಕೆಯಿಂದ ಓದಿ ಮತ್ತು ನಿಮ್ಮ ಶಾಖೆಗೆ ಅಗತ್ಯವಿರುವ ಸಾಕ್ಷ್ಯ ಫೈಲ್ ಅನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ.",
      uploadArea: "ಫೈಲ್ ಅನ್ನು ಇಲ್ಲಿಗೆ ಎಳೆಯಿರಿ ಅಥವಾ ಬ್ರೌಸ್ ಮಾಡಲು ಕ್ಲಿಕ್ ಮಾಡಿ",
      selected: "ಆಯ್ದ ಫೈಲ್",
      submitBtn: "ಅಧಿಕೃತ ಅನುಸರಣೆ ಸಲ್ಲಿಸಿ"
    },
    ta: {
      title: "சான்றுகள் சமர்ப்பிப்பு வாயில்",
      instruction: "கீழே உள்ள கிளை வழிகாட்டுதல்களை கவனமாகப் படித்து, தேவையான சான்று கோப்பை பதிவேற்றவும்.",
      uploadArea: "கோப்பை இங்கே இழுக்கவும் அல்லது உலாவ கிளிக் செய்யவும்",
      selected: "தேர்ந்தெடுக்கப்பட்ட கோப்பு",
      submitBtn: "அதிகாரப்பூர்வ இணக்கம் சமர்ப்பி"
    },
    ml: {
      title: "തെളിവ് സമർപ്പണ ഗേറ്റ്",
      instruction: "താഴെ നൽകിയിരിക്കുന്ന ബ്രാഞ്ച് നിർദ്ദേശങ്ങൾ ശ്രദ്ധാപൂർവ്വം വായിച്ച് ആവശ്യമായ തെളിവ് ഫയൽ അപ്‌ലോഡ് ചെയ്യുക.",
      uploadArea: "ഫയൽ ഇവിടെ വലിച്ചിടുക അല്ലെങ്കിൽ ബ്രൗസ് ചെയ്യാൻ ക്ലിക്ക് ചെയ്യുക",
      selected: "തിരഞ്ഞെടുത്ത ഫയൽ",
      submitBtn: "ഔദ്യോഗിക അനുസരണം സമർപ്പിക്കുക"
    },
    hi: {
      title: "साक्ष्य प्रस्तुतीकरण गेट",
      instruction: "कृपया निम्नलिखित निर्देशों को ध्यान से पढ़ें और आवश्यक साक्ष्य दस्तावेज अपलोड करें।",
      uploadArea: "फ़ाइल को यहाँ खींचें या ब्राउज़ करने के लिए क्लिक करें",
      selected: "चयनित फ़ाइल",
      submitBtn: "आधिकारिक साक्ष्य जमा करें"
    },
    en: {
      title: "Evidence Submission Gate",
      instruction: "Read the active compliance requirements below carefully, then upload the required verification file.",
      uploadArea: "Drag and drop your evidence file here, or click to browse",
      selected: "Selected File",
      submitBtn: "Submit Official Evidence"
    }
  };

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setLoading(true);
        const [mapRes, branchRes] = await Promise.all([
          api.get(`/api/v1/maps/${mapId}`),
          api.get(`/api/v1/branches/${lgdCode}`)
        ]);
        setMapDetail(mapRes.data);
        setBranch(branchRes.data);
      } catch (err) {
        console.error('Failed to load compliance metadata:', err);
      } finally {
        setLoading(false);
      }
    };
    Promise.resolve().then(() => {
      fetchMetadata();
    });
  }, [mapId, lgdCode]);

  // Estimate the text word count to calculate reading speed
  const textWordCount = mapDetail ? mapDetail.description.split(/\s+/).length + 200 : 300;
  
  // Initialize silent telemetry tracker
  const { submitTelemetry } = useTelemetry(mapId, textWordCount);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!mapDetail || !branch) {
    return (
      <div className="text-center py-20 bg-white border border-slate-200 rounded-lg text-slate-500">
        <h3 className="font-bold text-sm">Submission Access Revoked</h3>
        <p className="text-xs mt-1">Verification parameters are invalid.</p>
      </div>
    );
  }

  const lang = branch.language_code || 'en';
  const labelText = submitTranslations[lang] || submitTranslations.en;
  
  const localizedDesc = lang !== 'en' && mapDetail.translations?.[lang] 
    ? mapDetail.translations[lang] 
    : mapDetail.description;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg('Please select a valid file before submitting.');
      return;
    }

    setUploading(true);
    setResult('idle');
    setErrorMsg('');

    try {
      // 1. Silent BehaviorGuard telemetry submission
      const telemetryResult = await submitTelemetry();
      
      // 2. Prepare FormData for file upload
      const formData = new FormData();
      formData.append('map_id', mapId);
      formData.append('file', file);
      
      // stringify the exact snapshot telemetry values that we want to pass along
      formData.append('telemetry', JSON.stringify({
        map_id: mapId,
        time_on_page_seconds: telemetryResult?.time_on_page_seconds || 5,
        max_scroll_percent: telemetryResult?.max_scroll_percent || 0,
        word_count: textWordCount,
        click_count: telemetryResult?.click_count || 0,
        tab_switches: telemetryResult?.tab_switches || 0,
        submitted_at: new Date().toISOString()
      }));

      const response = await api.post('/api/v1/evidence/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const vaultEntry = response.data.vault_entry;
      
      if (vaultEntry.vault_status === 'QUARANTINED') {
        // Silent quarantine trigger: show generic error to force them to read the policy document
        setResult('quarantined');
      } else {
        setReceiptHash(vaultEntry.sha256_hash);
        setResult('success');
      }

    } catch (err) {
      console.error('File upload failed:', err);
      setResult('error');
      const errPayload = err as { response?: { data?: { detail?: string } } };
      setErrorMsg(errPayload.response?.data?.detail || 'An unexpected error occurred during cryptographic submission.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 select-none">
      
      {/* Back button */}
      <Link
        href={`/branch/${lgdCode}/maps`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary-600 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Task Board</span>
      </Link>

      {result === 'idle' && (
        <Card className="space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-slate-100 text-slate-600 font-mono font-bold px-2 py-0.5 rounded border border-slate-200">
                {mapDetail.id}
              </span>
              <span className="text-xs text-slate-400 font-semibold">LGD Reference: {branch.lgd_code}</span>
            </div>
            <h2 className="text-lg font-bold text-slate-800 mt-2">{labelText.title}</h2>
            <p className="text-xs text-slate-500 mt-1">{labelText.instruction}</p>
          </div>

          {/* Localized Instructions block */}
          <div className="bg-[#0D1F3C] text-white p-5 rounded-lg border border-slate-800 space-y-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-bl-full pointer-events-none"></div>
            <div className="text-[10px] text-primary-300 font-bold uppercase tracking-wider">
              Official Regulatory Directive (ಕನ್ನಡ / English)
            </div>
            <h3 className="font-bold text-sm text-white mt-1">{mapDetail.title}</h3>
            <p className="text-xs text-slate-300 leading-relaxed font-sans mt-2">
              {localizedDesc}
            </p>
            <div className="pt-2 flex justify-between items-center text-[10px] text-slate-400 font-semibold border-t border-white/10">
              <span>Required Format: {mapDetail.evidence_type}</span>
              <span>Deadline: {mapDetail.deadline_days} days</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleUploadSubmit} className="space-y-6">
            
            {/* File Ingress Area */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                Upload Compliance Evidence ({mapDetail.evidence_type})
              </label>
              
              <div className="relative border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-lg p-8 text-center cursor-pointer transition-colors bg-slate-50">
                <input
                  type="file"
                  required
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Upload className="h-8 w-8 text-slate-300" />
                  <span className="text-xs font-semibold text-slate-600">{labelText.uploadArea}</span>
                  <span className="text-[10px] text-slate-400">PDF, PNG, JPG, or LOG file (Max 10MB)</span>
                </div>
              </div>

              {file && (
                <div className="mt-3 p-3 bg-slate-100 border border-slate-200 rounded flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <FileText className="h-4.5 w-4.5 text-primary-500" />
                    <span>{file.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">{(file.size / 1024).toFixed(1)} KB</span>
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={uploading || !file}
              className={`w-full py-3 px-4 rounded font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 ${
                file 
                  ? 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer' 
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Generating SHA-256 Reciept...</span>
                </>
              ) : (
                <span>{labelText.submitBtn}</span>
              )}
            </button>

          </form>
        </Card>
      )}

      {/* Success View */}
      {result === 'success' && (
        <Card className="p-8 space-y-6 text-center">
          <CheckCircle2 className="h-16 w-16 text-success-500 mx-auto" />
          <div className="space-y-2">
            <h3 className="font-bold text-slate-800 text-base">Evidence Verification Locked</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Your submission has been accepted and written to the append-only compliance ledger.
            </p>
          </div>

          <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-4 font-mono text-left max-w-md mx-auto space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-bold border-b border-emerald-100 pb-2">
              <Fingerprint className="h-4 w-4 text-emerald-600" />
              <span>TrustVault Cryptographic Receipt</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-400 font-sans block uppercase font-bold">SHA-256 Evidence Hash</span>
              <span className="text-xs text-slate-700 break-all select-all font-bold block mt-0.5">{receiptHash}</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-400 font-sans block uppercase font-bold">Server Locked Timestamp</span>
              <span className="text-xs text-slate-600 font-bold block mt-0.5">{new Date().toLocaleString()}</span>
            </div>
          </div>

          <div className="pt-4">
            <Link
              href={`/branch/${lgdCode}/maps`}
              className="inline-block bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-6 rounded shadow"
            >
              Return to Tasks
            </Link>
          </div>
        </Card>
      )}

      {/* Quarantine / Alert View (Silently prevents checkbox compliance) */}
      {result === 'quarantined' && (
        <Card className="p-8 space-y-6 text-center bg-red-50/10 border-red-200">
          <ShieldAlert className="h-16 w-16 text-red-500 mx-auto animate-bounce" />
          <div className="space-y-2">
            <h3 className="font-bold text-red-800 text-base">Validation Check Failed</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              Compliance verification error code <span className="font-mono font-bold bg-slate-100 px-1 py-0.5 rounded text-red-600">LFA-403</span>. 
              The system detected anomalous metrics during upload validation.
            </p>
          </div>

          <div className="p-4 bg-white border border-red-100 rounded text-xs text-left text-slate-600 leading-relaxed space-y-2 max-w-md mx-auto">
            <h4 className="font-bold text-red-700">Remediation Action Required:</h4>
            <ul className="list-disc pl-4 space-y-1 text-[11px]">
              <li>Carefully review the regulatory directive text and guidelines (minimum read threshold required).</li>
              <li>Provide the specific file evidence requested (e.g. valid log files or scan reports).</li>
              <li>Ensure compliance submissions are uploaded during active working hours.</li>
            </ul>
          </div>

          <div className="pt-4 flex gap-3 justify-center">
            <button
              onClick={() => {
                setFile(null);
                setResult('idle');
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-6 rounded shadow"
            >
              Read Directions and Try Again
            </button>
          </div>
        </Card>
      )}

    </div>
  );
}
