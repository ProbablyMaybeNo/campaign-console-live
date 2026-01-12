import * as React from "react";
import { cn } from "@/lib/utils";

interface TerminalCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  headerActions?: React.ReactNode;
  noPadding?: boolean;
}

const TerminalCard = React.forwardRef<HTMLDivElement, TerminalCardProps>(
  ({ className, title, headerActions, noPadding, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-card border border-primary/20 relative overflow-hidden",
          "shadow-[inset_0_0_30px_rgba(0,0,0,0.5)]",
          className
        )}
        {...props}
      >
        {/* Subtle corner accents */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary/50" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary/50" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-primary/50" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-primary/50" />

        {title && (
          <div className="flex items-center justify-between px-4 py-2 border-b border-primary/20 bg-background/50">
            <h3 className="text-xs uppercase tracking-widest text-primary font-medium">
              [{title}]
            </h3>
            {headerActions && (
              <div className="flex items-center gap-2">{headerActions}</div>
            )}
          </div>
        )}
        <div className={cn(!noPadding && "p-4")}>{children}</div>
      </div>
    );
  }
);
TerminalCard.displayName = "TerminalCard";

export { TerminalCard };
