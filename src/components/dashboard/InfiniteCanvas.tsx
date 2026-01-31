import { useRef, useState, useCallback, useEffect } from "react";
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { DndContext, DragEndEvent, DragMoveEvent, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { DraggableComponent } from "./DraggableComponent";
import { CanvasControls } from "./CanvasControls";
import { CanvasGrid } from "./CanvasGrid";
import { DashboardComponent, useUpdateComponent } from "@/hooks/useDashboardComponents";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

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
  const [scale, setScale] = useState(1);
  const updateComponent = useUpdateComponent();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
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

  const handleZoomIn = () => {
    const ref = transformRef.current;
    if (!ref) return;
    const { positionX, positionY, scale: currentScale } = ref.state;
    const newScale = Math.min(currentScale + 0.1, 2); // 10% increment, max 200%
    ref.setTransform(positionX, positionY, newScale, 200);
  };

  const handleZoomOut = () => {
    const ref = transformRef.current;
    if (!ref) return;
    const { positionX, positionY, scale: currentScale } = ref.state;
    const newScale = Math.max(currentScale - 0.1, 0.25); // 10% decrement, min 25%
    ref.setTransform(positionX, positionY, newScale, 200);
  };

  const handleReset = () => {
    transformRef.current?.resetTransform();
  };

  const handleTransform = (ref: ReactZoomPanPinchRef) => {
    setScale(ref.state.scale);
  };

  // Keyboard shortcuts for zoom (Ctrl+Plus, Ctrl+Minus)
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
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-background rounded-md border border-primary/20">
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
        initialScale={1}
        minScale={0.25}
        maxScale={2}
        limitToBounds={false}
        onPanningStart={() => setIsPanning(true)}
        onPanningStop={() => setIsPanning(false)}
        onTransformed={handleTransform}
        panning={{
          velocityDisabled: true,
          excluded: ["draggable-component"],
        }}
        wheel={{
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
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
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
