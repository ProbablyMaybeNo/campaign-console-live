import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface DashboardComponent {
  id: string;
  campaign_id: string;
  name: string;
  component_type: string;
  data_source: string;
  config: Json;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  visibility: string;
  created_at: string;
  updated_at: string;
}

export interface CreateComponentInput {
  campaign_id: string;
  name: string;
  component_type: string;
  data_source?: string;
  config?: Json;
  position_x?: number;
  position_y?: number;
  width?: number;
  height?: number;
}

export interface UpdateComponentInput {
  id: string;
  name?: string;
  config?: Json;
  position_x?: number;
  position_y?: number;
  width?: number;
  height?: number;
}

export function useDashboardComponents(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["dashboard-components", campaignId],
    queryFn: async (): Promise<DashboardComponent[]> => {
      if (!campaignId) return [];

      const { data, error } = await supabase
        .from("dashboard_components")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!campaignId,
  });
}

export function useCreateComponent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateComponentInput): Promise<DashboardComponent> => {
      const { data, error } = await supabase
        .from("dashboard_components")
        .insert({
          campaign_id: input.campaign_id,
          name: input.name,
          component_type: input.component_type,
          data_source: input.data_source || "none",
          config: input.config || {},
          position_x: input.position_x ?? 100,
          position_y: input.position_y ?? 100,
          width: input.width ?? 300,
          height: input.height ?? 200,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-components", data.campaign_id] });
      toast.success("Component added");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add component: ${error.message}`);
    },
  });
}

export function useUpdateComponent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateComponentInput): Promise<DashboardComponent> => {
      const { id, ...updates } = input;
      
      const { data, error } = await supabase
        .from("dashboard_components")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-components", data.campaign_id] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update component: ${error.message}`);
    },
  });
}

export function useDeleteComponent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, campaignId }: { id: string; campaignId: string }): Promise<void> => {
      const { error } = await supabase
        .from("dashboard_components")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-components", variables.campaignId] });
      toast.success("Component removed");
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove component: ${error.message}`);
    },
  });
}
