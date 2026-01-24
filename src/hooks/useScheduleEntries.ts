import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ScheduleEntry {
  id: string;
  campaign_id: string;
  round_number: number;
  title: string;
  scenario: string | null;
  scheduled_date: string | null;
  start_date: string | null;
  end_date: string | null;
  color: string | null;
  entry_type: string | null;
  status: string | null;
  created_at: string;
}

export interface CreateScheduleEntryInput {
  campaign_id: string;
  title: string;
  round_number: number;
  start_date?: string | null;
  end_date?: string | null;
  color?: string;
  entry_type?: string;
  status?: string;
}

export interface UpdateScheduleEntryInput {
  id: string;
  title?: string;
  round_number?: number;
  start_date?: string | null;
  end_date?: string | null;
  color?: string;
  entry_type?: string;
  status?: string;
}

export function useScheduleEntries(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["schedule_entries", campaignId],
    queryFn: async (): Promise<ScheduleEntry[]> => {
      if (!campaignId) return [];
      
      const { data, error } = await supabase
        .from("schedule_entries")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("start_date", { ascending: true, nullsFirst: false })
        .order("round_number", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!campaignId,
  });
}

export function useCreateScheduleEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateScheduleEntryInput) => {
      const { data, error } = await supabase
        .from("schedule_entries")
        .insert({
          campaign_id: input.campaign_id,
          title: input.title,
          round_number: input.round_number,
          start_date: input.start_date,
          end_date: input.end_date,
          color: input.color || "#3b82f6",
          entry_type: input.entry_type || "round",
          status: input.status || "upcoming",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["schedule_entries", data.campaign_id] });
    },
  });
}

export function useUpdateScheduleEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateScheduleEntryInput) => {
      const { id, ...updates } = input;
      const { data, error } = await supabase
        .from("schedule_entries")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["schedule_entries", data.campaign_id] });
    },
  });
}

export function useDeleteScheduleEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, campaignId }: { id: string; campaignId: string }) => {
      const { error } = await supabase
        .from("schedule_entries")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { id, campaignId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["schedule_entries", variables.campaignId] });
    },
  });
}
