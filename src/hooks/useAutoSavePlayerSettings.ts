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

  const debouncedSave = useCallback((settings: AutoSaveSettings) => {
    // Store the pending update
    pendingUpdateRef.current = settings;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Create a hash of current settings to compare
    const settingsHash = JSON.stringify(settings);
    
    // Don't save if nothing changed
    if (settingsHash === lastSavedRef.current) {
      return;
    }

    // Set new timeout - save after 1.5 seconds of inactivity
    timeoutRef.current = setTimeout(() => {
      if (pendingUpdateRef.current) {
        lastSavedRef.current = JSON.stringify(pendingUpdateRef.current);
        mutation.mutate(pendingUpdateRef.current);
        pendingUpdateRef.current = null;
      }
    }, 1500);
  }, [mutation]);

  // Cleanup on unmount - save any pending changes immediately
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // Save any pending changes when component unmounts
      if (pendingUpdateRef.current) {
        const settingsHash = JSON.stringify(pendingUpdateRef.current);
        if (settingsHash !== lastSavedRef.current) {
          mutation.mutate(pendingUpdateRef.current);
        }
      }
    };
  }, [mutation]);

  return {
    autoSave: debouncedSave,
    isSaving: mutation.isPending,
  };
}
