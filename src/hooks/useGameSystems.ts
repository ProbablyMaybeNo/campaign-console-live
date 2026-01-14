import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface GameSystem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  repo_url: string | null;
  repo_type: "battlescribe" | "custom" | "manual";
  version: string | null;
  last_synced_at: string | null;
  status: "active" | "draft" | "deprecated";
  icon_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface MasterFaction {
  id: string;
  game_system_id: string;
  name: string;
  slug: string;
  description: string | null;
  source_file: string | null;
  rules_text: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MasterUnit {
  id: string;
  game_system_id: string;
  faction_id: string;
  name: string;
  base_cost: number;
  stats: Record<string, string | number>;
  abilities: string[];
  equipment_options: Array<{
    name: string;
    cost: number;
    category?: string;
    constraints?: {
      requires?: string[];
      excludes?: string[];
      replaces?: string;
    };
  }>;
  keywords: string[];
  constraints: Record<string, unknown>;
  source_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MasterRule {
  id: string;
  game_system_id: string;
  faction_id: string | null;
  category: string;
  rule_key: string;
  title: string;
  content: Record<string, unknown>;
  visibility: "public" | "gm_only";
  created_at: string;
  updated_at: string;
}

// Fetch all active game systems
export function useGameSystems() {
  return useQuery({
    queryKey: ["game-systems"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("game_systems")
        .select("*")
        .eq("status", "active")
        .order("name");

      if (error) throw error;
      return data as GameSystem[];
    },
  });
}

// Fetch a single game system by ID
export function useGameSystem(gameSystemId: string | undefined) {
  return useQuery({
    queryKey: ["game-system", gameSystemId],
    queryFn: async () => {
      if (!gameSystemId) return null;

      const { data, error } = await supabase
        .from("game_systems")
        .select("*")
        .eq("id", gameSystemId)
        .single();

      if (error) throw error;
      return data as GameSystem;
    },
    enabled: !!gameSystemId,
  });
}

// Fetch factions for a game system
export function useMasterFactions(gameSystemId: string | undefined) {
  return useQuery({
    queryKey: ["master-factions", gameSystemId],
    queryFn: async () => {
      if (!gameSystemId) return [];

      const { data, error } = await supabase
        .from("master_factions")
        .select("*")
        .eq("game_system_id", gameSystemId)
        .order("name");

      if (error) throw error;
      return data as MasterFaction[];
    },
    enabled: !!gameSystemId,
  });
}

// Fetch units for a faction
export function useMasterUnits(factionId: string | undefined) {
  return useQuery({
    queryKey: ["master-units", factionId],
    queryFn: async () => {
      if (!factionId) return [];

      const { data, error } = await supabase
        .from("master_units")
        .select("*")
        .eq("faction_id", factionId)
        .order("name");

      if (error) throw error;
      return data as MasterUnit[];
    },
    enabled: !!factionId,
  });
}

// Fetch units for a game system (all factions)
export function useMasterUnitsByGameSystem(gameSystemId: string | undefined) {
  return useQuery({
    queryKey: ["master-units-by-system", gameSystemId],
    queryFn: async () => {
      if (!gameSystemId) return [];

      const { data, error } = await supabase
        .from("master_units")
        .select("*, master_factions(name, slug)")
        .eq("game_system_id", gameSystemId)
        .order("name");

      if (error) throw error;
      return data as (MasterUnit & { master_factions: { name: string; slug: string } })[];
    },
    enabled: !!gameSystemId,
  });
}

// Fetch rules for a game system
export function useMasterRules(gameSystemId: string | undefined, factionId?: string | null) {
  return useQuery({
    queryKey: ["master-rules", gameSystemId, factionId],
    queryFn: async () => {
      if (!gameSystemId) return [];

      let query = supabase
        .from("master_rules")
        .select("*")
        .eq("game_system_id", gameSystemId)
        .order("category")
        .order("title");

      if (factionId === null) {
        // Only core rules (no faction)
        query = query.is("faction_id", null);
      } else if (factionId) {
        // Faction-specific rules + core rules
        query = query.or(`faction_id.eq.${factionId},faction_id.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MasterRule[];
    },
    enabled: !!gameSystemId,
  });
}

// Discover BattleScribe repo
export function useDiscoverBattleScribe() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (repoUrl: string) => {
      const { data, error } = await supabase.functions.invoke("parse-battlescribe", {
        body: { repoUrl, action: "discover" },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onError: (error) => {
      toast({
        title: "Discovery failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Sync BattleScribe repo to game system
export function useSyncBattleScribe() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ repoUrl, gameSystemId }: { repoUrl: string; gameSystemId: string }) => {
      const { data, error } = await supabase.functions.invoke("parse-battlescribe", {
        body: { repoUrl, gameSystemId, action: "sync" },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["game-systems"] });
      queryClient.invalidateQueries({ queryKey: ["master-factions"] });
      queryClient.invalidateQueries({ queryKey: ["master-units"] });
      queryClient.invalidateQueries({ queryKey: ["master-rules"] });

      toast({
        title: "Sync complete",
        description: `Imported ${data.unitsInserted} units across ${data.factionsProcessed?.length || 0} factions`,
      });
    },
    onError: (error) => {
      toast({
        title: "Sync failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Create a new game system (admin only - uses service role in edge function)
export function useCreateGameSystem() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      slug: string;
      description?: string;
      repo_url?: string;
      repo_type: "battlescribe" | "custom" | "manual";
    }) => {
      const { data, error } = await supabase
        .from("game_systems")
        .insert({
          ...input,
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;
      return data as GameSystem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["game-systems"] });
      toast({
        title: "Game system created",
        description: "You can now sync data from the repository",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create game system",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
