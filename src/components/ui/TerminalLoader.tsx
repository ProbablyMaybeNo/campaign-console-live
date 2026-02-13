import * as React from "react";
import { cn } from "@/lib/utils";

interface TerminalLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  text?: string;
  size?: "sm" | "md" | "lg";
}

const TerminalLoader = React.forwardRef<HTMLDivElement, TerminalLoaderProps>(
  ({ text = "Loading", className, size = "md", ...props }, ref) => {
    const sizeClasses = {
      sm: "text-xs",
      md: "text-sm",
      lg: "text-base",
    };

    return (
      <div 
        ref={ref}
        className={cn("flex items-center gap-2 font-mono", sizeClasses[size], className)}
        {...props}
      >
        <span className="text-primary">[</span>
        <span className="text-muted-foreground">{text}</span>
        <span className="inline-flex">
          <span className="animate-pulse text-primary" style={{ animationDelay: "0ms" }}>.</span>
          <span className="animate-pulse text-primary" style={{ animationDelay: "200ms" }}>.</span>
          <span className="animate-pulse text-primary" style={{ animationDelay: "400ms" }}>.</span>
        </span>
        <span className="text-primary">]</span>
      </div>
    );
  }
);
TerminalLoader.displayName = "TerminalLoader";

function FullScreenLoader({ text = "Initializing system" }: { text?: string }) {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <div className="text-center space-y-4">
        <div className="text-primary text-2xl font-bold tracking-widest text-glow-primary">
          CAMPAIGN CONSOLE
        </div>
        <TerminalLoader text={text} size="lg" />
        <div className="text-xs text-muted-foreground mt-4 animate-pulse">
          // v1.0.0 - Wargame Campaign Tracker
        </div>
      </div>
    </div>
  );
}

export { TerminalLoader, FullScreenLoader };
