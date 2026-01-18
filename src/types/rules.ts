// Canonical Rules Store Types
// Normalized data model for PDF, Paste, and GitHub JSON sources

export type SourceType = 'pdf' | 'paste' | 'github_json';

export type IndexStatus = 'not_indexed' | 'indexing' | 'indexed' | 'failed';

export interface RulesSource {
  id: string;
  campaign_id: string;
  type: SourceType;
  title: string;
  tags: string[] | null;
  storage_path: string | null;
  github_repo_url: string | null;
  github_json_path: string | null;
  github_imported_at: string | null;
  index_status: IndexStatus;
  index_stats: IndexStats | null;
  index_error: IndexError | null;
  last_indexed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IndexStats {
  pages: number;
  sections: number;
  chunks: number;
  tablesHigh: number;
  tablesLow: number;
  datasets: number;
}

export interface IndexError {
  stage: string;
  message: string;
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
  section_path: string[] | null;
  page_start: number | null;
  page_end: number | null;
  text: string | null;
  keywords: string[] | null;
  created_at: string;
}

export interface RulesChunk {
  id: string;
  source_id: string;
  section_id: string | null;
  text: string;
  page_start: number | null;
  page_end: number | null;
  section_path: string[] | null;
  order_index: number;
  keywords: string[] | null;
  score_hints: ScoreHints;
  created_at: string;
}

export interface ScoreHints {
  hasRollRanges?: boolean;
  hasTablePattern?: boolean;
  hasEquipmentList?: boolean;
  hasSkillList?: boolean;
}

export interface RulesTable {
  id: string;
  source_id: string;
  section_id: string | null;
  title_guess: string | null;
  header_context: string | null;
  page_number: number | null;
  raw_text: string | null;
  parsed_rows: Record<string, unknown>[] | null;
  confidence: 'high' | 'medium' | 'low';
  keywords: string[] | null;
  created_at: string;
}

export interface RulesDataset {
  id: string;
  source_id: string;
  name: string;
  dataset_type: 'equipment' | 'skills' | 'spells' | 'tables' | 'other';
  fields: string[];
  confidence: 'high' | 'medium' | 'low';
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

// Component linking types
export interface RulesDataSource {
  kind: 'rules';
  sourceId: string;
  preferred: 'dataset' | 'table' | 'chunks';
  datasetId?: string;
  tableId?: string;
  chunkIds?: string[];
  sectionIds?: string[];
  query?: string;
  sectionHint?: string[];
}

// Scoring types for AI auto-pick
export interface ScoredMatch {
  type: 'dataset' | 'table' | 'chunk' | 'section';
  id: string;
  title: string;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  preview?: string;
}

// GitHub JSON import structure
export interface GitHubRulesJSON {
  name?: string;
  version?: string;
  groups?: GitHubRulesGroup[];
  sections?: GitHubRulesSection[];
  tables?: GitHubRulesTableDef[];
  datasets?: GitHubRulesDatasetDef[];
}

export interface GitHubRulesGroup {
  id: string;
  name: string;
  sections?: GitHubRulesSection[];
  tables?: GitHubRulesTableDef[];
}

export interface GitHubRulesSection {
  id: string;
  title: string;
  text?: string;
  subsections?: GitHubRulesSection[];
}

export interface GitHubRulesTableDef {
  id: string;
  title: string;
  columns: string[];
  rows: Record<string, unknown>[];
}

export interface GitHubRulesDatasetDef {
  id: string;
  name: string;
  type: 'equipment' | 'skills' | 'spells' | 'tables' | 'other';
  fields: string[];
  rows: Record<string, unknown>[];
}

// Indexing progress
export interface IndexingProgress {
  stage: 'extracting_text' | 'building_sections' | 'chunking' | 'detecting_tables' | 'complete' | 'failed';
  progress: number;
  message: string;
}
