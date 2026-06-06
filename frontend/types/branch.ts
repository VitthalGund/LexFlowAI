export interface Branch {
  lgd_code: string;
  branch_name: string;
  district: string;
  state: string;
  classification: 'URBAN' | 'SEMI_URBAN' | 'RURAL' | 'METRO';
  language_code: string;
  lat?: number;
  lng?: number;
}
