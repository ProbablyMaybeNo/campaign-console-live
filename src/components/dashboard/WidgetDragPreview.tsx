import { memo } from "react";
import { motion } from "framer-motion";
import type { DashboardComponent } from "@/hooks/useDashboardComponents";
import { cn } from "@/lib/utils";
import { getWidgetIcon } from "./widgetIcons";

interface WidgetDragPreviewProps {
  component: DashboardComponent;
  /**
   * - overlay: rendered inside DragOverlay (portal) → fixed size, cursor-anchored
   * - placeholder: rendered inside the original widget box → fills parent
   */
  mode: "overlay" | "placeholder";
  className?: string;
}

function WidgetDragPreviewInner({
  component,
  mode,
  className,
}: WidgetDragPreviewProps) {
  const icon = getWidgetIcon(component.component_type);

  // Overlay uses fixed dimensions for consistency (not scaled)
  // This ensures the preview always appears at a readable size
  const style =
    mode === "overlay"
      ? {
          width: 200,
          height: 80,
        }
      : undefined;

  if (mode === "overlay") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "rounded border-2 border-primary/60 bg-card/95 text-card-foreground",
          "backdrop-blur-sm pointer-events-none shadow-lg shadow-primary/20",
          className
        )}
        style={style}
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
                Drop to place
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div
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

export const WidgetDragPreview = memo(WidgetDragPreviewInner);
