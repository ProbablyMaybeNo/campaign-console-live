import { useState, useRef, useCallback, memo, useMemo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { DashboardComponent, useUpdateComponent, useDeleteComponent } from "@/hooks/useDashboardComponents";
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
}: DraggableComponentProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [localSize, setLocalSize] = useState({ width: component.width, height: component.height });
  const resizeRef = useRef<{ startX: number; startY: number; startWidth: number; startHeight: number } | null>(null);

  const updateComponent = useUpdateComponent();
  const deleteComponent = useDeleteComponent();

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: component.id,
    disabled: !isGM || isPanning || isResizing,
  });

  // Use GPU-accelerated transforms with will-change hint
  const style = useMemo(() => ({
    position: "absolute" as const,
    left: component.position_x,
    top: component.position_y,
    width: localSize.width,
    height: localSize.height,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    zIndex: isDragging || isSelected ? 50 : 1,
    willChange: isDragging ? "transform" : "auto",
  }), [component.position_x, component.position_y, localSize.width, localSize.height, transform, isDragging, isSelected]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    if (!isGM) return;
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
      const deltaX = e.clientX - resizeRef.current.startX;
      const deltaY = e.clientY - resizeRef.current.startY;
      setLocalSize({
        width: Math.max(MIN_WIDTH, resizeRef.current.startWidth + deltaX),
        height: Math.max(MIN_HEIGHT, resizeRef.current.startHeight + deltaY),
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      if (resizeRef.current) {
        const finalWidth = Math.max(MIN_WIDTH, localSize.width);
        const finalHeight = Math.max(MIN_HEIGHT, localSize.height);
        updateComponent.mutate({
          id: component.id,
          width: Math.round(finalWidth),
          height: Math.round(finalHeight),
        });
      }
      resizeRef.current = null;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }, [isGM, localSize, component.id, updateComponent]);

  const handleDelete = useCallback(() => {
    deleteComponent.mutate({ id: component.id, campaignId });
  }, [deleteComponent, component.id, campaignId]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
  }, [onSelect]);

  const icon = COMPONENT_ICONS[component.component_type] || "📦";

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`draggable-component ${
        isDragging ? "opacity-90 shadow-2xl" : ""
      } ${isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
      onClick={handleClick}
    >
      <div className="h-full flex flex-col bg-card border border-primary/30 rounded overflow-hidden shadow-lg">
        {/* Component Header - entire bar is draggable for GM */}
        <div 
          className={`flex items-center justify-between px-3 py-2 bg-primary/10 border-b border-primary/20 select-none ${
            isGM ? "cursor-grab active:cursor-grabbing" : ""
          }`}
          {...(isGM ? { ...listeners, ...attributes } : {})}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isGM && (
              <GripVertical className="w-4 h-4 text-primary flex-shrink-0 opacity-50" />
            )}
            <span className="text-sm flex-shrink-0">{icon}</span>
            <span className="text-xs font-mono text-primary uppercase tracking-wider truncate">
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
            <Maximize2 className="w-3 h-3 text-primary/50 group-hover:text-primary absolute bottom-1 right-1 rotate-90" />
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
    prev.campaignId === next.campaignId
  );
});
