// ============================================
// Rules Import System V2 - Canonical Types
// ============================================

// Source types
export type RulesSourceType = 'pdf' | 'paste' | 'github_json';
export type IndexStatus = 'not_indexed' | 'indexing' | 'indexed' | 'failed';
export type Confidence = 'high' | 'medium' | 'low';
export type DatasetType = 'equipment' | 'skills' | 'spells' | 'tables' | 'injuries' | 'other';
export type ComponentVisibility = 'gm_only' | 'all_players';

// Index stats for tracking what was extracted
export interface IndexStats {
  pages?: number;
  sections?: number;
  chunks?: number;
  tablesHigh?: number;
  tablesMedium?: number;
  tablesLow?: number;
  datasets?: number;
  datasetRows?: number;
}

// Index error structure
export interface IndexError {
  stage: string;
  message: string;
  timestamp?: string;
}

// ============================================
// DATABASE ROW TYPES
// ============================================

export interface RulesSource {
  id: string;
  campaign_id: string;
  type: RulesSourceType;
  title: string;
  tags: string[];
  storage_path: string | null;
  github_repo_url: string | null;
  github_json_path: string | null;
  github_imported_at: string | null;
  index_status: IndexStatus;
  index_stats: IndexStats;
  index_error: IndexError | null;
  last_indexed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RulesPage {
  id: string;
  source_id: string;
  page_number: number;
  text: string;
  char_count: number;
  created_at: string;
}

export interface RulesSection {
  id: string;
  source_id: string;
  title: string;
  section_path: string[];
  page_start: number | null;
  page_end: number | null;
  text: string | null;
  keywords: string[];
  created_at: string;
}

export interface RulesChunk {
  id: string;
  source_id: string;
  section_id: string | null;
  text: string;
  page_start: number | null;
  page_end: number | null;
  section_path: string[];
  order_index: number;
  keywords: string[];
  score_hints: {
    hasRollRanges?: boolean;
    hasTablePattern?: boolean;
    hasListPattern?: boolean;
    hasDiceNotation?: boolean;
  };
  created_at: string;
}

export interface RulesTable {
  id: string;
  source_id: string;
  section_id: string | null;
  title_guess: string | null;
  header_context: string | null;
  page_number: number | null;
  raw_text: string | null;
  parsed_rows: Record<string, string>[] | null;
  confidence: Confidence;
  keywords: string[];
  created_at: string;
}

export interface RulesDataset {
  id: string;
  source_id: string;
  name: string;
  dataset_type: DatasetType;
  fields: string[];
  confidence: Confidence;
  created_at: string;
}

export interface RulesDatasetRow {
  id: string;
  dataset_id: string;
  data: Record<string, unknown>;
  page_number: number | null;
  source_path: string | null;
  created_at: string;
}

// ============================================
// INDEXING TYPES
// ============================================

// Chunking configuration
export const CHUNK_CONFIG = {
  TARGET_SIZE: 1800,
  OVERLAP_SIZE: 200,
  MIN_SIZE: 500,
  MAX_SIZE: 2500,
} as const;

// Detected table patterns for heuristic extraction
export interface DetectedTablePattern {
  startIndex: number;
  endIndex: number;
  rawText: string;
  titleGuess: string | null;
  headerContext: string | null;
  pageNumber: number;
  confidence: Confidence;
  type: 'roll_table' | 'stats_table' | 'equipment' | 'generic';
}

// Section detection result
export interface DetectedSection {
  title: string;
  sectionPath: string[];
  startIndex: number;
  endIndex: number;
  pageStart: number;
  pageEnd: number;
  text: string;
}

// ============================================
// AI COMPONENT BUILDER TYPES
// ============================================

export interface AIMatchCandidate {
  type: 'dataset' | 'table' | 'chunks';
  id: string;
  title: string;
  score: number;
  confidence: Confidence;
  sourceId: string;
  preview?: string;
}

export interface ComponentDataSource {
  kind: 'rules';
  sourceId: string;
  preferred: 'dataset' | 'table' | 'chunks';
  datasetId?: string;
  tableId?: string;
  chunkIds?: string[];
  query?: string;
  sectionHint?: string[];
}

// ============================================
// FORM/UI TYPES
// ============================================

export interface AddSourceFormData {
  type: RulesSourceType;
  title: string;
  tags: string[];
  // PDF
  file?: File;
  // Paste
  pastedText?: string;
  // GitHub
  repoUrl?: string;
  jsonPath?: string;
}

export interface SourceListItem extends RulesSource {
  // UI state
  isSelected?: boolean;
  isExpanded?: boolean;
}

// ============================================
// INDEXER RESULTS
// ============================================

export interface IndexingProgress {
  stage: 'extracting' | 'cleaning' | 'chunking' | 'detecting_tables' | 'detecting_datasets' | 'saving' | 'complete' | 'failed';
  progress: number; // 0-100
  message: string;
  details?: {
    pagesProcessed?: number;
    totalPages?: number;
    sectionsFound?: number;
    chunksCreated?: number;
    tablesDetected?: number;
    datasetsDetected?: number;
  };
}

export interface IndexingResult {
  success: boolean;
  stats: IndexStats;
  error?: IndexError;
  duration?: number;
}
