import { memo, useState, useCallback, useRef, useEffect } from "react";
import { CanvasAnnotation, useUpdateAnnotation, useDeleteAnnotation } from "@/hooks/useCanvasAnnotations";
import { Trash2, Lock, Unlock, Move, GripVertical } from "lucide-react";

const GRID_SIZE = 40;
const snap = (v: number) => Math.round(v / GRID_SIZE) * GRID_SIZE;

interface AnnotationLayerProps {
  annotations: CanvasAnnotation[];
  campaignId: string;
  userId: string | undefined;
  isGM: boolean;
  activeTool: string | null;
  scale: number;
}

interface AnnotationItemProps {
  annotation: CanvasAnnotation;
  campaignId: string;
  userId: string | undefined;
  isGM: boolean;
  scale: number;
}

const AnnotationItem = memo(function AnnotationItem({
  annotation,
  campaignId,
  userId,
  isGM,
  scale,
}: AnnotationItemProps) {
  const updateAnnotation = useUpdateAnnotation();
  const deleteAnnotation = useDeleteAnnotation();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(annotation.content);
  const [isDragging, setIsDragging] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);

  const canEdit = userId === annotation.creator_id || isGM;
  const isLocked = annotation.is_locked;

  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [isEditing]);

  const handleDragStart = useCallback(
    (e: React.PointerEvent) => {
      if (isLocked || !canEdit) return;
      e.preventDefault();
      e.stopPropagation();
      const el = e.currentTarget as HTMLElement;
      el.setPointerCapture(e.pointerId);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: annotation.position_x,
        origY: annotation.position_y,
      };
      setIsDragging(true);
    },
    [annotation.position_x, annotation.position_y, isLocked, canEdit]
  );

  const handleDragMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current || !isDragging) return;
      e.preventDefault();
      e.stopPropagation();
      const dx = (e.clientX - dragRef.current.startX) / scale;
      const dy = (e.clientY - dragRef.current.startY) / scale;
      const el = e.currentTarget.closest("[data-annotation]") as HTMLElement;
      if (el) {
        el.style.left = `${snap(dragRef.current.origX + dx)}px`;
        el.style.top = `${snap(dragRef.current.origY + dy)}px`;
      }
    },
    [isDragging, scale]
  );

  const handleDragEnd = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      e.preventDefault();
      const dx = (e.clientX - dragRef.current.startX) / scale;
      const dy = (e.clientY - dragRef.current.startY) / scale;
      const newX = snap(dragRef.current.origX + dx);
      const newY = snap(dragRef.current.origY + dy);
      if (newX !== annotation.position_x || newY !== annotation.position_y) {
        updateAnnotation.mutate({ id: annotation.id, position_x: newX, position_y: newY });
      }
      dragRef.current = null;
      setIsDragging(false);
    },
    [annotation.id, annotation.position_x, annotation.position_y, scale, updateAnnotation]
  );

  const handleDelete = useCallback(() => {
    deleteAnnotation.mutate({ id: annotation.id, campaignId });
  }, [annotation.id, campaignId, deleteAnnotation]);

  const handleToggleLock = useCallback(() => {
    updateAnnotation.mutate({ id: annotation.id, is_locked: !isLocked });
  }, [annotation.id, isLocked, updateAnnotation]);

  const handleFinishEdit = useCallback(() => {
    setIsEditing(false);
    if (editContent !== annotation.content) {
      updateAnnotation.mutate({ id: annotation.id, content: editContent });
    }
  }, [editContent, annotation.content, annotation.id, updateAnnotation]);

  // Text annotation
  if (annotation.annotation_type === "text") {
    return (
      <div
        data-annotation
        className="absolute group"
        style={{
          left: annotation.position_x,
          top: annotation.position_y,
          width: annotation.width,
          minHeight: annotation.height,
          zIndex: 25,
          cursor: isLocked ? "default" : "default",
        }}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => { if (!isEditing) setShowControls(false); }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        {canEdit && showControls && !isLocked && (
          <div
            className="absolute -top-6 left-0 flex items-center gap-1 bg-card/95 border border-border rounded px-1 py-0.5 z-30 cursor-grab active:cursor-grabbing"
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
          >
            <GripVertical className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground font-mono">MOVE</span>
          </div>
        )}

        {/* Controls */}
        {canEdit && showControls && (
          <div className="absolute -top-6 right-0 flex items-center gap-0.5 bg-card/95 border border-border rounded px-0.5 py-0.5 z-30">
            <button
              className="p-0.5 hover:bg-muted rounded"
              onClick={handleToggleLock}
              title={isLocked ? "Unlock" : "Lock"}
            >
              {isLocked ? (
                <Lock className="w-3 h-3 text-primary" />
              ) : (
                <Unlock className="w-3 h-3 text-muted-foreground" />
              )}
            </button>
            <button
              className="p-0.5 hover:bg-destructive/20 rounded"
              onClick={handleDelete}
              title="Delete"
            >
              <Trash2 className="w-3 h-3 text-destructive" />
            </button>
          </div>
        )}

        {isEditing ? (
          <textarea
            ref={editRef}
            className="w-full bg-transparent border border-primary/50 rounded p-1 resize-both outline-none font-mono"
            style={{
              color: annotation.color,
              fontSize: annotation.font_size,
              minHeight: annotation.height,
            }}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onBlur={handleFinishEdit}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setEditContent(annotation.content);
                setIsEditing(false);
              }
              e.stopPropagation();
            }}
          />
        ) : (
          <div
            className="whitespace-pre-wrap break-words font-mono cursor-text select-none"
            style={{
              color: annotation.color,
              fontSize: annotation.font_size,
              minHeight: 20,
            }}
            onDoubleClick={() => {
              if (canEdit && !isLocked) {
                setEditContent(annotation.content);
                setIsEditing(true);
              }
            }}
          >
            {annotation.content || (
              <span className="opacity-30 italic text-sm">Double-click to edit</span>
            )}
          </div>
        )}

        {/* Resize handle for text */}
        {canEdit && !isLocked && showControls && (
          <TextResizeHandle annotation={annotation} scale={scale} />
        )}
      </div>
    );
  }

  // Rectangle annotation
  if (annotation.annotation_type === "rectangle") {
    return (
      <div
        data-annotation
        className="absolute group"
        style={{
          left: annotation.position_x,
          top: annotation.position_y,
          width: annotation.width,
          height: annotation.height,
          border: `2px solid ${annotation.color}`,
          borderRadius: 2,
          zIndex: 20,
          boxShadow: `0 0 6px ${annotation.color}40`,
        }}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {canEdit && showControls && !isLocked && (
          <div
            className="absolute -top-6 left-0 flex items-center gap-1 bg-card/95 border border-border rounded px-1 py-0.5 z-30 cursor-grab active:cursor-grabbing"
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
          >
            <GripVertical className="w-3 h-3 text-muted-foreground" />
          </div>
        )}
        {canEdit && showControls && (
          <div className="absolute -top-6 right-0 flex items-center gap-0.5 bg-card/95 border border-border rounded px-0.5 py-0.5 z-30">
            <button className="p-0.5 hover:bg-muted rounded" onClick={handleToggleLock}>
              {isLocked ? <Lock className="w-3 h-3 text-primary" /> : <Unlock className="w-3 h-3 text-muted-foreground" />}
            </button>
            <button className="p-0.5 hover:bg-destructive/20 rounded" onClick={handleDelete}>
              <Trash2 className="w-3 h-3 text-destructive" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Line annotation
  if (annotation.annotation_type === "line") {
    const x1 = annotation.position_x;
    const y1 = annotation.position_y;
    const x2 = annotation.end_x ?? x1 + 120;
    const y2 = annotation.end_y ?? y1;
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    const w = Math.abs(x2 - x1) || 2;
    const h = Math.abs(y2 - y1) || 2;
    const pad = 12;

    return (
      <div
        data-annotation
        className="absolute group"
        style={{
          left: minX - pad,
          top: minY - pad,
          width: w + pad * 2,
          height: h + pad * 2,
          zIndex: 20,
        }}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {canEdit && showControls && !isLocked && (
          <div
            className="absolute -top-6 left-0 flex items-center gap-1 bg-card/95 border border-border rounded px-1 py-0.5 z-30 cursor-grab active:cursor-grabbing"
            onPointerDown={(e) => {
              if (isLocked || !canEdit) return;
              e.preventDefault();
              e.stopPropagation();
              const el = e.currentTarget as HTMLElement;
              el.setPointerCapture(e.pointerId);
              dragRef.current = { startX: e.clientX, startY: e.clientY, origX: x1, origY: y1 };
              setIsDragging(true);
            }}
            onPointerMove={(e) => {
              if (!dragRef.current || !isDragging) return;
              e.preventDefault();
              // visual feedback handled by parent re-render
            }}
            onPointerUp={(e) => {
              if (!dragRef.current) return;
              const dx = (e.clientX - dragRef.current.startX) / scale;
              const dy = (e.clientY - dragRef.current.startY) / scale;
              const snappedDx = snap(dx + dragRef.current.origX) - dragRef.current.origX;
              const snappedDy = snap(dy + dragRef.current.origY) - dragRef.current.origY;
              updateAnnotation.mutate({
                id: annotation.id,
                position_x: annotation.position_x + snappedDx,
                position_y: annotation.position_y + snappedDy,
                end_x: (annotation.end_x ?? annotation.position_x + 120) + snappedDx,
                end_y: (annotation.end_y ?? annotation.position_y) + snappedDy,
              });
              dragRef.current = null;
              setIsDragging(false);
            }}
          >
            <GripVertical className="w-3 h-3 text-muted-foreground" />
          </div>
        )}
        {canEdit && showControls && (
          <div className="absolute -top-6 right-0 flex items-center gap-0.5 bg-card/95 border border-border rounded px-0.5 py-0.5 z-30">
            <button className="p-0.5 hover:bg-muted rounded" onClick={handleToggleLock}>
              {isLocked ? <Lock className="w-3 h-3 text-primary" /> : <Unlock className="w-3 h-3 text-muted-foreground" />}
            </button>
            <button className="p-0.5 hover:bg-destructive/20 rounded" onClick={handleDelete}>
              <Trash2 className="w-3 h-3 text-destructive" />
            </button>
          </div>
        )}
        <svg
          width={w + pad * 2}
          height={h + pad * 2}
          className="absolute inset-0 pointer-events-none"
        >
          <line
            x1={x1 - minX + pad}
            y1={y1 - minY + pad}
            x2={x2 - minX + pad}
            y2={y2 - minY + pad}
            stroke={annotation.color}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  }

  return null;
});

// Resize handle sub-component for text annotations
function TextResizeHandle({
  annotation,
  scale,
}: {
  annotation: CanvasAnnotation;
  scale: number;
}) {
  const updateAnnotation = useUpdateAnnotation();
  const dragRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);

  return (
    <div
      className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize bg-primary/60 border border-primary rounded-sm"
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        dragRef.current = {
          startX: e.clientX,
          startY: e.clientY,
          origW: annotation.width,
          origH: annotation.height,
        };
      }}
      onPointerMove={(e) => {
        if (!dragRef.current) return;
        e.preventDefault();
        const dx = (e.clientX - dragRef.current.startX) / scale;
        const dy = (e.clientY - dragRef.current.startY) / scale;
        const parent = (e.currentTarget as HTMLElement).closest("[data-annotation]") as HTMLElement;
        if (parent) {
          parent.style.width = `${Math.max(80, snap(dragRef.current.origW + dx))}px`;
        }
      }}
      onPointerUp={(e) => {
        if (!dragRef.current) return;
        const dx = (e.clientX - dragRef.current.startX) / scale;
        const dy = (e.clientY - dragRef.current.startY) / scale;
        const newW = Math.max(80, snap(dragRef.current.origW + dx));
        const newH = Math.max(40, snap(dragRef.current.origH + dy));
        updateAnnotation.mutate({ id: annotation.id, width: newW, height: newH });
        dragRef.current = null;
      }}
    />
  );
}

export const AnnotationLayer = memo(function AnnotationLayer({
  annotations,
  campaignId,
  userId,
  isGM,
  activeTool,
  scale,
}: AnnotationLayerProps) {
  return (
    <>
      {annotations.map((a) => (
        <AnnotationItem
          key={a.id}
          annotation={a}
          campaignId={campaignId}
          userId={userId}
          isGM={isGM}
          scale={scale}
        />
      ))}
    </>
  );
});
