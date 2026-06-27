"use client";

import { useEffect, useState, use } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { MAP } from "@/types/map";
import { AlertTriangle, Terminal, Code, CheckSquare, Copy } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ITRemediationDetail({ params }: PageProps) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const router = useRouter();
  const [map, setMap] = useState<MAP | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"api" | "shell" | "rpa">("shell");
  const [approving, setApproving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.get(`/api/v1/maps/${id}`);
        setMap(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (id) loadData();
  }, [id]);

  const handleApprove = async () => {
    setApproving(true);
    try {
      await api.post(`/api/v1/remediation/${id}/approve`);
      const res = await api.get(`/api/v1/maps/${id}`);
      setMap(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setApproving(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="p-8">Loading Payload...</div>;
  if (!map) return <div className="p-8">MAP not found</div>;

  const payload = map.remediation_payload;
  
  if (!payload) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">{map.title}</h1>
        <div className="p-4 bg-warning-100 text-warning-700 rounded-md">
          No auto-generated payload available for this task.
        </div>
      </div>
    );
  }

  const isApproved = map.remediation_approved;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <span className="font-mono text-sm text-primary-500 bg-primary-50 px-2 py-1 rounded">
            {map.id}
          </span>
          <h1 className="text-3xl font-heading font-bold text-primary-900 mt-2">
            {map.title}
          </h1>
          <p className="text-neutral-600 mt-2">Target System: <span className="font-semibold">{payload.target_system}</span></p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => router.push("/it/maps")}
            className="px-4 py-2 text-sm font-semibold border border-neutral-300 rounded hover:bg-neutral-50 text-neutral-700"
          >
            Back
          </button>
          {!isApproved ? (
            <button 
              onClick={handleApprove} 
              disabled={approving}
              className="px-4 py-2 text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white rounded disabled:opacity-50 flex items-center justify-center"
            >
              {approving ? "Approving..." : "Approve Payload"}
            </button>
          ) : (
            <button 
              disabled 
              className="px-4 py-2 text-sm font-semibold bg-success-50 text-success-700 border border-success-200 rounded cursor-not-allowed"
            >
              Approved
            </button>
          )}
        </div>
      </div>

      <div className="bg-danger-50 border border-danger-200 rounded-lg p-4 flex items-start space-x-3">
        <AlertTriangle className="w-6 h-6 text-danger-500 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-danger-700">REVIEW REQUIRED</h3>
          <p className="text-sm text-danger-600 mt-1">
            This remediation script was generated autonomously by LexFlow. Do not execute in a production environment without manual review by a qualified systems administrator.
          </p>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden">
        <div className="flex border-b border-neutral-200">
          <button 
            className={`flex-1 flex justify-center items-center py-3 font-medium text-sm transition-colors ${activeTab === 'shell' ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-600' : 'text-neutral-500 hover:bg-neutral-50'}`}
            onClick={() => setActiveTab('shell')}
          >
            <Terminal className="w-4 h-4 mr-2" />
            Shell Script
          </button>
          <button 
            className={`flex-1 flex justify-center items-center py-3 font-medium text-sm transition-colors ${activeTab === 'api' ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-600' : 'text-neutral-500 hover:bg-neutral-50'}`}
            onClick={() => setActiveTab('api')}
          >
            <Code className="w-4 h-4 mr-2" />
            REST API Payload
          </button>
          <button 
            className={`flex-1 flex justify-center items-center py-3 font-medium text-sm transition-colors ${activeTab === 'rpa' ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-600' : 'text-neutral-500 hover:bg-neutral-50'}`}
            onClick={() => setActiveTab('rpa')}
          >
            <CheckSquare className="w-4 h-4 mr-2" />
            RPA / GUI Instructions
          </button>
        </div>

        <div className="p-6 bg-neutral-900 text-neutral-50 rounded-b-lg relative group">
          <button 
            onClick={() => handleCopy(
              activeTab === 'shell' ? payload.shell_script : 
              activeTab === 'api' ? JSON.stringify(payload.api_payload, null, 2) : 
              payload.rpa_instructions.join('\n')
            )}
            className="absolute top-4 right-4 p-2 bg-neutral-800 hover:bg-neutral-700 rounded-md transition-opacity opacity-0 group-hover:opacity-100"
            title="Copy to clipboard"
          >
            <Copy className="w-4 h-4 text-neutral-300" />
          </button>
          
          {copied && <span className="absolute top-6 right-14 text-xs text-success-400">Copied!</span>}

          {activeTab === 'shell' && (
            <pre className="font-mono text-sm whitespace-pre-wrap overflow-x-auto">
              <code>{payload.shell_script}</code>
            </pre>
          )}

          {activeTab === 'api' && (
            <pre className="font-mono text-sm whitespace-pre-wrap overflow-x-auto">
              <code>{JSON.stringify(payload.api_payload, null, 2)}</code>
            </pre>
          )}

          {activeTab === 'rpa' && (
            <ol className="list-decimal list-inside space-y-2 font-sans text-sm text-neutral-200">
              {payload.rpa_instructions.map((step: string, i: number) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
