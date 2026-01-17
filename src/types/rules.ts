// Centralized type definitions for the rules import system

export type RuleContentText = { type: "text"; text: string };
export type RuleContentList = { type: "list"; items: string[] };
export type RuleContentRollTable = { 
  type: "roll_table"; 
  dice: string; 
  entries: Array<{ roll: string; result: string }> 
};
export type RuleContentStatsTable = { 
  type: "stats_table"; 
  columns: string[]; 
  rows: Array<Record<string, string>> 
};
export type RuleContentEquipment = { 
  type: "equipment"; 
  items: Array<{ name: string; cost?: string; stats?: string; effect?: string }> 
};

export type RuleContent = 
  | RuleContentText
  | RuleContentList
  | RuleContentRollTable
  | RuleContentStatsTable
  | RuleContentEquipment;

export interface ExtractedRule {
  category: string;
  rule_key: string;
  title: string;
  content: RuleContent;
  metadata?: Record<string, unknown>;
  validation_status?: string;
}

export interface PreviewRule extends ExtractedRule {
  id?: string;
  isEditing?: boolean;
}

export interface SourceText {
  section: string;
  text: string;
}

export interface DetectedSection {
  id: string;
  name: string;
  type: "table" | "rules" | "equipment" | "skills" | "other";
  priority: "high" | "medium" | "low";
  estimatedComplexity: number;
  startPosition: number;
  endPosition: number;
  indicators: string[];
  selected?: boolean;
  status?: "pending" | "extracting" | "complete" | "failed";
  extractedCount?: number;
}

export interface ExtractionJob {
  id: string;
  campaignId: string;
  status: "pending" | "scanning" | "extracting" | "complete" | "failed";
  totalSections: number;
  completedSections: number;
  detectedSections: DetectedSection[];
  sourceName?: string;
  errorMessage?: string;
}

export interface ExtractionResult {
  success: boolean;
  saved: number;
  summary: {
    totalRules: number;
    categories: Record<string, number>;
  };
  error?: string;
}

export const RULE_CATEGORIES = [
  "Campaign Rules",
  "Exploration Tables", 
  "Skill Tables",
  "Roll Tables",
  "Injury Tables",
  "Equipment",
  "Keywords",
  "Core Rules",
  "Unit Profiles",
  "Abilities",
  "Scenarios",
  "Advancement",
  "Warband Rules",
  "Custom",
] as const;

export type RuleCategory = typeof RULE_CATEGORIES[number];
