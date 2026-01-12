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
