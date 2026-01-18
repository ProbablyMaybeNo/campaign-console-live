import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { extractPdfText, extractPdfTextEnhanced, removeHeadersFooters } from "@/lib/pdfExtractor";
import type { IndexingProgress } from "@/types/rules";

interface IndexingResult {
  success: boolean;
  stats?: {
    pages: number;
    sections: number;
    chunks: number;
    tablesHigh: number;
    tablesLow: number;
    datasets: number;
  };
  error?: string;
}

/**
 * Hook for client-side PDF extraction followed by server-side indexing
 */
export function usePdfIndexer() {
  const [progress, setProgress] = useState<IndexingProgress | null>(null);
  const queryClient = useQueryClient();

  const indexPdf = useCallback(async (
    sourceId: string,
    campaignId: string,
    storagePath: string,
    useAdvanced = false
  ): Promise<IndexingResult> => {
    try {
      setProgress({ stage: "extracting", progress: 0, message: "Downloading PDF..." });

      // Download PDF from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("campaign-documents")
        .download(storagePath);

      if (downloadError || !fileData) {
        throw new Error(`Failed to download PDF: ${downloadError?.message}`);
      }

      const file = new File([fileData], "document.pdf", { type: "application/pdf" });

      setProgress({ stage: "extracting", progress: 10, message: "Extracting text..." });

      // Use enhanced extraction for better table detection
      const result = await extractPdfTextEnhanced(file, (page, total, stage) => {
        const pct = 10 + Math.round((page / total) * 40);
        setProgress({
          stage: "extracting",
          progress: pct,
          message: `Extracting page ${page}/${total}...`,
        });
      });

      // Clean up headers/footers
      setProgress({ stage: "cleaning", progress: 55, message: "Cleaning text..." });
      const cleanedPages = removeHeadersFooters(result.pages);

      // Save pages to database
      setProgress({ stage: "saving", progress: 60, message: "Saving pages..." });
      
      const pagesToInsert = cleanedPages.map(p => ({
        source_id: sourceId,
        page_number: p.pageNumber,
        text: p.text,
        char_count: p.charCount,
      }));

      await supabase.from("rules_pages").delete().eq("source_id", sourceId);
      const { error: insertError } = await supabase.from("rules_pages").insert(pagesToInsert);
      if (insertError) throw insertError;

      // Trigger server-side indexing with pre-detected tables
      setProgress({ stage: "indexing", progress: 70, message: "Building index..." });

      const { data: indexResult, error: indexError } = await supabase.functions.invoke(
        "index-rules-source",
        { body: { sourceId, preDetectedTables: result.detectedTables } }
      );

      if (indexError) throw indexError;
      if (indexResult.error) throw new Error(indexResult.error);

      setProgress({ stage: "complete", progress: 100, message: "Complete!" });
      queryClient.invalidateQueries({ queryKey: ["rules_sources", campaignId] });

      return { success: true, stats: indexResult.stats };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setProgress({ stage: "failed", progress: 0, message });
      
      await supabase.from("rules_sources").update({
        index_status: "failed",
        index_error: { stage: "extraction", message },
      }).eq("id", sourceId);

      return { success: false, error: message };
    }
  }, [queryClient]);

  const reset = useCallback(() => setProgress(null), []);

  return { indexPdf, progress, reset };
}

/**
 * Hook for LlamaParse-based PDF extraction (advanced)
 */
export function useLlamaParseIndexer() {
  const [progress, setProgress] = useState<IndexingProgress | null>(null);
  const queryClient = useQueryClient();

  const indexWithLlamaParse = useCallback(async (
    sourceId: string,
    campaignId: string,
    storagePath: string
  ): Promise<IndexingResult> => {
    try {
      setProgress({ stage: "extracting", progress: 10, message: "Sending to LlamaParse..." });

      const { data: parseResult, error: parseError } = await supabase.functions.invoke(
        "parse-pdf-llamaparse",
        { body: { storagePath, sourceId } }
      );

      if (parseError) throw parseError;
      if (parseResult.error) throw new Error(parseResult.error);

      setProgress({ stage: "indexing", progress: 60, message: "Building index..." });

      const { data: indexResult, error: indexError } = await supabase.functions.invoke(
        "index-rules-source",
        { body: { sourceId } }
      );

      if (indexError) throw indexError;
      if (indexResult.error) throw new Error(indexResult.error);

      setProgress({ stage: "complete", progress: 100, message: "Complete!" });
      queryClient.invalidateQueries({ queryKey: ["rules_sources", campaignId] });

      return { success: true, stats: indexResult.stats };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setProgress({ stage: "failed", progress: 0, message });
      
      await supabase.from("rules_sources").update({
        index_status: "failed",
        index_error: { stage: "llamaparse", message },
      }).eq("id", sourceId);

      return { success: false, error: message };
    }
  }, [queryClient]);

  const reset = useCallback(() => setProgress(null), []);

  return { indexWithLlamaParse, progress, reset };
}

/**
 * Hook for GitHub JSON import and indexing
 */
export function useGitHubIndexer() {
  const [progress, setProgress] = useState<IndexingProgress | null>(null);
  const queryClient = useQueryClient();

  const indexGitHub = useCallback(async (
    sourceId: string,
    campaignId: string,
    repoUrl: string,
    jsonPath: string
  ): Promise<IndexingResult> => {
    try {
      setProgress({ stage: "fetching", progress: 10, message: "Fetching from GitHub..." });

      // Fetch JSON from GitHub via edge function
      const { data: fetchResult, error: fetchError } = await supabase.functions.invoke(
        "fetch-rules-repo",
        { body: { repoUrl, jsonPath } }
      );

      if (fetchError) throw fetchError;
      if (fetchResult.error) throw new Error(fetchResult.error);

      const { data: rulesJson, meta } = fetchResult;

      setProgress({ stage: "parsing", progress: 30, message: "Parsing JSON structure..." });

      // Store the SHA for provenance
      await supabase
        .from("rules_sources")
        .update({
          github_sha: meta.sha,
          github_imported_at: meta.fetchedAt,
        })
        .eq("id", sourceId);

      // Process the JSON and create sections/tables/datasets
      setProgress({ stage: "indexing", progress: 50, message: "Building index..." });

      const { data: indexResult, error: indexError } = await supabase.functions.invoke(
        "index-rules-source",
        { body: { sourceId, githubData: rulesJson } }
      );

      if (indexError) throw indexError;
      if (indexResult.error) throw new Error(indexResult.error);

      setProgress({ stage: "complete", progress: 100, message: "Complete!" });

      queryClient.invalidateQueries({ queryKey: ["rules_sources", campaignId] });

      return {
        success: true,
        stats: indexResult.stats,
      };

    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setProgress({ stage: "failed", progress: 0, message });

      await supabase
        .from("rules_sources")
        .update({
          index_status: "failed",
          index_error: { stage: "github_fetch", message },
        })
        .eq("id", sourceId);

      return { success: false, error: message };
    }
  }, [queryClient]);

  const reset = useCallback(() => {
    setProgress(null);
  }, []);

  return {
    indexGitHub,
    progress,
    reset,
  };
}