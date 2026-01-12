import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface EquipmentOption {
  name: string;
  cost: number;
  replaces?: string; // Equipment this replaces (for swaps)
  requires?: string[]; // Equipment required to take this
  excludes?: string[]; // Equipment that cannot be taken with this
}

export interface UnitStats {
  move?: string;
  fight?: number | string;
  shoot?: number | string;
  armour?: number | string;
  morale?: number | string;
  wounds?: number;
  [key: string]: string | number | undefined;
}

export interface CampaignUnit {
  id: string;
  campaign_id: string;
  faction: string;
  sub_faction: string | null;
  name: string;
  base_cost: number;
  stats: UnitStats;
  abilities: Array<{ name: string; effect: string }>;
  equipment_options: EquipmentOption[];
  keywords: string[];
  source: string;
  source_ref: string | null;
  created_at: string;
  updated_at: string;
}

export function useCampaignUnits(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["campaign_units", campaignId],
    queryFn: async (): Promise<CampaignUnit[]> => {
      if (!campaignId) return [];

      const { data, error } = await supabase
        .from("campaign_units")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("faction", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      
      return (data || []).map(unit => ({
        ...unit,
        stats: (unit.stats as unknown as UnitStats) || {},
        abilities: (unit.abilities as unknown as Array<{ name: string; effect: string }>) || [],
        equipment_options: (unit.equipment_options as unknown as EquipmentOption[]) || [],
        keywords: (unit.keywords as unknown as string[]) || [],
      }));
    },
    enabled: !!campaignId,
  });
}

export function useUnitsByFaction(campaignId: string | undefined, faction: string | undefined) {
  const { data: allUnits } = useCampaignUnits(campaignId);
  
  if (!faction) return [];
  
  return allUnits?.filter(unit => 
    unit.faction.toLowerCase() === faction.toLowerCase()
  ) || [];
}

export function useUnitsBySubFaction(
  campaignId: string | undefined, 
  faction: string | undefined,
  subFaction: string | undefined
) {
  const factionUnits = useUnitsByFaction(campaignId, faction);
  
  if (!subFaction) return factionUnits;
  
  return factionUnits.filter(unit => 
    !unit.sub_faction || unit.sub_faction.toLowerCase() === subFaction.toLowerCase()
  );
}

export function useFactions(campaignId: string | undefined) {
  const { data: units } = useCampaignUnits(campaignId);
  
  const factionMap = new Map<string, Set<string>>();
  
  units?.forEach(unit => {
    if (!factionMap.has(unit.faction)) {
      factionMap.set(unit.faction, new Set());
    }
    if (unit.sub_faction) {
      factionMap.get(unit.faction)!.add(unit.sub_faction);
    }
  });
  
  return Array.from(factionMap.entries()).map(([faction, subFactions]) => ({
    faction,
    subFactions: Array.from(subFactions),
  }));
}

export function useCreateCampaignUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (unit: Omit<CampaignUnit, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("campaign_units")
        .insert({
          campaign_id: unit.campaign_id,
          faction: unit.faction,
          sub_faction: unit.sub_faction,
          name: unit.name,
          base_cost: unit.base_cost,
          stats: unit.stats as Json,
          abilities: unit.abilities as unknown as Json,
          equipment_options: unit.equipment_options as unknown as Json,
          keywords: unit.keywords as unknown as Json,
          source: unit.source,
          source_ref: unit.source_ref,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["campaign_units", variables.campaign_id] });
      toast.success("Unit added to library");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add unit: ${error.message}`);
    },
  });
}

export function useUpdateCampaignUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...unit }: Partial<CampaignUnit> & { id: string; campaign_id: string }) => {
      const { data, error } = await supabase
        .from("campaign_units")
        .update({
          ...(unit.faction && { faction: unit.faction }),
          ...(unit.sub_faction !== undefined && { sub_faction: unit.sub_faction }),
          ...(unit.name && { name: unit.name }),
          ...(unit.base_cost !== undefined && { base_cost: unit.base_cost }),
          ...(unit.stats && { stats: unit.stats as Json }),
          ...(unit.abilities && { abilities: unit.abilities as unknown as Json }),
          ...(unit.equipment_options && { equipment_options: unit.equipment_options as unknown as Json }),
          ...(unit.keywords && { keywords: unit.keywords as unknown as Json }),
          ...(unit.source && { source: unit.source }),
          ...(unit.source_ref !== undefined && { source_ref: unit.source_ref }),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["campaign_units", variables.campaign_id] });
      toast.success("Unit updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update unit: ${error.message}`);
    },
  });
}

export function useDeleteCampaignUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, campaignId }: { id: string; campaignId: string }) => {
      const { error } = await supabase
        .from("campaign_units")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { id, campaignId };
    },
    onSuccess: (variables) => {
      queryClient.invalidateQueries({ queryKey: ["campaign_units", variables.campaignId] });
      toast.success("Unit removed from library");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete unit: ${error.message}`);
    },
  });
}
