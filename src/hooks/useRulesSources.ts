import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { 
  RulesSource, 
  RulesSourceType, 
  IndexStats, 
  IndexError,
  RulesPage,
  RulesSection,
  RulesChunk,
  RulesTable,
  RulesDataset,
  RulesDatasetRow
} from "@/types/rulesV2";
import type { Json } from "@/integrations/supabase/types";

// ============================================
// QUERY HOOKS
// ============================================

export function useRulesSources(campaignId: string) {
  return useQuery({
    queryKey: ["rules_sources", campaignId],
    queryFn: async (): Promise<RulesSource[]> => {
      const { data, error } = await supabase
        .from("rules_sources")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      return (data || []).map(row => ({
        ...row,
        type: row.type as RulesSourceType,
        index_status: row.index_status as RulesSource["index_status"],
        tags: row.tags || [],
        index_stats: (row.index_stats || {}) as IndexStats,
        index_error: row.index_error as unknown as IndexError | null,
      }));
    },
    enabled: !!campaignId,
  });
}

export function useRulesSource(sourceId: string) {
  return useQuery({
    queryKey: ["rules_source", sourceId],
    queryFn: async (): Promise<RulesSource | null> => {
      const { data, error } = await supabase
        .from("rules_sources")
        .select("*")
        .eq("id", sourceId)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }
      
      return {
        ...data,
        type: data.type as RulesSourceType,
        index_status: data.index_status as RulesSource["index_status"],
        tags: data.tags || [],
        index_stats: (data.index_stats || {}) as IndexStats,
        index_error: data.index_error as unknown as IndexError | null,
      };
    },
    enabled: !!sourceId,
  });
}

export function useRulesPages(sourceId: string) {
  return useQuery({
    queryKey: ["rules_pages", sourceId],
    queryFn: async (): Promise<RulesPage[]> => {
      const { data, error } = await supabase
        .from("rules_pages")
        .select("*")
        .eq("source_id", sourceId)
        .order("page_number", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!sourceId,
  });
}

export function useRulesSections(sourceId: string) {
  return useQuery({
    queryKey: ["rules_sections", sourceId],
    queryFn: async (): Promise<RulesSection[]> => {
      const { data, error } = await supabase
        .from("rules_sections")
        .select("*")
        .eq("source_id", sourceId)
        .order("page_start", { ascending: true });

      if (error) throw error;
      return (data || []).map(row => ({
        ...row,
        section_path: row.section_path || [],
        keywords: row.keywords || [],
      }));
    },
    enabled: !!sourceId,
  });
}

export function useRulesChunks(sourceId: string) {
  return useQuery({
    queryKey: ["rules_chunks", sourceId],
    queryFn: async (): Promise<RulesChunk[]> => {
      const { data, error } = await supabase
        .from("rules_chunks")
        .select("*")
        .eq("source_id", sourceId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      return (data || []).map(row => ({
        ...row,
        section_path: row.section_path || [],
        keywords: row.keywords || [],
        score_hints: (row.score_hints || {}) as RulesChunk["score_hints"],
      }));
    },
    enabled: !!sourceId,
  });
}

export function useRulesTables(sourceId: string) {
  return useQuery({
    queryKey: ["rules_tables", sourceId],
    queryFn: async (): Promise<RulesTable[]> => {
      const { data, error } = await supabase
        .from("rules_tables")
        .select("*")
        .eq("source_id", sourceId)
        .order("confidence", { ascending: false });

      if (error) throw error;
      return (data || []).map(row => ({
        ...row,
        confidence: row.confidence as RulesTable["confidence"],
        keywords: row.keywords || [],
        parsed_rows: row.parsed_rows as Record<string, string>[] | null,
      }));
    },
    enabled: !!sourceId,
  });
}

export function useRulesDatasets(sourceId: string) {
  return useQuery({
    queryKey: ["rules_datasets", sourceId],
    queryFn: async (): Promise<RulesDataset[]> => {
      const { data, error } = await supabase
        .from("rules_datasets")
        .select("*")
        .eq("source_id", sourceId)
        .order("name", { ascending: true });

      if (error) throw error;
      return (data || []).map(row => ({
        ...row,
        dataset_type: row.dataset_type as RulesDataset["dataset_type"],
        confidence: row.confidence as RulesDataset["confidence"],
        fields: (row.fields || []) as string[],
      }));
    },
    enabled: !!sourceId,
  });
}

export function useDatasetRows(datasetId: string) {
  return useQuery({
    queryKey: ["dataset_rows", datasetId],
    queryFn: async (): Promise<RulesDatasetRow[]> => {
      const { data, error } = await supabase
        .from("rules_dataset_rows")
        .select("*")
        .eq("dataset_id", datasetId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []).map(row => ({
        ...row,
        data: (row.data || {}) as Record<string, unknown>,
      }));
    },
    enabled: !!datasetId,
  });
}

// Get all tables for a campaign (across all sources)
export function useCampaignTables(campaignId: string) {
  return useQuery({
    queryKey: ["campaign_tables", campaignId],
    queryFn: async (): Promise<(RulesTable & { source_title: string })[]> => {
      const { data, error } = await supabase
        .from("rules_tables")
        .select(`
          *,
          rules_sources!inner(campaign_id, title)
        `)
        .eq("rules_sources.campaign_id", campaignId)
        .order("confidence", { ascending: false });

      if (error) throw error;
      
      return (data || []).map(row => ({
        ...row,
        confidence: row.confidence as RulesTable["confidence"],
        keywords: row.keywords || [],
        parsed_rows: row.parsed_rows as Record<string, string>[] | null,
        source_title: (row.rules_sources as unknown as { title: string })?.title || "Unknown",
      }));
    },
    enabled: !!campaignId,
  });
}

// Get all datasets for a campaign (across all sources)
export function useCampaignDatasets(campaignId: string) {
  return useQuery({
    queryKey: ["campaign_datasets", campaignId],
    queryFn: async (): Promise<(RulesDataset & { source_title: string })[]> => {
      const { data, error } = await supabase
        .from("rules_datasets")
        .select(`
          *,
          rules_sources!inner(campaign_id, title)
        `)
        .eq("rules_sources.campaign_id", campaignId)
        .order("name", { ascending: true });

      if (error) throw error;
      
      return (data || []).map(row => ({
        ...row,
        dataset_type: row.dataset_type as RulesDataset["dataset_type"],
        confidence: row.confidence as RulesDataset["confidence"],
        fields: (row.fields || []) as string[],
        source_title: (row.rules_sources as unknown as { title: string })?.title || "Unknown",
      }));
    },
    enabled: !!campaignId,
  });
}

// ============================================
// MUTATION HOOKS
// ============================================

export function useCreateSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      type,
      title,
      tags = [],
      storagePath,
      githubRepoUrl,
      githubJsonPath,
    }: {
      campaignId: string;
      type: RulesSourceType;
      title: string;
      tags?: string[];
      storagePath?: string;
      githubRepoUrl?: string;
      githubJsonPath?: string;
    }): Promise<RulesSource> => {
      const { data, error } = await supabase
        .from("rules_sources")
        .insert({
          campaign_id: campaignId,
          type,
          title,
          tags,
          storage_path: storagePath || null,
          github_repo_url: githubRepoUrl || null,
          github_json_path: githubJsonPath || null,
        })
        .select()
        .single();

      if (error) throw error;
      
      return {
        ...data,
        type: data.type as RulesSourceType,
        index_status: data.index_status as RulesSource["index_status"],
        tags: data.tags || [],
        index_stats: (data.index_stats || {}) as IndexStats,
        index_error: data.index_error as unknown as IndexError | null,
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["rules_sources", variables.campaignId] });
      toast.success("Source added. Ready to index.");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create source: ${error.message}`);
    },
  });
}

export function useUpdateSourceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourceId,
      status,
      stats,
      error: indexError,
    }: {
      sourceId: string;
      status: RulesSource["index_status"];
      stats?: IndexStats;
      error?: IndexError;
    }): Promise<void> => {
      const updates: Record<string, unknown> = {
        index_status: status,
        updated_at: new Date().toISOString(),
      };

      if (stats) {
        updates.index_stats = stats as Json;
      }
      if (indexError) {
        updates.index_error = indexError as unknown as Json;
      }
      if (status === "indexed") {
        updates.last_indexed_at = new Date().toISOString();
        updates.index_error = null;
      }

      const { error } = await supabase
        .from("rules_sources")
        .update(updates)
        .eq("id", sourceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rules_sources"] });
      queryClient.invalidateQueries({ queryKey: ["rules_source"] });
    },
  });
}

export function useDeleteSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sourceId: string): Promise<void> => {
      const { error } = await supabase
        .from("rules_sources")
        .delete()
        .eq("id", sourceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rules_sources"] });
      toast.success("Source deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete source: ${error.message}`);
    },
  });
}

// ============================================
// INDEXING DATA MUTATIONS
// ============================================

export function useSavePages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourceId,
      pages,
    }: {
      sourceId: string;
      pages: Omit<RulesPage, "id" | "created_at">[];
    }): Promise<number> => {
      // Delete existing pages first
      await supabase.from("rules_pages").delete().eq("source_id", sourceId);

      if (pages.length === 0) return 0;

      const { data, error } = await supabase
        .from("rules_pages")
        .insert(pages)
        .select("id");

      if (error) throw error;
      return data?.length || 0;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["rules_pages", variables.sourceId] });
    },
  });
}

export function useSaveSections() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourceId,
      sections,
    }: {
      sourceId: string;
      sections: Omit<RulesSection, "id" | "created_at">[];
    }): Promise<RulesSection[]> => {
      // Delete existing sections first
      await supabase.from("rules_sections").delete().eq("source_id", sourceId);

      if (sections.length === 0) return [];

      const { data, error } = await supabase
        .from("rules_sections")
        .insert(sections)
        .select();

      if (error) throw error;
      
      return (data || []).map(row => ({
        ...row,
        section_path: row.section_path || [],
        keywords: row.keywords || [],
      }));
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["rules_sections", variables.sourceId] });
    },
  });
}

export function useSaveChunks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourceId,
      chunks,
    }: {
      sourceId: string;
      chunks: Omit<RulesChunk, "id" | "created_at">[];
    }): Promise<number> => {
      // Delete existing chunks first
      await supabase.from("rules_chunks").delete().eq("source_id", sourceId);

      if (chunks.length === 0) return 0;

      // Insert in batches of 100
      const batchSize = 100;
      let totalInserted = 0;

      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const { data, error } = await supabase
          .from("rules_chunks")
          .insert(batch.map(c => ({
            ...c,
            score_hints: c.score_hints as Json,
          })))
          .select("id");

        if (error) throw error;
        totalInserted += data?.length || 0;
      }

      return totalInserted;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["rules_chunks", variables.sourceId] });
    },
  });
}

export function useSaveTables() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourceId,
      tables,
    }: {
      sourceId: string;
      tables: Omit<RulesTable, "id" | "created_at">[];
    }): Promise<RulesTable[]> => {
      // Delete existing tables first
      await supabase.from("rules_tables").delete().eq("source_id", sourceId);

      if (tables.length === 0) return [];

      const { data, error } = await supabase
        .from("rules_tables")
        .insert(tables.map(t => ({
          ...t,
          parsed_rows: t.parsed_rows as Json,
        })))
        .select();

      if (error) throw error;
      
      return (data || []).map(row => ({
        ...row,
        confidence: row.confidence as RulesTable["confidence"],
        keywords: row.keywords || [],
        parsed_rows: row.parsed_rows as Record<string, string>[] | null,
      }));
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["rules_tables", variables.sourceId] });
      queryClient.invalidateQueries({ queryKey: ["campaign_tables"] });
    },
  });
}

export function useSaveDatasets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourceId,
      datasets,
      rows,
    }: {
      sourceId: string;
      datasets: Omit<RulesDataset, "id" | "created_at">[];
      rows: Map<string, Omit<RulesDatasetRow, "id" | "dataset_id" | "created_at">[]>;
    }): Promise<number> => {
      // Delete existing datasets (cascade deletes rows)
      await supabase.from("rules_datasets").delete().eq("source_id", sourceId);

      if (datasets.length === 0) return 0;

      // Insert datasets
      const { data: insertedDatasets, error: datasetError } = await supabase
        .from("rules_datasets")
        .insert(datasets.map(d => ({
          ...d,
          fields: d.fields as unknown as Json,
        })))
        .select();

      if (datasetError) throw datasetError;

      // Insert rows for each dataset
      let totalRows = 0;
      for (const dataset of insertedDatasets || []) {
        const datasetRows = rows.get(dataset.name);
        if (datasetRows && datasetRows.length > 0) {
          const { data: insertedRows, error: rowError } = await supabase
            .from("rules_dataset_rows")
            .insert(datasetRows.map(r => ({
              ...r,
              dataset_id: dataset.id,
              data: r.data as Json,
            })))
            .select("id");

          if (rowError) throw rowError;
          totalRows += insertedRows?.length || 0;
        }
      }

      return totalRows;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["rules_datasets", variables.sourceId] });
      queryClient.invalidateQueries({ queryKey: ["campaign_datasets"] });
    },
  });
}
