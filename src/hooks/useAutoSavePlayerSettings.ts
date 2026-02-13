import { useEffect, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import type { PlayerSettings } from "./usePlayerSettings";

interface AutoSaveSettings {
  player_name?: string | null;
  faction?: string | null;
  sub_faction?: string | null;
  current_points?: number | null;
  warband_link?: string | null;
  additional_info?: string | null;
}

export function useAutoSavePlayerSettings(campaignId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const pendingUpdateRef = useRef<AutoSaveSettings | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>("");

  const mutation = useMutation({
    mutationFn: async (settings: AutoSaveSettings) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("campaign_players")
        .update(settings)
        .eq("campaign_id", campaignId)
        .eq("user_id", user.id);

      if (error) throw error;
      return settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player-settings", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["campaign-players", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["all-player-settings", campaignId] });
      // Show subtle save indicator
      toast.success("Settings auto-saved", {
        duration: 2000,
        position: "bottom-right",
      });
    },
    onError: (error) => {
      toast.error("Failed to auto-save", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  const save = useCallback((settings: AutoSaveSettings) => {
    mutation.mutate(settings);
  }, [mutation]);

  return {
    save,
    autoSave: save, // backward compat
    isSaving: mutation.isPending,
  };
}
