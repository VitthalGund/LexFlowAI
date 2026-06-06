'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { 
  Database, 
  Fingerprint, 
  Search, 
  ShieldCheck, 
  ShieldX, 
  FileText, 
  Upload, 
  Loader2
} from 'lucide-react';
import { sha256 } from 'js-sha256';

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
}

interface VerificationResult {
  verified: boolean;
  entry?: EvidenceLedgerEntry;
  message?: string;
}

export default function TrustVaultPage() {
  const [ledger, setLedger] = useState<EvidenceLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Hash verification panel states
  const [verifyFile, setVerifyFile] = useState<File | null>(null);
  const [calculatingHash, setCalculatingHash] = useState(false);
  const [clientHash, setClientHash] = useState('');
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/evidence/ledger');
      // Show only accepted entries in public vault (as per rules: quarantined entries are separate)
      setLedger(res.data.filter((e: EvidenceLedgerEntry) => e.vault_status === 'ACCEPTED'));
    } catch (err) {
      console.error('Failed to load evidence ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchLedger();
    });
  }, []);

  const handleVerifyFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setVerifyFile(selectedFile);
      setCalculatingHash(true);
      setVerificationResult(null);

      // Read file and compute hash client-side
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target?.result) {
          const arrayBuffer = event.target.result as ArrayBuffer;
          // Compute sha256 using js-sha256
          const hashHex = sha256(arrayBuffer);
          setClientHash(hashHex);
          setCalculatingHash(false);
          
          // Trigger backend verification
          setVerificationLoading(true);
          try {
            const res = await api.get(`/api/v1/evidence/verify/${hashHex}`);
            setVerificationResult(res.data);
          } catch (err) {
            console.error('Hash verification API failed:', err);
            setVerificationResult({ verified: false, message: 'Verification API failed to respond.' });
          } finally {
            setVerificationLoading(false);
          }
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    }
  };

  const filteredLedger = ledger.filter(item => 
    item.uploader_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.file_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.sha256_hash.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.map_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 select-none">
      
      {/* Overview */}
      <div className="bg-white p-6 rounded-lg border border-neutral-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">TrustVault Cryptographic Ledger</h2>
          <p className="text-xs text-slate-500 mt-1">
            An append-only database mapping verification file metadata to mathematical SHA-256 hashes.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold bg-neutral-50 px-3.5 py-2 border border-neutral-200 rounded text-slate-600">
          <Database className="h-4.5 w-4.5 text-success-500" />
          <span>Ledger Locked: {ledger.length} entries</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Ledger Audit Trail */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search ledger by hash, file name, map, or manager..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-primary-500 rounded px-3 py-2 pl-10 text-xs outline-none transition-colors"
              />
            </div>
          </Card>

          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredLedger.length > 0 ? (
              filteredLedger.map((item) => (
                <div key={item.id} className="bg-white border border-neutral-200 rounded-lg p-5 hover:border-primary-400 transition-colors shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h4 className="font-bold text-xs text-slate-800 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-400" />
                        <span>{item.file_name}</span>
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold font-mono">
                        <span>LGD Branch: {item.branch_lgd_code}</span>
                        <span>|</span>
                        <span>Map: {item.map_id}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {new Date(item.uploaded_at).toLocaleString()}
                    </span>
                  </div>

                  {/* Hash display */}
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-100 font-mono text-[10px] break-all select-all flex items-center gap-2 font-bold text-slate-700">
                    <Fingerprint className="h-4 w-4 shrink-0 text-success-500" />
                    <span>SHA-256: {item.sha256_hash}</span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold pt-1 border-t border-slate-50">
                    <span>Uploader: {item.uploader_name}</span>
                    <span>Size: {(item.file_size_bytes / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-20 bg-white border border-slate-200 rounded-lg text-slate-400">
                <Database className="h-12 w-12 mx-auto text-slate-300 stroke-[1.5] mb-2" />
                <p className="text-xs font-semibold">No records found matching search queries.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Interactive Hash Verifier */}
        <div className="lg:col-span-5">
          <div className="bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden flex flex-col sticky top-20">
            <div className="p-5 border-b border-neutral-200 bg-neutral-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-success-500" />
                <span>Auditor Verification Engine</span>
              </h3>
            </div>

            <div className="p-5 space-y-6">
              <p className="text-xs text-slate-500 leading-relaxed">
                Verify the integrity of a compliance file. Select a document to calculate its SHA-256 hash client-side and match it with the ledger.
              </p>

              {/* Upload input */}
              <div className="relative border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-lg p-6 text-center cursor-pointer transition-colors bg-slate-50">
                <input
                  type="file"
                  onChange={handleVerifyFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Upload className="h-6 w-6 text-slate-300" />
                  <span className="text-xs font-semibold text-slate-600">Select file to verify</span>
                  <span className="text-[10px] text-slate-400">Audit receipt will be processed offline</span>
                </div>
              </div>

              {/* Hash status */}
              {verifyFile && (
                <div className="space-y-4">
                  <div className="p-3 bg-slate-100 border border-slate-200 rounded text-xs space-y-1">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">File Audited</span>
                    <span className="font-semibold text-slate-700 block truncate">{verifyFile.name}</span>
                    
                    <span className="text-[9px] text-slate-400 font-bold uppercase block pt-2">Computed SHA-256</span>
                    {calculatingHash ? (
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Calculating checksum...</span>
                      </div>
                    ) : (
                      <span className="font-mono text-[10px] text-slate-600 break-all select-all font-bold block mt-0.5">
                        {clientHash}
                      </span>
                    )}
                  </div>

                  {/* Verification Result details */}
                  {verificationLoading && (
                    <div className="flex justify-center p-4">
                      <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
                    </div>
                  )}

                  {!verificationLoading && verificationResult && (
                    verificationResult.verified ? (
                      <div className="p-4 bg-success-50 border border-success-200 rounded-lg space-y-3">
                        <div className="flex items-center gap-2 text-success-800 text-xs font-bold">
                          <ShieldCheck className="h-5 w-5 text-success-500" />
                          <span>VERIFIED COMPLIANT IN TRUSTVAULT</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          This file matches the exact cryptographic hash submitted during the branch compliance audit. The document has not been modified or replaced since submission.
                        </p>
                        
                        <div className="border-t border-success-200 pt-2.5 text-[10px] space-y-1 text-slate-500 font-semibold">
                          <div>
                            <span>Branch LGD: </span>
                            <span className="text-slate-700 font-bold">{verificationResult.entry?.branch_lgd_code}</span>
                          </div>
                          <div>
                            <span>Submitted By: </span>
                            <span className="text-slate-700 font-bold">{verificationResult.entry?.uploader_name}</span>
                          </div>
                          <div>
                            <span>Timestamp: </span>
                            <span className="text-slate-700 font-bold">
                              {verificationResult.entry && new Date(verificationResult.entry.uploaded_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-2">
                        <div className="flex items-center gap-2 text-red-800 text-xs font-bold">
                          <ShieldX className="h-5 w-5 text-red-500 animate-pulse" />
                          <span>VERIFICATION FAILED</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          This file hash does not match any entry in the ledger. The document is either unsubmitted or has been altered.
                        </p>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
