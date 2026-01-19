import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { extractPdfTextEnhanced, getExtractionStats, removeHeadersFooters, shouldFlagScannedPdf } from "@/lib/pdfExtractor";
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
      const markStage = (stage: string, start: number) => {
        timeMsByStage[stage] = Math.round(performance.now() - start);
      };

      setProgress({ stage: "extracting", progress: 0, message: "Downloading PDF..." });

      const downloadStart = performance.now();
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

      const cleanedStats = buildClientStats(cleanedPages);
      if (shouldFlagScannedPdf(cleanedPages)) {
        setProgress({ stage: "extracting", progress: 55, message: "Scanned PDF detected. Trying OCR..." });

        const fallbackStart = performance.now();
        const { data: parseResult, error: parseError } = await supabase.functions.invoke(
          "parse-pdf-llamaparse",
          { body: { storagePath, sourceId } }
        );
        markStage("llamaParse", fallbackStart);

        if (parseError || parseResult?.error) {
          const message = parseError?.message || parseResult?.error || "Scanned PDF detected. Use OCR / alternate method.";
          setProgress({ stage: "failed", progress: 0, message });
          await supabase.from("rules_sources").update({
            index_status: "failed",
            index_error: { stage: "llamaparse", message },
            index_stats: {
              ...cleanedStats,
              sections: 0,
              chunks: 0,
              tablesHigh: 0,
              tablesLow: 0,
              datasets: 0,
              timeMsByStage,
            },
          }).eq("id", sourceId);

          return { success: false, error: message };
        }

        const parsedPages: PageLike[] = (parseResult?.pages ?? []).map((page: PageLike) => ({
          pageNumber: page.pageNumber,
          text: page.text,
          charCount: page.charCount,
        }));
        const parsedStats = buildClientStats(parsedPages);

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

      if (progress?.stage !== "indexing") {
        await supabase.from("rules_sources").update({
          index_status: "failed",
          index_error: { stage: "extraction", message },
        }).eq("id", sourceId);
      }

      return { success: false, error: message };
    }
  }, [debugEnabled, progress, queryClient]);

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
      const timeMsByStage: Record<string, number> = {};

      setProgress({ stage: "extracting", progress: 10, message: "Sending to LlamaParse..." });

      const parseStart = performance.now();
      const { data: parseResult, error: parseError } = await supabase.functions.invoke(
        "parse-pdf-llamaparse",
        { body: { storagePath, sourceId } }
      );
      timeMsByStage.llamaParse = Math.round(performance.now() - parseStart);

      if (parseError) throw parseError;
      if (parseResult?.error) throw new Error(parseResult.error);

      const parsedPages: PageLike[] = (parseResult?.pages ?? []).map((p: any) => ({
        pageNumber: p.pageNumber,
        text: p.text ?? "",
        charCount: typeof p.charCount === "number" ? p.charCount : (p.text ?? "").length,
      }));

      if (!parsedPages.length) {
        throw new Error(
          "No pages were produced from the PDF. Try Advanced PDF Parsing again or upload a different PDF."
        );
      }

      const clientStats = buildClientStats(parsedPages);

      setProgress({ stage: "indexing", progress: 60, message: "Building index..." });

      const indexStart = performance.now();
      const { data: indexResult, error: indexError } = await supabase.functions.invoke(
        "index-rules-source",
        {
          body: {
            sourceId,
            clientStats,
            clientTimings: timeMsByStage,
          },
        }
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
