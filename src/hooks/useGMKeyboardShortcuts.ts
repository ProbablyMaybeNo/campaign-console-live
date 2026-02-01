import { useEffect, useCallback } from "react";

interface UseGMKeyboardShortcutsOptions {
  isGM: boolean;
  onOpenCommandPalette: () => void;
  onShowShortcuts: () => void;
  onDeleteSelected?: () => void;
}

export function useGMKeyboardShortcuts({
  isGM,
  onOpenCommandPalette,
  onShowShortcuts,
  onDeleteSelected,
}: UseGMKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isGM) return;

    // Don't trigger shortcuts when typing in inputs
    const target = e.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    ) {
      return;
    }

    // Ctrl/Cmd + K: Command palette
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      onOpenCommandPalette();
      return;
    }

    // Shift + ?: Show shortcuts help
    if (e.shiftKey && e.key === "?") {
      e.preventDefault();
      onShowShortcuts();
      return;
    }

    // Delete or Backspace: Delete selected component
    if ((e.key === "Delete" || e.key === "Backspace") && onDeleteSelected) {
      e.preventDefault();
      onDeleteSelected();
      return;
    }
  }, [isGM, onOpenCommandPalette, onShowShortcuts, onDeleteSelected]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
