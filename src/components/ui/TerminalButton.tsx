import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const terminalButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-mono text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 uppercase tracking-wider border",
  {
    variants: {
      variant: {
        default:
          "bg-primary/15 text-primary border-primary/60 hover:bg-primary/25 hover:border-primary hover:shadow-[0_0_12px_hsl(var(--primary)/0.4)] text-glow-primary",
        secondary:
          "bg-secondary/15 text-secondary border-secondary/60 hover:bg-secondary/25 hover:border-secondary hover:shadow-[0_0_12px_hsl(var(--secondary)/0.4)] text-glow-secondary",
        destructive:
          "bg-destructive/15 text-destructive border-destructive/60 hover:bg-destructive/25 hover:border-destructive hover:shadow-[0_0_12px_hsl(var(--destructive)/0.4)]",
        outline:
          "bg-transparent text-foreground border-primary/40 hover:bg-primary/10 hover:border-primary hover:text-primary",
        ghost:
          "bg-transparent text-muted-foreground border-transparent hover:bg-accent hover:text-foreground hover:border-primary/30",
        link: "text-primary underline-offset-4 hover:underline border-transparent text-glow-primary",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-6 text-base",
        icon: "min-w-[48px] min-h-[48px] w-12 h-12",
        "icon-sm": "min-w-[32px] min-h-[32px] w-8 h-8 text-xs",
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
