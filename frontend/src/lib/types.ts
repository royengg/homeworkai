export interface User {
  userId: string;
  name: string;
  email: string;
}

// Login/register now set an HttpOnly cookie on the response — the body no
// longer carries the raw token. `expiresAt` is a unix-seconds timestamp the
// SPA uses to schedule a proactive logout before the cookie silently expires.
export interface AuthResponse {
  user: User;
  expiresAt: number;
}

// /auth/me returns the same shape (user + expiresAt) so the cold-load path
// and the periodic revalidation share one type.
export interface MeResponse {
  user: User;
  expiresAt: number;
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
  userId: string;
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
    target_word_count?: number;
  }[];
  subject?: string;
  topic?: string;
  audience?: string;
  target_word_count?: number;
  source_scope?: 'source_only' | 'source_with_general_knowledge';
  required_block_types?: ContentBlock['type'][];
}

export interface AssignmentSection {
  section_id: string;
  summary?: string;
  blocks?: ContentBlock[];
  source_references?: SourceReference[];
  verification?: {
    status: 'verified' | 'revised';
    issues_fixed: string[];
  };
  content?: string;
  citations?: string[];
}

export interface SourceReference {
  span_id: string;
  excerpt: string;
}

type SourcedBlock = {
  source_span_ids: string[];
};

export type ContentBlock =
  | (SourcedBlock & {
      type: 'heading';
      content: string;
      level: 3 | 4;
    })
  | (SourcedBlock & { type: 'paragraph'; content: string })
  | (SourcedBlock & { type: 'bullet_list'; items: string[] })
  | (SourcedBlock & {
      type: 'equation';
      content: string;
      caption?: string;
    })
  | (SourcedBlock & {
      type: 'table';
      columns: string[];
      rows: string[][];
      caption?: string;
    })
  | (SourcedBlock & {
      type: 'callout';
      title: string;
      content: string;
    })
  | (SourcedBlock & {
      type: 'diagram';
      title: string;
      content: string;
      caption: string;
    });

export interface Question {
  qid: string;
  question_text: string;
  source_span_ids?: string[];
  parts: QuestionPart[];
}

export interface QuestionPart {
  label: string;
  given?: string[];
  assumptions?: string[];
  steps?: {
    title: string;
    explanation: string;
    equation?: string;
  }[];
  answer: string;
  verification?: string;
  source_span_ids?: string[];
  workings?: string;
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
