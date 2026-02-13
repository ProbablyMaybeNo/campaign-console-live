import { forwardRef, memo } from "react";
import { motion } from "framer-motion";
import type { DashboardComponent } from "@/hooks/useDashboardComponents";
import { cn } from "@/lib/utils";
import { getWidgetIcon } from "./widgetIcons";

interface WidgetDragPreviewProps {
  component: DashboardComponent;
  /**
   * - overlay: rendered inside DragOverlay (portal) → full-size ghost at canvas scale
   * - placeholder: rendered inside the original widget box → fills parent
   */
  mode: "overlay" | "placeholder";
  /** Canvas zoom scale - used to render the ghost at correct visual size */
  scale?: number;
  className?: string;
}

const WidgetDragPreviewInner = forwardRef<HTMLDivElement, WidgetDragPreviewProps>(
  function WidgetDragPreviewInner({ component, mode, scale = 1, className }, ref) {
    const icon = getWidgetIcon(component.component_type);

    // Overlay uses actual widget dimensions scaled to current zoom
    // This lets users see exactly where the widget will land
    const scaledWidth = component.width * scale;
    const scaledHeight = component.height * scale;

    if (mode === "overlay") {
      return (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "rounded-sm pointer-events-none",
            "border-2 border-dashed border-primary",
            "bg-primary/10 backdrop-blur-sm",
            "shadow-lg shadow-primary/20",
            className
          )}
          style={{
            width: scaledWidth,
            height: scaledHeight,
            willChange: "transform",
            contain: "layout paint",
          }}
        >
          {/* Header bar mimics real widget header */}
          <div
            className="flex items-center gap-2 px-3 border-b border-primary/40 bg-card/80"
            style={{ height: Math.min(36 * scale, 36) }}
          >
            <span
              className="flex-shrink-0"
              style={{ fontSize: Math.min(16 * scale, 16) }}
              aria-hidden
            >
              {icon}
            </span>
            <span
              className="font-mono uppercase tracking-wider text-primary truncate"
              style={{ fontSize: Math.min(11 * scale, 11) }}
            >
              {component.name}
            </span>
          </div>

          {/* Ghost body - empty translucent area */}
          <div className="flex-1 grid place-items-center p-3">
            <span
              className="text-muted-foreground/60 font-mono uppercase tracking-widest"
              style={{ fontSize: Math.min(10 * scale, 10) }}
            >
              Drop to place
            </span>
          </div>
        </motion.div>
      );
    }

    // Placeholder mode - fills parent, shown in original widget position
    return (
      <div
        ref={ref}
        className={cn(
          "rounded border-2 border-primary/60 bg-card/95 text-card-foreground",
          "backdrop-blur-sm",
          className
        )}
      >
        <div className="h-full w-full grid place-items-center p-3">
          <div className="flex items-center gap-2 max-w-full">
            <span className="text-lg flex-shrink-0" aria-hidden>
              {icon}
            </span>
            <div className="min-w-0">
              <div className="text-xs font-mono uppercase tracking-wider text-primary truncate">
                {component.name}
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                Moving…
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

export const WidgetDragPreview = memo(WidgetDragPreviewInner);
