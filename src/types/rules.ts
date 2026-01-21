// V1 Simplified Rules Types
// Only types needed for pattern detection and component configs

// Enhanced PDF extraction types (used by pdfExtractor.ts)
export type DetectedTableType = 'pipe' | 'whitespace' | 'dice-roll';

export interface DetectedTable {
  type: DetectedTableType;
  title: string;
  pageNumber: number;
  startLine: number;
  endLine: number;
  rawText: string;
  headerContext?: string;
  columns?: string[];
  rows?: string[][];
  diceType?: 'd6' | 'd66' | '2d6';
  confidence: 'high' | 'medium' | 'low';
}

export interface DetectedSection {
  title: string;
  pageNumber: number;
  lineNumber: number;
  level: number;
  type?: 'chapter' | 'section' | 'subsection';
}

export interface EnhancedExtractionResult {
  pages: {
    pageNumber: number;
    text: string;
    charCount: number;
  }[];
  totalPages: number;
  totalChars: number;
  emptyPages: number;
  avgCharsPerPage: number;
  pageErrors: number[];
  detectedTables: DetectedTable[];
  detectedSections: DetectedSection[];
}

// Component config types for pasted content
export interface PastedTableConfig {
  rawText: string;
  sourceLabel?: string;
  notes?: string;
  parsingMode: 'auto' | 'ai' | 'manual';
  columns: string[];
  rows: Array<{ id: string; [key: string]: string }>;
}

export interface PastedCardConfig {
  rawText: string;
  sourceLabel?: string;
  notes?: string;
  title: string;
  sections: Array<{ header: string; content: string }>;
}
