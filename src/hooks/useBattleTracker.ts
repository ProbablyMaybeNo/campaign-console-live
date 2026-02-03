import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { useEffect } from "react";
import type { Json } from "@/integrations/supabase/types";

// Types
export interface BattleRound {
  id: string;
  campaign_id: string;
  round_index: number;
  name: string;
  status: 'draft' | 'open' | 'closed';
  pairing_system: string;
  starts_at: string | null;
  ends_at: string | null;
  constraints_config: ConstraintsConfig;
  scoring_config: ScoringConfig;
  report_fields_config: ReportFieldsConfig;
  created_at: string;
  updated_at: string;
}

export interface ConstraintsConfig {
  noBackToBack?: boolean;
  maxRematchCount?: number;
  preferNotRepeatLastN?: number;
  byeScoring?: { win: number; draw: number; loss: number };
  allowCoop?: boolean;
}

export interface ScoringConfig {
  win: number;
  draw: number;
  loss: number;
  requireNarrative: boolean;
  autoApprove: boolean;
  quickResultAllowed: boolean;
}

export interface ReportFieldsConfig {
  narrative: boolean;
  injuries: boolean;
  loot: boolean;
  events: boolean;
  resources: boolean;
}

export interface MatchParticipant {
  playerId: string;
  playerName: string;
  warbandId?: string;
  warbandName?: string;
  side: 'a' | 'b' | 'c' | 'd';
}

export interface MatchResult {
  outcome: 'win' | 'loss' | 'draw';
  points: number;
}

export interface BattleMatch {
  id: string;
  campaign_id: string;
  round_id: string;
  participants: MatchParticipant[];
  status: 'unplayed' | 'played' | 'submitted' | 'approved' | 'disputed';
  is_bye: boolean;
  provisional_results: Record<string, MatchResult>;
  final_results: Record<string, MatchResult>;
  match_index: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BattleReport {
  id: string;
  match_id: string;
  submitted_by: string;
  player_side: string;
  outcome: 'win' | 'loss' | 'draw';
  points_earned: number;
  narrative: string | null;
  injuries: { unitName: string; injury: string; notes?: string }[];
  notable_events: { tag: string; description: string }[];
  loot_found: { item: string; quantity?: number; notes?: string }[];
  resources: { gained?: number; spent?: number };
  attachments: { url: string; type: string; name: string }[];
  approved_by: string | null;
  approved_at: string | null;
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

// Helper to safely cast JSON
function parseRound(data: unknown): BattleRound {
  const d = data as Record<string, unknown>;
  return {
    id: d.id as string,
    campaign_id: d.campaign_id as string,
    round_index: d.round_index as number,
    name: d.name as string,
    status: d.status as BattleRound['status'],
    pairing_system: d.pairing_system as string,
    starts_at: d.starts_at as string | null,
    ends_at: d.ends_at as string | null,
    constraints_config: (d.constraints_config || {}) as ConstraintsConfig,
    scoring_config: (d.scoring_config || { win: 3, draw: 1, loss: 0, requireNarrative: false, autoApprove: false, quickResultAllowed: true }) as ScoringConfig,
    report_fields_config: (d.report_fields_config || { narrative: true, injuries: true, loot: true, events: true, resources: false }) as ReportFieldsConfig,
    created_at: d.created_at as string,
    updated_at: d.updated_at as string,
  };
}

function parseMatch(data: unknown): BattleMatch {
  const d = data as Record<string, unknown>;
  return {
    id: d.id as string,
    campaign_id: d.campaign_id as string,
    round_id: d.round_id as string,
    participants: (d.participants || []) as MatchParticipant[],
    status: d.status as BattleMatch['status'],
    is_bye: d.is_bye as boolean,
    provisional_results: (d.provisional_results || {}) as Record<string, MatchResult>,
    final_results: (d.final_results || {}) as Record<string, MatchResult>,
    match_index: d.match_index as number,
    notes: d.notes as string | null,
    created_at: d.created_at as string,
    updated_at: d.updated_at as string,
  };
}

function parseReport(data: unknown): BattleReport {
  const d = data as Record<string, unknown>;
  return {
    id: d.id as string,
    match_id: d.match_id as string,
    submitted_by: d.submitted_by as string,
    player_side: d.player_side as string,
    outcome: d.outcome as BattleReport['outcome'],
    points_earned: d.points_earned as number,
    narrative: d.narrative as string | null,
    injuries: (d.injuries || []) as BattleReport['injuries'],
    notable_events: (d.notable_events || []) as BattleReport['notable_events'],
    loot_found: (d.loot_found || []) as BattleReport['loot_found'],
    resources: (d.resources || {}) as BattleReport['resources'],
    attachments: (d.attachments || []) as BattleReport['attachments'],
    approved_by: d.approved_by as string | null,
    approved_at: d.approved_at as string | null,
    submitted_at: d.submitted_at as string,
    created_at: d.created_at as string,
    updated_at: d.updated_at as string,
  };
}

// Hooks
export function useBattleRounds(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["battle-rounds", campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      const { data, error } = await supabase
        .from("battle_rounds")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("round_index", { ascending: true });
      
      if (error) throw error;
      return (data || []).map(parseRound);
    },
    enabled: !!campaignId,
  });
}

export function useCurrentRound(campaignId: string | undefined) {
  const { data: rounds = [] } = useBattleRounds(campaignId);
  // Current round is the latest open round, or the latest round if none are open
  const openRound = rounds.find(r => r.status === 'open');
  return openRound || rounds[rounds.length - 1] || null;
}

export function useBattleMatches(roundId: string | undefined) {
  return useQuery({
    queryKey: ["battle-matches", roundId],
    queryFn: async () => {
      if (!roundId) return [];
      const { data, error } = await supabase
        .from("battle_matches")
        .select("*")
        .eq("round_id", roundId)
        .order("match_index", { ascending: true });
      
      if (error) throw error;
      return (data || []).map(parseMatch);
    },
    enabled: !!roundId,
  });
}

export function useCampaignMatches(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["battle-matches-campaign", campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      const { data, error } = await supabase
        .from("battle_matches")
        .select("*, battle_rounds!inner(round_index, name, status)")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return (data || []).map(m => ({
        ...parseMatch(m),
        round: m.battle_rounds as { round_index: number; name: string; status: string },
      }));
    },
    enabled: !!campaignId,
  });
}

export function useBattleReports(matchId: string | undefined) {
  return useQuery({
    queryKey: ["battle-reports", matchId],
    queryFn: async () => {
      if (!matchId) return [];
      const { data, error } = await supabase
        .from("battle_reports")
        .select("*")
        .eq("match_id", matchId)
        .order("submitted_at", { ascending: true });
      
      if (error) throw error;
      return (data || []).map(parseReport);
    },
    enabled: !!matchId,
  });
}

// Mutations
export function useCreateRound() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ campaignId, name, roundIndex }: { campaignId: string; name: string; roundIndex: number }) => {
      const { data, error } = await supabase
        .from("battle_rounds")
        .insert({
          campaign_id: campaignId,
          name,
          round_index: roundIndex,
          status: 'draft',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { campaignId }) => {
      queryClient.invalidateQueries({ queryKey: ["battle-rounds", campaignId] });
      toast.success("Round created");
    },
    onError: (error: Error) => {
      toast.error("Failed to create round: " + error.message);
    },
  });
}

export function useUpdateRound() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ roundId, updates }: { roundId: string; updates: Partial<BattleRound> }) => {
      // Convert to DB format
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.pairing_system !== undefined) dbUpdates.pairing_system = updates.pairing_system;
      if (updates.starts_at !== undefined) dbUpdates.starts_at = updates.starts_at;
      if (updates.ends_at !== undefined) dbUpdates.ends_at = updates.ends_at;
      if (updates.constraints_config !== undefined) dbUpdates.constraints_config = updates.constraints_config as unknown as Json;
      if (updates.scoring_config !== undefined) dbUpdates.scoring_config = updates.scoring_config as unknown as Json;
      if (updates.report_fields_config !== undefined) dbUpdates.report_fields_config = updates.report_fields_config as unknown as Json;
      
      const { data, error } = await supabase
        .from("battle_rounds")
        .update(dbUpdates)
        .eq("id", roundId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["battle-rounds", data.campaign_id] });
      toast.success("Round updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update round: " + error.message);
    },
  });
}

export function useDeleteRound() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ roundId, campaignId }: { roundId: string; campaignId: string }) => {
      const { error } = await supabase
        .from("battle_rounds")
        .delete()
        .eq("id", roundId);
      
      if (error) throw error;
      return { campaignId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["battle-rounds", data.campaignId] });
      toast.success("Round deleted");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete round: " + error.message);
    },
  });
}

export function useCreateMatch() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      campaignId, 
      roundId, 
      participants, 
      matchIndex,
      isBye = false 
    }: { 
      campaignId: string; 
      roundId: string; 
      participants: MatchParticipant[];
      matchIndex: number;
      isBye?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("battle_matches")
        .insert({
          campaign_id: campaignId,
          round_id: roundId,
          participants: participants as unknown as Json,
          match_index: matchIndex,
          is_bye: isBye,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["battle-matches", data.round_id] });
      queryClient.invalidateQueries({ queryKey: ["battle-matches-campaign", data.campaign_id] });
    },
    onError: (error: Error) => {
      toast.error("Failed to create match: " + error.message);
    },
  });
}

export function useUpdateMatch() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ matchId, updates }: { matchId: string; updates: Partial<BattleMatch> }) => {
      // Convert to DB format
      const dbUpdates: Record<string, unknown> = {};
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.participants !== undefined) dbUpdates.participants = updates.participants as unknown as Json;
      if (updates.provisional_results !== undefined) dbUpdates.provisional_results = updates.provisional_results as unknown as Json;
      if (updates.final_results !== undefined) dbUpdates.final_results = updates.final_results as unknown as Json;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.is_bye !== undefined) dbUpdates.is_bye = updates.is_bye;
      
      const { data, error } = await supabase
        .from("battle_matches")
        .update(dbUpdates)
        .eq("id", matchId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["battle-matches", data.round_id] });
      queryClient.invalidateQueries({ queryKey: ["battle-matches-campaign", data.campaign_id] });
    },
    onError: (error: Error) => {
      toast.error("Failed to update match: " + error.message);
    },
  });
}

export function useDeleteMatch() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ matchId, roundId, campaignId }: { matchId: string; roundId: string; campaignId: string }) => {
      const { error } = await supabase
        .from("battle_matches")
        .delete()
        .eq("id", matchId);
      
      if (error) throw error;
      return { roundId, campaignId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["battle-matches", data.roundId] });
      queryClient.invalidateQueries({ queryKey: ["battle-matches-campaign", data.campaignId] });
      toast.success("Match deleted");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete match: " + error.message);
    },
  });
}

export function useSubmitBattleReport() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      matchId, 
      report,
      campaignId,
      roundId,
    }: { 
      matchId: string; 
      report: Omit<BattleReport, 'id' | 'match_id' | 'submitted_by' | 'approved_by' | 'approved_at' | 'submitted_at' | 'created_at' | 'updated_at'>;
      campaignId: string;
      roundId: string;
    }) => {
      if (!user) throw new Error("Must be logged in");
      
      const { data, error } = await supabase
        .from("battle_reports")
        .insert({
          match_id: matchId,
          submitted_by: user.id,
          player_side: report.player_side,
          outcome: report.outcome,
          points_earned: report.points_earned,
          narrative: report.narrative,
          injuries: report.injuries as unknown as Json,
          notable_events: report.notable_events as unknown as Json,
          loot_found: report.loot_found as unknown as Json,
          resources: report.resources as unknown as Json,
          attachments: report.attachments as unknown as Json,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Update match status to submitted
      await supabase
        .from("battle_matches")
        .update({ status: 'submitted' })
        .eq("id", matchId);
      
      return { data, campaignId, roundId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["battle-reports", result.data.match_id] });
      queryClient.invalidateQueries({ queryKey: ["battle-matches", result.roundId] });
      queryClient.invalidateQueries({ queryKey: ["battle-matches-campaign", result.campaignId] });
      toast.success("Battle report submitted");
    },
    onError: (error: Error) => {
      toast.error("Failed to submit report: " + error.message);
    },
  });
}

export function useApproveReport() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      reportId, 
      matchId,
      finalResults,
      campaignId,
      roundId,
    }: { 
      reportId: string; 
      matchId: string;
      finalResults: Record<string, MatchResult>;
      campaignId: string;
      roundId: string;
    }) => {
      if (!user) throw new Error("Must be logged in");
      
      // Update report
      const { error: reportError } = await supabase
        .from("battle_reports")
        .update({
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", reportId);
      
      if (reportError) throw reportError;
      
      // Update match
      const { error: matchError } = await supabase
        .from("battle_matches")
        .update({ 
          status: 'approved',
          final_results: finalResults as unknown as Json,
        })
        .eq("id", matchId);
      
      if (matchError) throw matchError;
      
      return { matchId, campaignId, roundId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["battle-reports", result.matchId] });
      queryClient.invalidateQueries({ queryKey: ["battle-matches", result.roundId] });
      queryClient.invalidateQueries({ queryKey: ["battle-matches-campaign", result.campaignId] });
      toast.success("Report approved");
    },
    onError: (error: Error) => {
      toast.error("Failed to approve report: " + error.message);
    },
  });
}

export function useBulkCreateMatches() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      campaignId, 
      roundId, 
      matches 
    }: { 
      campaignId: string; 
      roundId: string; 
      matches: { participants: MatchParticipant[]; matchIndex: number; isBye?: boolean }[];
    }) => {
      const { data, error } = await supabase
        .from("battle_matches")
        .insert(
          matches.map(m => ({
            campaign_id: campaignId,
            round_id: roundId,
            participants: m.participants as unknown as Json,
            match_index: m.matchIndex,
            is_bye: m.isBye || false,
          }))
        )
        .select();
      
      if (error) throw error;
      return { data, roundId, campaignId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["battle-matches", result.roundId] });
      queryClient.invalidateQueries({ queryKey: ["battle-matches-campaign", result.campaignId] });
      toast.success(`Created ${result.data.length} matches`);
    },
    onError: (error: Error) => {
      toast.error("Failed to create matches: " + error.message);
    },
  });
}

// Real-time subscription hook
export function useBattleMatchesRealtime(roundId: string | undefined) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (!roundId) return;
    
    const channel = supabase
      .channel(`battle-matches-${roundId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'battle_matches',
          filter: `round_id=eq.${roundId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["battle-matches", roundId] });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roundId, queryClient]);
}
