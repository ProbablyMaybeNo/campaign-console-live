import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { 
  RulesSection, 
  RulesChunk, 
  RulesTable, 
  RulesDataset,
  RulesDatasetRow,
  ScoreHints
} from "@/types/rules";

// Fetch sections for a source
export function useRulesSections(sourceId: string | undefined) {
  return useQuery({
    queryKey: ["rules_sections", sourceId],
    queryFn: async (): Promise<RulesSection[]> => {
      if (!sourceId) return [];

      const { data, error } = await supabase
        .from("rules_sections")
        .select("*")
        .eq("source_id", sourceId)
        .order("page_start", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!sourceId,
  });
}

// Fetch chunks for a source
export function useRulesChunks(sourceId: string | undefined) {
  return useQuery({
    queryKey: ["rules_chunks", sourceId],
    queryFn: async (): Promise<RulesChunk[]> => {
      if (!sourceId) return [];

      const { data, error } = await supabase
        .from("rules_chunks")
        .select("*")
        .eq("source_id", sourceId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      return (data || []).map(row => ({
        ...row,
        score_hints: (row.score_hints || {}) as ScoreHints,
      }));
    },
    enabled: !!sourceId,
  });
}

// Fetch tables for a source
export function useRulesTables(sourceId: string | undefined) {
  return useQuery({
    queryKey: ["rules_tables", sourceId],
    queryFn: async (): Promise<RulesTable[]> => {
      if (!sourceId) return [];

      const { data, error } = await supabase
        .from("rules_tables")
        .select("*")
        .eq("source_id", sourceId)
        .order("page_number", { ascending: true });

      if (error) throw error;
      return (data || []).map(row => ({
        id: row.id,
        source_id: row.source_id,
        section_id: row.section_id,
        title_guess: row.title_guess,
        header_context: row.header_context,
        page_number: row.page_number,
        raw_text: row.raw_text,
        parsed_rows: row.parsed_rows as Record<string, unknown>[] | null,
        confidence: (row.confidence || 'medium') as RulesTable['confidence'],
        keywords: row.keywords,
        created_at: row.created_at,
      }));
    },
    enabled: !!sourceId,
  });
}

// Fetch datasets for a source
export function useRulesDatasets(sourceId: string | undefined) {
  return useQuery({
    queryKey: ["rules_datasets", sourceId],
    queryFn: async (): Promise<RulesDataset[]> => {
      if (!sourceId) return [];

      const { data, error } = await supabase
        .from("rules_datasets")
        .select("*")
        .eq("source_id", sourceId)
        .order("name", { ascending: true });

      if (error) throw error;
      return (data || []).map(row => ({
        id: row.id,
        source_id: row.source_id,
        name: row.name,
        dataset_type: (row.dataset_type || 'other') as RulesDataset['dataset_type'],
        fields: (row.fields || []) as string[],
        confidence: (row.confidence || 'medium') as RulesDataset['confidence'],
        created_at: row.created_at,
      }));
    },
    enabled: !!sourceId,
  });
}

// Fetch rows for a dataset
export function useDatasetRows(datasetId: string | undefined) {
  return useQuery({
    queryKey: ["rules_dataset_rows", datasetId],
    queryFn: async (): Promise<RulesDatasetRow[]> => {
      if (!datasetId) return [];

      const { data, error } = await supabase
        .from("rules_dataset_rows")
        .select("*")
        .eq("dataset_id", datasetId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []).map(row => ({
        id: row.id,
        dataset_id: row.dataset_id,
        data: row.data as Record<string, unknown>,
        page_number: row.page_number,
        source_path: row.source_path,
        created_at: row.created_at,
      }));
    },
    enabled: !!datasetId,
  });
}

// Search across all indexed content for a campaign
export function useSearchRulesContent(campaignId: string | undefined, query: string) {
  return useQuery({
    queryKey: ["rules_search", campaignId, query],
    queryFn: async () => {
      if (!campaignId || !query || query.length < 2) return { sections: [], chunks: [], tables: [], datasets: [] };

      const searchPattern = `%${query}%`;

      // Search sections
      const { data: sections } = await supabase
        .from("rules_sections")
        .select("*, rules_sources!inner(campaign_id)")
        .eq("rules_sources.campaign_id", campaignId)
        .ilike("title", searchPattern)
        .limit(10);

      // Search chunks by text
      const { data: chunks } = await supabase
        .from("rules_chunks")
        .select("*, rules_sources!inner(campaign_id)")
        .eq("rules_sources.campaign_id", campaignId)
        .ilike("text", searchPattern)
        .limit(20);

      // Search tables by title
      const { data: tables } = await supabase
        .from("rules_tables")
        .select("*, rules_sources!inner(campaign_id)")
        .eq("rules_sources.campaign_id", campaignId)
        .ilike("title_guess", searchPattern)
        .limit(10);

      // Search datasets by name
      const { data: datasets } = await supabase
        .from("rules_datasets")
        .select("*, rules_sources!inner(campaign_id)")
        .eq("rules_sources.campaign_id", campaignId)
        .ilike("name", searchPattern)
        .limit(10);

      return {
        sections: sections || [],
        chunks: chunks || [],
        tables: tables || [],
        datasets: datasets || [],
      };
    },
    enabled: !!campaignId && query.length >= 2,
    staleTime: 30000,
  });
}
