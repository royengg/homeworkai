export interface User {
  userId: number;
  name: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export type UploadStatus = 'uploading' | 'uploaded' | 'processing' | 'processed' | 'failed';

export interface Upload {
  uploadId: string;
  userId: number;
  bucket: string;
  key: string;
  size?: number;
  mime?: string;
  status: UploadStatus;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  parseResult?: ParseResult;
  analyses: AnalysisResult[];
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
}

export interface ParseResult {
  id: string;
  uploadId: string;
  text: string;
  numPages?: number;
  createdAt: string;
}

export type AnalysisStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface AnalysisResult {
  id: string;
  uploadId: string;
  status: AnalysisStatus;
  error?: string;
  output: AnalysisOutput | null;
  solutionBucket?: string;
  solutionKey?: string;
  pages?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisOutput {
  document_id: string;
  type: 'homework' | 'assignment';
  questions?: Question[];
  assignment?: {
    title: string;
    blueprint: AssignmentBlueprint;
    full_content?: string;
    sections?: AssignmentSection[];
  };
}

export interface AssignmentBlueprint {
  title: string;
  description: string;
  sections: {
    id: string;
    title: string;
    objectives: string[];
    key_points: string[];
  }[];
  subject?: string;
  topic?: string;
}

export interface AssignmentSection {
  section_id: string;
  content: string;
  citations?: string[];
}

export interface Question {
  qid: string;
  question_text: string;
  parts: QuestionPart[];
}

export interface QuestionPart {
  label: string;
  answer: string;
  workings: string;
}

export interface PresignResponse {
  uploadId: string;
  url: string;
  key: string;
  bucket: string;
  expiresAt: string;
}

export interface ApiError {
  error: string;
  correlationId?: string;
  details?: any;
}
