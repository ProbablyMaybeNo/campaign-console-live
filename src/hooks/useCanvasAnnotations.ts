import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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

  return useMutation({
    mutationFn: async (input: UpdateAnnotationInput) => {
      const { id, ...updates } = input;
      const { data, error } = await supabase
        .from("canvas_annotations" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as CanvasAnnotation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["canvas-annotations", data.campaign_id],
      });
    },
    onError: () => {
      toast.error("Failed to update annotation");
    },
  });
}

export function useDeleteAnnotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, campaignId }: { id: string; campaignId: string }) => {
      const { error } = await supabase
        .from("canvas_annotations" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
      return campaignId;
    },
    onSuccess: (campaignId) => {
      queryClient.invalidateQueries({
        queryKey: ["canvas-annotations", campaignId],
      });
    },
    onError: () => {
      toast.error("Failed to delete annotation");
    },
  });
}
