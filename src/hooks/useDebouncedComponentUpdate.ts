import { useRef, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardComponent, UpdateComponentInput } from "./useDashboardComponents";
import { useUndoStack } from "@/hooks/useUndoStack";
import type { SaveStatus } from "@/components/ui/SaveIndicator";

const DEBOUNCE_MS = 400;
const SAVED_DISPLAY_MS = 2000;

/**
 * Hook that provides debounced component updates with optimistic UI, save status, and undo support.
 */
export function useDebouncedComponentUpdate(campaignId: string) {
  const queryClient = useQueryClient();
  const { pushUndo } = useUndoStack();
  const pendingUpdates = useRef<Map<string, UpdateComponentInput>>(new Map());
  const snapshotsBeforeFlush = useRef<Map<string, Partial<DashboardComponent>>>(new Map());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const flushUpdates = useCallback(async () => {
    const updates = Array.from(pendingUpdates.current.values());
    const snapshots = new Map(snapshotsBeforeFlush.current);
    pendingUpdates.current.clear();
    snapshotsBeforeFlush.current.clear();

    if (updates.length === 0) return;

    setSaveStatus("saving");

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
      queryClient.invalidateQueries({ queryKey: ["dashboard-components", campaignId] });
    } else {
      setSaveStatus("saved");
      // Push undo for the batch
      if (snapshots.size > 0) {
        const undoEntries = Array.from(snapshots.entries());
        pushUndo({
          label: `Move/resize ${undoEntries.length} widget(s)`,
          undo: async () => {
            await Promise.all(
              undoEntries.map(async ([id, prev]) => {
                const { id: _id, ...fields } = prev as any;
                await supabase.from("dashboard_components").update(fields).eq("id", id);
              })
            );
            queryClient.invalidateQueries({ queryKey: ["dashboard-components", campaignId] });
          },
        });
      }
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }
      savedTimeoutRef.current = setTimeout(() => {
        setSaveStatus("idle");
      }, SAVED_DISPLAY_MS);
    }
  }, [campaignId, queryClient, pushUndo]);

  const update = useCallback(
    (input: UpdateComponentInput) => {
      const componentId = input.id;

      // Capture snapshot of original values (only first time per flush cycle)
      if (!snapshotsBeforeFlush.current.has(componentId)) {
        const cached = queryClient.getQueryData<DashboardComponent[]>(["dashboard-components", campaignId]);
        const current = cached?.find((c) => c.id === componentId);
        if (current) {
          const snapshot: Record<string, any> = {};
          for (const key of Object.keys(input)) {
            if (key !== "id") snapshot[key] = (current as any)[key];
          }
          snapshotsBeforeFlush.current.set(componentId, snapshot as Partial<DashboardComponent>);
        }
      }

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

  const flushNow = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    flushUpdates();
  }, [flushUpdates]);

  const retry = useCallback(() => {
    setSaveStatus("idle");
    flushUpdates();
  }, [flushUpdates]);

  return { update, flushNow, saveStatus, retry };
}
