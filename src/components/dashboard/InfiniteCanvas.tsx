import { useRef, useState, useCallback, useEffect } from "react";
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { DraggableComponent } from "./DraggableComponent";
import { CanvasControls } from "./CanvasControls";
import { CanvasGrid } from "./CanvasGrid";
import { DashboardComponent, useUpdateComponent } from "@/hooks/useDashboardComponents";

interface InfiniteCanvasProps {
  components: DashboardComponent[];
  isGM: boolean;
  campaignId: string;
  onComponentSelect: (component: DashboardComponent | null) => void;
  selectedComponentId: string | null;
}

export function InfiniteCanvas({
  components,
  isGM,
  campaignId,
  onComponentSelect,
  selectedComponentId,
}: InfiniteCanvasProps) {
  const transformRef = useRef<ReactZoomPanPinchRef>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [scale, setScale] = useState(0.5);
  const updateComponent = useUpdateComponent();

  // Reduce activation distance for faster drag start (3px instead of 8px)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, delta } = event;
      const componentId = active.id as string;
      const component = components.find((c) => c.id === componentId);

      if (component && isGM) {
        const newX = component.position_x + delta.x / scale;
        const newY = component.position_y + delta.y / scale;

        updateComponent.mutate({
          id: componentId,
          position_x: Math.round(newX),
          position_y: Math.round(newY),
        });
      }
    },
    [components, isGM, scale, updateComponent]
  );

  const handleZoomIn = useCallback(() => {
    const ref = transformRef.current;
    if (!ref) return;
    ref.zoomIn(0.1, 150, "easeOut");
  }, []);

  const handleZoomOut = useCallback(() => {
    const ref = transformRef.current;
    if (!ref) return;
    ref.zoomOut(0.1, 150, "easeOut");
  }, []);

  const handleReset = useCallback(() => {
    const ref = transformRef.current;
    if (!ref) return;
    ref.setTransform(0, 0, 0.5, 150, "easeOut");
  }, []);

  const handleTransform = useCallback((ref: ReactZoomPanPinchRef) => {
    setScale(ref.state.scale);
  }, []);

  const handlePanningStart = useCallback(() => setIsPanning(true), []);
  const handlePanningStop = useCallback(() => setIsPanning(false), []);

  // Keyboard shortcuts for zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          handleZoomIn();
        } else if (e.key === '-') {
          e.preventDefault();
          handleZoomOut();
        } else if (e.key === '0') {
          e.preventDefault();
          handleReset();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleZoomIn, handleZoomOut, handleReset]);

  // Prevent scroll on canvas - only allow scroll within focused components
  const handleCanvasWheel = useCallback((e: React.WheelEvent) => {
    const target = e.target as HTMLElement;
    const scrollableParent = target.closest('[data-scrollable="true"]');
    
    if (!scrollableParent) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  const handleCanvasClick = useCallback(() => {
    onComponentSelect(null);
  }, [onComponentSelect]);

  return (
    <div 
      className="relative w-full h-full overflow-hidden bg-background rounded-md border border-primary/20"
      onWheel={handleCanvasWheel}
      onClick={handleCanvasClick}
    >
      {/* Canvas Controls */}
      <CanvasControls
        scale={scale}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleReset}
      />

      {/* Zoom/Pan Container */}
      <TransformWrapper
        ref={transformRef}
        initialScale={0.5}
        minScale={0.25}
        maxScale={2}
        limitToBounds={false}
        onPanningStart={handlePanningStart}
        onPanningStop={handlePanningStop}
        onTransformed={handleTransform}
        panning={{
          velocityDisabled: true,
          excluded: ["draggable-component"],
        }}
        wheel={{
          disabled: true,
        }}
        doubleClick={{
          disabled: true,
        }}
      >
        <TransformComponent
          wrapperStyle={{
            width: "100%",
            height: "100%",
          }}
          contentStyle={{
            width: "4000px",
            height: "4000px",
          }}
        >
          {/* Grid Background */}
          <CanvasGrid />

          {/* DnD Context for draggable components */}
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            {components.map((component) => (
              <DraggableComponent
                key={component.id}
                component={component}
                isGM={isGM}
                isPanning={isPanning}
                isSelected={selectedComponentId === component.id}
                onSelect={() => onComponentSelect(component)}
                campaignId={campaignId}
              />
            ))}
          </DndContext>

          {/* Empty state */}
          {components.length === 0 && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <div className="text-muted-foreground text-sm space-y-2">
                <p className="text-lg font-mono text-primary/70">[ EMPTY DASHBOARD ]</p>
                <p className="text-xs max-w-xs">
                  {isGM
                    ? "Click the + button to add components to your campaign dashboard"
                    : "No dashboard components have been published for players yet. Check back later or contact your Games Master."}
                </p>
              </div>
            </div>
          )}
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
