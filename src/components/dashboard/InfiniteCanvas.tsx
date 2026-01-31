import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { DraggableComponent } from "./DraggableComponent";
import { CanvasControls } from "./CanvasControls";
import { CanvasGrid } from "./CanvasGrid";
import { DashboardComponent } from "@/hooks/useDashboardComponents";
import { useDebouncedComponentUpdate } from "@/hooks/useDebouncedComponentUpdate";
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  getInitialTransform, 
  getTransformForComponent 
} from "@/lib/canvasPlacement";

interface InfiniteCanvasProps {
  components: DashboardComponent[];
  isGM: boolean;
  campaignId: string;
  onComponentSelect: (component: DashboardComponent | null) => void;
  selectedComponentId: string | null;
}

const ZOOM_STEP = 0.15;
const GRID_SIZE = 20;
const INITIAL_SCALE = 0.5;

export function InfiniteCanvas({
  components,
  isGM,
  campaignId,
  onComponentSelect,
  selectedComponentId,
}: InfiniteCanvasProps) {
  const transformRef = useRef<ReactZoomPanPinchRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [scale, setScale] = useState(INITIAL_SCALE);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });

  // Track which campaign we've centered on to handle campaign switching
  const centeredCampaignRef = useRef<string | null>(null);

  const { update: debouncedUpdate, flushNow } = useDebouncedComponentUpdate(campaignId);

  // Find the Campaign Console anchor widget
  const anchorComponent = useMemo(() => {
    return components.find((c) => c.component_type === "campaign-console");
  }, [components]);

  // Calculate initial position when container is available
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const { positionX, positionY } = getInitialTransform(
      container.clientWidth,
      container.clientHeight,
      INITIAL_SCALE
    );
    setInitialPosition({ x: positionX, y: positionY });
  }, []);

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

  // Recenter on the anchor component (Campaign Console) or canvas center
  const handleRecenter = useCallback(() => {
    const ref = transformRef.current;
    const container = containerRef.current;
    if (!ref || !container) return;

    const targetScale = INITIAL_SCALE;
    
    // If we have an anchor component, center on it
    const targetComponent = anchorComponent || components[0];
    if (targetComponent) {
      const { positionX, positionY } = getTransformForComponent(
        container.clientWidth,
        container.clientHeight,
        targetComponent.position_x,
        targetComponent.position_y,
        targetComponent.width,
        targetComponent.height,
        targetScale
      );
      ref.setTransform(positionX, positionY, targetScale, 200, "easeOut");
    } else {
      // No components - center on canvas center
      const { positionX, positionY } = getInitialTransform(
        container.clientWidth,
        container.clientHeight,
        targetScale
      );
      ref.setTransform(positionX, positionY, targetScale, 200, "easeOut");
    }
  }, [anchorComponent, components]);

  // Zoom toward viewport center
  const handleZoomIn = useCallback(() => {
    const ref = transformRef.current;
    const container = containerRef.current;
    if (!ref || !container || !ref.state) return;
    
    const currentScale = ref.state.scale ?? scale;
    const positionX = ref.state.positionX ?? 0;
    const positionY = ref.state.positionY ?? 0;
    const newScale = Math.min(2, currentScale + ZOOM_STEP);
    
    const centerX = container.clientWidth / 2;
    const centerY = container.clientHeight / 2;
    const scaleFactor = newScale / currentScale;
    const newPositionX = centerX - (centerX - positionX) * scaleFactor;
    const newPositionY = centerY - (centerY - positionY) * scaleFactor;
    
    ref.setTransform(newPositionX, newPositionY, newScale, 150, "easeOut");
  }, [scale]);

  const handleZoomOut = useCallback(() => {
    const ref = transformRef.current;
    const container = containerRef.current;
    if (!ref || !container || !ref.state) return;
    
    const currentScale = ref.state.scale ?? scale;
    const positionX = ref.state.positionX ?? 0;
    const positionY = ref.state.positionY ?? 0;
    const newScale = Math.max(0.25, currentScale - ZOOM_STEP);
    
    const centerX = container.clientWidth / 2;
    const centerY = container.clientHeight / 2;
    const scaleFactor = newScale / currentScale;
    const newPositionX = centerX - (centerX - positionX) * scaleFactor;
    const newPositionY = centerY - (centerY - positionY) * scaleFactor;
    
    ref.setTransform(newPositionX, newPositionY, newScale, 150, "easeOut");
  }, [scale]);

  const handleReset = useCallback(() => {
    handleRecenter();
  }, [handleRecenter]);

  const handleTransform = useCallback((ref: ReactZoomPanPinchRef) => {
    setScale(ref.state.scale);
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

    // Wait for layout to stabilize
    const frame = requestAnimationFrame(() => {
      if (!transformRef.current?.state) return;
      centeredCampaignRef.current = campaignId;
      handleRecenter();
    });

    return () => cancelAnimationFrame(frame);
  }, [anchorComponent?.id, campaignId, handleRecenter]);

  // Keyboard shortcuts for zoom and navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
        initialScale={INITIAL_SCALE}
        initialPositionX={initialPosition.x}
        initialPositionY={initialPosition.y}
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
            width: `${CANVAS_WIDTH}px`,
            height: `${CANVAS_HEIGHT}px`,
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
            <div 
              className="absolute text-center pointer-events-none"
              style={{
                left: `${CANVAS_WIDTH / 2}px`,
                top: `${CANVAS_HEIGHT / 2}px`,
                transform: 'translate(-50%, -50%)',
              }}
            >
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
