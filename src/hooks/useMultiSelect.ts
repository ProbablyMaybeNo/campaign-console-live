import { useState, useCallback } from "react";
import { DashboardComponent } from "@/hooks/useDashboardComponents";

export interface UseMultiSelectReturn {
  selectedIds: Set<string>;
  isSelected: (id: string) => boolean;
  toggleSelect: (id: string, shiftKey: boolean) => void;
  selectAll: (components: DashboardComponent[]) => void;
  clearSelection: () => void;
  selectRange: (components: DashboardComponent[], targetId: string) => void;
  selectByIds: (ids: string[]) => void;
}

export function useMultiSelect(): UseMultiSelectReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  const isSelected = useCallback((id: string) => {
    return selectedIds.has(id);
  }, [selectedIds]);

  const toggleSelect = useCallback((id: string, shiftKey: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      
      if (shiftKey && next.has(id)) {
        // Shift+click on selected item - deselect it
        next.delete(id);
      } else if (shiftKey) {
        // Shift+click on unselected item - add to selection
        next.add(id);
      } else {
        // Regular click - single select
        next.clear();
        next.add(id);
      }
      
      return next;
    });
    setLastSelectedId(id);
  }, []);

  const selectAll = useCallback((components: DashboardComponent[]) => {
    setSelectedIds(new Set(components.map((c) => c.id)));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setLastSelectedId(null);
  }, []);

  const selectRange = useCallback((components: DashboardComponent[], targetId: string) => {
    if (!lastSelectedId) {
      setSelectedIds(new Set([targetId]));
      setLastSelectedId(targetId);
      return;
    }

    const lastIndex = components.findIndex((c) => c.id === lastSelectedId);
    const targetIndex = components.findIndex((c) => c.id === targetId);

    if (lastIndex === -1 || targetIndex === -1) {
      setSelectedIds(new Set([targetId]));
      setLastSelectedId(targetId);
      return;
    }

    const start = Math.min(lastIndex, targetIndex);
    const end = Math.max(lastIndex, targetIndex);

    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (let i = start; i <= end; i++) {
        next.add(components[i].id);
      }
      return next;
    });
  }, [lastSelectedId]);

  const selectByIds = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  return {
    selectedIds,
    isSelected,
    toggleSelect,
    selectAll,
    clearSelection,
    selectRange,
    selectByIds,
  };
}
