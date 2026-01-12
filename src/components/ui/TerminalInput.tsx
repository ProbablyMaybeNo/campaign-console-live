import * as React from "react";
import { cn } from "@/lib/utils";

export interface TerminalInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const TerminalInput = React.forwardRef<HTMLInputElement, TerminalInputProps>(
  ({ className, type, label, error, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            {label}
          </label>
        )}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary opacity-60">
            {">"}_
          </span>
          <input
            type={type}
            className={cn(
              "flex h-10 w-full bg-input border border-border pl-10 pr-3 py-2 text-sm font-mono",
              "placeholder:text-muted-foreground/50",
              "focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "transition-all duration-200",
              error && "border-destructive focus:border-destructive focus:ring-destructive/30",
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs text-destructive font-mono">[ERROR] {error}</p>
        )}
      </div>
    );
  }
);
TerminalInput.displayName = "TerminalInput";

export { TerminalInput };
