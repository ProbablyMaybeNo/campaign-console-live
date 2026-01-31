import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { DraggableComponent } from "./DraggableComponent";
import { CanvasControls } from "./CanvasControls";
import { CanvasGrid } from "./CanvasGrid";
import { DashboardComponent } from "@/hooks/useDashboardComponents";
import { useDebouncedComponentUpdate } from "@/hooks/useDebouncedComponentUpdate";
import { writeCanvasTransform } from "@/lib/canvasPlacement";

interface InfiniteCanvasProps {
  components: DashboardComponent[];
  isGM: boolean;
  campaignId: string;
  onComponentSelect: (component: DashboardComponent | null) => void;
  selectedComponentId: string | null;
}

const ZOOM_STEP = 0.15;
const GRID_SIZE = 20;

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
  const [snapToGrid, setSnapToGrid] = useState(false);

  // Track which campaign we've centered on to handle campaign switching
  const centeredCampaignRef = useRef<string | null>(null);

  const { update: debouncedUpdate, flushNow } = useDebouncedComponentUpdate(campaignId);

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

  const snapPosition = useCallback((value: number) => {
    if (!snapToGrid) return Math.round(value);
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  }, [snapToGrid]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, delta } = event;
      const componentId = active.id as string;
      const component = components.find((c) => c.id === componentId);

      if (component && isGM) {
        const newX = snapPosition(component.position_x + delta.x / scale);
        const newY = snapPosition(component.position_y + delta.y / scale);

        debouncedUpdate({
          id: componentId,
          position_x: newX,
          position_y: newY,
        });
        flushNow(); // Flush immediately on drag end
      }
    },
    [components, isGM, scale, debouncedUpdate, flushNow, snapPosition]
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

  // Zoom toward viewport center by calculating the new transform manually
  const handleZoomIn = useCallback(() => {
    const ref = transformRef.current;
    const container = containerRef.current;
    if (!ref || !container) return;
    
    const { scale: currentScale, positionX, positionY } = ref.state;
    const newScale = Math.min(2, currentScale + ZOOM_STEP);
    
    // Calculate zoom centered on viewport center
    const centerX = container.clientWidth / 2;
    const centerY = container.clientHeight / 2;
    const scaleFactor = newScale / currentScale;
    const newPositionX = centerX - (centerX - positionX) * scaleFactor;
    const newPositionY = centerY - (centerY - positionY) * scaleFactor;
    
    ref.setTransform(newPositionX, newPositionY, newScale, 150, "easeOut");
  }, []);

  const handleZoomOut = useCallback(() => {
    const ref = transformRef.current;
    const container = containerRef.current;
    if (!ref || !container) return;
    
    const { scale: currentScale, positionX, positionY } = ref.state;
    const newScale = Math.max(0.25, currentScale - ZOOM_STEP);
    
    // Calculate zoom centered on viewport center
    const centerX = container.clientWidth / 2;
    const centerY = container.clientHeight / 2;
    const scaleFactor = newScale / currentScale;
    const newPositionX = centerX - (centerX - positionX) * scaleFactor;
    const newPositionY = centerY - (centerY - positionY) * scaleFactor;
    
    ref.setTransform(newPositionX, newPositionY, newScale, 150, "easeOut");
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

  // Auto-center when anchor component first appears or on campaign switch
  useEffect(() => {
    const ref = transformRef.current;
    const container = containerRef.current;
    if (!ref || !container) return;

    // Only center if we have an anchor and haven't centered this campaign yet
    if (!anchorComponent) return;
    if (centeredCampaignRef.current === campaignId) return;

    // Wait for layout to stabilize using requestAnimationFrame
    const frame = requestAnimationFrame(() => {
      centeredCampaignRef.current = campaignId;
      handleRecenter();
    });

    return () => cancelAnimationFrame(frame);
  }, [anchorComponent?.id, campaignId, handleRecenter]);

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

  // Keyboard shortcuts for zoom and navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

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
      } else if (e.key === 'Home') {
        e.preventDefault();
        handleRecenter();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleZoomIn, handleZoomOut, handleReset, handleRecenter]);

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

  // Handle resize with scale compensation
  const handleComponentResize = useCallback(
    (id: string, width: number, height: number) => {
      const snappedWidth = snapToGrid ? Math.round(width / GRID_SIZE) * GRID_SIZE : Math.round(width);
      const snappedHeight = snapToGrid ? Math.round(height / GRID_SIZE) * GRID_SIZE : Math.round(height);
      
      debouncedUpdate({
        id,
        width: snappedWidth,
        height: snappedHeight,
      });
    },
    [debouncedUpdate, snapToGrid]
  );

  const handleResizeEnd = useCallback(() => {
    flushNow();
  }, [flushNow]);

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
        snapToGrid={snapToGrid}
        onToggleSnap={() => setSnapToGrid(!snapToGrid)}
      />

      {/* Zoom/Pan Container */}
      <TransformWrapper
        ref={transformRef}
        initialScale={0.5}
        initialPositionX={0}
        initialPositionY={0}
        minScale={0.25}
        maxScale={2}
        limitToBounds={false}
        onPanningStart={handlePanningStart}
        onPanningStop={handlePanningStop}
        onTransformed={handleTransform}
        smooth={true}
        panning={{
          velocityDisabled: false,
          excluded: ["draggable-component"],
        }}
        wheel={{
          disabled: true,
        }}
        doubleClick={{
          disabled: true,
        }}
        velocityAnimation={{
          sensitivity: 1,
          animationTime: 200,
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
                scale={scale}
                onResize={handleComponentResize}
                onResizeEnd={handleResizeEnd}
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
