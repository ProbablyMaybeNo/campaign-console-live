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

// Fetch game systems (admin library uses this; can optionally filter to active only)
export function useGameSystems(options?: { status?: "active" | "all" }) {
  const status = options?.status ?? "all";

  return useQuery({
    queryKey: ["game-systems", status],
    queryFn: async () => {
      let query = supabase.from("game_systems").select("*").order("name");
      if (status === "active") query = query.eq("status", "active");

      const { data, error } = await query;
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

// Get unique rule categories for a game system
export function useMasterRuleCategories(gameSystemId: string | undefined) {
  const { data: rules } = useMasterRules(gameSystemId);

  const categories = rules?.reduce((acc, rule) => {
    if (!acc[rule.category]) {
      acc[rule.category] = [];
    }
    acc[rule.category].push(rule);
    return acc;
  }, {} as Record<string, MasterRule[]>);

  return Object.entries(categories || {}).map(([category, categoryRules]) => ({
    category,
    rules: categoryRules,
    ruleCount: categoryRules.length,
  }));
}

// Fetch rules by category for a game system
export function useMasterRulesByCategory(gameSystemId: string | undefined, category: string | undefined) {
  return useQuery({
    queryKey: ["master-rules-by-category", gameSystemId, category],
    queryFn: async () => {
      if (!gameSystemId || !category) return [];

      const { data, error } = await supabase
        .from("master_rules")
        .select("*")
        .eq("game_system_id", gameSystemId)
        .eq("category", category)
        .order("title");

      if (error) throw error;
      return data as MasterRule[];
    },
    enabled: !!gameSystemId && !!category,
  });
}

// BSData Gallery types
export interface BSDataGameSystem {
  name: string;
  description: string;
  version: string;
  lastUpdated: string;
  repositoryUrl: string;
  githubUrl: string;
}

// Fetch all available game systems from BSData gallery
export function useBSDataGallery() {
  return useQuery({
    queryKey: ["bsdata-gallery"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("parse-battlescribe", {
        body: { action: "list_gallery" },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.gameSystems as BSDataGameSystem[];
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });
}

// Import a game system from BSData gallery (instant, uses pre-processed data)
export function useImportFromGallery() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (gameSystem: BSDataGameSystem) => {
      const { data, error } = await supabase.functions.invoke("parse-battlescribe", {
        body: {
          action: "import_from_gallery",
          ...gameSystem,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["game-systems"] });
      queryClient.invalidateQueries({ queryKey: ["game-systems", "all"] });
      queryClient.invalidateQueries({ queryKey: ["game-systems", "active"] });
      queryClient.invalidateQueries({ queryKey: ["master-factions"] });
      queryClient.invalidateQueries({ queryKey: ["master-units"] });
      queryClient.invalidateQueries({ queryKey: ["master-rules"] });

      toast({
        title: "Import complete!",
        description: `Imported ${data.unitsCount} units across ${data.factions?.length || 0} factions`,
      });
    },
    onError: (error) => {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Sync BattleScribe repo - processes one faction at a time
export function useSyncBattleScribe() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      repoUrl, 
      gameSystemId,
      onProgress 
    }: { 
      repoUrl: string; 
      gameSystemId: string;
      onProgress?: (current: number, total: number, factionName: string) => void;
    }) => {
      // Step 1: Initialize game system (parse GST only)
      const initRes = await supabase.functions.invoke("parse-battlescribe", {
        body: { repoUrl, gameSystemId, action: "sync_init" },
      });

      if (initRes.error) throw initRes.error;
      if (initRes.data.error) throw new Error(initRes.data.error);

      const totalFactions = initRes.data.totalFactions || 0;
      const gameSystemName = initRes.data.gameSystem;
      let totalUnits = 0;
      const allFactions: string[] = [];

      // Step 2: Process each faction one at a time
      for (let i = 0; i < totalFactions; i++) {
        onProgress?.(i + 1, totalFactions, `Importing faction ${i + 1} of ${totalFactions}...`);

        const factionRes = await supabase.functions.invoke("parse-battlescribe", {
          body: { repoUrl, gameSystemId, action: "sync_faction", factionIndex: i },
        });

        if (factionRes.error) {
          console.error(`Error syncing faction ${i}:`, factionRes.error);
          continue; // Skip failed factions but continue
        }
        if (factionRes.data.error) {
          console.error(`Error syncing faction ${i}:`, factionRes.data.error);
          continue;
        }

        totalUnits += factionRes.data.unitsInserted || 0;
        if (factionRes.data.factionName) {
          allFactions.push(factionRes.data.factionName);
        }
      }

      return { unitsInserted: totalUnits, factionsProcessed: allFactions, gameSystem: gameSystemName };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["game-systems"] });
      queryClient.invalidateQueries({ queryKey: ["game-systems", "all"] });
      queryClient.invalidateQueries({ queryKey: ["game-systems", "active"] });
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

// Create a new game system (idempotent by slug)
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
      // Use upsert so re-importing the same repo doesn't fail with duplicate slug.
      // On insert, DB defaults status='draft'. On conflict, we avoid forcing status back to draft.
      const { data, error } = await supabase
        .from("game_systems")
        .upsert({ ...input }, { onConflict: "slug" })
        .select()
        .single();

      if (error) throw error;
      return data as GameSystem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["game-systems"] });
      queryClient.invalidateQueries({ queryKey: ["game-systems", "all"] });
      queryClient.invalidateQueries({ queryKey: ["game-systems", "active"] });
      toast({
        title: "Game system ready",
        description: "Starting import from the repository…",
      });
    },
    onError: (error: any) => {
      const message =
        error?.code === "23505"
          ? "A game system with this slug already exists. Try resync instead."
          : error?.message || "Unknown error";

      toast({
        title: "Failed to create game system",
        description: message,
        variant: "destructive",
      });
    },
  });
}
