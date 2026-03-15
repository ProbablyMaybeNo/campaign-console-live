import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUndoStack } from "@/hooks/useUndoStack";
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
  const { pushUndo } = useUndoStack();

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
      pushUndo({
        label: `Add ${data.name}`,
        undo: async () => {
          await supabase.from("dashboard_components").delete().eq("id", data.id);
          queryClient.invalidateQueries({ queryKey: ["dashboard-components", data.campaign_id] });
        },
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to add component: ${error.message}`);
    },
  });
}

export function useUpdateComponent() {
  const queryClient = useQueryClient();
  const { pushUndo } = useUndoStack();

  return useMutation({
    mutationFn: async (input: UpdateComponentInput): Promise<{ data: DashboardComponent; previous: Partial<DashboardComponent> }> => {
      const { id, ...updates } = input;
      
      // Read current state for undo (from cache first, then DB)
      let previous: Partial<DashboardComponent> = {};
      const allQueries = queryClient.getQueriesData<DashboardComponent[]>({ queryKey: ["dashboard-components"] });
      for (const [, comps] of allQueries) {
        const found = comps?.find((c) => c.id === id);
        if (found) {
          // Only capture the fields we're about to change
          const prev: Record<string, any> = { id };
          for (const key of Object.keys(updates)) {
            prev[key] = (found as any)[key];
          }
          previous = prev as Partial<DashboardComponent>;
          break;
        }
      }

      const { data, error } = await supabase
        .from("dashboard_components")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { data, previous };
    },
    // Optimistic update for immediate UI response
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["dashboard-components"] });

      const allQueries = queryClient.getQueriesData<DashboardComponent[]>({ 
        queryKey: ["dashboard-components"] 
      });

      const previousData: { queryKey: string[]; data: DashboardComponent[] | undefined }[] = [];

      allQueries.forEach(([queryKey, data]) => {
        if (data) {
          previousData.push({ queryKey: queryKey as string[], data });
          queryClient.setQueryData<DashboardComponent[]>(queryKey, (old) =>
            old?.map((c) => (c.id === input.id ? { ...c, ...input } : c))
          );
        }
      });

      return { previousData };
    },
    onSuccess: ({ data, previous }) => {
      if (previous && Object.keys(previous).length > 1) {
        pushUndo({
          label: `Edit ${data.name}`,
          undo: async () => {
            const { id, ...restoreFields } = previous as UpdateComponentInput;
            if (id) {
              await supabase.from("dashboard_components").update(restoreFields).eq("id", id);
              queryClient.invalidateQueries({ queryKey: ["dashboard-components", data.campaign_id] });
            }
          },
        });
      }
    },
    onError: (error: Error, _input, context) => {
      if (context?.previousData) {
        context.previousData.forEach(({ queryKey, data }) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error(`Failed to update component: ${error.message}`);
    },
    onSettled: () => {
      // Optionally refetch for consistency
    },
  });
}

export function useDeleteComponent() {
  const queryClient = useQueryClient();
  const { pushUndo } = useUndoStack();

  return useMutation({
    mutationFn: async ({ id, campaignId }: { id: string; campaignId: string }): Promise<{ campaignId: string; deleted: DashboardComponent | null }> => {
      // Read the full component before deleting for undo
      const cached = queryClient.getQueryData<DashboardComponent[]>(["dashboard-components", campaignId]);
      const deleted = cached?.find((c) => c.id === id) || null;

      const { error } = await supabase
        .from("dashboard_components")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { campaignId, deleted };
    },
    // Optimistic delete
    onMutate: async ({ id, campaignId }) => {
      await queryClient.cancelQueries({ queryKey: ["dashboard-components", campaignId] });

      const previousData = queryClient.getQueryData<DashboardComponent[]>(["dashboard-components", campaignId]);

      queryClient.setQueryData<DashboardComponent[]>(
        ["dashboard-components", campaignId],
        (old) => old?.filter((c) => c.id !== id)
      );

      return { previousData, campaignId };
    },
    onSuccess: ({ campaignId, deleted }) => {
      toast.success("Component removed");
      if (deleted) {
        pushUndo({
          label: `Delete ${deleted.name}`,
          undo: async () => {
            const { id, created_at, updated_at, ...rest } = deleted;
            await supabase.from("dashboard_components").insert({ ...rest });
            queryClient.invalidateQueries({ queryKey: ["dashboard-components", campaignId] });
          },
        });
      }
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ["dashboard-components", context.campaignId],
          context.previousData
        );
      }
      toast.error(`Failed to remove component: ${error.message}`);
    },
  });
}
