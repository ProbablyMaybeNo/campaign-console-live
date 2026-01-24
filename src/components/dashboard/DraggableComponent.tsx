import { useState, useRef, useCallback } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
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

export function DraggableComponent({
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

  const style = {
    position: "absolute" as const,
    left: component.position_x,
    top: component.position_y,
    width: localSize.width,
    height: localSize.height,
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging || isSelected ? 50 : 1,
  };

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

  const handleDelete = () => {
    deleteComponent.mutate({ id: component.id, campaignId });
  };

  const getComponentIcon = () => {
    switch (component.component_type) {
      case "table":
      case "rules_table":
      case "custom_table":
        return "📊";
      case "card":
      case "rules_card":
      case "custom_card":
        return "🃏";
      case "counter":
        return "🔢";
      case "image":
        return "🖼️";
      case "dice_roller":
        return "🎲";
      case "map":
        return "🗺️";
      case "player_list":
        return "👥";
      case "narrative_table":
        return "📖";
      case "calendar":
        return "📅";
      default:
        return "📦";
    }
  };

  const renderComponentContent = () => {
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
      default:
        return (
          <div className="text-center py-8">
            <p className="font-mono">[ {component.component_type.toUpperCase()} ]</p>
            <p className="mt-2 text-xs opacity-60">Unsupported component type</p>
          </div>
        );
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`draggable-component transition-shadow ${
        isDragging ? "cursor-grabbing opacity-90" : ""
      } ${isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <div className="h-full flex flex-col bg-card border border-primary/30 rounded overflow-hidden">
        {/* Component Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-primary/10 border-b border-primary/20">
          <div className="flex items-center gap-2">
            {isGM && (
              <div
                {...listeners}
                {...attributes}
                className="cursor-grab active:cursor-grabbing p-1 hover:bg-primary/20 rounded"
              >
                <GripVertical className="w-4 h-4 text-primary" />
              </div>
            )}
            <span className="text-sm">{getComponentIcon()}</span>
            <span className="text-xs font-mono text-primary uppercase tracking-wider truncate">
              {component.name}
            </span>
          </div>
          {isGM && (
            <TerminalButton
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <X className="w-3 h-3" />
            </TerminalButton>
          )}
        </div>

        {/* Component Content */}
        <div className="flex-1 p-3 overflow-auto text-xs text-muted-foreground">
          {renderComponentContent()}
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
