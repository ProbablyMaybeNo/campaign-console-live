import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { RulesSource, SourceType, IndexStats, IndexError, ParseMethod } from "@/types/rules";

// Fetch all rules sources for a campaign
export function useRulesSources(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["rules_sources", campaignId],
    queryFn: async (): Promise<RulesSource[]> => {
      if (!campaignId) return [];

      const { data, error } = await supabase
        .from("rules_sources")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      return (data || []).map(row => ({
        id: row.id,
        campaign_id: row.campaign_id,
        type: (row.type || 'pdf') as SourceType,
        type_source: (row.type_source || null) as ParseMethod | null,
        title: row.title,
        tags: row.tags,
        storage_path: row.storage_path,
        github_repo_url: row.github_repo_url,
        github_json_path: row.github_json_path,
        github_imported_at: row.github_imported_at,
        index_status: (row.index_status || 'not_indexed') as RulesSource['index_status'],
        index_stats: row.index_stats as unknown as IndexStats | null,
        index_error: row.index_error as unknown as IndexError | null,
        last_indexed_at: row.last_indexed_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
    },
    enabled: !!campaignId,
  });
}

// Create a new PDF source
export function useCreatePdfSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      campaignId, 
      title, 
      storagePath,
      tags = [],
      useAdvancedParsing = false
    }: { 
      campaignId: string; 
      title: string; 
      storagePath: string;
      tags?: string[];
      useAdvancedParsing?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("rules_sources")
        .insert({
          campaign_id: campaignId,
          type: "pdf",
          type_source: useAdvancedParsing ? "llamaparse" : "standard",
          title,
          storage_path: storagePath,
          tags,
          index_status: "not_indexed",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["rules_sources", variables.campaignId] });
      toast.success("PDF source added. Ready to index.");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add PDF: ${error.message}`);
    },
  });
}

// Create a new paste/text source
export function useCreatePasteSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      campaignId, 
      title, 
      text,
      tags = [] 
    }: { 
      campaignId: string; 
      title: string; 
      text: string;
      tags?: string[];
    }) => {
      // Create source first
      const { data: source, error: sourceError } = await supabase
        .from("rules_sources")
        .insert({
          campaign_id: campaignId,
          type: "paste",
          title,
          tags,
          index_status: "not_indexed",
        })
        .select()
        .single();

      if (sourceError) throw sourceError;

      // Create pseudo-pages (split by ~8000 chars)
      const pageSize = 8000;
      const pages = [];
      for (let i = 0; i < text.length; i += pageSize) {
        const pageText = text.slice(i, i + pageSize);
        pages.push({
          source_id: source.id,
          page_number: Math.floor(i / pageSize) + 1,
          text: pageText,
          char_count: pageText.length,
        });
      }

      if (pages.length > 0) {
        const { error: pagesError } = await supabase
          .from("rules_pages")
          .insert(pages);

        if (pagesError) throw pagesError;
      }

      return source;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["rules_sources", variables.campaignId] });
      toast.success("Text source added. Ready to index.");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add text: ${error.message}`);
    },
  });
}

// Create a GitHub JSON source
export function useCreateGitHubSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      campaignId, 
      title, 
      repoUrl,
      jsonPath = "rules.json",
      tags = [] 
    }: { 
      campaignId: string; 
      title: string; 
      repoUrl: string;
      jsonPath?: string;
      tags?: string[];
    }) => {
      const { data, error } = await supabase
        .from("rules_sources")
        .insert({
          campaign_id: campaignId,
          type: "github_json",
          title,
          github_repo_url: repoUrl,
          github_json_path: jsonPath,
          tags,
          index_status: "not_indexed",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["rules_sources", variables.campaignId] });
      toast.success("GitHub source added. Ready to index.");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add GitHub source: ${error.message}`);
    },
  });
}

// Update source metadata
export function useUpdateSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      title, 
      tags 
    }: { 
      id: string; 
      title?: string; 
      tags?: string[];
    }) => {
      const updates: Record<string, unknown> = {};
      if (title !== undefined) updates.title = title;
      if (tags !== undefined) updates.tags = tags;

      const { data, error } = await supabase
        .from("rules_sources")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["rules_sources", data.campaign_id] });
      toast.success("Source updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });
}

// Delete a source and all its indexed data
export function useDeleteSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, campaignId }: { id: string; campaignId: string }) => {
      // Delete cascades through foreign keys
      const { error } = await supabase
        .from("rules_sources")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { id, campaignId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["rules_sources", data.campaignId] });
      toast.success("Source deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });
}

// Trigger indexing for a source
export function useIndexSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sourceId, campaignId }: { sourceId: string; campaignId: string }) => {
      const { data, error } = await supabase.functions.invoke("index-rules-source", {
        body: { sourceId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return { ...data, campaignId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["rules_sources", data.campaignId] });
      toast.success(data.message || "Indexing complete");
    },
    onError: (error: Error) => {
      toast.error(`Indexing failed: ${error.message}`);
    },
  });
}
