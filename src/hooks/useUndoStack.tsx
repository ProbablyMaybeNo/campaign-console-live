import { createContext, useContext, useCallback, useRef, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

interface UndoEntry {
  label: string;
  undo: () => void | Promise<void>;
}

interface UndoStackContextValue {
  pushUndo: (entry: UndoEntry) => void;
  undo: () => void;
  canUndo: boolean;
}

const UndoStackContext = createContext<UndoStackContextValue | null>(null);

const MAX_UNDO = 10;

export function UndoStackProvider({ children }: { children: ReactNode }) {
  const stackRef = useRef<UndoEntry[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  const pushUndo = useCallback((entry: UndoEntry) => {
    stackRef.current.push(entry);
    if (stackRef.current.length > MAX_UNDO) {
      stackRef.current.shift();
    }
    setCanUndo(true);
  }, []);

  const undo = useCallback(async () => {
    const entry = stackRef.current.pop();
    if (!entry) return;
    try {
      await entry.undo();
      toast.info(`Undo: ${entry.label}`);
    } catch {
      toast.error("Undo failed");
    }
    setCanUndo(stackRef.current.length > 0);
  }, []);

  // Global Ctrl+Z listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        // Don't intercept when focused in editable fields
        const active = document.activeElement;
        if (
          active instanceof HTMLTextAreaElement ||
          active instanceof HTMLInputElement ||
          (active instanceof HTMLElement && active.isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo]);

  return (
    <UndoStackContext.Provider value={{ pushUndo, undo, canUndo }}>
      {children}
    </UndoStackContext.Provider>
  );
}

export function useUndoStack() {
  const ctx = useContext(UndoStackContext);
  // Return a no-op version if used outside provider (safe fallback)
  if (!ctx) {
    return {
      pushUndo: () => {},
      undo: () => {},
      canUndo: false,
    };
  }
  return ctx;
}
