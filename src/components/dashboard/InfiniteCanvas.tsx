import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { DraggableComponent } from "./DraggableComponent";
import { CanvasControls } from "./CanvasControls";
import { CanvasGrid } from "./CanvasGrid";
import { DashboardComponent, useUpdateComponent } from "@/hooks/useDashboardComponents";
import { writeCanvasTransform } from "@/lib/canvasPlacement";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const persistRafRef = useRef<number | null>(null);
  const latestTransformRef = useRef<{ scale: number; positionX: number; positionY: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [scale, setScale] = useState(0.5);
  const updateComponent = useUpdateComponent();

  // Find the Campaign Console anchor widget
  const anchorComponent = useMemo(() => {
    return components.find((c) => c.component_type === "campaign-console");
  }, [components]);

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

  // Recenter on the anchor component (Campaign Console) or first component
  const handleRecenter = useCallback(() => {
    const ref = transformRef.current;
    const container = containerRef.current;
    if (!ref || !container) return;

    // Find anchor or first component - read from current components
    const targetComponent = anchorComponent || components[0];
    if (!targetComponent) {
      // No components, center on a nice starting point
      ref.setTransform(container.clientWidth / 4, container.clientHeight / 4, 0.5, 200, "easeOut");
      return;
    }

    const containerRect = {
      width: container.clientWidth,
      height: container.clientHeight,
    };
    const targetScale = 0.5;

    // We want the component to appear centered in the viewport
    // Component is at position (position_x, position_y) in canvas space
    // At scale 0.5, the visual position is position * 0.5
    // To center it, we need: translateX + (position_x * scale) + (width * scale / 2) = containerWidth / 2
    // So: translateX = containerWidth / 2 - position_x * scale - width * scale / 2
    
    const newX = (containerRect.width / 2) - (targetComponent.position_x * targetScale) - (targetComponent.width * targetScale / 2);
    const newY = (containerRect.height / 2) - (targetComponent.position_y * targetScale) - (targetComponent.height * targetScale / 2);

    ref.setTransform(newX, newY, targetScale, 200, "easeOut");
  }, [anchorComponent, components]);

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
    handleRecenter();
  }, [handleRecenter]);

  const handleTransform = useCallback(
    (ref: ReactZoomPanPinchRef) => {
      setScale(ref.state.scale);

      latestTransformRef.current = {
        scale: ref.state.scale,
        positionX: ref.state.positionX,
        positionY: ref.state.positionY,
      };

      if (persistRafRef.current != null) return;
      persistRafRef.current = window.requestAnimationFrame(() => {
        persistRafRef.current = null;
        const container = containerRef.current;
        const latest = latestTransformRef.current;
        if (!container || !latest) return;
        writeCanvasTransform(campaignId, {
          ...latest,
          viewportWidth: container.clientWidth,
          viewportHeight: container.clientHeight,
        });
      });
    },
    [campaignId]
  );

  useEffect(() => {
    return () => {
      if (persistRafRef.current != null) {
        window.cancelAnimationFrame(persistRafRef.current);
      }
    };
  }, []);

  const handlePanningStart = useCallback(() => setIsPanning(true), []);
  const handlePanningStop = useCallback(() => setIsPanning(false), []);

  // Auto-center when anchor component first appears
  const anchorId = anchorComponent?.id;
  useEffect(() => {
    if (anchorId && transformRef.current && containerRef.current) {
      // Delay to ensure component is rendered
      const timer = setTimeout(() => {
        handleRecenter();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [anchorId]); // Only trigger when anchor component ID changes

  // Persist an initial snapshot so newly-created components can be centered even
  // before the user pans/zooms.
  useEffect(() => {
    const ref = transformRef.current;
    const container = containerRef.current;
    if (!ref || !container) return;

    const timer = window.setTimeout(() => {
      writeCanvasTransform(campaignId, {
        scale: ref.state.scale,
        positionX: ref.state.positionX,
        positionY: ref.state.positionY,
        viewportWidth: container.clientWidth,
        viewportHeight: container.clientHeight,
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [campaignId]);

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
      ref={containerRef}
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
        onRecenter={handleRecenter}
      />

      {/* Zoom/Pan Container */}
      <TransformWrapper
        ref={transformRef}
        initialScale={0.5}
        initialPositionX={100}
        initialPositionY={100}
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
