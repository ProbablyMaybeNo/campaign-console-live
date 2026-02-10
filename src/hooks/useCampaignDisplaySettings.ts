import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface DisplaySettings {
  visible_round_ids?: string[];
  [key: string]: unknown;
}

export function useCampaignDisplaySettings(campaignId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: displaySettings, isLoading } = useQuery({
    queryKey: ["campaign-display-settings", campaignId],
    queryFn: async (): Promise<DisplaySettings> => {
      if (!campaignId) return {};
      const { data, error } = await supabase
        .from("campaigns")
        .select("display_settings")
        .eq("id", campaignId)
        .single();

      if (error) throw error;
      return (data?.display_settings as DisplaySettings) || {};
    },
    enabled: !!campaignId,
  });

  const updateDisplaySettings = useMutation({
    mutationFn: async (updates: Partial<DisplaySettings>) => {
      if (!campaignId) throw new Error("No campaign ID");
      const merged = { ...(displaySettings || {}), ...updates };
      const { error } = await supabase
        .from("campaigns")
        .update({ display_settings: merged as unknown as Json })
        .eq("id", campaignId);

      if (error) throw error;
      return merged;
    },
    onSuccess: (merged) => {
      queryClient.setQueryData(["campaign-display-settings", campaignId], merged);
      queryClient.invalidateQueries({ queryKey: ["campaign-display-settings", campaignId] });
    },
  });

  return {
    displaySettings: displaySettings || {},
    isLoading,
    updateDisplaySettings: updateDisplaySettings.mutate,
  };
}
