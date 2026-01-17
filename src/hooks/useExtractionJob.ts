import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
