export interface DataRecord {
  id: string;
  company: string;
  role: string;
  status: string;
  dateApplied: string; // YYYY-MM-DD
  notes?: string;
  resumeUrl?: string;
  visaSponsorship: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface ImportResult {
  success: boolean;
  imported: DataRecord[];
  errors: ImportError[];
  skipped: number;
}

export interface ImportError {
  row: number;
  field?: string;
  message: string;
  data?: any;
}

export interface ExportOptions {
  filename?: string;
  includeHeaders?: boolean;
  dateFormat?: 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY';
}

export interface ImportProgress {
  loaded: number;
  total: number;
  rowsProcessed: number;
  errors: number;
}