import { memo } from "react";
import type { DashboardComponent } from "@/hooks/useDashboardComponents";
import { cn } from "@/lib/utils";
import { getWidgetIcon } from "./widgetIcons";

interface WidgetDragPreviewProps {
  component: DashboardComponent;
  /** Canvas scale; used to approximate on-screen size in the DragOverlay */
  scale?: number;
  /**
   * - overlay: rendered inside DragOverlay (portal) → must size itself
   * - placeholder: rendered inside the original widget box → fills parent
   */
  mode: "overlay" | "placeholder";
  className?: string;
}

function WidgetDragPreviewInner({
  component,
  scale = 1,
  mode,
  className,
}: WidgetDragPreviewProps) {
  const icon = getWidgetIcon(component.component_type);

  const style =
    mode === "overlay"
      ? {
          width: Math.max(160, Math.round(component.width * scale)),
          height: Math.max(80, Math.round(component.height * scale)),
        }
      : undefined;

  return (
    <div
      className={cn(
        "h-full w-full rounded border border-primary/40 bg-card text-card-foreground",
        "shadow-none",
        mode === "overlay" && "pointer-events-none",
        className
      )}
      style={style}
    >
      <div className="h-full w-full grid place-items-center p-3">
        <div className="flex items-center gap-2 max-w-full">
          <span className="text-base flex-shrink-0" aria-hidden>
            {icon}
          </span>
          <div className="min-w-0">
            <div className="text-xs font-mono uppercase tracking-wider text-primary truncate">
              {component.name}
            </div>
            <div className="text-[10px] text-muted-foreground truncate">
              {mode === "overlay" ? "Dragging" : "Moving…"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const WidgetDragPreview = memo(WidgetDragPreviewInner);
