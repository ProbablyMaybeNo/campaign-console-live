/**
 * useRuleSync - Hook for syncing dashboard widget edits back to linked wargame_rules
 */

import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { Json } from "@/integrations/supabase/types";

interface TableContent {
  type: "table";
  columns: string[];
  rows: Array<{ id: string; [key: string]: string }>;
  rawText?: string;
}

interface CardContent {
  type: "card";
  title: string;
  sections: Array<{ id: string; header: string; content: string }>;
  rawText?: string;
}

interface SyncTableParams {
  ruleId: string;
  columns: string[];
  rows: Array<{ id: string; [key: string]: string }>;
  rawText?: string;
}

interface SyncCardParams {
  ruleId: string;
  title: string;
  sections: Array<{ id: string; header: string; content: string }>;
  rawText?: string;
}

export function useRuleSync() {
  const queryClient = useQueryClient();

  const syncTableToRule = useCallback(async ({ ruleId, columns, rows, rawText }: SyncTableParams) => {
    if (!ruleId) return;

    const content: TableContent = {
      type: "table",
      columns,
      rows,
      rawText,
    };

    const { data, error } = await supabase
      .from("wargame_rules")
      .update({ content: content as unknown as Json })
      .eq("id", ruleId)
      .select("campaign_id")
      .single();

    if (error) {
      console.error("Failed to sync table to rule:", error);
      return;
    }

    // Invalidate rules cache
    if (data?.campaign_id) {
      queryClient.invalidateQueries({ queryKey: ["wargame_rules", data.campaign_id] });
      queryClient.invalidateQueries({ queryKey: ["wargame_rule", ruleId] });
    }
  }, [queryClient]);

  const syncCardToRule = useCallback(async ({ ruleId, title, sections, rawText }: SyncCardParams) => {
    if (!ruleId) return;

    const content: CardContent = {
      type: "card",
      title,
      sections,
      rawText,
    };

    const { data, error } = await supabase
      .from("wargame_rules")
      .update({ content: content as unknown as Json })
      .eq("id", ruleId)
      .select("campaign_id")
      .single();

    if (error) {
      console.error("Failed to sync card to rule:", error);
      return;
    }

    // Invalidate rules cache
    if (data?.campaign_id) {
      queryClient.invalidateQueries({ queryKey: ["wargame_rules", data.campaign_id] });
      queryClient.invalidateQueries({ queryKey: ["wargame_rule", ruleId] });
    }
  }, [queryClient]);

  return { syncTableToRule, syncCardToRule };
}
