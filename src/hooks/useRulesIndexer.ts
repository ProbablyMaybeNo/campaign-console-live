import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { extractPdfTextEnhanced, getExtractionStats, removeHeadersFooters, shouldFlagScannedPdf } from "@/lib/pdfExtractor";
import type { IndexingProgress, IndexStats } from "@/types/rules";
import { DEFAULT_INDEX_STATS } from "@/types/rules";

type PageLike = { pageNumber: number; text: string; charCount: number };

interface IndexingResult {
  success: boolean;
  stats?: {
    pages: number;
    pagesExtracted?: number;
    sections: number;
    chunks: number;
    tablesHigh: number;
    tablesLow: number;
    datasets: number;
  };
  error?: string;
}

export function buildClientStats(pages: PageLike[], overrides: Partial<IndexStats> = {}): IndexStats {
  const { emptyPages, avgCharsPerPage } = getExtractionStats(pages);
  return {
    ...DEFAULT_INDEX_STATS,
    pages: pages.length,
    pagesExtracted: pages.length,
    emptyPages,
    avgCharsPerPage,
    ...overrides,
    timeMsByStage: {
      ...DEFAULT_INDEX_STATS.timeMsByStage,
      ...(overrides.timeMsByStage ?? {}),
    },
    pageHashes: overrides.pageHashes ?? DEFAULT_INDEX_STATS.pageHashes,
  };
}

async function updateSourceIndexingState(
  sourceId: string,
  payload: {
    index_status: "indexing" | "failed" | "indexed";
    index_error?: { stage: string; message: string } | null;
    index_stats?: IndexStats | null;
  }
) {
  await supabase
    .from("rules_sources")
    .update(payload)
    .eq("id", sourceId);
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
    const timeMsByStage: Record<string, number> = {};
    let errorStage: string | undefined;
    let statsSnapshot: IndexStats | null = null;

    try {
      const markStage = (stage: string, start: number) => {
        timeMsByStage[stage] = Math.round(performance.now() - start);
      };

      await updateSourceIndexingState(sourceId, {
        index_status: "indexing",
        index_error: null,
      });

      setProgress({ stage: "extracting", progress: 0, message: "Downloading PDF..." });

      const downloadStart = performance.now();
      // Download PDF from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("campaign-documents")
        .download(storagePath);

      if (downloadError || !fileData) {
        errorStage = "fetch";
        throw new Error(`Failed to download PDF: ${downloadError?.message}`);
      }
      markStage("fetch", downloadStart);

      const file = new File([fileData], "document.pdf", { type: "application/pdf" });

      setProgress({ stage: "extracting", progress: 10, message: "Extracting text..." });

      const extractStart = performance.now();
      errorStage = "extraction";
      // Use enhanced extraction for better table detection
      const result = await extractPdfTextEnhanced(file, (page, total, stage) => {
        const pct = 10 + Math.round((page / total) * 40);
        setProgress({
          stage: "extracting",
          progress: pct,
          message: `Extracting page ${page}/${total}...`,
        });
      });
      markStage("extraction", extractStart);
      // Clean up headers/footers
      const cleanStart = performance.now();
      setProgress({ stage: "cleaning", progress: 55, message: "Cleaning text..." });
      errorStage = "clean";
      const cleanedPages = removeHeadersFooters(result.pages);
      markStage("clean", cleanStart);

      const cleanedStats = buildClientStats(cleanedPages, {
        ocrAttempted: false,
        ocrSucceeded: false,
        timeMsByStage,
      });
      statsSnapshot = cleanedStats;
      if (shouldFlagScannedPdf(cleanedPages)) {
        setProgress({ stage: "extracting", progress: 55, message: "Scanned PDF detected. Trying OCR..." });

        const maxAttempts = 2;
        let parseResult: { pages?: PageLike[]; error?: string; stage?: string; timeMsByStage?: Record<string, number> } | null = null;
        let parseError: Error | null = null;

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
          const fallbackStart = performance.now();
          const { data, error } = await supabase.functions.invoke(
            "parse-pdf-llamaparse",
            { body: { storagePath, sourceId } }
          );
          markStage("llamaparse", fallbackStart);

          parseResult = data ?? null;
          parseError = error ?? null;

          if (!parseError && !parseResult?.error) {
            break;
          }

          if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 500 * 2 ** (attempt - 1)));
          }
        }

        const llamaparseTimings = parseResult?.timeMsByStage ?? {};
        Object.assign(timeMsByStage, llamaparseTimings);

        if (parseError || parseResult?.error) {
          const message = parseError?.message || parseResult?.error || "Scanned PDF detected. Use OCR / alternate method.";
          errorStage = parseResult?.stage || (message.toLowerCase().includes("timeout") ? "timeout" : "llamaparse");
          setProgress({ stage: "failed", progress: 0, message });
          const failedStats = buildClientStats(cleanedPages, {
            ...cleanedStats,
            ocrAttempted: true,
            ocrSucceeded: false,
            timeMsByStage,
          });
          statsSnapshot = failedStats;
          await updateSourceIndexingState(sourceId, {
            index_status: "failed",
            index_error: { stage: errorStage, message },
            index_stats: failedStats,
          });
          queryClient.invalidateQueries({ queryKey: ["rules_sources", campaignId] });

          return { success: false, error: message };
        }

        const parsedPages: PageLike[] = (parseResult?.pages ?? []).map((page: PageLike) => ({
          pageNumber: page.pageNumber,
          text: page.text,
          charCount: page.charCount,
        }));
        const parsedStats = buildClientStats(parsedPages, {
          ocrAttempted: true,
          ocrSucceeded: true,
          timeMsByStage,
        });
        statsSnapshot = parsedStats;

        setProgress({ stage: "indexing", progress: 70, message: "Building index from OCR..." });
        const indexStart = performance.now();
        const { data: indexResult, error: indexError } = await supabase.functions.invoke(
          "index-rules-source",
          {
            body: {
              sourceId,
              clientStats: parsedStats,
              clientTimings: timeMsByStage,
            },
          }
        );
        markStage("indexing", indexStart);

        if (indexError) {
          errorStage = "indexing";
          throw indexError;
        }
        if (indexResult.error) {
          errorStage = "indexing";
          throw new Error(indexResult.error);
        }

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
        if (insertError) {
          errorStage = "save";
          throw insertError;
        }
      }
      markStage("save", saveStart);

      // Trigger server-side indexing with pre-detected tables
      setProgress({ stage: "indexing", progress: 70, message: "Building index..." });

      const indexStart = performance.now();
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
      markStage("indexing", indexStart);

      if (indexError) {
        errorStage = "indexing";
        throw indexError;
      }
      if (indexResult.error) {
        errorStage = "indexing";
        throw new Error(indexResult.error);
      }

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
      const stage = errorStage || "unknown";
      setProgress({ stage: "failed", progress: 0, message });

      await updateSourceIndexingState(sourceId, {
        index_status: "failed",
        index_error: { stage, message },
        index_stats: statsSnapshot ? { ...statsSnapshot, timeMsByStage } : null,
      });
      queryClient.invalidateQueries({ queryKey: ["rules_sources", campaignId] });

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
    const timeMsByStage: Record<string, number> = {};
    let errorStage: string | undefined;
    let statsSnapshot: IndexStats | null = null;

    try {
      await updateSourceIndexingState(sourceId, {
        index_status: "indexing",
        index_error: null,
      });

      setProgress({ stage: "extracting", progress: 10, message: "Sending to LlamaParse..." });

      const parseStart = performance.now();
      const { data: parseResult, error: parseError } = await supabase.functions.invoke(
        "parse-pdf-llamaparse",
        { body: { storagePath, sourceId } }
      );

      timeMsByStage.llamaparse = Math.round(performance.now() - parseStart);
      Object.assign(timeMsByStage, parseResult?.timeMsByStage ?? {});

      if (parseError || parseResult?.error) {
        const message = parseError?.message || parseResult?.error || "LlamaParse failed";
        errorStage = parseResult?.stage || (message.toLowerCase().includes("timeout") ? "timeout" : "llamaparse");
        statsSnapshot = buildClientStats(parseResult?.pages ?? [], {
          ocrAttempted: true,
          ocrSucceeded: false,
          timeMsByStage,
        });
        throw new Error(message);
      }

      statsSnapshot = buildClientStats(parseResult?.pages ?? [], {
        ocrAttempted: true,
        ocrSucceeded: true,
        timeMsByStage,
      });

      setProgress({ stage: "indexing", progress: 60, message: "Building index..." });

      const indexStart = performance.now();
      const { data: indexResult, error: indexError } = await supabase.functions.invoke(
        "index-rules-source",
        { body: { sourceId, clientStats: statsSnapshot, clientTimings: timeMsByStage } }
      );
      timeMsByStage.indexing = Math.round(performance.now() - indexStart);

      if (indexError) {
        errorStage = "indexing";
        throw indexError;
      }
      if (indexResult.error) {
        errorStage = "indexing";
        throw new Error(indexResult.error);
      }

      setProgress({ stage: "complete", progress: 100, message: "Complete!" });
      queryClient.invalidateQueries({ queryKey: ["rules_sources", campaignId] });

      return { success: true, stats: indexResult.stats };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const stage = errorStage || "llamaparse";
      setProgress({ stage: "failed", progress: 0, message });
      
      await updateSourceIndexingState(sourceId, {
        index_status: "failed",
        index_error: { stage, message },
        index_stats: statsSnapshot ? { ...statsSnapshot, timeMsByStage } : null,
      });
      queryClient.invalidateQueries({ queryKey: ["rules_sources", campaignId] });

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
    const timeMsByStage: Record<string, number> = {};
    let errorStage: string | undefined;
    let statsSnapshot: IndexStats | null = null;

    try {
      await updateSourceIndexingState(sourceId, {
        index_status: "indexing",
        index_error: null,
      });

      setProgress({ stage: "fetching", progress: 10, message: "Fetching from GitHub..." });

      const fetchStart = performance.now();
      // Fetch JSON from GitHub via edge function
      const { data: fetchResult, error: fetchError } = await supabase.functions.invoke(
        "fetch-rules-repo",
        { body: { repoUrl, jsonPath } }
      );
      timeMsByStage.github_fetch = Math.round(performance.now() - fetchStart);

      if (fetchError || fetchResult?.error) {
        const message = fetchError?.message || fetchResult?.error || "Failed to fetch GitHub JSON";
        errorStage = "github_fetch";
        statsSnapshot = buildClientStats([], { timeMsByStage });
        throw new Error(message);
      }

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

      const indexStart = performance.now();
      const { data: indexResult, error: indexError } = await supabase.functions.invoke(
        "index-rules-source",
        { body: { sourceId, githubData: rulesJson, clientTimings: timeMsByStage } }
      );
      timeMsByStage.indexing = Math.round(performance.now() - indexStart);

      if (indexError) {
        errorStage = "indexing";
        throw indexError;
      }
      if (indexResult.error) {
        errorStage = "indexing";
        throw new Error(indexResult.error);
      }

      setProgress({ stage: "complete", progress: 100, message: "Complete!" });

      queryClient.invalidateQueries({ queryKey: ["rules_sources", campaignId] });

      return {
        success: true,
        stats: indexResult.stats,
      };

    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const stage = errorStage || "github_fetch";
      setProgress({ stage: "failed", progress: 0, message });

      await updateSourceIndexingState(sourceId, {
        index_status: "failed",
        index_error: { stage, message },
        index_stats: statsSnapshot ? { ...statsSnapshot, timeMsByStage } : null,
      });
      queryClient.invalidateQueries({ queryKey: ["rules_sources", campaignId] });

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
