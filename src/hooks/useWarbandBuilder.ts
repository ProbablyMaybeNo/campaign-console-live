import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCampaign } from "./useCampaigns";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface RosterUnit {
  id: string;
  unitId: string;
  name: string;
  cost: number;
  faction: string;
  stats: Record<string, unknown>;
  abilities: string[];
  keywords: string[];
  equipment: string[];
  quantity: number;
}

export interface CampaignUnit {
  id: string;
  campaign_id: string;
  name: string;
  faction: string;
  sub_faction: string | null;
  base_cost: number;
  stats: Record<string, unknown>;
  abilities: unknown[];
  keywords: unknown[];
  equipment_options: unknown[];
  source: string;
  source_ref: string | null;
}

export interface Warband {
  id: string;
  campaign_id: string;
  owner_id: string;
  name: string;
  faction: string | null;
  sub_faction: string | null;
  points_total: number | null;
  roster: RosterUnit[];
  narrative: string | null;
  created_at: string;
  updated_at: string;
}

export function useWarbandBuilder(campaignId: string, warbandId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: campaign } = useCampaign(campaignId);

  // Local state for unsaved changes
  const [localRoster, setLocalRoster] = useState<RosterUnit[]>([]);
  const [localFaction, setLocalFaction] = useState<string | null>(null);
  const [localSubFaction, setLocalSubFaction] = useState<string | null>(null);
  const [localName, setLocalName] = useState<string>("New Warband");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch existing warband if editing
  const { data: existingWarband, isLoading: warbandLoading } = useQuery({
    queryKey: ["warband", warbandId],
    queryFn: async (): Promise<Warband | null> => {
      if (!warbandId) return null;

      const { data, error } = await supabase
        .from("warbands")
        .select("*")
        .eq("id", warbandId)
        .single();

      if (error) throw error;
      
      // Parse roster from JSON - handle the Json type properly
      let roster: RosterUnit[] = [];
      if (data.roster && Array.isArray(data.roster)) {
        roster = data.roster.map((item: unknown) => {
          const rosterItem = item as Record<string, unknown>;
          return {
            id: String(rosterItem.id || ''),
            unitId: String(rosterItem.unitId || ''),
            name: String(rosterItem.name || ''),
            cost: Number(rosterItem.cost || 0),
            faction: String(rosterItem.faction || ''),
            stats: (rosterItem.stats as Record<string, unknown>) || {},
            abilities: Array.isArray(rosterItem.abilities) ? rosterItem.abilities as string[] : [],
            keywords: Array.isArray(rosterItem.keywords) ? rosterItem.keywords as string[] : [],
            equipment: Array.isArray(rosterItem.equipment) ? rosterItem.equipment as string[] : [],
            quantity: Number(rosterItem.quantity || 1),
          };
        });
      }

      return { ...data, roster };
    },
    enabled: !!warbandId,
  });

  // Initialize local state from fetched warband
  if (existingWarband && !isInitialized) {
    setLocalRoster(existingWarband.roster);
    setLocalFaction(existingWarband.faction);
    setLocalSubFaction(existingWarband.sub_faction);
    setLocalName(existingWarband.name);
    setIsInitialized(true);
  }

  // Fetch campaign units for the library
  const { data: units = [], isLoading: unitsLoading } = useQuery({
    queryKey: ["campaign-units", campaignId],
    queryFn: async (): Promise<CampaignUnit[]> => {
      const { data, error } = await supabase
        .from("campaign_units")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("faction", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      return (data || []).map(u => ({
        ...u,
        stats: typeof u.stats === 'object' ? u.stats as Record<string, unknown> : {},
        abilities: Array.isArray(u.abilities) ? u.abilities : [],
        keywords: Array.isArray(u.keywords) ? u.keywords : [],
        equipment_options: Array.isArray(u.equipment_options) ? u.equipment_options : [],
      }));
    },
    enabled: !!campaignId,
  });

  // Get unique factions from units
  const factions = useMemo(() => {
    const factionSet = new Set(units.map(u => u.faction));
    return Array.from(factionSet).sort();
  }, [units]);

  // Get sub-factions for selected faction
  const subFactions = useMemo(() => {
    if (!localFaction) return [];
    const subFactionSet = new Set(
      units
        .filter(u => u.faction === localFaction && u.sub_faction)
        .map(u => u.sub_faction!)
    );
    return Array.from(subFactionSet).sort();
  }, [units, localFaction]);

  // Filter units by faction
  const availableUnits = useMemo(() => {
    if (!localFaction) return units;
    return units.filter(u => 
      u.faction === localFaction && 
      (!localSubFaction || !u.sub_faction || u.sub_faction === localSubFaction)
    );
  }, [units, localFaction, localSubFaction]);

  // Calculate total points
  const totalPoints = useMemo(() => {
    return localRoster.reduce((sum, unit) => sum + (unit.cost * unit.quantity), 0);
  }, [localRoster]);

  const pointsLimit = campaign?.points_limit || 1000;
  const pointsRemaining = pointsLimit - totalPoints;
  const isOverLimit = totalPoints > pointsLimit;

  // Add unit to roster
  const addUnit = useCallback((unit: CampaignUnit) => {
    const rosterUnit: RosterUnit = {
      id: crypto.randomUUID(),
      unitId: unit.id,
      name: unit.name,
      cost: unit.base_cost,
      faction: unit.faction,
      stats: unit.stats,
      abilities: (unit.abilities as string[]) || [],
      keywords: (unit.keywords as string[]) || [],
      equipment: [],
      quantity: 1,
    };

    setLocalRoster(prev => [...prev, rosterUnit]);
    setHasUnsavedChanges(true);
  }, []);

  // Remove unit from roster
  const removeUnit = useCallback((rosterUnitId: string) => {
    setLocalRoster(prev => prev.filter(u => u.id !== rosterUnitId));
    setHasUnsavedChanges(true);
  }, []);

  // Update unit quantity
  const updateQuantity = useCallback((rosterUnitId: string, quantity: number) => {
    if (quantity < 1) return;
    setLocalRoster(prev => prev.map(u => 
      u.id === rosterUnitId ? { ...u, quantity } : u
    ));
    setHasUnsavedChanges(true);
  }, []);

  // Set faction (clears roster if different faction)
  const setFaction = useCallback((faction: string | null) => {
    if (faction !== localFaction && localRoster.length > 0) {
      // Warn user that roster will be cleared
      if (!confirm("Changing faction will clear your current roster. Continue?")) {
        return;
      }
      setLocalRoster([]);
    }
    setLocalFaction(faction);
    setLocalSubFaction(null);
    setHasUnsavedChanges(true);
  }, [localFaction, localRoster]);

  const setSubFaction = useCallback((subFaction: string | null) => {
    setLocalSubFaction(subFaction);
    setHasUnsavedChanges(true);
  }, []);

  const setName = useCallback((name: string) => {
    setLocalName(name);
    setHasUnsavedChanges(true);
  }, []);

  // Save warband mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      // Convert roster to JSON-compatible format
      const rosterJson: Json = localRoster.map(unit => ({
        id: unit.id,
        unitId: unit.unitId,
        name: unit.name,
        cost: unit.cost,
        faction: unit.faction,
        stats: unit.stats as Json,
        abilities: unit.abilities,
        keywords: unit.keywords,
        equipment: unit.equipment,
        quantity: unit.quantity,
      }));

      const warbandData = {
        campaign_id: campaignId,
        owner_id: user.id,
        name: localName,
        faction: localFaction,
        sub_faction: localSubFaction,
        points_total: totalPoints,
        roster: rosterJson,
      };

      if (warbandId) {
        // Update existing
        const { error } = await supabase
          .from("warbands")
          .update(warbandData)
          .eq("id", warbandId);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from("warbands")
          .insert(warbandData);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warbands", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["warband", warbandId] });
      setHasUnsavedChanges(false);
      toast.success("Warband saved successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to save warband: ${error.message}`);
    },
  });

  // Delete warband mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!warbandId) throw new Error("No warband to delete");

      const { error } = await supabase
        .from("warbands")
        .delete()
        .eq("id", warbandId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warbands", campaignId] });
      toast.success("Warband deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete warband: ${error.message}`);
    },
  });

  return {
    // State
    name: localName,
    faction: localFaction,
    subFaction: localSubFaction,
    roster: localRoster,
    hasUnsavedChanges,
    
    // Computed
    totalPoints,
    pointsLimit,
    pointsRemaining,
    isOverLimit,
    factions,
    subFactions,
    availableUnits,
    
    // Loading states
    isLoading: warbandLoading || unitsLoading,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
    
    // Actions
    setName,
    setFaction,
    setSubFaction,
    addUnit,
    removeUnit,
    updateQuantity,
    save: () => saveMutation.mutate(),
    delete: () => deleteMutation.mutate(),
  };
}
