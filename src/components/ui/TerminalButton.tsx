import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const terminalButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-mono text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 uppercase tracking-wider border",
  {
    variants: {
      variant: {
        default:
          "bg-primary/10 text-primary border-primary/50 hover:bg-primary/20 hover:border-primary hover:glow-primary",
        secondary:
          "bg-secondary/10 text-secondary border-secondary/50 hover:bg-secondary/20 hover:border-secondary hover:glow-secondary",
        destructive:
          "bg-destructive/10 text-destructive border-destructive/50 hover:bg-destructive/20 hover:border-destructive hover:glow-destructive",
        outline:
          "bg-transparent text-foreground border-border hover:bg-accent hover:border-primary/50 hover:text-primary",
        ghost:
          "bg-transparent text-muted-foreground border-transparent hover:bg-accent hover:text-foreground hover:border-border",
        link: "text-primary underline-offset-4 hover:underline border-transparent",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface TerminalButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof terminalButtonVariants> {
  asChild?: boolean;
}

const TerminalButton = React.forwardRef<HTMLButtonElement, TerminalButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(terminalButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
TerminalButton.displayName = "TerminalButton";

export { TerminalButton, terminalButtonVariants };
