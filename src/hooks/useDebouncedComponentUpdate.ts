import { useRef, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardComponent, UpdateComponentInput } from "./useDashboardComponents";
import type { SaveStatus } from "@/components/ui/SaveIndicator";

const DEBOUNCE_MS = 400;
const SAVED_DISPLAY_MS = 2000;

/**
 * Hook that provides debounced component updates with optimistic UI and save status.
 * Updates are batched and sent to the database after a delay,
 * while the UI updates immediately.
 */
export function useDebouncedComponentUpdate(campaignId: string) {
  const queryClient = useQueryClient();
  const pendingUpdates = useRef<Map<string, UpdateComponentInput>>(new Map());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const flushUpdates = useCallback(async () => {
    const updates = Array.from(pendingUpdates.current.values());
    pendingUpdates.current.clear();

    if (updates.length === 0) return;

    setSaveStatus("saving");

    // Execute all updates in parallel
    const results = await Promise.all(
      updates.map(async (input) => {
        const { id, ...changes } = input;
        const { error } = await supabase
          .from("dashboard_components")
          .update(changes)
          .eq("id", id);

        return { id, error };
      })
    );

    const hasError = results.some((r) => r.error);

    if (hasError) {
      console.error("Failed to update components:", results.filter((r) => r.error));
      setSaveStatus("failed");
      // Rollback on error - invalidate to refetch from server
      queryClient.invalidateQueries({ queryKey: ["dashboard-components", campaignId] });
    } else {
      setSaveStatus("saved");
      // Clear saved status after display duration
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }
      savedTimeoutRef.current = setTimeout(() => {
        setSaveStatus("idle");
      }, SAVED_DISPLAY_MS);
    }
  }, [campaignId, queryClient]);

  const update = useCallback(
    (input: UpdateComponentInput) => {
      const componentId = input.id;

      // Merge with any pending updates for this component
      const existing = pendingUpdates.current.get(componentId) || { id: componentId };
      pendingUpdates.current.set(componentId, { ...existing, ...input });

      // Optimistically update the cache immediately
      queryClient.setQueryData<DashboardComponent[]>(
        ["dashboard-components", campaignId],
        (old) => {
          if (!old) return old;
          return old.map((c) =>
            c.id === componentId ? { ...c, ...input } : c
          );
        }
      );

      // Debounce the actual database write
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        flushUpdates();
      }, DEBOUNCE_MS);
    },
    [campaignId, queryClient, flushUpdates]
  );

  // Flush immediately (useful for final updates on drag/resize end)
  const flushNow = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    flushUpdates();
  }, [flushUpdates]);

  // Retry failed saves
  const retry = useCallback(() => {
    setSaveStatus("idle");
    flushUpdates();
  }, [flushUpdates]);

  return { update, flushNow, saveStatus, retry };
}
