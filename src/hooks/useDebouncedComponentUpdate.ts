import { useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardComponent, UpdateComponentInput } from "./useDashboardComponents";

const DEBOUNCE_MS = 400;

/**
 * Hook that provides debounced component updates with optimistic UI.
 * Updates are batched and sent to the database after a delay,
 * while the UI updates immediately.
 */
export function useDebouncedComponentUpdate(campaignId: string) {
  const queryClient = useQueryClient();
  const pendingUpdates = useRef<Map<string, UpdateComponentInput>>(new Map());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const flushUpdates = useCallback(async () => {
    const updates = Array.from(pendingUpdates.current.values());
    pendingUpdates.current.clear();

    if (updates.length === 0) return;

    // Execute all updates in parallel
    const promises = updates.map(async (input) => {
      const { id, ...changes } = input;
      const { error } = await supabase
        .from("dashboard_components")
        .update(changes)
        .eq("id", id);

      if (error) {
        console.error("Failed to update component:", error);
        // Rollback on error - invalidate to refetch from server
        queryClient.invalidateQueries({ queryKey: ["dashboard-components", campaignId] });
      }
    });

    await Promise.all(promises);
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

  return { update, flushNow };
}
