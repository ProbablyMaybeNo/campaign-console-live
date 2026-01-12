import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface RosterUnit {
  unit_id: string;
  custom_name?: string;
  equipment: string[];
  total_cost: number;
  // Reference data (denormalized for display)
  unit_name: string;
  base_cost: number;
}

export interface Warband {
  id: string;
  campaign_id: string;
  owner_id: string;
  name: string;
  faction: string | null;
  sub_faction: string | null;
  narrative: string | null;
  points_total: number | null;
  roster: RosterUnit[];
  created_at: string;
  updated_at: string;
}

export function useWarband(campaignId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ["warband", campaignId, userId],
    queryFn: async (): Promise<Warband | null> => {
      if (!campaignId || !userId) return null;

      const { data, error } = await supabase
        .from("warbands")
        .select("*")
        .eq("campaign_id", campaignId)
        .eq("owner_id", userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        ...data,
        roster: (data.roster as unknown as RosterUnit[]) || [],
      };
    },
    enabled: !!campaignId && !!userId,
  });
}

export function useWarbandById(warbandId: string | undefined) {
  return useQuery({
    queryKey: ["warband", warbandId],
    queryFn: async (): Promise<Warband | null> => {
      if (!warbandId) return null;

      const { data, error } = await supabase
        .from("warbands")
        .select("*")
        .eq("id", warbandId)
        .single();

      if (error) throw error;

      return {
        ...data,
        roster: (data.roster as unknown as RosterUnit[]) || [],
      };
    },
    enabled: !!warbandId,
  });
}

export function useCampaignWarbands(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["campaign_warbands", campaignId],
    queryFn: async (): Promise<Warband[]> => {
      if (!campaignId) return [];

      const { data, error } = await supabase
        .from("warbands")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("name", { ascending: true });

      if (error) throw error;

      return (data || []).map(w => ({
        ...w,
        roster: (w.roster as unknown as RosterUnit[]) || [],
      }));
    },
    enabled: !!campaignId,
  });
}

export function useCreateWarband() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (warband: {
      campaign_id: string;
      owner_id: string;
      name: string;
      faction: string;
      sub_faction?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("warbands")
        .insert({
          campaign_id: warband.campaign_id,
          owner_id: warband.owner_id,
          name: warband.name,
          faction: warband.faction,
          sub_faction: warband.sub_faction || null,
          roster: [] as unknown as Json,
          points_total: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["warband", variables.campaign_id] });
      queryClient.invalidateQueries({ queryKey: ["campaign_warbands", variables.campaign_id] });
      toast.success("Warband created!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create warband: ${error.message}`);
    },
  });
}

export function useUpdateWarband() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      campaign_id,
      ...updates 
    }: Partial<Warband> & { id: string; campaign_id: string }) => {
      const updateData: Record<string, unknown> = {};
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.faction !== undefined) updateData.faction = updates.faction;
      if (updates.sub_faction !== undefined) updateData.sub_faction = updates.sub_faction;
      if (updates.narrative !== undefined) updateData.narrative = updates.narrative;
      if (updates.roster !== undefined) {
        updateData.roster = updates.roster as unknown as Json;
        // Recalculate points total
        updateData.points_total = updates.roster.reduce((sum, u) => sum + u.total_cost, 0);
      }
      if (updates.points_total !== undefined && updates.roster === undefined) {
        updateData.points_total = updates.points_total;
      }

      const { data, error } = await supabase
        .from("warbands")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, campaign_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["warband", data.id] });
      queryClient.invalidateQueries({ queryKey: ["warband", data.campaign_id] });
      queryClient.invalidateQueries({ queryKey: ["campaign_warbands", data.campaign_id] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update warband: ${error.message}`);
    },
  });
}

export function useDeleteWarband() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, campaignId }: { id: string; campaignId: string }) => {
      const { error } = await supabase
        .from("warbands")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { id, campaignId };
    },
    onSuccess: (variables) => {
      queryClient.invalidateQueries({ queryKey: ["warband", variables.campaignId] });
      queryClient.invalidateQueries({ queryKey: ["campaign_warbands", variables.campaignId] });
      toast.success("Warband deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete warband: ${error.message}`);
    },
  });
}

// Helper to calculate unit cost with equipment
export function calculateUnitCost(baseCost: number, equipment: string[], equipmentOptions: Array<{ name: string; cost: number }>): number {
  const equipmentCost = equipment.reduce((sum, eq) => {
    const option = equipmentOptions.find(o => o.name === eq);
    return sum + (option?.cost || 0);
  }, 0);
  return baseCost + equipmentCost;
}
