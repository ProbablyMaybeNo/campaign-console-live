import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";
import type { ExtractedRule, ExtractionResult } from "@/types/rules";

// Re-export types for backward compatibility
export type { ExtractedRule, ExtractionResult };

/**
 * Extract rules from text content using AI
 */
export function useExtractRules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      content,
      sourceType,
      sourceName,
      campaignId,
    }: {
      content: string;
      sourceType: "pdf" | "text";
      sourceName?: string;
      campaignId: string;
    }): Promise<ExtractionResult> => {
      const { data, error } = await supabase.functions.invoke("extract-rules", {
        body: { content, sourceType, sourceName, campaignId },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed to extract rules");

      return data;
    },
    onSuccess: (result, variables) => {
      // Invalidate the rules query so UI fetches fresh data
      queryClient.invalidateQueries({ queryKey: ["wargame_rules", variables.campaignId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to extract rules: ${error.message}`);
    },
  });
}

/**
 * Save extracted rules to the database (upsert to handle duplicates)
 */
export function useSaveRules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      rules,
    }: {
      campaignId: string;
      rules: ExtractedRule[];
    }): Promise<{ inserted: number; updated: number }> => {
      // Transform rules to match database schema
      const dbRules = rules.map((rule) => ({
        campaign_id: campaignId,
        category: rule.category,
        rule_key: rule.rule_key,
        title: rule.title,
        content: rule.content as Json,
        metadata: (rule.metadata || {}) as Json,
        updated_at: new Date().toISOString(),
      }));

      // Use upsert to handle duplicates - updates existing rules with same campaign_id+category+rule_key
      const { data, error } = await supabase
        .from("wargame_rules")
        .upsert(dbRules, {
          onConflict: "campaign_id,category,rule_key",
          ignoreDuplicates: false, // Update on conflict
        })
        .select();

      if (error) {
        console.error("Save error:", error);
        throw error;
      }
      
      return { inserted: data?.length || 0, updated: 0 };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["wargame_rules", variables.campaignId] });
      toast.success(`Saved ${result.inserted} rules to campaign`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to save rules: ${error.message}`);
    },
  });
}

/**
 * Update a single rule
 */
export function useUpdateRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ruleId,
      updates,
    }: {
      ruleId: string;
      updates: {
        title?: string;
        category?: string;
        content?: Json;
      };
    }): Promise<void> => {
      const { error } = await supabase
        .from("wargame_rules")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ruleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wargame_rules"] });
      toast.success("Rule updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update rule: ${error.message}`);
    },
  });
}

/**
 * Delete a single rule
 */
export function useDeleteRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ruleId: string): Promise<void> => {
      const { error } = await supabase
        .from("wargame_rules")
        .delete()
        .eq("id", ruleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wargame_rules"] });
      toast.success("Rule deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete rule: ${error.message}`);
    },
  });
}

/**
 * Delete all rules for a campaign
 */
export function useClearCampaignRules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: string): Promise<void> => {
      const { error } = await supabase
        .from("wargame_rules")
        .delete()
        .eq("campaign_id", campaignId);

      if (error) throw error;
    },
    onSuccess: (_, campaignId) => {
      queryClient.invalidateQueries({ queryKey: ["wargame_rules", campaignId] });
      toast.success("All rules cleared");
    },
    onError: (error: Error) => {
      toast.error(`Failed to clear rules: ${error.message}`);
    },
  });
}
