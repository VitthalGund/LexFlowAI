export type Department = 'IT' | 'OPERATIONS' | 'RISK' | 'HR' | 'FINANCE' | 'AUDIT';
export type EvidenceType = 'POLICY_DOC' | 'LOG_FILE' | 'SCREENSHOT' | 'REPORT' | 'CERTIFICATE';
export type GeoScope = 'NATIONAL' | 'STATE' | 'DISTRICT' | 'BRANCH';
export type MAPStatus = 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'VERIFIED' | 'QUARANTINED' | 'OVERDUE';

export interface RemediationPayload {
  api_payload: Record<string, unknown>;
  shell_script: string;
  rpa_instructions: string[];
  target_system: string;
  risk_level: string;
  requires_approval: boolean;
}

export interface MAP {
  id: string;
  circular_id: string;
  title: string;
  description: string;
  kpi: string;
  deadline_days: number;
  deadline: string;
  department: Department;
  evidence_type: EvidenceType;
  geographic_scope: GeoScope;
  target_lgd_codes: string[];
  translations: Record<string, string>;
  status: MAPStatus;
  behavioral_risk_score: number;
  evidence_hash?: string;
  localized_description?: string;
  remediation_payload?: RemediationPayload;
  remediation_approved?: boolean;
  remediation_approved_by?: string;
}
