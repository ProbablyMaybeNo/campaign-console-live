import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUndoStack } from "@/hooks/useUndoStack";
import { toast } from "sonner";

export interface CanvasAnnotation {
  id: string;
  campaign_id: string;
  creator_id: string;
  annotation_type: "text" | "line" | "rectangle";
  content: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  end_x: number | null;
  end_y: number | null;
  color: string;
  font_size: number;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAnnotationInput {
  campaign_id: string;
  annotation_type: "text" | "line" | "rectangle";
  content?: string;
  position_x: number;
  position_y: number;
  width?: number;
  height?: number;
  end_x?: number;
  end_y?: number;
  color?: string;
  font_size?: number;
}

export interface UpdateAnnotationInput {
  id: string;
  content?: string;
  position_x?: number;
  position_y?: number;
  width?: number;
  height?: number;
  end_x?: number;
  end_y?: number;
  color?: string;
  font_size?: number;
  is_locked?: boolean;
}

export function useCanvasAnnotations(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["canvas-annotations", campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      const { data, error } = await supabase
        .from("canvas_annotations" as any)
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as CanvasAnnotation[];
    },
    enabled: !!campaignId,
  });
}

export function useCreateAnnotation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { pushUndo } = useUndoStack();

  return useMutation({
    mutationFn: async (input: CreateAnnotationInput) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("canvas_annotations" as any)
        .insert({
          ...input,
          creator_id: user.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as CanvasAnnotation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["canvas-annotations", data.campaign_id],
      });
      // Push undo: delete the newly created annotation
      pushUndo({
        label: `Add ${data.annotation_type}`,
        undo: async () => {
          await supabase.from("canvas_annotations" as any).delete().eq("id", data.id);
          queryClient.invalidateQueries({ queryKey: ["canvas-annotations", data.campaign_id] });
        },
      });
    },
    onError: (error: any) => {
      if (error.message?.includes("Annotation limit")) {
        toast.error("Annotation limit reached (50 per campaign)");
      } else {
        toast.error("Failed to create annotation");
      }
    },
  });
}

export function useUpdateAnnotation() {
  const queryClient = useQueryClient();
  const { pushUndo } = useUndoStack();

  return useMutation({
    mutationFn: async (input: UpdateAnnotationInput) => {
      const { id, ...updates } = input;
      // Fetch current state before updating for undo
      const { data: before } = await supabase
        .from("canvas_annotations" as any)
        .select("*")
        .eq("id", id)
        .single();

      const { data, error } = await supabase
        .from("canvas_annotations" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return { data: data as unknown as CanvasAnnotation, before: before as unknown as CanvasAnnotation | null };
    },
    onSuccess: ({ data, before }) => {
      queryClient.invalidateQueries({
        queryKey: ["canvas-annotations", data.campaign_id],
      });
      if (before) {
        pushUndo({
          label: `Edit ${data.annotation_type}`,
          undo: async () => {
            const { id, campaign_id, creator_id, created_at, ...restoreFields } = before;
            await supabase
              .from("canvas_annotations" as any)
              .update({ ...restoreFields, updated_at: new Date().toISOString() } as any)
              .eq("id", id);
            queryClient.invalidateQueries({ queryKey: ["canvas-annotations", campaign_id] });
          },
        });
      }
    },
    onError: () => {
      toast.error("Failed to update annotation");
    },
  });
}

export function useDeleteAnnotation() {
  const queryClient = useQueryClient();
  const { pushUndo } = useUndoStack();

  return useMutation({
    mutationFn: async ({ id, campaignId }: { id: string; campaignId: string }) => {
      // Fetch before deleting for undo
      const { data: before } = await supabase
        .from("canvas_annotations" as any)
        .select("*")
        .eq("id", id)
        .single();

      const { error } = await supabase
        .from("canvas_annotations" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { campaignId, before: before as unknown as CanvasAnnotation | null };
    },
    onSuccess: ({ campaignId, before }) => {
      queryClient.invalidateQueries({
        queryKey: ["canvas-annotations", campaignId],
      });
      if (before) {
        pushUndo({
          label: `Delete ${before.annotation_type}`,
          undo: async () => {
            const { id, ...rest } = before;
            await supabase
              .from("canvas_annotations" as any)
              .insert({ ...rest } as any);
            queryClient.invalidateQueries({ queryKey: ["canvas-annotations", campaignId] });
          },
        });
      }
    },
    onError: () => {
      toast.error("Failed to delete annotation");
    },
  });
}
