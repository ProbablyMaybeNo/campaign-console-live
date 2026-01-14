import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  rules_repo_url: string | null;
  rules_repo_ref: string | null;
  points_limit: number | null;
  game_system_id: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCampaignInput {
  name: string;
  description?: string;
  points_limit?: number;
  rules_repo_url?: string;
  game_system_id?: string;
}

export interface UpdateCampaignInput {
  id: string;
  name?: string;
  description?: string;
  points_limit?: number;
  rules_repo_url?: string;
  game_system_id?: string | null;
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
      
      if (playerCampaignIds.length > 0) {
        const { data: joinedCampaigns, error: joinedError } = await supabase
          .from("campaigns")
          .select("*")
          .in("id", playerCampaignIds)
          .neq("owner_id", user.id);

        if (joinedError) throw joinedError;

        return [...(ownedCampaigns || []), ...(joinedCampaigns || [])];
      }

      return ownedCampaigns || [];
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
      return data;
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

      const { data, error } = await supabase
        .from("campaigns")
        .insert({
          name: input.name,
          description: input.description || null,
          points_limit: input.points_limit || 1000,
          rules_repo_url: input.rules_repo_url || null,
          game_system_id: input.game_system_id || null,
          owner_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
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
      const { id, ...updates } = input;
      
      const { data, error } = await supabase
        .from("campaigns")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
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

export function useIsGM(campaignId: string | undefined): boolean {
  const { user } = useAuth();
  const { data: campaign, isLoading } = useCampaign(campaignId);

  // Return true (assume GM) while loading to prevent flash of player mode
  if (isLoading || !campaign) return true;
  if (!user) return false;
  return campaign.owner_id === user.id;
}
