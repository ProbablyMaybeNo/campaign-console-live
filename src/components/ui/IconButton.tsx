import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * IconButton - A button wrapper for icon-only controls that ensures 48px minimum hit targets
 * for accessibility while keeping the visual icon size small.
 * 
 * Usage:
 * <IconButton aria-label="Close dialog" onClick={handleClose}>
 *   <X className="w-4 h-4" />
 * </IconButton>
 */

const iconButtonVariants = cva(
  "inline-flex items-center justify-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "text-foreground hover:text-primary hover:bg-primary/10",
        ghost:
          "text-muted-foreground hover:text-foreground hover:bg-accent",
        destructive:
          "text-muted-foreground hover:text-destructive hover:bg-destructive/10",
        primary:
          "text-primary hover:text-primary-bright hover:bg-primary/10",
        secondary:
          "text-secondary hover:text-secondary-bright hover:bg-secondary/10",
      },
      size: {
        // Default: 48px hit target (accessibility standard)
        default: "min-w-[48px] min-h-[48px] w-12 h-12",
        // Medium: 40px hit target
        md: "min-w-[40px] min-h-[40px] w-10 h-10",
        // Small: 32px hit target (minimum acceptable)
        sm: "min-w-[32px] min-h-[32px] w-8 h-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  /** Required for accessibility - describes the button action */
  "aria-label": string;
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, children, ...props }, ref) => {
    return (
      <button
        type="button"
        className={cn(iconButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);
IconButton.displayName = "IconButton";

export { IconButton, iconButtonVariants };
