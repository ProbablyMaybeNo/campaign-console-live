import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface PlayerSettings {
  id: string;
  user_id: string;
  campaign_id: string;
  player_name: string | null;
  faction: string | null;
  sub_faction: string | null;
  current_points: number | null;
  warband_link: string | null;
  additional_info: string | null;
}

export interface PlayerNarrativeEntry {
  id: string;
  campaign_id: string;
  player_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export function usePlayerSettings(campaignId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["player-settings", campaignId, user?.id],
    queryFn: async (): Promise<PlayerSettings | null> => {
      if (!campaignId || !user?.id) return null;

      // First check if user is a campaign player
      const { data, error } = await supabase
        .from("campaign_players")
        .select(`
          id,
          user_id,
          campaign_id,
          player_name,
          faction,
          sub_faction,
          current_points,
          warband_link,
          additional_info
        `)
        .eq("campaign_id", campaignId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      
      // If user is a player, return their settings
      if (data) return data;

      // Check if user is the GM (campaign owner) - return mock settings for preview mode
      const { data: campaign } = await supabase
        .from("campaigns")
        .select("owner_id")
        .eq("id", campaignId)
        .maybeSingle();

      if (campaign?.owner_id === user.id) {
        // Return a mock/preview settings object for GM testing
        return {
          id: "gm-preview",
          user_id: user.id,
          campaign_id: campaignId,
          player_name: "(GM Preview)",
          faction: null,
          sub_faction: null,
          current_points: null,
          warband_link: null,
          additional_info: null,
        };
      }

      return null;
    },
    enabled: !!campaignId && !!user?.id,
  });
}

export function useUpdatePlayerSettings(campaignId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (settings: Partial<Omit<PlayerSettings, "id" | "user_id" | "campaign_id">>) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("campaign_players")
        .update(settings)
        .eq("campaign_id", campaignId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player-settings", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["campaign-players", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["all-player-settings", campaignId] });
      toast.success("Settings saved");
    },
    onError: (error) => {
      toast.error("Failed to save settings", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });
}

// Fetch all players' settings for the Player List widget
export function useAllPlayerSettings(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["all-player-settings", campaignId],
    queryFn: async (): Promise<(PlayerSettings & { profile_display_name: string | null; narrative_count: number; latest_narrative_title: string | null })[]> => {
      if (!campaignId) return [];

      // Fetch all campaign players with their settings
      const { data: players, error: playersError } = await supabase
        .from("campaign_players")
        .select(`
          id,
          user_id,
          campaign_id,
          player_name,
          faction,
          sub_faction,
          current_points,
          warband_link,
          additional_info,
          is_ghost
        `)
        .eq("campaign_id", campaignId);

      if (playersError) throw playersError;
      if (!players || players.length === 0) return [];

      // Fetch profiles to get display names as fallback
      const userIds = players.map((p) => p.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles_public")
        .select("id, display_name")
        .in("id", userIds);

      if (profilesError) {
        console.warn("Failed to fetch public profiles:", profilesError);
      }

      const profileMap = (profiles || []).reduce((acc, p) => {
        acc[p.id] = p.display_name;
        return acc;
      }, {} as Record<string, string | null>);

      // Fetch narrative entries for each player (get latest title)
      const { data: narrativeEntries, error: narrativeError } = await supabase
        .from("player_narrative_entries")
        .select("player_id, title, created_at")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });

      const narrativeMap: Record<string, { count: number; latestTitle: string | null }> = {};
      if (!narrativeError && narrativeEntries) {
        narrativeEntries.forEach((entry) => {
          if (!narrativeMap[entry.player_id]) {
            narrativeMap[entry.player_id] = { count: 0, latestTitle: entry.title };
          }
          narrativeMap[entry.player_id].count += 1;
        });
      }

      return players.map((player) => ({
        ...player,
        profile_display_name: profileMap[player.user_id] || player.player_name || null,
        narrative_count: narrativeMap[player.user_id]?.count || 0,
        latest_narrative_title: narrativeMap[player.user_id]?.latestTitle || null,
      }));
    },
    enabled: !!campaignId,
  });
}

// Fetch narrative entries for a specific player (for viewing in modal)
export function usePlayerNarrativeEntriesById(campaignId: string | undefined, playerId: string | undefined) {
  return useQuery({
    queryKey: ["player-narrative-entries-by-id", campaignId, playerId],
    queryFn: async (): Promise<PlayerNarrativeEntry[]> => {
      if (!campaignId || !playerId) return [];

      const { data, error } = await supabase
        .from("player_narrative_entries")
        .select("*")
        .eq("campaign_id", campaignId)
        .eq("player_id", playerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!campaignId && !!playerId,
  });
}

// Player narrative entries
export function usePlayerNarrativeEntries(campaignId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["player-narrative-entries", campaignId, user?.id],
    queryFn: async (): Promise<PlayerNarrativeEntry[]> => {
      if (!campaignId || !user?.id) return [];

      const { data, error } = await supabase
        .from("player_narrative_entries")
        .select("*")
        .eq("campaign_id", campaignId)
        .eq("player_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!campaignId && !!user?.id,
  });
}

export function useCreatePlayerNarrativeEntry(campaignId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ title, content }: { title: string; content: string }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("player_narrative_entries")
        .insert({
          campaign_id: campaignId,
          player_id: user.id,
          title,
          content,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player-narrative-entries", campaignId] });
      toast.success("Narrative entry added");
    },
    onError: (error) => {
      toast.error("Failed to add entry", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });
}

export function useUpdatePlayerNarrativeEntry(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, title, content }: { id: string; title: string; content: string }) => {
      const { error } = await supabase
        .from("player_narrative_entries")
        .update({ title, content })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player-narrative-entries", campaignId] });
      toast.success("Entry updated");
    },
    onError: (error) => {
      toast.error("Failed to update entry", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });
}

export function useDeletePlayerNarrativeEntry(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("player_narrative_entries")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player-narrative-entries", campaignId] });
      toast.success("Entry deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete entry", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });
}

export function useLeaveCampaign() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (campaignId: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("campaign_players")
        .delete()
        .eq("campaign_id", campaignId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaign-players"] });
      toast.success("You have left the campaign");
    },
    onError: (error) => {
      toast.error("Failed to leave campaign", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });
}
