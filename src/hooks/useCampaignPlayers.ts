import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CampaignPlayer {
  id: string;
  user_id: string;
  campaign_id: string;
  role: string;
  joined_at: string;
  profile: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  warband_count: number;
}

export function useCampaignPlayers(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["campaign-players", campaignId],
    queryFn: async (): Promise<CampaignPlayer[]> => {
      if (!campaignId) return [];

      // Fetch campaign players with profiles
      const { data: players, error: playersError } = await supabase
        .from("campaign_players")
        .select(`
          id,
          user_id,
          campaign_id,
          role,
          joined_at
        `)
        .eq("campaign_id", campaignId)
        .order("joined_at", { ascending: true });

      if (playersError) throw playersError;
      if (!players || players.length === 0) return [];

      // Fetch profiles for all players
      const userIds = players.map((p) => p.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Fetch warband counts per user for this campaign
      const { data: warbands, error: warbandsError } = await supabase
        .from("warbands")
        .select("owner_id")
        .eq("campaign_id", campaignId);

      if (warbandsError) throw warbandsError;

      // Count warbands per user
      const warbandCounts = (warbands || []).reduce((acc, w) => {
        acc[w.owner_id] = (acc[w.owner_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Map profiles to players
      const profileMap = (profiles || []).reduce((acc, p) => {
        acc[p.id] = { display_name: p.display_name, avatar_url: p.avatar_url };
        return acc;
      }, {} as Record<string, { display_name: string | null; avatar_url: string | null }>);

      return players.map((player) => ({
        ...player,
        profile: profileMap[player.user_id] || null,
        warband_count: warbandCounts[player.user_id] || 0,
      }));
    },
    enabled: !!campaignId,
  });
}

// Also fetch the campaign owner separately
export function useCampaignOwner(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["campaign-owner", campaignId],
    queryFn: async () => {
      if (!campaignId) return null;

      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .select("owner_id")
        .eq("id", campaignId)
        .single();

      if (campaignError) throw campaignError;
      if (!campaign) return null;

      // Fetch owner profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .eq("id", campaign.owner_id)
        .single();

      if (profileError && profileError.code !== "PGRST116") throw profileError;

      // Fetch warband count for owner
      const { data: warbands, error: warbandsError } = await supabase
        .from("warbands")
        .select("id")
        .eq("campaign_id", campaignId)
        .eq("owner_id", campaign.owner_id);

      if (warbandsError) throw warbandsError;

      return {
        id: "owner",
        user_id: campaign.owner_id,
        campaign_id: campaignId,
        role: "gm",
        joined_at: "",
        profile: profile ? { display_name: profile.display_name, avatar_url: profile.avatar_url } : null,
        warband_count: warbands?.length || 0,
      } as CampaignPlayer;
    },
    enabled: !!campaignId,
  });
}
