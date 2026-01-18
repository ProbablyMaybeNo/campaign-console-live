import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { extractTextFromPDF, isValidPDF } from "@/lib/pdfExtractor";
import { cleanText, removeRepeatedHeadersFooters } from "@/lib/indexer/textCleaner";
import { createChunks, extractSections } from "@/lib/indexer/chunker";
import { detectTables } from "@/lib/indexer/tableDetector";
import type { RulesSource, RulesPage, RulesSection, RulesChunk, RulesTable } from "@/types/rulesV2";

interface IndexingProgress {
  stage: string;
  current: number;
  total: number;
  percentage: number;
}

interface UseRulesIndexerReturn {
  indexSource: (source: RulesSource, pdfFile?: File) => Promise<void>;
  isIndexing: boolean;
  currentSourceId: string | null;
  progress: IndexingProgress | null;
  error: string | null;
}

export function useRulesIndexer(campaignId: string): UseRulesIndexerReturn {
  const [isIndexing, setIsIndexing] = useState(false);
  const [currentSourceId, setCurrentSourceId] = useState<string | null>(null);
  const [progress, setProgress] = useState<IndexingProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const updateProgress = useCallback((stage: string, current: number, total: number) => {
    setProgress({
      stage,
      current,
      total,
      percentage: Math.round((current / total) * 100),
    });
  }, []);

  const updateSourceStatus = useCallback(async (
    sourceId: string, 
    status: string, 
    stats?: Record<string, number>,
    indexError?: { stage: string; message: string }
  ) => {
    const updateData: Record<string, unknown> = {
      index_status: status,
      updated_at: new Date().toISOString(),
    };

    if (stats) {
      updateData.index_stats = stats;
      updateData.last_indexed_at = new Date().toISOString();
    }

    if (indexError) {
      updateData.index_error = indexError;
    }

    await supabase
      .from("rules_sources")
      .update(updateData)
      .eq("id", sourceId);

    queryClient.invalidateQueries({ queryKey: ["rules_sources", campaignId] });
  }, [campaignId, queryClient]);

  const indexSource = useCallback(async (source: RulesSource, pdfFile?: File) => {
    setIsIndexing(true);
    setCurrentSourceId(source.id);
    setError(null);
    setProgress({ stage: "Preparing", current: 0, total: 1, percentage: 0 });

    try {
      await updateSourceStatus(source.id, "indexing");

      // Step 1: Get raw text based on source type
      let pages: string[] = [];
      
      if (source.type === "pdf") {
        if (pdfFile && isValidPDF(pdfFile)) {
          updateProgress("Extracting PDF", 0, 1);
          const result = await extractTextFromPDF(pdfFile, (p) => {
            updateProgress("Extracting PDF", p.currentPage, p.totalPages);
          });
          // Split by double newlines to get pages
          pages = result.text.split("\n\n").filter(p => p.trim().length > 0);
        } else {
          // Try to get text from storage if already uploaded
          const { data: existingPages } = await supabase
            .from("rules_pages")
            .select("text, page_number")
            .eq("source_id", source.id)
            .order("page_number");
          
          if (existingPages && existingPages.length > 0) {
            pages = existingPages.map(p => p.text);
          } else {
            throw new Error("PDF file required for first-time indexing");
          }
        }
      } else if (source.type === "paste") {
        // For paste, get existing pages or create from stored content
        const { data: existingPages } = await supabase
          .from("rules_pages")
          .select("text, page_number")
          .eq("source_id", source.id)
          .order("page_number");
        
        if (existingPages && existingPages.length > 0) {
          pages = existingPages.map(p => p.text);
        }
      } else if (source.type === "github_json") {
        // For GitHub, fetch and parse the JSON
        updateProgress("Fetching repository", 0, 1);
        const { data, error: fnError } = await supabase.functions.invoke("fetch-rules-repo", {
          body: { 
            repoUrl: source.github_repo_url, 
            jsonPath: source.github_json_path,
            action: "fetch" 
          }
        });

        if (fnError || !data.success) {
          throw new Error(data?.error || "Failed to fetch repository data");
        }

        // Convert JSON structure to pages
        pages = convertJsonToPages(data.content);
      }

      if (pages.length === 0) {
        throw new Error("No content found to index");
      }

      // Step 2: Clean text and remove headers/footers
      updateProgress("Cleaning text", 0, pages.length);
      const cleanedPages = removeRepeatedHeadersFooters(
        pages.map((p, i) => {
          updateProgress("Cleaning text", i + 1, pages.length);
          return cleanText(p);
        })
      );

      // Step 3: Save canonical pages
      updateProgress("Saving pages", 0, cleanedPages.length);
      
      // Delete existing pages first
      await supabase.from("rules_pages").delete().eq("source_id", source.id);
      
      const pageRecords: Partial<RulesPage>[] = cleanedPages.map((text, idx) => ({
        source_id: source.id,
        page_number: idx + 1,
        text,
        char_count: text.length,
      }));

      for (let i = 0; i < pageRecords.length; i += 50) {
        const batch = pageRecords.slice(i, i + 50);
        await supabase.from("rules_pages").insert(batch as RulesPage[]);
        updateProgress("Saving pages", Math.min(i + 50, pageRecords.length), cleanedPages.length);
      }

      // Step 4: Detect sections
      updateProgress("Detecting sections", 0, 1);
      const detectedSections = extractSections(
        cleanedPages.map((text, idx) => ({ text, pageNumber: idx + 1 })),
        source.id
      );

      // Delete existing sections and save new ones
      await supabase.from("rules_sections").delete().eq("source_id", source.id);
      
      if (detectedSections.length > 0) {
        await supabase
          .from("rules_sections")
          .insert(detectedSections as RulesSection[])
          .select("id, title");
      }

      updateProgress("Detecting sections", 1, 1);

      // Step 5: Create chunks
      updateProgress("Creating chunks", 0, cleanedPages.length);
      const chunkResults = createChunks(
        cleanedPages.map((text, idx) => ({ text, pageNumber: idx + 1 }))
      );

      // Delete existing chunks and save new ones
      await supabase.from("rules_chunks").delete().eq("source_id", source.id);
      
      const chunkRecords = chunkResults.map((c, idx) => ({
        ...c,
        source_id: source.id,
        order_index: idx,
      }));

      for (let i = 0; i < chunkRecords.length; i += 50) {
        const batch = chunkRecords.slice(i, i + 50);
        await supabase.from("rules_chunks").insert(batch);
        updateProgress("Creating chunks", Math.min(i + 50, chunkRecords.length), chunkRecords.length);
      }

      // Step 6: Detect tables
      updateProgress("Detecting tables", 0, 1);
      const fullText = cleanedPages.join("\n\n");
      const detectedTables = detectTables(fullText, 1, source.id);

      // Delete existing tables and save new ones
      await supabase.from("rules_tables").delete().eq("source_id", source.id);
      
      if (detectedTables.length > 0) {
        await supabase.from("rules_tables").insert(detectedTables);
      }


      updateProgress("Detecting tables", 1, 1);

      // Step 7: Update source status with stats
      const stats = {
        pages: cleanedPages.length,
        sections: detectedSections.length,
        chunks: chunkResults.length,
        tablesHigh: detectedTables.filter(t => t.confidence === "high").length,
        tablesLow: detectedTables.filter(t => t.confidence !== "high").length,
        datasets: 0,
      };

      await updateSourceStatus(source.id, "indexed", stats);
      toast.success(`Indexed ${stats.pages} pages, ${stats.chunks} chunks, ${detectedTables.length} tables`);

    } catch (err) {
      console.error("Indexing error:", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      await updateSourceStatus(source.id, "failed", undefined, {
        stage: progress?.stage || "Unknown",
        message,
      });
      toast.error(`Indexing failed: ${message}`);
    } finally {
      setIsIndexing(false);
      setCurrentSourceId(null);
      setProgress(null);
    }
  }, [updateProgress, updateSourceStatus, progress?.stage]);

  return {
    indexSource,
    isIndexing,
    currentSourceId,
    progress,
    error,
  };
}

// Helper to convert JSON structure to pseudo-pages
function convertJsonToPages(content: unknown): string[] {
  const pages: string[] = [];
  
  if (Array.isArray(content)) {
    // Array of sections/rules
    for (const item of content) {
      pages.push(JSON.stringify(item, null, 2));
    }
  } else if (typeof content === "object" && content !== null) {
    // Object with categories/groups
    for (const [key, value] of Object.entries(content)) {
      pages.push(`# ${key}\n\n${JSON.stringify(value, null, 2)}`);
    }
  } else if (typeof content === "string") {
    // Plain text
    const chunks = content.match(/.{1,8000}/gs) || [];
    pages.push(...chunks);
  }
  
  return pages.length > 0 ? pages : ["No content found"];
}