import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { extractPdfTextEnhanced, getExtractionStats, removeHeadersFooters, shouldFlagScannedPdf, shouldUseOcrFallback } from "@/lib/pdfExtractor";
import type { IndexingProgress } from "@/types/rules";

type PageLike = { pageNumber: number; text: string; charCount: number };

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

export function buildClientStats(pages: PageLike[]) {
  const { emptyPages, avgCharsPerPage } = getExtractionStats(pages);
  return {
    pagesExtracted: pages.length,
    emptyPages,
    avgCharsPerPage,
  };
}

export function shouldAttemptOcrFallback(pages: PageLike[]) {
  return shouldUseOcrFallback(pages);
}

/**
 * Hook for client-side PDF extraction followed by server-side indexing
 */
export function usePdfIndexer() {
  const [progress, setProgress] = useState<IndexingProgress | null>(null);
  const queryClient = useQueryClient();
  const debugEnabled = typeof window !== "undefined" && window.localStorage.getItem("rules_index_debug") === "true";

  const indexPdf = useCallback(async (
    sourceId: string,
    campaignId: string,
    storagePath: string,
    useAdvanced = false
  ): Promise<IndexingResult> => {
    try {
      const timeMsByStage: Record<string, number> = {};
      let failureStage = "extraction";
      let statsSnapshot: Record<string, unknown> | null = null;
      const markStage = (stage: string, start: number) => {
        timeMsByStage[stage] = Math.round(performance.now() - start);
      };

      await supabase.from("rules_sources").update({
        index_status: "indexing",
        index_error: null,
      }).eq("id", sourceId);

      setProgress({ stage: "extracting", progress: 0, message: "Downloading PDF..." });

      const downloadStart = performance.now();
      failureStage = "fetch";
      // Download PDF from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("campaign-documents")
        .download(storagePath);

      if (downloadError || !fileData) {
        throw new Error(`Failed to download PDF: ${downloadError?.message}`);
      }
      markStage("downloadPdf", downloadStart);

      const file = new File([fileData], "document.pdf", { type: "application/pdf" });

      setProgress({ stage: "extracting", progress: 10, message: "Extracting text..." });

      const extractStart = performance.now();
      failureStage = "extraction";
      // Use enhanced extraction for better table detection
      const result = await extractPdfTextEnhanced(file, (page, total, stage) => {
        const pct = 10 + Math.round((page / total) * 40);
        setProgress({
          stage: "extracting",
          progress: pct,
          message: `Extracting page ${page}/${total}...`,
        });
      });
      markStage("extractText", extractStart);
      // Clean up headers/footers
      const cleanStart = performance.now();
      setProgress({ stage: "cleaning", progress: 55, message: "Cleaning text..." });
      const cleanedPages = removeHeadersFooters(result.pages);
      markStage("cleanHeadersFooters", cleanStart);

      const shouldOcrFallback = shouldAttemptOcrFallback(cleanedPages) || shouldFlagScannedPdf(cleanedPages);
      const cleanedStats = {
        ...buildClientStats(cleanedPages),
        ocrAttempted: shouldOcrFallback,
        ocrSucceeded: false,
      };
      statsSnapshot = cleanedStats;

      const invokeLlamaParse = async () => {
        let lastError: string | null = null;
        for (let attempt = 1; attempt <= 2; attempt += 1) {
          if (attempt > 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
          }
          const attemptStart = performance.now();
          const { data: parseResult, error: parseError } = await supabase.functions.invoke(
            "parse-pdf-llamaparse",
            { body: { storagePath, sourceId } }
          );
          markStage(`llamaParseAttempt${attempt}`, attemptStart);
          if (!parseError && !parseResult?.error) {
            return parseResult;
          }
          lastError = parseError?.message || parseResult?.error || "LlamaParse failed";
        }
        throw new Error(lastError || "LlamaParse failed");
      };

      if (shouldOcrFallback) {
        setProgress({ stage: "extracting", progress: 55, message: "Low-text PDF detected. Trying OCR..." });
        failureStage = "llamaparse";

        const fallbackStart = performance.now();
        const parseResult = await invokeLlamaParse();
        markStage("llamaParse", fallbackStart);

        const parsedPages: PageLike[] = (parseResult?.pages ?? []).map((page: PageLike) => ({
          pageNumber: page.pageNumber,
          text: page.text,
          charCount: page.charCount,
        }));
        const parsedStats = buildClientStats(parsedPages);
        const ocrStats = { ...parsedStats, ocrAttempted: true, ocrSucceeded: true };
        statsSnapshot = ocrStats;

        setProgress({ stage: "indexing", progress: 70, message: "Building index from OCR..." });
        const indexStart = performance.now();
        failureStage = "indexing";
        const { data: indexResult, error: indexError } = await supabase.functions.invoke(
          "index-rules-source",
          {
            body: {
              sourceId,
              clientStats: ocrStats,
              clientTimings: timeMsByStage,
            },
          }
        );
        markStage("indexSource", indexStart);

        if (indexError) throw indexError;
        if (indexResult.error) throw new Error(indexResult.error);

        setProgress({ stage: "complete", progress: 100, message: "Complete!" });
        queryClient.invalidateQueries({ queryKey: ["rules_sources", campaignId] });

        return { success: true, stats: indexResult.stats };
      }

      // Save pages to database
      const saveStart = performance.now();
      setProgress({ stage: "saving", progress: 60, message: "Saving pages..." });
      
      const pagesToInsert = cleanedPages.map(p => ({
        source_id: sourceId,
        page_number: p.pageNumber,
        text: p.text,
        char_count: p.charCount,
      }));

      await supabase.from("rules_pages").delete().eq("source_id", sourceId);
      for (let i = 0; i < pagesToInsert.length; i += 200) {
        const batch = pagesToInsert.slice(i, i + 200);
        const { error: insertError } = await supabase.from("rules_pages").insert(batch);
        if (insertError) throw insertError;
      }
      markStage("savePages", saveStart);

      // Trigger server-side indexing with pre-detected tables
      setProgress({ stage: "indexing", progress: 70, message: "Building index..." });

      const indexStart = performance.now();
      failureStage = "indexing";
      const { data: indexResult, error: indexError } = await supabase.functions.invoke(
        "index-rules-source",
        {
          body: {
            sourceId,
            preDetectedTables: result.detectedTables,
            preDetectedSections: result.detectedSections,
            clientStats: cleanedStats,
            clientTimings: timeMsByStage,
          },
        }
      );
      markStage("indexSource", indexStart);

      if (indexError) throw indexError;
      if (indexResult.error) throw new Error(indexResult.error);

      setProgress({ stage: "complete", progress: 100, message: "Complete!" });
      queryClient.invalidateQueries({ queryKey: ["rules_sources", campaignId] });

      if (debugEnabled) {
        console.debug("Rules indexing stats", {
          pagesExtracted: cleanedPages.length,
          emptyPages: cleanedStats.emptyPages,
          avgCharsPerPage: cleanedStats.avgCharsPerPage,
          timeMsByStage,
          detectedTables: result.detectedTables.length,
          detectedSections: result.detectedSections.length,
          pageErrors: result.pageErrors.length,
        });
      }

      return { success: true, stats: indexResult.stats };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setProgress({ stage: "failed", progress: 0, message });

      await supabase.from("rules_sources").update({
        index_status: "failed",
        index_error: { stage: failureStage, message },
        ...(statsSnapshot && failureStage !== "indexing"
          ? { index_stats: { ...statsSnapshot, timeMsByStage } }
          : {}),
      }).eq("id", sourceId);

      return { success: false, error: message };
    }
  }, [debugEnabled, queryClient]);

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
      await supabase.from("rules_sources").update({
        index_status: "indexing",
        index_error: null,
      }).eq("id", sourceId);

      setProgress({ stage: "extracting", progress: 10, message: "Sending to LlamaParse..." });

      const timeMsByStage: Record<string, number> = {};
      let failureStage = "llamaparse";

      const invokeLlamaParse = async () => {
        let lastError: string | null = null;
        for (let attempt = 1; attempt <= 2; attempt += 1) {
          if (attempt > 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
          }
          const attemptStart = performance.now();
          const { data: parseResult, error: parseError } = await supabase.functions.invoke(
            "parse-pdf-llamaparse",
            { body: { storagePath, sourceId } }
          );
          timeMsByStage[`llamaParseAttempt${attempt}`] = Math.round(performance.now() - attemptStart);
          if (!parseError && !parseResult?.error) {
            return parseResult;
          }
          lastError = parseError?.message || parseResult?.error || "LlamaParse failed";
        }
        throw new Error(lastError || "LlamaParse failed");
      };

      const parseStart = performance.now();
      const parseResult = await invokeLlamaParse();
      timeMsByStage.llamaParse = Math.round(performance.now() - parseStart);
      const parsedPages = (parseResult?.pages ?? []) as PageLike[];
      const parsedStats = {
        ...buildClientStats(parsedPages),
        ocrAttempted: true,
        ocrSucceeded: true,
      };

      setProgress({ stage: "indexing", progress: 60, message: "Building index..." });

      failureStage = "indexing";
      const indexStart = performance.now();
      const { data: indexResult, error: indexError } = await supabase.functions.invoke(
        "index-rules-source",
        { body: { sourceId, clientStats: parsedStats, clientTimings: timeMsByStage } }
      );
      timeMsByStage.indexSource = Math.round(performance.now() - indexStart);

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
        index_error: { stage: failureStage, message },
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
