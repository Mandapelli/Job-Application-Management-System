export const DOCUMENT_TYPES = ['RESUME', 'COVER_LETTER', 'OTHER'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const TYPE_LABELS: Record<DocumentType, string> = {
  RESUME: 'Resume',
  COVER_LETTER: 'Cover letter',
  OTHER: 'Other',
};

// These mirror the server's rules so people get instant feedback; the server checks the real file content anyway.
export const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx'] as const;
export const MAX_UPLOAD_MB = 5;

export interface AttachedApplication {
  id: string;
  jobTitle: string;
  companyName: string;
}

export interface DocumentItem {
  id: string;
  name: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  type: DocumentType;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { applications: number };
  /** Only on the details response. */
  applications?: AttachedApplication[];
}

export interface UploadInput {
  file: File;
  name: string;
  type: DocumentType;
  description: string;
}

export interface DocumentListParams {
  page: number;
  limit: number;
  search?: string;
  type?: DocumentType;
  applicationId?: string;
  sortBy: 'createdAt' | 'name' | 'sizeBytes';
  sortOrder: 'asc' | 'desc';
}
