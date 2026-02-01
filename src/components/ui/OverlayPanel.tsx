import { useEffect, useCallback, ReactNode } from "react";
import { X, AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TerminalButton } from "./TerminalButton";
import { cn } from "@/lib/utils";

interface OverlayPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** Width preset: 'sm' (400px), 'md' (600px), 'lg' (800px), 'xl' (1000px), 'full' */
  size?: "sm" | "md" | "lg" | "xl" | "full";
  /** If true, shows confirmation before closing when there are unsaved changes */
  hasUnsavedChanges?: boolean;
}

interface OverlayLoadingProps {
  text?: string;
}

interface OverlayEmptyProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

interface OverlayErrorProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  details?: string;
}

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
  full: "max-w-[95vw]",
};

/**
 * Standardized overlay panel component with consistent behavior:
 * - Header with title, subtitle, close button
 * - Scrollable body
 * - Optional footer with CTAs
 * - Backdrop click to close
 * - Escape key to close (handled by useOverlayState)
 * - Unsaved changes confirmation
 */
export function OverlayPanel({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  className,
  size = "lg",
  hasUnsavedChanges = false,
}: OverlayPanelProps) {
  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      if (window.confirm("You have unsaved changes. Are you sure you want to close?")) {
        onClose();
      }
    } else {
      onClose();
    }
  }, [onClose, hasUnsavedChanges]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

  // Lock body scroll when overlay is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 pb-4"
          onClick={handleBackdropClick}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
              "relative w-full bg-card border border-primary/50 shadow-[0_0_30px_hsl(var(--primary)/0.15)] flex flex-col max-h-[80vh]",
              sizeClasses[size],
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-4 border-b border-primary/30 shrink-0">
              <div className="flex items-start gap-3">
                {icon && (
                  <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                    {icon}
                  </div>
                )}
                <div>
                  <h2 className="text-sm font-mono uppercase tracking-widest text-primary font-medium text-glow-primary">
                    {title}
                  </h2>
                  {subtitle && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
                aria-label="Close overlay"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="p-4 border-t border-primary/30 shrink-0 bg-muted/20">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Loading state for overlay content
 */
export function OverlayLoading({ text = "Loading" }: OverlayLoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
      <span className="text-sm text-muted-foreground font-mono uppercase tracking-wider">
        {text}...
      </span>
    </div>
  );
}

/**
 * Empty state for overlay content
 */
export function OverlayEmpty({ icon, title, description, action }: OverlayEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && (
        <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4 text-muted-foreground/50">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-mono uppercase tracking-wider text-foreground mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-muted-foreground max-w-sm mb-4">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

/**
 * Error state for overlay content
 */
export function OverlayError({ title = "Error", message, onRetry, details }: OverlayErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <AlertCircle className="w-6 h-6 text-destructive" />
      </div>
      <h3 className="text-sm font-mono uppercase tracking-wider text-destructive mb-1">
        {title}
      </h3>
      <p className="text-xs text-muted-foreground max-w-sm mb-4">
        {message}
      </p>
      {details && (
        <pre className="text-[10px] bg-muted/30 p-2 rounded mb-4 max-w-full overflow-x-auto text-muted-foreground">
          {details}
        </pre>
      )}
      {onRetry && (
        <TerminalButton size="sm" variant="outline" onClick={onRetry}>
          <RefreshCw className="w-3 h-3 mr-1" />
          Retry
        </TerminalButton>
      )}
    </div>
  );
}
