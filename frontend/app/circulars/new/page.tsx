'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { MAPStatusBadge } from '@/components/maps/MAPStatusBadge';
import { 
  ArrowRight, 
  Loader2, 
  CheckCircle2, 
  Sparkles,
  Building,
  Calendar,
  Check,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

interface ExtractedMAP {
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
}

// Sample RBI Direction template for one-click demo
const MOCK_RBI_TEMPLATE = {
  circular_number: "RBI/2026-27/112",
  title: "Master Direction – Information Technology Governance, Risk, Controls and Assurance Practices",
  raw_text: `RESERVE BANK OF INDIA
www.rbi.org.in

RBI/2026-27/112
DoS.CO.CSITE.SEC.No.1/31.01.015/2026-27

April 15, 2026

The Chairman / Managing Director / Chief Executive Officer
All Scheduled Commercial Banks (excluding Regional Rural Banks)
All Small Finance Banks and Payments Banks
All Non-Banking Financial Companies (NBFCs)

Madam / Dear Sir,

Master Direction – Information Technology Governance, Risk, Controls and Assurance Practices

1. The Reserve Bank of India has observed that Regulated Entities (REs) are increasingly relying on Information Technology (IT) to deliver critical services. To ensure resilience, all REs are required to adhere to the following strict compliance measures.

2. IT Infrastructure Upgrades (TLS 1.3):
All internet-facing web applications, mobile app backend servers, and API gateways must be upgraded to strictly enforce the Transport Layer Security (TLS) 1.3 protocol. Fallback to TLS 1.0, 1.1, or 1.2 is explicitly prohibited for internet-facing systems.
Deadline: REs must ensure 100% compliance within 30 days of this circular. Proof of compliance must be maintained via automated scan logs.

3. Access Management and Multi-Factor Authentication (MFA):
To mitigate credential compromise, Multi-factor authentication (MFA) must be strictly implemented for all privileged accounts, database administrators, and IT operations staff accessing production environments.
Deadline: Full implementation within 15 days. System access logs must be verifiable by concurrent auditors.

4. Cybersecurity Awareness Training:
The Board shall ensure that a comprehensive, role-based Cybersecurity Awareness Training program is conducted for all employees, contractors, and third-party vendors with system access.
Deadline: To be completed within 60 days. LMS completion certificates must be stored for regulatory inspection.

Yours faithfully,

(Chief General Manager-in-Charge)
Department of Supervision`
};

export default function IngestCircularPage() {
  const [circularNumber, setCircularNumber] = useState('');
  const [title, setTitle] = useState('');
  const [rawText, setRawText] = useState('');
  const [issuedDate, setIssuedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [status, setStatus] = useState<'idle' | 'ingesting' | 'completed' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [extractedMaps, setExtractedMaps] = useState<ExtractedMAP[]>([]);

  // Steps for LangGraph visualization
  const steps = [
    { title: 'Ingesting Circular', desc: 'Parsing structure & text token streams...' },
    { title: 'MAP Node (Ollama)', desc: 'Extracting action points using gaganyatri/sarvam-2b LLM...' },
    { title: 'Validation Node', desc: 'Enforcing strict Pydantic compliance constraints...' },
    { title: 'Routing Node', desc: 'Assigning to branches via government-standard LGD codes...' },
    { title: 'BharatVoice Node', desc: 'Generating regional localizations (Kannada, Tamil)...' }
  ];

  const fillDemoTemplate = () => {
    setCircularNumber(MOCK_RBI_TEMPLATE.circular_number);
    setTitle(MOCK_RBI_TEMPLATE.title);
    setRawText(MOCK_RBI_TEMPLATE.raw_text);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setStatus('ingesting');
    setActiveStep(0);

    // Step 0 -> Step 1 (Ollama LLM) takes a moment, then it parks at the LLM node which does the heavy lifting.
    const interval = setInterval(() => {
      setActiveStep((prev) => {
        if (prev < 1) return prev + 1;
        clearInterval(interval);
        return prev;
      });
    }, 1500);

    try {
      const payload = {
        circular_number: circularNumber,
        title,
        issued_date: new Date(issuedDate).toISOString(),
        raw_text: rawText
      };

      const response = await api.post('/api/v1/circulars/ingest', payload);
      
      clearInterval(interval);
      
      // The API returned successfully! Rapidly animate through the remaining success steps
      const finalSteps = async () => {
        for (let i = 2; i < steps.length; i++) {
          setActiveStep(i);
          await new Promise(r => setTimeout(r, 600));
        }
        setActiveStep(steps.length);
        setExtractedMaps(response.data.maps_extracted || []);
        setStatus('completed');
      };
      
      finalSteps();

    } catch (err) {
      clearInterval(interval);
      setStatus('error');
      const errPayload = err as { response?: { data?: { detail?: string } } };
      setErrorMessage(errPayload.response?.data?.detail || 'LangGraph extraction pipeline encountered an error.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 select-none">
      
      {/* Overview */}
      <div className="flex justify-between items-center bg-white p-6 rounded-lg border border-neutral-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Circular Ingestion Gate</h2>
          <p className="text-xs text-slate-500 mt-1">Upload official RBI notifications to trigger autonomous Multi-Agent compliance workflows.</p>
        </div>
        {status === 'idle' && (
          <button
            onClick={fillDemoTemplate}
            className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3.5 py-2 border border-emerald-200 rounded-lg active:scale-95 transition-all"
          >
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <span>Pre-fill Demo</span>
          </button>
        )}
      </div>

      {status === 'idle' && (
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Circular Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RBI/2026-27/304"
                  value={circularNumber}
                  onChange={(e) => setCircularNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-primary-500 rounded px-3 py-2 text-sm outline-none transition-colors"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Circular Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Direction on Cyber Security Framework"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-primary-500 rounded px-3 py-2 text-sm outline-none transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Issued Date
                </label>
                <input
                  type="date"
                  required
                  value={issuedDate}
                  onChange={(e) => setIssuedDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-primary-500 rounded px-3 py-2 text-sm outline-none transition-colors text-slate-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Circular Body / Raw Text
              </label>
              <textarea
                required
                rows={8}
                placeholder="Paste the raw text details of the regulatory notification here..."
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-primary-500 rounded px-3.5 py-3 text-sm outline-none transition-colors resize-none font-mono"
              ></textarea>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-[#1A3A6B] hover:bg-slate-800 text-white font-bold text-sm py-3 px-6 rounded shadow-md flex items-center gap-2 active:scale-98 transition-all"
              >
                <span>Trigger LexGraph Compliance Engine</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Ingesting Pipeline Processing State */}
      {status === 'ingesting' && (
        <Card className="p-8 space-y-8">
          <div className="text-center space-y-2">
            <Loader2 className="h-10 w-10 text-primary-500 animate-spin mx-auto" />
            <h3 className="text-slate-800 font-bold text-base mt-4">Running Compliance Pipeline</h3>
            <p className="text-xs text-slate-400">LexGraph is orchestrating autonomous agents in the background.</p>
          </div>

          <div className="max-w-md mx-auto relative border-l border-slate-200 pl-6 space-y-6">
            {steps.map((step, idx) => {
              const isCompleted = activeStep > idx;
              const isActive = activeStep === idx;
              
              return (
                <div key={idx} className="relative">
                  {/* Step bullet */}
                  <div className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                    isCompleted 
                      ? 'bg-success-500 border-success-500 text-white' 
                      : isActive 
                        ? 'bg-primary-500 border-primary-500 animate-pulse text-white' 
                        : 'bg-white border-slate-200'
                  }`}>
                    {isCompleted && <Check className="h-2.5 w-2.5" />}
                  </div>
                  
                  <div className="space-y-1">
                    <span className={`text-xs font-bold block ${isActive ? 'text-primary-600' : isCompleted ? 'text-slate-500' : 'text-slate-300'}`}>
                      {step.title}
                    </span>
                    <span className="text-[11px] text-slate-400 block">{step.desc}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Completed State - Extracted MAPs display */}
      {status === 'completed' && (
        <div className="space-y-6">
          <Card className="bg-success-50/50 border-success-200 p-6 flex items-center gap-4">
            <CheckCircle2 className="h-10 w-10 text-success-500 shrink-0" />
            <div>
              <h3 className="font-bold text-success-800 text-sm">Circular Processed Successfully!</h3>
              <p className="text-xs text-slate-600 mt-1">
                LexGraph processed the text and generated <span className="font-bold text-slate-800">{extractedMaps.length} MAPs</span>. These have been assigned and routed to the corresponding branches.
              </p>
            </div>
          </Card>

          <h3 className="font-bold text-slate-800 text-sm tracking-tight">Extracted Measurable Action Points (MAPs)</h3>
          
          <div className="grid grid-cols-1 gap-4">
            {extractedMaps.map((map) => (
              <div key={map.id} className="bg-white border border-neutral-200 rounded-lg p-5 hover:border-primary-400 transition-colors shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-800 text-base">{map.title}</h4>
                    <span className="text-[10px] text-slate-400 block font-mono mt-0.5">{map.id}</span>
                  </div>
                  <MAPStatusBadge status={map.status} />
                </div>

                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded">
                  {map.description}
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block uppercase font-bold text-[9px]">Department</span>
                    <span className="text-slate-700 font-semibold mt-0.5 block">{map.department}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase font-bold text-[9px]">Evidence Required</span>
                    <span className="text-slate-700 font-semibold mt-0.5 block">{map.evidence_type}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase font-bold text-[9px]">Scope / Routes</span>
                    <span className="text-slate-700 font-semibold mt-0.5 block flex items-center gap-1">
                      <Building className="h-3.5 w-3.5 text-slate-400" />
                      {map.geographic_scope} ({map.target_lgd_codes.length} branches)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase font-bold text-[9px]">Deadline</span>
                    <span className="text-slate-700 font-semibold mt-0.5 block flex items-center gap-1 text-red-600">
                      <Calendar className="h-3.5 w-3.5" />
                      {map.deadline_days} Days
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-4 justify-end pt-4">
            <button
              onClick={() => setStatus('idle')}
              className="bg-white border border-slate-200 text-slate-700 font-bold text-xs py-3 px-5 rounded hover:bg-slate-50 transition-colors"
            >
              Ingest Another Circular
            </button>
            <Link
              href="/dashboard"
              className="bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs py-3 px-5 rounded flex items-center gap-1.5 transition-colors"
            >
              <span>Go to Command Center</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Error State */}
      {status === 'error' && (
        <Card className="bg-red-50/50 border-red-200 p-8 space-y-6 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
          <div className="space-y-2">
            <h3 className="font-bold text-red-800 text-base">Pipeline Ingestion Failed</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto">{errorMessage}</p>
          </div>
          <button
            onClick={() => setStatus('idle')}
            className="bg-[#1A3A6B] text-white font-bold text-xs py-2.5 px-6 rounded hover:bg-slate-800 transition-colors mx-auto"
          >
            Try Again
          </button>
        </Card>
      )}

    </div>
  );
}
