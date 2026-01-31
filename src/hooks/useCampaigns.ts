import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface DisplaySettings {
  showId?: boolean;
  showPoints?: boolean;
  showPlayers?: boolean;
  showRound?: boolean;
  showDates?: boolean;
  showStatus?: boolean;
  showGameSystem?: boolean;
  [key: string]: boolean | undefined; // Index signature for Json compatibility
}

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  rules_repo_url: string | null;
  rules_repo_ref: string | null;
  points_limit: number | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
  player_count?: number;
  // New fields
  max_players?: number | null;
  total_rounds?: number | null;
  round_length?: string | null;
  join_code?: string | null;
  password?: string | null;
  status?: string | null;
  game_system?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  current_round?: number | null;
  display_settings?: DisplaySettings | Json | null;
  title_color?: string | null;
  border_color?: string | null;
}

export interface CreateCampaignInput {
  name: string;
  description?: string;
  points_limit?: number;
  rules_repo_url?: string;
  max_players?: number;
  total_rounds?: number;
  round_length?: string;
  password?: string;
  game_system?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  title_color?: string;
  border_color?: string;
  display_settings?: DisplaySettings;
}

export interface UpdateCampaignInput {
  id: string;
  name?: string;
  description?: string;
  points_limit?: number;
  rules_repo_url?: string;
  max_players?: number;
  total_rounds?: number;
  round_length?: string;
  password?: string;
  game_system?: string;
  start_date?: string;
  end_date?: string;
  current_round?: number;
  status?: string;
  title_color?: string;
  border_color?: string;
  display_settings?: DisplaySettings;
}

export function useCampaigns() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["campaigns", user?.id],
    queryFn: async (): Promise<Campaign[]> => {
      if (!user) return [];
      
      // Get campaigns owned by user or where user is a player
      const { data: ownedCampaigns, error: ownedError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("owner_id", user.id)
        .order("updated_at", { ascending: false });

      if (ownedError) throw ownedError;

      const { data: playerCampaigns, error: playerError } = await supabase
        .from("campaign_players")
        .select("campaign_id")
        .eq("user_id", user.id);

      if (playerError) throw playerError;

      const playerCampaignIds = playerCampaigns?.map(p => p.campaign_id) || [];
      
      let allCampaigns = (ownedCampaigns || []) as Campaign[];
      
      if (playerCampaignIds.length > 0) {
        const { data: joinedCampaigns, error: joinedError } = await supabase
          .from("campaigns")
          .select("*")
          .in("id", playerCampaignIds)
          .neq("owner_id", user.id);

        if (joinedError) throw joinedError;

        allCampaigns = [...allCampaigns, ...((joinedCampaigns || []) as Campaign[])];
      }

      // Fetch player counts for all campaigns
      if (allCampaigns.length > 0) {
        const campaignIds = allCampaigns.map(c => c.id);
        const { data: playerCounts, error: countError } = await supabase
          .from("campaign_players")
          .select("campaign_id")
          .in("campaign_id", campaignIds);

        if (!countError && playerCounts) {
          const countMap: Record<string, number> = {};
          playerCounts.forEach(p => {
            countMap[p.campaign_id] = (countMap[p.campaign_id] || 0) + 1;
          });

          allCampaigns = allCampaigns.map(campaign => ({
            ...campaign,
            player_count: countMap[campaign.id] || 0,
          }));
        }
      }

      return allCampaigns;
    },
    enabled: !!user,
  });
}

export function useCampaign(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["campaign", campaignId],
    queryFn: async (): Promise<Campaign | null> => {
      if (!campaignId) return null;

      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .maybeSingle();

      if (error) throw error;
      return data as Campaign | null;
    },
    enabled: !!campaignId,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateCampaignInput): Promise<Campaign> => {
      if (!user) throw new Error("Not authenticated");

      const displaySettings: DisplaySettings = input.display_settings || {
        showId: true,
        showPoints: true,
        showPlayers: true,
        showRound: true,
        showDates: true,
        showStatus: true,
        showGameSystem: true,
      };

      const { data, error } = await supabase
        .from("campaigns")
        .insert({
          name: input.name,
          description: input.description || null,
          points_limit: input.points_limit || 1000,
          rules_repo_url: input.rules_repo_url || null,
          owner_id: user.id,
          max_players: input.max_players || 8,
          total_rounds: input.total_rounds || 10,
          round_length: input.round_length || "weekly",
          password: input.password || null,
          game_system: input.game_system || null,
          start_date: input.start_date || null,
          end_date: input.end_date || null,
          status: input.status || "active",
          title_color: input.title_color || "#22c55e",
          border_color: input.border_color || "#22c55e",
          display_settings: displaySettings as unknown as Json,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create campaign: ${error.message}`);
    },
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateCampaignInput): Promise<Campaign> => {
      const { id, display_settings, ...updates } = input;
      
      const updatePayload: Record<string, unknown> = { ...updates };
      if (display_settings) {
        updatePayload.display_settings = display_settings as unknown as Json;
      }
      
      const { data, error } = await supabase
        .from("campaigns")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Campaign;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaign", data.id] });
      toast.success("Campaign updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update campaign: ${error.message}`);
    },
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: string): Promise<void> => {
      const { error } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", campaignId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete campaign: ${error.message}`);
    },
  });
}

export function useJoinCampaign() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ joinCode, password }: { joinCode: string; password?: string }): Promise<string> => {
      if (!user) throw new Error("Not authenticated");

      // Find campaign by join code
      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .select("id, owner_id, password")
        .eq("join_code", joinCode.toUpperCase())
        .maybeSingle();

      if (campaignError) throw campaignError;
      if (!campaign) throw new Error("Campaign not found. Please check the ID and try again.");

      // Check if user is already the owner
      if (campaign.owner_id === user.id) {
        throw new Error("You are the Games Master of this campaign.");
      }

      // Check password if required
      if (campaign.password && campaign.password !== password) {
        throw new Error("Incorrect password.");
      }

      // Check if user is already a member
      const { data: existingMembership } = await supabase
        .from("campaign_players")
        .select("id")
        .eq("campaign_id", campaign.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingMembership) {
        throw new Error("You have already joined this campaign.");
      }

      // Join the campaign as a player
      const { error: joinError } = await supabase
        .from("campaign_players")
        .insert({
          campaign_id: campaign.id,
          user_id: user.id,
          role: "player",
        });

      if (joinError) throw joinError;
      
      return campaign.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Successfully joined campaign!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useIsGM(campaignId: string | undefined) {
  const { user } = useAuth();
  const { data: campaign } = useCampaign(campaignId);

  if (!user || !campaign) return false;
  return campaign.owner_id === user.id;
}
