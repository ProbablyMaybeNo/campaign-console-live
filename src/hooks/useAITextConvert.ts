import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TableResult {
  columns: string[];
  rows: Array<{ id: string; [key: string]: string }>;
  title?: string;
}

interface CardResult {
  title: string;
  sections: Array<{ header: string; content: string }>;
}

type ConversionResult = 
  | { success: true; type: "table"; data: TableResult }
  | { success: true; type: "card"; data: CardResult }
  | { success: false; error: string };

export function useAITextConvert() {
  const [isConverting, setIsConverting] = useState(false);

  const convertText = async (
    rawText: string,
    hint: "table" | "card" = "table"
  ): Promise<ConversionResult> => {
    if (!rawText.trim()) {
      return { success: false, error: "No text provided" };
    }

    setIsConverting(true);

    try {
      const { data, error } = await supabase.functions.invoke("convert-text-to-table", {
        body: { rawText, hint },
      });

      if (error) {
        console.error("AI conversion error:", error);
        toast.error("AI conversion failed", { description: error.message });
        return { success: false, error: error.message };
      }

      if (!data.success) {
        toast.error("Conversion failed", { description: data.error });
        return { success: false, error: data.error };
      }

      toast.success("AI conversion complete");
      return data as ConversionResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("AI conversion error:", err);
      toast.error("AI conversion failed", { description: message });
      return { success: false, error: message };
    } finally {
      setIsConverting(false);
    }
  };

  return { convertText, isConverting };
}
