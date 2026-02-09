import { useState, useRef, useCallback, memo, useMemo, useEffect } from "react";
import { useDraggable } from "@dnd-kit/core";
import { DashboardComponent, useDeleteComponent } from "@/hooks/useDashboardComponents";
import { GripVertical, X, Maximize2 } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { TableWidget } from "./widgets/TableWidget";
import { CounterWidget } from "./widgets/CounterWidget";
import { DiceRollerWidget } from "./widgets/DiceRollerWidget";
import { CardWidget } from "./widgets/CardWidget";
import { ImageWidget } from "./widgets/ImageWidget";
import { MapWidget } from "./widgets/MapWidget";
import { PlayerListWidget } from "./widgets/PlayerListWidget";
import { NarrativeTableWidget } from "./widgets/NarrativeTableWidget";
import { CalendarWidget } from "./widgets/CalendarWidget";
import { CampaignConsoleWidget } from "./widgets/CampaignConsoleWidget";
import { ActivityFeedWidget } from "./widgets/ActivityFeedWidget";
import { RollRecorderWidget } from "./widgets/RollRecorderWidget";
import { AnnouncementsWidget } from "./widgets/AnnouncementsWidget";
import { TextWidget } from "./widgets/TextWidget";
import { StickerWidget } from "./widgets/StickerWidget";
import { BattleTrackerWidget } from "./widgets/BattleTrackerWidget";
import { WidgetDragPreview } from "./WidgetDragPreview";
import { getWidgetIcon } from "./widgetIcons";

interface DraggableComponentProps {
  component: DashboardComponent;
  isGM: boolean;
  isPanning: boolean;
  isSelected: boolean;
  isMultiSelected?: boolean;
  onSelect: (shiftKey: boolean) => void;
  campaignId: string;
  scale: number;
  onResize: (id: string, width: number, height: number) => void;
  onResizeStart?: () => void;
  onResizeEnd: () => void;
  /** True when ANY component on the canvas is being dragged (for paint reduction) */
  isAnyDragging?: boolean;
  /** True when ANY component on the canvas is being resized (for paint reduction) */
  isAnyResizing?: boolean;
  /**
   * True when THIS component should stay in lightweight placeholder mode because
   * the DragOverlay is active (including the short handoff after drop).
   */
  isOverlayActive?: boolean;
  /** When true, the active widget uses DragOverlay and stays as a lightweight placeholder */
  useDragOverlay?: boolean;
}

const MIN_WIDTH = 200;
const MIN_HEIGHT = 150;

function DraggableComponentInner({
  component,
  isGM,
  isPanning,
  isSelected,
  isMultiSelected = false,
  onSelect,
  campaignId,
  scale,
  onResize,
  onResizeStart,
  onResizeEnd,
  isAnyDragging = false,
  isAnyResizing = false,
  isOverlayActive = false,
  useDragOverlay = true,
}: DraggableComponentProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [localSize, setLocalSize] = useState({ width: component.width, height: component.height });
  const resizeRef = useRef<{ startX: number; startY: number; startWidth: number; startHeight: number } | null>(null);

  const deleteComponent = useDeleteComponent();

  const isLocked = (component.config as { locked?: boolean })?.locked ?? false;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: component.id,
    disabled: !isGM || isPanning || isResizing || isLocked,
    data: { component }, // Pass component data for the modifier
  });

  const isOverlayDragging = useDragOverlay && (isDragging || isOverlayActive);

  // Sync local size with component props when they change (e.g., from server)
  useEffect(() => {
    if (!isResizing) {
      setLocalSize({ width: component.width, height: component.height });
    }
  }, [component.width, component.height, isResizing]);

  // Determine if we're in "interaction mode" (any widget dragging/resizing on canvas)
  const isInteracting = isDragging || isResizing;
  const isCanvasInteracting = isAnyDragging || isAnyResizing;

  // Use GPU-accelerated transforms with will-change hint
  // When using DragOverlay, keep the real widget DOM STATIC for the entire drag lifecycle.
  // Otherwise, on drag-end there can be a 1-frame "handoff" where @dnd-kit still provides
  // the last transform while the overlay has already been removed, causing a visible jitter.
  const style = useMemo(
    () => ({
      position: "absolute" as const,
      left: component.position_x,
      top: component.position_y,
      width: localSize.width,
      height: localSize.height,
      // Only apply @dnd-kit transform when we are NOT using DragOverlay.
      transform:
        !useDragOverlay && transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
      zIndex: isOverlayDragging ? (isSelected ? 50 : 1) : isDragging || isSelected ? 50 : 1,
      willChange: isInteracting && !useDragOverlay ? "transform" : "auto",
    }),
    [
      component.position_x,
      component.position_y,
      localSize.width,
      localSize.height,
      transform,
      useDragOverlay,
      isOverlayDragging,
      isDragging,
      isSelected,
      isInteracting,
    ]
  );

  // Compute box shadow - disable expensive glow during interactions
  const boxShadowStyle = useMemo(() => {
    if (isOverlayDragging) {
      return { boxShadow: "none" };
    }
    if (isCanvasInteracting) {
      // Simplified shadow during interactions for reduced paint cost
      return { boxShadow: "0 2px 8px hsl(0 0% 0% / 0.3)" };
    }
    return { boxShadow: "0 0 15px hsl(142 76% 65% / 0.3), 0 4px 20px hsl(0 0% 0% / 0.3)" };
  }, [isCanvasInteracting, isOverlayDragging]);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      if (!isGM || isLocked) return;
      e.stopPropagation();
      e.preventDefault();
      setIsResizing(true);
      onResizeStart?.(); // Notify parent for canvas-wide interaction tracking

      const startX = e.clientX;
      const startY = e.clientY;
      const startWidth = localSize.width;
      const startHeight = localSize.height;

      resizeRef.current = { startX, startY, startWidth, startHeight };

      // Track pending RAF to prevent duplicate frames
      let rafId: number | null = null;
      let pendingSize: { width: number; height: number } | null = null;

      const handleMouseMove = (e: MouseEvent) => {
        if (!resizeRef.current) return;

        // Scale-compensated delta calculation
        const deltaX = (e.clientX - resizeRef.current.startX) / scale;
        const deltaY = (e.clientY - resizeRef.current.startY) / scale;

        const newWidth = Math.max(MIN_WIDTH, resizeRef.current.startWidth + deltaX);
        const newHeight = Math.max(MIN_HEIGHT, resizeRef.current.startHeight + deltaY);

        // Store pending size, only update in next animation frame
        pendingSize = { width: newWidth, height: newHeight };

        if (rafId === null) {
          rafId = requestAnimationFrame(() => {
            if (pendingSize) {
              setLocalSize(pendingSize);
            }
            rafId = null;
          });
        }

        // DO NOT call onResize here - only update local state for visuals
      };

      const handleMouseUp = () => {
        // Cancel any pending RAF
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
        }

        // Get final size from resizeRef (most accurate)
        const finalSize = pendingSize || { width: startWidth, height: startHeight };

        // Commit final size ONCE to parent (triggers cache + DB update)
        onResize(component.id, Math.round(finalSize.width), Math.round(finalSize.height));

        setIsResizing(false);
        resizeRef.current = null;
        onResizeEnd();

        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [isGM, isLocked, localSize.width, localSize.height, component.id, scale, onResize, onResizeStart, onResizeEnd]
  );

  const handleDelete = useCallback(() => {
    deleteComponent.mutate({ id: component.id, campaignId });
  }, [deleteComponent, component.id, campaignId]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(e.shiftKey);
    },
    [onSelect]
  );

  const icon = getWidgetIcon(component.component_type);
  const isCampaignConsole = component.component_type === "campaign-console";

  // Memoize component content to prevent re-renders during drag
  const componentContent = useMemo(() => {
    switch (component.component_type) {
      case "table":
      case "rules_table":
      case "custom_table":
        return <TableWidget component={component} isGM={isGM} campaignId={campaignId} />;
      case "counter":
        return <CounterWidget component={component} isGM={isGM} />;
      case "dice_roller":
        return <DiceRollerWidget component={component} campaignId={campaignId} isGM={isGM} />;
      case "roll_recorder":
        return <RollRecorderWidget component={component} campaignId={campaignId} isGM={isGM} />;
      case "card":
      case "rules_card":
      case "custom_card":
        return <CardWidget component={component} isGM={isGM} campaignId={campaignId} />;
      case "image":
        return <ImageWidget component={component} isGM={isGM} />;
      case "map":
        return <MapWidget component={component} isGM={isGM} />;
      case "player_list":
        return <PlayerListWidget component={component} isGM={isGM} />;
      case "narrative_table":
        return <NarrativeTableWidget campaignId={campaignId} isGM={isGM} />;
      case "calendar":
        return <CalendarWidget campaignId={campaignId} isGM={isGM} />;
      case "campaign-console":
        return <CampaignConsoleWidget campaignId={campaignId} isGM={isGM} />;
      case "activity_feed":
        return <ActivityFeedWidget campaignId={campaignId} isGM={isGM} />;
      case "announcements":
        return <AnnouncementsWidget campaignId={campaignId} isGM={isGM} />;
      case "text":
        return <TextWidget component={component} isGM={isGM} />;
      case "sticker":
        return <StickerWidget component={component} isGM={isGM} />;
      case "battle_tracker":
        return <BattleTrackerWidget campaignId={campaignId} isGM={isGM} />;
      default:
        return (
          <div className="text-center py-8">
            <p className="font-mono">[ {component.component_type.toUpperCase()} ]</p>
            <p className="mt-2 text-xs opacity-60">Unsupported component type</p>
          </div>
        );
    }
  }, [component, isGM, campaignId]);

  const chromeStyle = useMemo(
    () => ({
      ...boxShadowStyle,
      contain: "layout paint size",
    }),
    [boxShadowStyle]
  );

  // Campaign Console uses a minimal chrome layout (no title bar, just corner controls)
  if (isCampaignConsole) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`draggable-component ${
          isOverlayDragging ? "opacity-20" : isDragging ? "opacity-90" : ""
        } ${isSelected ? "ring-2 ring-[hsl(200,100%,65%)] ring-offset-2 ring-offset-background" : ""} ${
          isMultiSelected ? "ring-2 ring-[hsl(45,100%,60%)] ring-offset-1 ring-offset-background" : ""
        }`}
        onClick={handleClick}
      >
        <div
          className="h-full flex flex-col bg-card border border-[hsl(142,76%,65%)] rounded overflow-hidden relative"
          style={chromeStyle}
        >
          {/* Corner Controls for Campaign Console (GM only) */}
          {isGM && (
            <>
              {/* Move handle - top left */}
              <div
                className="absolute top-2 left-2 z-10 cursor-grab active:cursor-grabbing p-1 rounded bg-card/80 hover:bg-card border border-primary/30 touch-none"
                {...listeners}
                {...attributes}
              >
                <GripVertical className="w-4 h-4 text-primary opacity-60 hover:opacity-100" />
              </div>

              {/* Resize handle - bottom right with 32x32 hit target */}
              <div
                className="absolute -bottom-1 -right-1 w-8 h-8 cursor-se-resize group z-10 flex items-center justify-center"
                onMouseDown={handleResizeStart}
                aria-label="Resize widget"
                role="button"
                tabIndex={0}
              >
                <div className="absolute inset-0 rounded-bl bg-transparent group-hover:bg-primary/10 transition-colors" />
                <Maximize2 className="w-4 h-4 text-primary/50 group-hover:text-primary group-hover:drop-shadow-[0_0_4px_hsl(var(--primary))] rotate-90 relative z-10 transition-all" />
              </div>
            </>
          )}

          {/* Component Content - full area */}
          <div
            className={`flex-1 text-xs text-muted-foreground ${
              isOverlayDragging ? "overflow-hidden pointer-events-none" : "overflow-auto"
            }`}
          >
            {isOverlayDragging ? (
              <WidgetDragPreview component={component} mode="placeholder" className="h-full w-full" />
            ) : (
              componentContent
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`draggable-component ${
        isOverlayDragging ? "opacity-20" : isDragging ? "opacity-90" : ""
      } ${isSelected ? "ring-2 ring-[hsl(200,100%,65%)] ring-offset-2 ring-offset-background" : ""} ${
        isMultiSelected ? "ring-2 ring-[hsl(45,100%,60%)] ring-offset-1 ring-offset-background" : ""
      }`}
      onClick={handleClick}
    >
      <div
        className="h-full flex flex-col bg-card border border-[hsl(142,76%,65%)] rounded overflow-hidden"
        style={chromeStyle}
      >
        {/* Component Header - entire bar is draggable for GM */}
        <div
          className={`flex items-center justify-between px-3 py-2 bg-primary/10 border-b border-primary/30 select-none touch-none ${
            isGM ? "cursor-grab active:cursor-grabbing" : ""
          }`}
          {...(isGM ? { ...listeners, ...attributes } : {})}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isGM && <GripVertical className="w-4 h-4 text-primary flex-shrink-0 opacity-50" />}
            <span className="text-sm flex-shrink-0" aria-hidden>
              {icon}
            </span>
            <span
              className="text-xs font-mono text-primary uppercase tracking-wider truncate"
              style={{ textShadow: "0 0 8px hsl(var(--primary) / 0.4)" }}
            >
              {component.name}
            </span>
          </div>
          {isGM && (
            <IconButton
              variant="destructive"
              size="default"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={`Delete ${component.name} widget`}
              className="flex-shrink-0 -mr-1"
            >
              <X className="w-4 h-4" />
            </IconButton>
          )}
        </div>

        {/* Component Content */}
        <div
          className={`flex-1 p-3 text-xs text-muted-foreground ${
            isOverlayDragging ? "overflow-hidden pointer-events-none" : "overflow-auto"
          }`}
        >
          {isOverlayDragging ? (
            <WidgetDragPreview component={component} mode="placeholder" className="h-full w-full" />
          ) : (
            componentContent
          )}
        </div>

        {/* Resize Handle (GM only) - 32x32 hit target with visual feedback */}
        {isGM && (
          <div
            className="absolute -bottom-1 -right-1 w-8 h-8 cursor-se-resize group flex items-center justify-center"
            onMouseDown={handleResizeStart}
            aria-label="Resize widget"
            role="button"
            tabIndex={0}
          >
            <div className="absolute inset-0 rounded-tl bg-transparent group-hover:bg-primary/10 transition-colors" />
            <Maximize2 className="w-4 h-4 text-primary/50 group-hover:text-primary group-hover:drop-shadow-[0_0_4px_hsl(var(--primary))] rotate-90 relative z-10 transition-all" />
          </div>
        )}
      </div>
    </div>
  );
}

// Memoize the entire component to prevent unnecessary re-renders
export const DraggableComponent = memo(DraggableComponentInner, (prev, next) => {
  // Custom comparison - only re-render when these specific props change
  return (
    prev.component.id === next.component.id &&
    prev.component.position_x === next.component.position_x &&
    prev.component.position_y === next.component.position_y &&
    prev.component.width === next.component.width &&
    prev.component.height === next.component.height &&
    prev.component.name === next.component.name &&
    prev.component.config === next.component.config &&
    prev.isGM === next.isGM &&
    prev.isPanning === next.isPanning &&
    prev.isSelected === next.isSelected &&
    prev.isMultiSelected === next.isMultiSelected &&
    prev.campaignId === next.campaignId &&
    prev.scale === next.scale &&
    prev.isAnyDragging === next.isAnyDragging &&
    prev.isAnyResizing === next.isAnyResizing &&
    prev.isOverlayActive === next.isOverlayActive &&
    prev.useDragOverlay === next.useDragOverlay
  );
});
