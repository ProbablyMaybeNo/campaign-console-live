import * as React from "react";
import { Check, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * SaveIndicator - Shows save status feedback (Saving, Saved, Failed)
 * Designed to be placed in canvas controls or as a floating indicator.
 */

export type SaveStatus = "idle" | "saving" | "saved" | "failed";

interface SaveIndicatorProps {
  status: SaveStatus;
  className?: string;
  /** Called when user clicks retry on failed state */
  onRetry?: () => void;
}

export function SaveIndicator({ status, className, onRetry }: SaveIndicatorProps) {
  if (status === "idle") return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 text-xs font-mono rounded transition-all duration-200",
        status === "saving" && "text-muted-foreground bg-muted/30",
        status === "saved" && "text-primary bg-primary/10",
        status === "failed" && "text-destructive bg-destructive/10 cursor-pointer hover:bg-destructive/20",
        className
      )}
      onClick={status === "failed" ? onRetry : undefined}
      role={status === "failed" ? "button" : undefined}
      tabIndex={status === "failed" ? 0 : undefined}
      onKeyDown={(e) => {
        if (status === "failed" && (e.key === "Enter" || e.key === " ")) {
          onRetry?.();
        }
      }}
    >
      {status === "saving" && (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Saving...</span>
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="w-3 h-3" />
          <span>Saved</span>
        </>
      )}
      {status === "failed" && (
        <>
          <AlertCircle className="w-3 h-3" />
          <span>Failed - Click to retry</span>
        </>
      )}
    </div>
  );
}
