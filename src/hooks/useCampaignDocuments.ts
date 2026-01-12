import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CampaignDocument {
  id: string;
  campaign_id: string;
  uploaded_by: string;
  name: string;
  file_path: string;
  file_type: string;
  file_size: number | null;
  created_at: string;
}

export function useCampaignDocuments(campaignId: string) {
  return useQuery({
    queryKey: ["campaign-documents", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_documents")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CampaignDocument[];
    },
    enabled: !!campaignId,
  });
}

export function useUploadCampaignDocument(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Not authenticated");

      // Upload to storage
      const filePath = `${campaignId}/${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("campaign-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create database record
      const { data, error: dbError } = await supabase
        .from("campaign_documents")
        .insert({
          campaign_id: campaignId,
          uploaded_by: user.id,
          name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
        })
        .select()
        .single();

      if (dbError) throw dbError;
      return data as CampaignDocument;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-documents", campaignId] });
      toast.success("Document uploaded and saved to campaign");
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast.error("Failed to upload document");
    },
  });
}

export function useDeleteCampaignDocument(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (document: CampaignDocument) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("campaign-documents")
        .remove([document.file_path]);

      if (storageError) console.warn("Storage delete warning:", storageError);

      // Delete database record
      const { error: dbError } = await supabase
        .from("campaign_documents")
        .delete()
        .eq("id", document.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-documents", campaignId] });
      toast.success("Document deleted");
    },
    onError: (error) => {
      console.error("Delete error:", error);
      toast.error("Failed to delete document");
    },
  });
}

export async function getDocumentContent(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("campaign-documents")
    .download(filePath);

  if (error) throw error;

  // For text files, return the text content
  if (filePath.endsWith(".txt") || filePath.endsWith(".md")) {
    return await data.text();
  }

  // For PDFs, return a base64 representation that can be sent to AI
  const arrayBuffer = await data.arrayBuffer();
  const base64 = btoa(
    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
  );
  return `[PDF Content: base64,${base64}]`;
}
