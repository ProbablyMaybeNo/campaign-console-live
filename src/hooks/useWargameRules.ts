import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface WargameRule {
  id: string;
  campaign_id: string;
  category: string;
  rule_key: string;
  title: string;
  content: Json;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface RuleCategory {
  category: string;
  ruleCount: number;
  rules: Array<{ key: string; title: string }>;
}

export type RuleContentType = "table" | "card";

export interface TableRuleContent {
  type: "table";
  columns: string[];
  rows: Array<{ id: string; [key: string]: string }>;
  rawText?: string;
}

export interface CardRuleContent {
  type: "card";
  title: string;
  sections: Array<{ id: string; header: string; content: string }>;
  rawText?: string;
}

export type RuleContent = TableRuleContent | CardRuleContent;

export function useWargameRules(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["wargame_rules", campaignId],
    queryFn: async (): Promise<WargameRule[]> => {
      if (!campaignId) return [];

      const { data, error } = await supabase
        .from("wargame_rules")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("category", { ascending: true })
        .order("title", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!campaignId,
  });
}

export function useWargameRule(ruleId: string | undefined) {
  return useQuery({
    queryKey: ["wargame_rule", ruleId],
    queryFn: async (): Promise<WargameRule | null> => {
      if (!ruleId) return null;

      const { data, error } = await supabase
        .from("wargame_rules")
        .select("*")
        .eq("id", ruleId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!ruleId,
  });
}

export function useRuleCategories(campaignId: string | undefined) {
  const { data: rules } = useWargameRules(campaignId);

  const categories = rules?.reduce((acc, rule) => {
    if (!acc[rule.category]) {
      acc[rule.category] = [];
    }
    acc[rule.category].push(rule);
    return acc;
  }, {} as Record<string, WargameRule[]>);

  return Object.entries(categories || {}).map(([category, categoryRules]) => ({
    category,
    rules: categoryRules,
  }));
}

export function useCreateRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      title,
      category,
      content,
    }: {
      campaignId: string;
      title: string;
      category: string;
      content: RuleContent;
    }): Promise<WargameRule> => {
      const ruleKey = `${category.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`;
      
      const { data, error } = await supabase
        .from("wargame_rules")
        .insert({
          campaign_id: campaignId,
          title,
          category,
          rule_key: ruleKey,
          content: content as unknown as Json,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["wargame_rules", variables.campaignId] });
      toast.success("Rule created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create rule: ${error.message}`);
    },
  });
}

export function useUpdateRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      title,
      category,
      content,
    }: {
      id: string;
      title?: string;
      category?: string;
      content?: RuleContent;
    }): Promise<WargameRule> => {
      const updates: Record<string, unknown> = {};
      if (title !== undefined) updates.title = title;
      if (category !== undefined) updates.category = category;
      if (content !== undefined) updates.content = content as unknown as Json;

      // Update the rule
      const { data, error } = await supabase
        .from("wargame_rules")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Sync linked dashboard components (bidirectional sync)
      if (content || title) {
        // Find all dashboard components linked to this rule
        const { data: linkedComponents } = await supabase
          .from("dashboard_components")
          .select("id, config")
          .eq("campaign_id", data.campaign_id)
          .or(`component_type.eq.rules_table,component_type.eq.rules_card`);

        if (linkedComponents) {
          // Filter to only components that reference this rule
          const componentsToUpdate = linkedComponents.filter((comp) => {
            const config = comp.config as Record<string, unknown>;
            return config?.rule_id === id;
          });

          // Update each linked component's config with new content
          for (const comp of componentsToUpdate) {
            const existingConfig = comp.config as Record<string, unknown>;
            const newConfig: Record<string, unknown> = {
              ...existingConfig,
              sourceLabel: title || existingConfig.sourceLabel,
            };

            // Sync content based on type
            if (content?.type === "table") {
              newConfig.columns = content.columns;
              newConfig.rows = content.rows;
              newConfig.rawText = content.rawText;
            } else if (content?.type === "card") {
              newConfig.title = content.title;
              newConfig.sections = content.sections;
              newConfig.rawText = content.rawText;
            }

            await supabase
              .from("dashboard_components")
              .update({ 
                config: newConfig as unknown as Json,
                name: title || (existingConfig.sourceLabel as string),
              })
              .eq("id", comp.id);
          }
        }
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["wargame_rules", data.campaign_id] });
      queryClient.invalidateQueries({ queryKey: ["wargame_rule", data.id] });
      // Also invalidate dashboard components to reflect sync
      queryClient.invalidateQueries({ queryKey: ["dashboard-components", data.campaign_id] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update rule: ${error.message}`);
    },
  });
}

export function useDeleteRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, campaignId }: { id: string; campaignId: string }) => {
      const { error } = await supabase
        .from("wargame_rules")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { id, campaignId };
    },
    onSuccess: (variables) => {
      queryClient.invalidateQueries({ queryKey: ["wargame_rules", variables.campaignId] });
      toast.success("Rule deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete rule: ${error.message}`);
    },
  });
}

export function useDiscoverRepoRules() {
  return useMutation({
    mutationFn: async (repoUrl: string): Promise<RuleCategory[]> => {
      const { data, error } = await supabase.functions.invoke("fetch-rules-repo", {
        body: { repoUrl, action: "discover" },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed to discover rules");

      return data.categories;
    },
    onError: (error: Error) => {
      toast.error(`Failed to discover rules: ${error.message}`);
    },
  });
}

export function useSyncRepoRules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      repoUrl,
      campaignId,
    }: {
      repoUrl: string;
      campaignId: string;
    }): Promise<{ message: string; categories: string[] }> => {
      const { data, error } = await supabase.functions.invoke("fetch-rules-repo", {
        body: { repoUrl, campaignId, action: "sync" },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed to sync rules");

      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["wargame_rules", variables.campaignId] });
      toast.success(data.message);
    },
    onError: (error: Error) => {
      toast.error(`Failed to sync rules: ${error.message}`);
    },
  });
}

export function useRulesByCategory(campaignId: string | undefined, category: string | undefined) {
  return useQuery({
    queryKey: ["wargame_rules", campaignId, category],
    queryFn: async (): Promise<WargameRule[]> => {
      if (!campaignId || !category) return [];

      const { data, error } = await supabase
        .from("wargame_rules")
        .select("*")
        .eq("campaign_id", campaignId)
        .eq("category", category)
        .order("title", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!campaignId && !!category,
  });
}
