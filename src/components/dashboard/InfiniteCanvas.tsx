import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import { createGrabPointPreservingModifier } from "./dragOverlayModifiers";
import { AnimatePresence } from "framer-motion";
import { DraggableComponent } from "./DraggableComponent";
import { WidgetDragPreview } from "./WidgetDragPreview";
import { CanvasControls, AnnotationTool } from "./CanvasControls";
import { CanvasGrid } from "./CanvasGrid";
import { AnnotationLayer } from "./AnnotationLayer";
import { DashboardComponent } from "@/hooks/useDashboardComponents";
import { useDebouncedComponentUpdate } from "@/hooks/useDebouncedComponentUpdate";
import { useCanvasAnnotations, useCreateAnnotation } from "@/hooks/useCanvasAnnotations";
import { useAuth } from "@/hooks/useAuth";
import { getCanvasDimensions, getInitialTransform, getTransformForComponent, clampTransform } from "@/lib/canvasPlacement";

interface InfiniteCanvasProps {
  components: DashboardComponent[];
  isGM: boolean;
  campaignId: string;
  onComponentSelect: (component: DashboardComponent | null, shiftKey?: boolean) => void;
  selectedComponentId: string | null;
  multiSelectedIds?: Set<string>;
  onMarqueeSelect?: (ids: string[]) => void;
  canAnnotate?: boolean;
}

const ZOOM_STEP = 0.1;
const GRID_SIZE = 40;
const INITIAL_SCALE = 1.0;

export function InfiniteCanvas({
  components,
  isGM,
  campaignId,
  onComponentSelect,
  selectedComponentId,
  multiSelectedIds = new Set(),
  onMarqueeSelect,
  canAnnotate = false,
}: InfiniteCanvasProps) {
  const { user } = useAuth();
  const transformRef = useRef<ReactZoomPanPinchRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [scale, setScale] = useState(INITIAL_SCALE);
  const [isReady, setIsReady] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: 1200, height: 800 });

  // Track canvas-wide interaction state for paint reduction
  const [isAnyDragging, setIsAnyDragging] = useState(false);
  const [isAnyResizing, setIsAnyResizing] = useState(false);
  const [shiftHeld, setShiftHeld] = useState(false);

  // DragOverlay state
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [pendingDrop, setPendingDrop] = useState<
    { id: string; x: number; y: number } | null
  >(null);

  // Marquee selection state
  const [marquee, setMarquee] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const marqueeStartRef = useRef<{ canvasX: number; canvasY: number } | null>(null);

  // Annotation tool state
  const [activeTool, setActiveTool] = useState<AnnotationTool>(null);
  const [annotationColor, setAnnotationColor] = useState("#22c55e");
  const drawStartRef = useRef<{ canvasX: number; canvasY: number } | null>(null);
  const [drawPreview, setDrawPreview] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Annotations data
  const { data: annotations = [] } = useCanvasAnnotations(campaignId);
  const createAnnotation = useCreateAnnotation();

  // Track which campaign we've centered on to handle campaign switching
  const centeredCampaignRef = useRef<string | null>(null);

  const { update: debouncedUpdate, flushNow, saveStatus, retry: retrySave } =
    useDebouncedComponentUpdate(campaignId);

  // Calculate responsive canvas dimensions based on viewport
  const canvasDimensions = useMemo(
    () => getCanvasDimensions(viewportSize.width, viewportSize.height),
    [viewportSize.width, viewportSize.height]
  );

  // Track viewport size for responsive canvas
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      setViewportSize({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    };

    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

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

    const timer = setTimeout(() => {
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
        const clamped = clampTransform(
          positionX, positionY, INITIAL_SCALE,
          container.clientWidth, container.clientHeight,
          canvasDimensions.width, canvasDimensions.height
        );
        ref.setTransform(clamped.positionX, clamped.positionY, INITIAL_SCALE, 0);
      } else {
        const { positionX, positionY } = getInitialTransform(
          container.clientWidth, container.clientHeight, INITIAL_SCALE
        );
        const clamped = clampTransform(
          positionX, positionY, INITIAL_SCALE,
          container.clientWidth, container.clientHeight,
          canvasDimensions.width, canvasDimensions.height
        );
        ref.setTransform(clamped.positionX, clamped.positionY, INITIAL_SCALE, 0);
      }
      setIsReady(true);
    }, 50);

    return () => clearTimeout(timer);
  }, [isReady, anchorComponent, canvasDimensions.width, canvasDimensions.height]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 3 },
    })
  );

  const snapPosition = useCallback((value: number) => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  }, []);

  // Helper to convert viewport coords to canvas coords
  const viewportToCanvas = useCallback((clientX: number, clientY: number, container: HTMLElement) => {
    const ref = transformRef.current;
    const state = ref?.instance?.transformState;
    if (!state) return null;
    const rect = container.getBoundingClientRect();
    const viewportX = clientX - rect.left;
    const viewportY = clientY - rect.top;
    return {
      canvasX: (viewportX - state.positionX) / state.scale,
      canvasY: (viewportY - state.positionY) / state.scale,
    };
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setPendingDrop(null);
    setIsAnyDragging(true);
    setActiveDragId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, delta } = event;
      const componentId = active.id as string;
      const component = components.find((c) => c.id === componentId);

      if (!component || !isGM) {
        setIsAnyDragging(false);
        setActiveDragId(null);
        setPendingDrop(null);
        return;
      }

      const deltaX = delta.x / scale;
      const deltaY = delta.y / scale;

      const newX = snapPosition(component.position_x + deltaX);
      const newY = snapPosition(component.position_y + deltaY);

      console.log('[DnD Drop]', {
        delta, scale,
        oldPos: { x: component.position_x, y: component.position_y },
        newPos: { x: newX, y: newY },
      });

      if (newX === component.position_x && newY === component.position_y) {
        setIsAnyDragging(false);
        setActiveDragId(null);
        setPendingDrop(null);
        return;
      }

      setPendingDrop({ id: componentId, x: newX, y: newY });

      debouncedUpdate({
        id: componentId,
        position_x: newX,
        position_y: newY,
      });

      if (multiSelectedIds.size > 1 && multiSelectedIds.has(componentId)) {
        components.forEach((c) => {
          if (c.id !== componentId && multiSelectedIds.has(c.id)) {
            debouncedUpdate({
              id: c.id,
              position_x: snapPosition(c.position_x + deltaX),
              position_y: snapPosition(c.position_y + deltaY),
            });
          }
        });
      }

      flushNow();
    },
    [components, isGM, scale, debouncedUpdate, flushNow, snapPosition, multiSelectedIds]
  );

  const handleDragCancel = useCallback(() => {
    setIsAnyDragging(false);
    setActiveDragId(null);
    setPendingDrop(null);
  }, []);

  useEffect(() => {
    if (!pendingDrop) return;

    const c = components.find((x) => x.id === pendingDrop.id);
    if (c && c.position_x === pendingDrop.x && c.position_y === pendingDrop.y) {
      setActiveDragId(null);
      setIsAnyDragging(false);
      setPendingDrop(null);
      return;
    }

    const t = setTimeout(() => {
      setActiveDragId(null);
      setIsAnyDragging(false);
      setPendingDrop(null);
    }, 250);

    return () => clearTimeout(t);
  }, [pendingDrop, components]);

  const handleRecenter = useCallback(() => {
    const ref = transformRef.current;
    const container = containerRef.current;
    if (!ref || !container) return;

    const targetScale = INITIAL_SCALE;
    const targetComponent = anchorComponent || components[0];
    if (targetComponent) {
      const { positionX, positionY } = getTransformForComponent(
        container.clientWidth, container.clientHeight,
        targetComponent.position_x, targetComponent.position_y,
        targetComponent.width, targetComponent.height, targetScale
      );
      const clamped = clampTransform(positionX, positionY, targetScale, container.clientWidth, container.clientHeight, canvasDimensions.width, canvasDimensions.height);
      ref.setTransform(clamped.positionX, clamped.positionY, targetScale, 200, "easeOut");
    } else {
      const { positionX, positionY } = getInitialTransform(container.clientWidth, container.clientHeight, targetScale);
      const clamped = clampTransform(positionX, positionY, targetScale, container.clientWidth, container.clientHeight, canvasDimensions.width, canvasDimensions.height);
      ref.setTransform(clamped.positionX, clamped.positionY, targetScale, 200, "easeOut");
    }
  }, [anchorComponent, components, canvasDimensions.width, canvasDimensions.height]);

  const handleZoomIn = useCallback(() => {
    const ref = transformRef.current;
    const container = containerRef.current;
    if (!ref || !container) return;
    const state = ref.instance?.transformState;
    if (!state) return;
    const currentScale = state.scale ?? scale;
    const positionX = state.positionX ?? 0;
    const positionY = state.positionY ?? 0;
    const newScale = Math.min(2, Math.round((currentScale + ZOOM_STEP) * 10) / 10);
    const centerX = container.clientWidth / 2;
    const centerY = container.clientHeight / 2;
    const scaleFactor = newScale / currentScale;
    const newPositionX = centerX - (centerX - positionX) * scaleFactor;
    const newPositionY = centerY - (centerY - positionY) * scaleFactor;
    const clamped = clampTransform(newPositionX, newPositionY, newScale, container.clientWidth, container.clientHeight, canvasDimensions.width, canvasDimensions.height);
    ref.setTransform(clamped.positionX, clamped.positionY, newScale, 150, "easeOut");
  }, [scale, canvasDimensions.width, canvasDimensions.height]);

  const handleZoomOut = useCallback(() => {
    const ref = transformRef.current;
    const container = containerRef.current;
    if (!ref || !container) return;
    const state = ref.instance?.transformState;
    if (!state) return;
    const currentScale = state.scale ?? scale;
    const positionX = state.positionX ?? 0;
    const positionY = state.positionY ?? 0;
    const newScale = Math.max(0.3, Math.round((currentScale - ZOOM_STEP) * 10) / 10);
    const centerX = container.clientWidth / 2;
    const centerY = container.clientHeight / 2;
    const scaleFactor = newScale / currentScale;
    const newPositionX = centerX - (centerX - positionX) * scaleFactor;
    const newPositionY = centerY - (centerY - positionY) * scaleFactor;
    const clamped = clampTransform(newPositionX, newPositionY, newScale, container.clientWidth, container.clientHeight, canvasDimensions.width, canvasDimensions.height);
    ref.setTransform(clamped.positionX, clamped.positionY, newScale, 150, "easeOut");
  }, [scale, canvasDimensions.width, canvasDimensions.height]);

  const handleReset = useCallback(() => {
    handleRecenter();
  }, [handleRecenter]);

  const handleTransform = useCallback((ref: ReactZoomPanPinchRef) => {
    const state = ref.instance?.transformState;
    if (state) setScale(state.scale);
  }, []);

  const handlePanningStart = useCallback(() => setIsPanning(true), []);
  const handlePanningStop = useCallback(() => setIsPanning(false), []);

  // Auto-center when anchor component first appears or on campaign switch
  useEffect(() => {
    const ref = transformRef.current;
    const container = containerRef.current;
    if (!ref || !container) return;
    if (!anchorComponent) return;
    if (centeredCampaignRef.current === campaignId) return;

    const frame = requestAnimationFrame(() => {
      if (!transformRef.current?.instance?.transformState) return;
      centeredCampaignRef.current = campaignId;
      handleRecenter();
    });

    return () => cancelAnimationFrame(frame);
  }, [anchorComponent?.id, campaignId, handleRecenter]);

  // Keyboard shortcuts for zoom, navigation, and annotation tools
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
      } else if (e.key === 'Escape') {
        setActiveTool(null);
        setDrawPreview(null);
        drawStartRef.current = null;
      } else if (canAnnotate) {
        if (e.key === 't' || e.key === 'T') {
          setActiveTool(prev => prev === 'text' ? null : 'text');
        } else if (e.key === 'l' || e.key === 'L') {
          setActiveTool(prev => prev === 'line' ? null : 'line');
        } else if (e.key === 'r' || e.key === 'R') {
          setActiveTool(prev => prev === 'rectangle' ? null : 'rectangle');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleZoomIn, handleZoomOut, handleReset, handleRecenter, canAnnotate]);

  // Track Shift key for marquee selection (disables panning)
  useEffect(() => {
    if (!isGM) return;
    const down = (e: KeyboardEvent) => { if (e.key === 'Shift') setShiftHeld(true); };
    const up = (e: KeyboardEvent) => { if (e.key === 'Shift') setShiftHeld(false); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', () => setShiftHeld(false));
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [isGM]);

  // Handle wheel events
  const handleCanvasWheel = useCallback((e: React.WheelEvent) => {
    const target = e.target as HTMLElement;
    const scrollableParent = target.closest('[data-scrollable="true"]');
    if (scrollableParent) return;

    e.preventDefault();
    e.stopPropagation();

    const ref = transformRef.current;
    const container = containerRef.current;
    if (!ref || !container) return;

    const state = ref.instance?.transformState;
    if (!state) return;

    const currentScale = state.scale ?? scale;
    const positionX = state.positionX ?? 0;
    const positionY = state.positionY ?? 0;

    const direction = e.deltaY < 0 ? 1 : -1;
    const newScale = Math.max(0.3, Math.min(2, Math.round((currentScale + direction * ZOOM_STEP) * 10) / 10));

    if (newScale === currentScale) return;

    const rect = container.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;
    const scaleFactor = newScale / currentScale;
    const newPositionX = cursorX - (cursorX - positionX) * scaleFactor;
    const newPositionY = cursorY - (cursorY - positionY) * scaleFactor;

    const clamped = clampTransform(newPositionX, newPositionY, newScale, container.clientWidth, container.clientHeight, canvasDimensions.width, canvasDimensions.height);
    ref.setTransform(clamped.positionX, clamped.positionY, newScale, 100, "easeOut");
  }, [scale, canvasDimensions.width, canvasDimensions.height]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    // If text tool is active and we click on empty canvas, create a text annotation
    if (activeTool === 'text' && canAnnotate) {
      const container = containerRef.current;
      if (!container) return;
      const target = e.target as HTMLElement;
      if (target.closest('[data-draggable-component]') || target.closest('[data-annotation]')) return;

      const coords = viewportToCanvas(e.clientX, e.clientY, container);
      if (!coords) return;

      const snappedX = snapPosition(coords.canvasX);
      const snappedY = snapPosition(coords.canvasY);

      createAnnotation.mutate({
        campaign_id: campaignId,
        annotation_type: 'text',
        position_x: snappedX,
        position_y: snappedY,
        width: 200,
        height: 40,
        color: annotationColor,
        font_size: 16,
        content: '',
      });
      return;
    }

    onComponentSelect(null);
  }, [onComponentSelect, activeTool, canAnnotate, campaignId, annotationColor, viewportToCanvas, snapPosition, createAnnotation]);

  // Handle resize COMMIT
  const handleComponentResize = useCallback(
    (id: string, width: number, height: number) => {
      const snappedWidth = Math.round(width / GRID_SIZE) * GRID_SIZE;
      const snappedHeight = Math.round(height / GRID_SIZE) * GRID_SIZE;
      debouncedUpdate({ id, width: snappedWidth, height: snappedHeight });
      flushNow();
    },
    [debouncedUpdate, flushNow]
  );

  const handleResizeStart = useCallback(() => setIsAnyResizing(true), []);
  const handleResizeEnd = useCallback(() => setIsAnyResizing(false), []);

  const activeDragComponent = useMemo(() => {
    if (!activeDragId) return null;
    return components.find((c) => c.id === activeDragId) ?? null;
  }, [activeDragId, components]);

  // Marquee + drawing handlers
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;
    const target = e.target as HTMLElement;

    // Drawing tool: line or rectangle
    if ((activeTool === 'line' || activeTool === 'rectangle') && canAnnotate && e.button === 0) {
      if (target.closest('[data-draggable-component]') || target.closest('[data-annotation]')) return;
      e.preventDefault();
      e.stopPropagation();

      const coords = viewportToCanvas(e.clientX, e.clientY, container);
      if (!coords) return;

      drawStartRef.current = { canvasX: snapPosition(coords.canvasX), canvasY: snapPosition(coords.canvasY) };
      setDrawPreview({ x: snapPosition(coords.canvasX), y: snapPosition(coords.canvasY), w: 0, h: 0 });
      return;
    }

    // Marquee selection
    if (!isGM || !e.shiftKey || e.button !== 0) return;
    if (target.closest('[data-draggable-component]')) return;

    e.preventDefault();
    e.stopPropagation();

    const coords = viewportToCanvas(e.clientX, e.clientY, container);
    if (!coords) return;

    marqueeStartRef.current = coords;
    setMarquee({ startX: coords.canvasX, startY: coords.canvasY, currentX: coords.canvasX, currentY: coords.canvasY });
  }, [isGM, activeTool, canAnnotate, viewportToCanvas, snapPosition]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;

    // Drawing preview
    if (drawStartRef.current && drawPreview) {
      const coords = viewportToCanvas(e.clientX, e.clientY, container);
      if (!coords) return;
      const snappedX = snapPosition(coords.canvasX);
      const snappedY = snapPosition(coords.canvasY);
      setDrawPreview({
        x: Math.min(drawStartRef.current.canvasX, snappedX),
        y: Math.min(drawStartRef.current.canvasY, snappedY),
        w: Math.abs(snappedX - drawStartRef.current.canvasX),
        h: Math.abs(snappedY - drawStartRef.current.canvasY),
      });
      return;
    }

    // Marquee
    if (!marquee || !marqueeStartRef.current) return;

    const coords = viewportToCanvas(e.clientX, e.clientY, container);
    if (!coords) return;

    setMarquee(prev => prev ? { ...prev, currentX: coords.canvasX, currentY: coords.canvasY } : null);
  }, [marquee, drawPreview, viewportToCanvas, snapPosition]);

  const handleCanvasMouseUp = useCallback((e: React.MouseEvent) => {
    // Finish drawing
    if (drawStartRef.current && drawPreview && canAnnotate) {
      const container = containerRef.current;
      if (container) {
        const coords = viewportToCanvas(e.clientX, e.clientY, container);
        if (coords) {
          const endX = snapPosition(coords.canvasX);
          const endY = snapPosition(coords.canvasY);
          const startX = drawStartRef.current.canvasX;
          const startY = drawStartRef.current.canvasY;

          // Only create if there's meaningful size
          if (Math.abs(endX - startX) > 10 || Math.abs(endY - startY) > 10) {
            if (activeTool === 'line') {
              createAnnotation.mutate({
                campaign_id: campaignId,
                annotation_type: 'line',
                position_x: startX,
                position_y: startY,
                end_x: endX,
                end_y: endY,
                color: annotationColor,
              });
            } else if (activeTool === 'rectangle') {
              createAnnotation.mutate({
                campaign_id: campaignId,
                annotation_type: 'rectangle',
                position_x: Math.min(startX, endX),
                position_y: Math.min(startY, endY),
                width: Math.abs(endX - startX),
                height: Math.abs(endY - startY),
                color: annotationColor,
              });
            }
          }
        }
      }

      drawStartRef.current = null;
      setDrawPreview(null);
      return;
    }

    // Marquee
    if (!marquee || !onMarqueeSelect) {
      setMarquee(null);
      marqueeStartRef.current = null;
      return;
    }

    const left = Math.min(marquee.startX, marquee.currentX);
    const right = Math.max(marquee.startX, marquee.currentX);
    const top = Math.min(marquee.startY, marquee.currentY);
    const bottom = Math.max(marquee.startY, marquee.currentY);

    if (right - left > 10 && bottom - top > 10) {
      const hitIds = components
        .filter(c => {
          return c.position_x + c.width > left && c.position_x < right && c.position_y + c.height > top && c.position_y < bottom;
        })
        .map(c => c.id);

      onMarqueeSelect(hitIds);
    }

    setMarquee(null);
    marqueeStartRef.current = null;
  }, [marquee, components, onMarqueeSelect, drawPreview, activeTool, canAnnotate, campaignId, annotationColor, viewportToCanvas, snapPosition, createAnnotation]);

  const marqueeRect = useMemo(() => {
    if (!marquee) return null;
    return {
      left: Math.min(marquee.startX, marquee.currentX),
      top: Math.min(marquee.startY, marquee.currentY),
      width: Math.abs(marquee.currentX - marquee.startX),
      height: Math.abs(marquee.currentY - marquee.startY),
    };
  }, [marquee]);

  // Cursor style based on active tool
  const cursorClass = useMemo(() => {
    if (activeTool === 'text') return 'cursor-text';
    if (activeTool === 'line' || activeTool === 'rectangle') return 'cursor-crosshair';
    if (shiftHeld && isGM) return 'cursor-crosshair';
    return '';
  }, [activeTool, shiftHeld, isGM]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-background ${cursorClass}`}
      onWheel={handleCanvasWheel}
      onClick={handleCanvasClick}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onMouseLeave={() => { handleCanvasMouseUp({} as React.MouseEvent); }}
    >
      {/* Canvas Controls */}
      <CanvasControls
        scale={scale}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleReset}
        onRecenter={handleRecenter}
        saveStatus={saveStatus}
        onRetry={retrySave}
        activeTool={activeTool}
        onToolChange={canAnnotate ? setActiveTool : undefined}
        annotationColor={annotationColor}
        onColorChange={canAnnotate ? setAnnotationColor : undefined}
        canAnnotate={canAnnotate}
      />

      {/* DnD Context wraps everything - DragOverlay is OUTSIDE TransformWrapper */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
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
            disabled: shiftHeld || activeTool !== null,
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
              width: `${canvasDimensions.width}px`,
              height: `${canvasDimensions.height}px`,
            }}
          >
            {/* Grid Background */}
            <CanvasGrid />

            {/* Marquee selection rectangle */}
            {marqueeRect && (
              <div
                className="absolute border-2 border-primary bg-primary/10 pointer-events-none z-50"
                style={{
                  left: marqueeRect.left,
                  top: marqueeRect.top,
                  width: marqueeRect.width,
                  height: marqueeRect.height,
                  boxShadow: '0 0 8px hsl(var(--primary) / 0.4)',
                }}
              />
            )}

            {/* Draw preview for line/rect tools */}
            {drawPreview && activeTool === 'rectangle' && (
              <div
                className="absolute pointer-events-none z-40"
                style={{
                  left: drawPreview.x,
                  top: drawPreview.y,
                  width: drawPreview.w,
                  height: drawPreview.h,
                  border: `2px dashed ${annotationColor}`,
                  borderRadius: 2,
                  opacity: 0.7,
                }}
              />
            )}
            {drawPreview && activeTool === 'line' && drawStartRef.current && (
              <svg
                className="absolute inset-0 pointer-events-none z-40"
                width={canvasDimensions.width}
                height={canvasDimensions.height}
              >
                <line
                  x1={drawStartRef.current.canvasX}
                  y1={drawStartRef.current.canvasY}
                  x2={drawPreview.x + drawPreview.w}
                  y2={drawPreview.y + drawPreview.h}
                  stroke={annotationColor}
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  opacity={0.7}
                />
              </svg>
            )}

            {/* Annotation layer */}
            <AnnotationLayer
              annotations={annotations}
              campaignId={campaignId}
              userId={user?.id}
              isGM={isGM}
              activeTool={activeTool}
              scale={scale}
            />

            {/* Draggable components inside the scaled canvas */}
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
                onResizeStart={handleResizeStart}
                onResizeEnd={handleResizeEnd}
                isAnyDragging={isAnyDragging}
                isAnyResizing={isAnyResizing}
                isOverlayActive={activeDragId === component.id}
                useDragOverlay={true}
              />
            ))}

            {/* Empty state */}
            {components.length === 0 && (
              <div
                className="absolute text-center pointer-events-none"
                style={{
                  left: `${canvasDimensions.width / 2}px`,
                  top: `${canvasDimensions.height / 2}px`,
                  transform: "translate(-50%, -50%)",
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

        {/* DragOverlay is OUTSIDE TransformWrapper - renders in viewport coordinates */}
        <DragOverlay dropAnimation={null} modifiers={[createGrabPointPreservingModifier(scale)]}>
          <AnimatePresence>
            {activeDragComponent ? (
              <WidgetDragPreview
                key={activeDragComponent.id}
                component={activeDragComponent}
                mode="overlay"
                scale={scale}
              />
            ) : null}
          </AnimatePresence>
        </DragOverlay>
      </DndContext>
    </div>
  );
}
