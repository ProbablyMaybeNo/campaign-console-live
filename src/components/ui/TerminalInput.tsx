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
          <label className="text-xs uppercase tracking-wider text-primary/80 font-medium">
            {label}
          </label>
        )}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary text-glow-primary opacity-80">
            {">"}_
          </span>
          <input
            type={type}
            className={cn(
              "flex h-10 w-full bg-input border border-primary/30 pl-10 pr-3 py-2 text-sm font-mono text-foreground",
              "placeholder:text-muted-foreground/60",
              "focus:outline-none focus:border-primary/70 focus:ring-1 focus:ring-primary/40 focus:shadow-[0_0_8px_hsl(var(--primary)/0.2)]",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "transition-all duration-200",
              error && "border-destructive focus:border-destructive focus:ring-destructive/40",
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
