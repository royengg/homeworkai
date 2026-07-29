export type ParsedBlockType =
  | "heading"
  | "paragraph"
  | "list"
  | "table"
  | "note"
  | "image"
  | "chart";

export type ParseWarningCode =
  | "UNREADABLE_PAGE"
  | "EMPTY_PAGE"
  | "LOW_TEXT_PAGE"
  | "VISUAL_CONTENT"
  | "PARSER_FALLBACK"
  | "NO_TEXT_CONTENT";

export interface ParseWarning {
  code: ParseWarningCode;
  message: string;
  unit?: number;
}

export interface ParsedBlock {
  id: string;
  type: ParsedBlockType;
  text: string;
  page?: number;
  level?: number;
  rows?: string[][];
}

export interface ParseDiagnostics {
  parser: "officeparser" | "pdf-parse";
  parserVersion: string;
  totalUnits: number;
  parsedUnits: number;
  coverage: number;
  characterCount: number;
  visualFallbackRecommended: boolean;
  warnings: ParseWarning[];
}

export interface ParsedResult {
  text: string;
  blocks: ParsedBlock[];
  diagnostics: ParseDiagnostics;
  numPages?: number;
}
