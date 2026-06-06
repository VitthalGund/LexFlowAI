export interface EvidenceVaultEntry {
  id: string;
  map_id: string;
  circular_id: string;
  branch_lgd_code: string;
  uploader_id: string;
  uploader_name: string;
  file_name: string;
  file_size_bytes: number;
  sha256_hash: string;
  uploaded_at: string;
  behavioral_risk_score: number;
  telemetry_snapshot: Record<string, unknown>;
  vault_status: 'ACCEPTED' | 'QUARANTINED';
  quarantine_reason?: string;
  amendment_of?: string;
}

export interface HashVerificationResult {
  verified: boolean;
  vault_entry?: EvidenceVaultEntry;
  message: string;
}
