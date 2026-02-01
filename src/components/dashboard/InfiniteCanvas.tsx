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
  getTransformForComponent,
  clampTransform,
} from "@/lib/canvasPlacement";

interface InfiniteCanvasProps {
  components: DashboardComponent[];
  isGM: boolean;
  campaignId: string;
  onComponentSelect: (component: DashboardComponent | null, shiftKey?: boolean) => void;
  selectedComponentId: string | null;
  multiSelectedIds?: Set<string>;
}

const ZOOM_STEP = 0.15;
const GRID_SIZE = 20;
const INITIAL_SCALE = 1.0;

export function InfiniteCanvas({
  components,
  isGM,
  campaignId,
  onComponentSelect,
  selectedComponentId,
  multiSelectedIds = new Set(),
}: InfiniteCanvasProps) {
  const transformRef = useRef<ReactZoomPanPinchRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [scale, setScale] = useState(INITIAL_SCALE);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Track which campaign we've centered on to handle campaign switching
  const centeredCampaignRef = useRef<string | null>(null);

  const { update: debouncedUpdate, flushNow } = useDebouncedComponentUpdate(campaignId);

  // Find the Campaign Console anchor widget
  const anchorComponent = useMemo(() => {
    return components.find((c) => c.component_type === "campaign-console");
  }, [components]);

  // Center on mount once the transform wrapper is ready
  useEffect(() => {
    if (isReady) return;
    
    const ref = transformRef.current;
    const container = containerRef.current;
    if (!ref || !container) return;

    // Small delay to ensure TransformWrapper is fully initialized
    const timer = setTimeout(() => {
      // If we have an anchor component (Campaign Console), center on it
      if (anchorComponent) {
        const { positionX, positionY } = getTransformForComponent(
          container.clientWidth,
          container.clientHeight,
          anchorComponent.position_x,
          anchorComponent.position_y,
          anchorComponent.width,
          anchorComponent.height,
          INITIAL_SCALE
        );
        const clamped = clampTransform(positionX, positionY, INITIAL_SCALE, container.clientWidth, container.clientHeight);
        ref.setTransform(clamped.positionX, clamped.positionY, INITIAL_SCALE, 0);
      } else {
        // No anchor - show top-center of canvas
        const { positionX, positionY } = getInitialTransform(
          container.clientWidth,
          container.clientHeight,
          INITIAL_SCALE
        );
        const clamped = clampTransform(positionX, positionY, INITIAL_SCALE, container.clientWidth, container.clientHeight);
        ref.setTransform(clamped.positionX, clamped.positionY, INITIAL_SCALE, 0);
      }
      setIsReady(true);
    }, 50);

    return () => clearTimeout(timer);
  }, [isReady, anchorComponent]);

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

  // Recenter on the anchor component (Campaign Console) or top of canvas
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
      const clamped = clampTransform(positionX, positionY, targetScale, container.clientWidth, container.clientHeight);
      ref.setTransform(clamped.positionX, clamped.positionY, targetScale, 200, "easeOut");
    } else {
      // No components - show top of canvas
      const { positionX, positionY } = getInitialTransform(
        container.clientWidth,
        container.clientHeight,
        targetScale
      );
      const clamped = clampTransform(positionX, positionY, targetScale, container.clientWidth, container.clientHeight);
      ref.setTransform(clamped.positionX, clamped.positionY, targetScale, 200, "easeOut");
    }
  }, [anchorComponent, components]);

  // Zoom toward viewport center with clamping
  const handleZoomIn = useCallback(() => {
    const ref = transformRef.current;
    const container = containerRef.current;
    if (!ref || !container) return;
    
    // Access state through instance property
    const state = ref.instance?.transformState;
    if (!state) return;
    
    const currentScale = state.scale ?? scale;
    const positionX = state.positionX ?? 0;
    const positionY = state.positionY ?? 0;
    const newScale = Math.min(2, currentScale + ZOOM_STEP);
    
    const centerX = container.clientWidth / 2;
    const centerY = container.clientHeight / 2;
    const scaleFactor = newScale / currentScale;
    const newPositionX = centerX - (centerX - positionX) * scaleFactor;
    const newPositionY = centerY - (centerY - positionY) * scaleFactor;
    
    const clamped = clampTransform(newPositionX, newPositionY, newScale, container.clientWidth, container.clientHeight);
    ref.setTransform(clamped.positionX, clamped.positionY, newScale, 150, "easeOut");
  }, [scale]);

  const handleZoomOut = useCallback(() => {
    const ref = transformRef.current;
    const container = containerRef.current;
    if (!ref || !container) return;
    
    // Access state through instance property
    const state = ref.instance?.transformState;
    if (!state) return;
    
    const currentScale = state.scale ?? scale;
    const positionX = state.positionX ?? 0;
    const positionY = state.positionY ?? 0;
    const newScale = Math.max(0.25, currentScale - ZOOM_STEP);
    
    const centerX = container.clientWidth / 2;
    const centerY = container.clientHeight / 2;
    const scaleFactor = newScale / currentScale;
    const newPositionX = centerX - (centerX - positionX) * scaleFactor;
    const newPositionY = centerY - (centerY - positionY) * scaleFactor;
    
    const clamped = clampTransform(newPositionX, newPositionY, newScale, container.clientWidth, container.clientHeight);
    ref.setTransform(clamped.positionX, clamped.positionY, newScale, 150, "easeOut");
  }, [scale]);

  const handleReset = useCallback(() => {
    handleRecenter();
  }, [handleRecenter]);

  const handleTransform = useCallback((ref: ReactZoomPanPinchRef) => {
    const state = ref.instance?.transformState;
    if (state) {
      setScale(state.scale);
    }
  }, []);

  const handlePanningStart = useCallback(() => setIsPanning(true), []);
  
  // Clamp position when panning stops to keep view within bounds
  const handlePanningStop = useCallback(() => {
    setIsPanning(false);
    
    const ref = transformRef.current;
    const container = containerRef.current;
    if (!ref || !container) return;
    
    const state = ref.instance?.transformState;
    if (!state) return;
    
    const { positionX, positionY } = clampTransform(
      state.positionX,
      state.positionY,
      state.scale,
      container.clientWidth,
      container.clientHeight
    );
    
    // Only update if position changed
    if (positionX !== state.positionX || positionY !== state.positionY) {
      ref.setTransform(positionX, positionY, state.scale, 150, "easeOut");
    }
  }, []);

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
      if (!transformRef.current?.instance?.transformState) return;
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
      className="relative w-full h-full overflow-hidden bg-background"
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
                isMultiSelected={multiSelectedIds.has(component.id) && multiSelectedIds.size > 1}
                onSelect={(shiftKey: boolean) => onComponentSelect(component, shiftKey)}
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
