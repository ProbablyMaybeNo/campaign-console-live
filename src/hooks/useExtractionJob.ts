import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface DetectedSection {
  id: string;
  name: string;
  type: "table" | "rules" | "equipment" | "skills" | "other";
  priority: "high" | "medium" | "low";
  estimatedComplexity: number;
  startPosition: number;
  endPosition: number;
  indicators: string[];
  selected?: boolean;
  status?: "pending" | "extracting" | "complete" | "failed";
  extractedCount?: number;
}

export interface ExtractionJob {
  id: string;
  campaignId: string;
  status: "pending" | "scanning" | "extracting" | "complete" | "failed";
  totalSections: number;
  completedSections: number;
  detectedSections: DetectedSection[];
  sourceName?: string;
  errorMessage?: string;
}

export interface ExtractedRule {
  category: string;
  rule_key: string;
  title: string;
  content: RuleContent;
  metadata?: Record<string, unknown>;
  validation_status?: string;
}

type RuleContent = 
  | { type: "text"; text: string }
  | { type: "list"; items: string[] }
  | { type: "roll_table"; dice: string; entries: Array<{ roll: string; result: string }> }
  | { type: "stats_table"; columns: string[]; rows: Array<Record<string, string>> }
  | { type: "equipment"; items: Array<{ name: string; cost?: string; stats?: string; effect?: string }> };

/**
 * Hook to analyze document structure before extraction
 */
export function useAnalyzeDocument() {
  return useMutation({
    mutationFn: async ({ content }: { content: string }): Promise<DetectedSection[]> => {
      const { data, error } = await supabase.functions.invoke("analyze-document", {
        body: { content },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed to analyze document");

      return data.sections || [];
    },
    onError: (error: Error) => {
      toast.error(`Document analysis failed: ${error.message}`);
    },
  });
}

/**
 * Hook to extract rules in preview mode (without saving)
 */
export function usePreviewExtraction() {
  return useMutation({
    mutationFn: async ({ 
      content, 
      campaignId,
      sections,
      sourceType,
      sourceName 
    }: { 
      content: string;
      campaignId: string;
      sections: DetectedSection[];
      sourceType: "pdf" | "text";
      sourceName?: string;
    }): Promise<{ rules: ExtractedRule[]; summary: { totalRules: number; categories: Record<string, number> } }> => {
      const allRules: ExtractedRule[] = [];
      const allCategories: Record<string, number> = {};

      // Process sections in batches of 2 for preview
      for (let i = 0; i < sections.length; i += 2) {
        const batch = sections.slice(i, i + 2);
        const results = await Promise.allSettled(
          batch.map(async (section) => {
            const { data, error } = await supabase.functions.invoke("extract-rules", {
              body: {
                content,
                sourceType,
                sourceName,
                campaignId,
                focusedSection: { 
                  name: section.name, 
                  type: section.type, 
                  startPosition: section.startPosition, 
                  endPosition: section.endPosition 
                },
                previewMode: true,
              },
            });

            if (error) throw error;
            if (!data.success) throw new Error(data.error || "Extraction failed");
            
            return data.rules as ExtractedRule[];
          })
        );

        results.forEach((result) => {
          if (result.status === "fulfilled" && result.value) {
            allRules.push(...result.value);
            result.value.forEach(rule => {
              allCategories[rule.category] = (allCategories[rule.category] || 0) + 1;
            });
          }
        });
      }

      return {
        rules: allRules,
        summary: { totalRules: allRules.length, categories: allCategories }
      };
    },
    onError: (error: Error) => {
      toast.error(`Preview extraction failed: ${error.message}`);
    },
  });
}

/**
 * Hook to save previewed rules to the database
 */
export function useSavePreviewedRules(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      rules,
      sourceType,
      sourceName 
    }: { 
      rules: ExtractedRule[];
      sourceType: "pdf" | "text";
      sourceName?: string;
    }) => {
      const dbRules = rules.map((rule) => ({
        campaign_id: campaignId,
        category: rule.category,
        rule_key: rule.rule_key,
        title: rule.title,
        content: rule.content as Json,
        metadata: {
          source_type: sourceType,
          source_name: sourceName || "Unknown",
          saved_at: new Date().toISOString(),
          ...rule.metadata
        } as Json,
        validation_status: rule.validation_status || "complete",
      }));

      const { data, error } = await supabase
        .from("wargame_rules")
        .insert(dbRules)
        .select("id, category, title");

      if (error) throw error;

      return { saved: data?.length || 0 };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["wargame_rules", campaignId] });
      toast.success(`Saved ${result.saved} rules to campaign`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to save rules: ${error.message}`);
    },
  });
}

export function useExtractionJob(campaignId: string) {
  const queryClient = useQueryClient();
  const [job, setJob] = useState<ExtractionJob | null>(null);

  const createJob = useCallback(async (sections: DetectedSection[], sourceName?: string): Promise<string> => {
    const { data, error } = await supabase
      .from("extraction_jobs")
      .insert({
        campaign_id: campaignId,
        status: "pending",
        total_sections: sections.length,
        completed_sections: 0,
        detected_sections: JSON.parse(JSON.stringify(sections)) as Json,
        source_name: sourceName || null,
      })
      .select("id")
      .single();

    if (error) throw error;

    setJob({
      id: data.id,
      campaignId,
      status: "pending",
      totalSections: sections.length,
      completedSections: 0,
      detectedSections: sections,
      sourceName,
    });

    return data.id;
  }, [campaignId]);

  const updateJobStatus = useCallback(async (
    jobId: string,
    status: ExtractionJob["status"],
    completedSections?: number
  ) => {
    const updates: Record<string, unknown> = { status };
    if (completedSections !== undefined) updates.completed_sections = completedSections;

    await supabase.from("extraction_jobs").update(updates).eq("id", jobId);
    setJob(prev => prev ? { ...prev, status, completedSections: completedSections ?? prev.completedSections } : null);
  }, []);

  const extractSection = useCallback(async (
    content: string,
    section: DetectedSection,
    jobId: string,
    sourceType: "pdf" | "text",
    sourceName?: string
  ) => {
    setJob(prev => prev ? {
      ...prev,
      detectedSections: prev.detectedSections.map(s =>
        s.id === section.id ? { ...s, status: "extracting" as const } : s
      ),
    } : null);

    const { data, error } = await supabase.functions.invoke("extract-rules", {
      body: {
        content,
        sourceType,
        sourceName,
        campaignId,
        focusedSection: { name: section.name, type: section.type, startPosition: section.startPosition, endPosition: section.endPosition },
        extractionJobId: jobId,
      },
    });

    if (error) throw new Error(error.message);
    if (!data.success) throw new Error(data.error || "Extraction failed");

    setJob(prev => prev ? {
      ...prev,
      completedSections: prev.completedSections + 1,
      detectedSections: prev.detectedSections.map(s =>
        s.id === section.id ? { ...s, status: "complete" as const, extractedCount: data.saved } : s
      ),
    } : null);

    return data;
  }, [campaignId]);

  const runParallelExtraction = useCallback(async (
    content: string,
    selectedSections: DetectedSection[],
    sourceType: "pdf" | "text",
    sourceName?: string
  ) => {
    if (selectedSections.length === 0) {
      toast.error("No sections selected");
      return null;
    }

    const jobId = await createJob(selectedSections, sourceName);
    await updateJobStatus(jobId, "extracting");

    const results: { section: string; saved: number; categories: Record<string, number> }[] = [];

    for (let i = 0; i < selectedSections.length; i += 3) {
      const batch = selectedSections.slice(i, i + 3);
      const batchResults = await Promise.allSettled(
        batch.map(section => extractSection(content, section, jobId, sourceType, sourceName))
      );

      batchResults.forEach((result, j) => {
        if (result.status === "fulfilled" && result.value) {
          results.push({ section: batch[j].name, saved: result.value.saved, categories: result.value.summary?.categories || {} });
        }
      });
    }

    await updateJobStatus(jobId, "complete", selectedSections.length);
    queryClient.invalidateQueries({ queryKey: ["wargame_rules", campaignId] });

    const totalSaved = results.reduce((sum, r) => sum + r.saved, 0);
    const allCategories = results.reduce((acc, r) => {
      Object.entries(r.categories).forEach(([cat, count]) => { acc[cat] = (acc[cat] || 0) + count; });
      return acc;
    }, {} as Record<string, number>);

    return { totalSaved, categories: allCategories, sectionResults: results };
  }, [createJob, updateJobStatus, extractSection, queryClient, campaignId]);

  return { job, runParallelExtraction, reset: () => setJob(null) };
}
