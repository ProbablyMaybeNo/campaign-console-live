import * as React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { cn } from "@/lib/utils";

/**
 * Standardized async state components for loading, empty, and error states.
 * These ensure consistent UX across all data-loading widgets.
 */

interface LoadingStateProps {
  /** Optional text to show while loading */
  text?: string;
  /** Number of skeleton rows to show */
  rows?: number;
  /** Additional CSS classes */
  className?: string;
}

export function LoadingState({ text = "Loading...", rows = 3, className }: LoadingStateProps) {
  return (
    <div className={cn("space-y-3 p-4", className)}>
      <p className="text-xs text-muted-foreground font-mono animate-pulse">{text}</p>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full bg-muted/30" />
      ))}
    </div>
  );
}

interface EmptyStateProps {
  /** Icon to display (defaults to none) */
  icon?: React.ReactNode;
  /** Title text */
  title: string;
  /** Optional description */
  description?: string;
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Additional CSS classes */
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-8 px-4 text-center", className)}>
      {icon && <div className="mb-3 text-muted-foreground/50">{icon}</div>}
      <p className="text-sm font-mono text-muted-foreground">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground/70 mt-1 max-w-[200px]">{description}</p>
      )}
      {action && (
        <TerminalButton
          variant="outline"
          size="sm"
          onClick={action.onClick}
          className="mt-4"
        >
          {action.label}
        </TerminalButton>
      )}
    </div>
  );
}

interface ErrorStateProps {
  /** Error message to display */
  message?: string;
  /** Retry callback */
  onRetry?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export function ErrorState({ 
  message = "Failed to load data", 
  onRetry, 
  className 
}: ErrorStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-8 px-4 text-center", className)}>
      <AlertCircle className="w-8 h-8 text-destructive mb-3" />
      <p className="text-sm font-mono text-destructive">{message}</p>
      {onRetry && (
        <TerminalButton
          variant="destructive"
          size="sm"
          onClick={onRetry}
          className="mt-4"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Retry
        </TerminalButton>
      )}
    </div>
  );
}
