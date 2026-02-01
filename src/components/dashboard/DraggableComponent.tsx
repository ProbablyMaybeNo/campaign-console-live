import { useState, useRef, useCallback, memo, useMemo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { DashboardComponent, useDeleteComponent } from "@/hooks/useDashboardComponents";
import { GripVertical, X, Maximize2 } from "lucide-react";
import { TerminalButton } from "@/components/ui/TerminalButton";
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

interface DraggableComponentProps {
  component: DashboardComponent;
  isGM: boolean;
  isPanning: boolean;
  isSelected: boolean;
  onSelect: () => void;
  campaignId: string;
  scale: number;
  onResize: (id: string, width: number, height: number) => void;
  onResizeEnd: () => void;
}

const MIN_WIDTH = 200;
const MIN_HEIGHT = 150;

// Component icon lookup - memoized outside component
const COMPONENT_ICONS: Record<string, string> = {
  table: "📊",
  rules_table: "📊",
  custom_table: "📊",
  card: "🃏",
  rules_card: "🃏",
  custom_card: "🃏",
  counter: "🔢",
  image: "🖼️",
  dice_roller: "🎲",
  map: "🗺️",
  player_list: "👥",
  narrative_table: "📖",
  calendar: "📅",
  "campaign-console": "⚔️",
};

function DraggableComponentInner({
  component,
  isGM,
  isPanning,
  isSelected,
  onSelect,
  campaignId,
  scale,
  onResize,
  onResizeEnd,
}: DraggableComponentProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [localSize, setLocalSize] = useState({ width: component.width, height: component.height });
  const resizeRef = useRef<{ startX: number; startY: number; startWidth: number; startHeight: number } | null>(null);

  const deleteComponent = useDeleteComponent();

  const isLocked = (component.config as { locked?: boolean })?.locked ?? false;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: component.id,
    disabled: !isGM || isPanning || isResizing || isLocked,
  });

  // Sync local size with component props when they change (e.g., from server)
  useMemo(() => {
    if (!isResizing) {
      setLocalSize({ width: component.width, height: component.height });
    }
  }, [component.width, component.height, isResizing]);

  // Use GPU-accelerated transforms with will-change hint
  const style = useMemo(() => ({
    position: "absolute" as const,
    left: component.position_x,
    top: component.position_y,
    width: localSize.width,
    height: localSize.height,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    zIndex: isDragging || isSelected ? 50 : 1,
    willChange: isDragging || isResizing ? "transform" : "auto",
  }), [component.position_x, component.position_y, localSize.width, localSize.height, transform, isDragging, isSelected, isResizing]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    if (!isGM || isLocked) return;
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: localSize.width,
      startHeight: localSize.height,
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      
      // Scale-compensated delta calculation
      const deltaX = (e.clientX - resizeRef.current.startX) / scale;
      const deltaY = (e.clientY - resizeRef.current.startY) / scale;
      
      const newWidth = Math.max(MIN_WIDTH, resizeRef.current.startWidth + deltaX);
      const newHeight = Math.max(MIN_HEIGHT, resizeRef.current.startHeight + deltaY);
      
      setLocalSize({
        width: newWidth,
        height: newHeight,
      });
      
      // Notify parent for optimistic updates
      onResize(component.id, newWidth, newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeRef.current = null;
      onResizeEnd();
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }, [isGM, isLocked, localSize, component.id, scale, onResize, onResizeEnd]);

  const handleDelete = useCallback(() => {
    deleteComponent.mutate({ id: component.id, campaignId });
  }, [deleteComponent, component.id, campaignId]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
  }, [onSelect]);

  const icon = COMPONENT_ICONS[component.component_type] || "📦";
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
        return <DiceRollerWidget component={component} isGM={isGM} />;
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
      default:
        return (
          <div className="text-center py-8">
            <p className="font-mono">[ {component.component_type.toUpperCase()} ]</p>
            <p className="mt-2 text-xs opacity-60">Unsupported component type</p>
          </div>
        );
    }
  }, [component, isGM, campaignId]);

  // Campaign Console uses a minimal chrome layout (no title bar, just corner controls)
  if (isCampaignConsole) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`draggable-component ${
          isDragging ? "opacity-90 shadow-2xl" : ""
        } ${isSelected ? "ring-2 ring-[hsl(200,100%,65%)] ring-offset-2 ring-offset-background" : ""}`}
        onClick={handleClick}
      >
        <div 
          className="h-full flex flex-col bg-card border border-[hsl(142,76%,65%)] rounded overflow-hidden relative"
          style={{ boxShadow: '0 0 15px hsl(142 76% 65% / 0.3), 0 4px 20px hsl(0 0% 0% / 0.3)' }}
        >
          {/* Corner Controls for Campaign Console (GM only) */}
          {isGM && (
            <>
              {/* Move handle - top left */}
              <div 
                className="absolute top-2 left-2 z-10 cursor-grab active:cursor-grabbing p-1 rounded bg-card/80 hover:bg-card border border-[hsl(142,76%,50%)]/30"
                {...listeners}
                {...attributes}
              >
                <GripVertical className="w-4 h-4 text-[hsl(142,76%,50%)] opacity-60 hover:opacity-100" />
              </div>
              
              {/* Resize handle - bottom right */}
              <div
                className="absolute bottom-1 right-1 w-5 h-5 cursor-se-resize group z-10"
                onMouseDown={handleResizeStart}
              >
                <Maximize2 className="w-4 h-4 text-[hsl(142,76%,50%)]/50 group-hover:text-[hsl(142,76%,50%)] rotate-90" />
              </div>
            </>
          )}

          {/* Component Content - full area */}
          <div className="flex-1 overflow-auto text-xs text-muted-foreground">
            {componentContent}
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
        isDragging ? "opacity-90 shadow-2xl" : ""
      } ${isSelected ? "ring-2 ring-[hsl(200,100%,65%)] ring-offset-2 ring-offset-background" : ""}`}
      onClick={handleClick}
    >
      <div 
        className="h-full flex flex-col bg-card border border-[hsl(142,76%,65%)] rounded overflow-hidden"
        style={{ boxShadow: '0 0 15px hsl(142 76% 65% / 0.3), 0 4px 20px hsl(0 0% 0% / 0.3)' }}
      >
        {/* Component Header - entire bar is draggable for GM */}
        <div 
          className={`flex items-center justify-between px-3 py-2 bg-[hsl(142,76%,50%)]/10 border-b border-[hsl(142,76%,50%)]/30 select-none ${
            isGM ? "cursor-grab active:cursor-grabbing" : ""
          }`}
          {...(isGM ? { ...listeners, ...attributes } : {})}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isGM && (
              <GripVertical className="w-4 h-4 text-[hsl(142,76%,50%)] flex-shrink-0 opacity-50" />
            )}
            <span className="text-sm flex-shrink-0">{icon}</span>
            <span 
              className="text-xs font-mono text-[hsl(142,76%,50%)] uppercase tracking-wider truncate"
              style={{ textShadow: '0 0 8px hsl(142 76% 50% / 0.4)' }}
            >
              {component.name}
            </span>
          </div>
          {isGM && (
            <TerminalButton
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
            >
              <X className="w-3 h-3" />
            </TerminalButton>
          )}
        </div>

        {/* Component Content */}
        <div className="flex-1 p-3 overflow-auto text-xs text-muted-foreground">
          {componentContent}
        </div>

        {/* Resize Handle (GM only) */}
        {isGM && (
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize group"
            onMouseDown={handleResizeStart}
          >
            <Maximize2 className="w-3 h-3 text-[hsl(142,76%,50%)]/50 group-hover:text-[hsl(142,76%,50%)] absolute bottom-1 right-1 rotate-90" />
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
    prev.campaignId === next.campaignId &&
    prev.scale === next.scale
  );
});
