export type UserRole = 'COMPLIANCE_OFFICER' | 'REGIONAL_HEAD' | 'BRANCH_MANAGER' | 'IT_ENGINEER' | 'AUDITOR';

export interface User {
  email: string;
  name: string;
  role: UserRole;
  branch_lgd_code?: string;
  language?: string;
}
