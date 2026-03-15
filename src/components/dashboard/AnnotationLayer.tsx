import { memo, useState, useCallback, useRef, useEffect } from "react";
import { CanvasAnnotation, useUpdateAnnotation, useDeleteAnnotation } from "@/hooks/useCanvasAnnotations";
import { Trash2, Lock, Unlock, GripVertical, Check, Palette } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const ANNOTATION_COLORS = [
  "#22c55e", "#3b82f6", "#ef4444", "#eab308", "#8b5cf6",
  "#06b6d4", "#f97316", "#ec4899", "#ffffff",
];

const FONT_SIZES = [
  { label: "S", value: 12 },
  { label: "M", value: 18 },
  { label: "L", value: 28 },
  { label: "XL", value: 40 },
];

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
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDeselect: () => void;
}

/* ─── Shared toolbar for all annotation types ─── */
function AnnotationToolbar({
  annotation,
  canEdit,
  isLocked,
  showFontSizes,
  onToggleLock,
  onDelete,
}: {
  annotation: CanvasAnnotation;
  canEdit: boolean;
  isLocked: boolean;
  showFontSizes: boolean;
  onToggleLock: () => void;
  onDelete: () => void;
}) {
  const updateAnnotation = useUpdateAnnotation();
  if (!canEdit) return null;

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 bg-card/95 border border-border rounded-md px-1.5 py-1 z-40 shadow-lg"
      style={{ bottom: "calc(100% + 6px)" }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Drag handle */}
      {!isLocked && (
        <div className="flex items-center gap-0.5 text-muted-foreground cursor-grab active:cursor-grabbing annotation-drag-handle">
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      {!isLocked && (
        <div className="w-px h-5 bg-border mx-0.5" />
      )}

      {/* Font size buttons (text only) */}
      {showFontSizes && (
        <>
          {FONT_SIZES.map((fs) => (
            <button
              key={fs.label}
              className={`min-w-[28px] min-h-[28px] flex items-center justify-center text-[11px] font-mono rounded transition-colors ${
                annotation.font_size === fs.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
              onClick={() => updateAnnotation.mutate({ id: annotation.id, font_size: fs.value })}
              title={`Font size ${fs.label}`}
            >
              {fs.label}
            </button>
          ))}
          <div className="w-px h-5 bg-border mx-0.5" />
        </>
      )}

      {/* Color picker */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="min-w-[28px] min-h-[28px] flex items-center justify-center hover:bg-muted rounded transition-colors"
            title="Change color"
          >
            <Palette className="w-4 h-4" style={{ color: annotation.color }} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" side="top" align="center" sideOffset={8}>
          <div className="flex flex-wrap gap-1.5 max-w-[160px]">
            {ANNOTATION_COLORS.map((c) => (
              <button
                key={c}
                className={`w-6 h-6 rounded-full border-2 transition-all ${
                  annotation.color === c ? "border-primary scale-110" : "border-transparent hover:border-border"
                }`}
                style={{ background: c }}
                onClick={() => updateAnnotation.mutate({ id: annotation.id, color: c })}
              />
            ))}
            <div className="flex items-center gap-1 w-full mt-1">
              <input
                type="color"
                className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                value={annotation.color}
                onChange={(e) => updateAnnotation.mutate({ id: annotation.id, color: e.target.value })}
              />
              <span className="text-[10px] text-muted-foreground font-mono">Custom</span>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <div className="w-px h-5 bg-border mx-0.5" />

      {/* Lock */}
      <button
        className="min-w-[28px] min-h-[28px] flex items-center justify-center hover:bg-muted rounded transition-colors"
        onClick={onToggleLock}
        title={isLocked ? "Unlock" : "Lock in place"}
        aria-label={isLocked ? "Unlock annotation" : "Lock annotation"}
      >
        {isLocked ? (
          <Lock className="w-4 h-4 text-primary" />
        ) : (
          <Unlock className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* Delete */}
      <button
        className="min-w-[28px] min-h-[28px] flex items-center justify-center hover:bg-destructive/20 rounded transition-colors"
        onClick={onDelete}
        title="Delete"
        aria-label="Delete annotation"
      >
        <Trash2 className="w-4 h-4 text-destructive" />
      </button>
    </div>
  );
}

/* ─── Annotation Item ─── */
const AnnotationItem = memo(function AnnotationItem({
  annotation,
  campaignId,
  userId,
  isGM,
  scale,
  isSelected,
  onSelect,
  onDeselect,
}: AnnotationItemProps) {
  const updateAnnotation = useUpdateAnnotation();
  const deleteAnnotation = useDeleteAnnotation();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(annotation.content);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const canEdit = userId === annotation.creator_id || isGM;
  const isLocked = annotation.is_locked;
  const showToolbar = isSelected || isHovered;

  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [isEditing]);

  // Click outside to deselect
  useEffect(() => {
    if (!isSelected) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onDeselect();
      }
    };
    // Delay to avoid immediate deselection from the click that selected it
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSelected, onDeselect]);

  const handleSelect = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (canEdit) onSelect(annotation.id);
  }, [canEdit, annotation.id, onSelect]);

  /* ── Drag (shared) ── */
  const startDrag = useCallback(
    (e: React.PointerEvent, origX: number, origY: number) => {
      if (isLocked || !canEdit) return;
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = { startX: e.clientX, startY: e.clientY, origX, origY };
      setIsDragging(true);
    },
    [isLocked, canEdit]
  );

  const moveDrag = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current || !isDragging) return;
      e.preventDefault();
      e.stopPropagation();
      const dx = (e.clientX - dragRef.current.startX) / scale;
      const dy = (e.clientY - dragRef.current.startY) / scale;
      const el = containerRef.current;
      if (el) {
        el.style.left = `${snap(dragRef.current.origX + dx)}px`;
        el.style.top = `${snap(dragRef.current.origY + dy)}px`;
      }
    },
    [isDragging, scale]
  );

  const endDragBasic = useCallback(
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

  const endDragLine = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      const dx = (e.clientX - dragRef.current.startX) / scale;
      const dy = (e.clientY - dragRef.current.startY) / scale;
      const snappedNewX = snap(dragRef.current.origX + dx);
      const snappedNewY = snap(dragRef.current.origY + dy);
      const shiftX = snappedNewX - annotation.position_x;
      const shiftY = snappedNewY - annotation.position_y;
      if (shiftX !== 0 || shiftY !== 0) {
        updateAnnotation.mutate({
          id: annotation.id,
          position_x: annotation.position_x + shiftX,
          position_y: annotation.position_y + shiftY,
          end_x: (annotation.end_x ?? annotation.position_x + 120) + shiftX,
          end_y: (annotation.end_y ?? annotation.position_y) + shiftY,
        });
      }
      dragRef.current = null;
      setIsDragging(false);
    },
    [annotation, scale, updateAnnotation]
  );

  const handleDelete = useCallback(() => {
    deleteAnnotation.mutate({ id: annotation.id, campaignId });
    onDeselect();
  }, [annotation.id, campaignId, deleteAnnotation, onDeselect]);

  const handleToggleLock = useCallback(() => {
    updateAnnotation.mutate({ id: annotation.id, is_locked: !isLocked });
  }, [annotation.id, isLocked, updateAnnotation]);

  const handleFinishEdit = useCallback(() => {
    setIsEditing(false);
    if (editContent !== annotation.content) {
      updateAnnotation.mutate({ id: annotation.id, content: editContent });
    }
  }, [editContent, annotation.content, annotation.id, updateAnnotation]);

  // Selection outline style
  const selectionOutline = isSelected
    ? "ring-2 ring-primary/60 ring-offset-1 ring-offset-transparent"
    : isHovered && canEdit
    ? "ring-1 ring-primary/30"
    : "";

  /* ── Drag handle bindings for toolbar ── */
  const toolbarDragProps = annotation.annotation_type === "line"
    ? {
        onPointerDown: (e: React.PointerEvent) => startDrag(e, annotation.position_x, annotation.position_y),
        onPointerMove: moveDrag,
        onPointerUp: endDragLine,
      }
    : {
        onPointerDown: (e: React.PointerEvent) => startDrag(e, annotation.position_x, annotation.position_y),
        onPointerMove: moveDrag,
        onPointerUp: endDragBasic,
      };

  // ── TEXT ──
  if (annotation.annotation_type === "text") {
    return (
      <div
        ref={containerRef}
        data-annotation
        className={`absolute rounded ${selectionOutline} transition-shadow`}
        style={{
          left: annotation.position_x,
          top: annotation.position_y,
          width: annotation.width,
          minHeight: annotation.height,
          zIndex: isSelected ? 30 : 25,
          cursor: isLocked ? "default" : "pointer",
          // Extend hover zone above for toolbar access
          paddingTop: showToolbar && canEdit ? 40 : 0,
          marginTop: showToolbar && canEdit ? -40 : 0,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleSelect}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Toolbar */}
        {showToolbar && canEdit && (
          <div style={{ position: "relative", height: 0 }}>
            <div
              className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 bg-card/95 border border-border rounded-md px-1.5 py-1 z-40 shadow-lg"
              style={{ bottom: 6, whiteSpace: "nowrap" }}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {/* Drag handle */}
              {!isLocked && (
                <div
                  className="min-w-[28px] min-h-[28px] flex items-center justify-center text-muted-foreground cursor-grab active:cursor-grabbing rounded hover:bg-muted transition-colors"
                  {...toolbarDragProps}
                >
                  <GripVertical className="w-4 h-4" />
                </div>
              )}
              {!isLocked && <div className="w-px h-5 bg-border mx-0.5" />}

              {/* Font sizes */}
              {FONT_SIZES.map((fs) => (
                <button
                  key={fs.label}
                  className={`min-w-[28px] min-h-[28px] flex items-center justify-center text-[11px] font-mono rounded transition-colors ${
                    annotation.font_size === fs.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                  onClick={() => updateAnnotation.mutate({ id: annotation.id, font_size: fs.value })}
                  title={`Font size ${fs.label}`}
                >
                  {fs.label}
                </button>
              ))}
              <div className="w-px h-5 bg-border mx-0.5" />

              {/* Color */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="min-w-[28px] min-h-[28px] flex items-center justify-center hover:bg-muted rounded transition-colors"
                    title="Change color"
                  >
                    <Palette className="w-4 h-4" style={{ color: annotation.color }} />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" side="top" align="center" sideOffset={8}>
                  <div className="flex flex-wrap gap-1.5 max-w-[160px]">
                    {ANNOTATION_COLORS.map((c) => (
                      <button
                        key={c}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${
                          annotation.color === c ? "border-primary scale-110" : "border-transparent hover:border-border"
                        }`}
                        style={{ background: c }}
                        onClick={() => updateAnnotation.mutate({ id: annotation.id, color: c })}
                      />
                    ))}
                    <div className="flex items-center gap-1 w-full mt-1">
                      <input
                        type="color"
                        className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                        value={annotation.color}
                        onChange={(e) => updateAnnotation.mutate({ id: annotation.id, color: e.target.value })}
                      />
                      <span className="text-[10px] text-muted-foreground font-mono">Custom</span>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <div className="w-px h-5 bg-border mx-0.5" />

              {/* Lock */}
              <button
                className="min-w-[28px] min-h-[28px] flex items-center justify-center hover:bg-muted rounded transition-colors"
                onClick={handleToggleLock}
                title={isLocked ? "Unlock" : "Lock in place"}
                aria-label={isLocked ? "Unlock" : "Lock"}
              >
                {isLocked ? <Lock className="w-4 h-4 text-primary" /> : <Unlock className="w-4 h-4 text-muted-foreground" />}
              </button>

              {/* Delete */}
              <button
                className="min-w-[28px] min-h-[28px] flex items-center justify-center hover:bg-destructive/20 rounded transition-colors"
                onClick={handleDelete}
                title="Delete"
                aria-label="Delete annotation"
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
            </div>
          </div>
        )}

        {isEditing ? (
          <div className="relative">
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
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setEditContent(annotation.content);
                  setIsEditing(false);
                }
                e.stopPropagation();
              }}
            />
            <button
              className="absolute bottom-1 right-1 flex items-center gap-1 bg-primary text-primary-foreground rounded px-2.5 py-1 text-xs font-mono hover:bg-primary/80 z-30"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onClick={(e) => { e.stopPropagation(); handleFinishEdit(); }}
            >
              <Check className="w-3.5 h-3.5" /> Done
            </button>
          </div>
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

        {/* Resize handle */}
        {canEdit && !isLocked && showToolbar && (
          <TextResizeHandle annotation={annotation} scale={scale} />
        )}
      </div>
    );
  }

  // ── RECTANGLE ──
  if (annotation.annotation_type === "rectangle") {
    return (
      <div
        ref={containerRef}
        data-annotation
        className={`absolute rounded ${selectionOutline} transition-shadow`}
        style={{
          left: annotation.position_x,
          top: annotation.position_y,
          width: annotation.width,
          height: annotation.height,
          border: `2px solid ${annotation.color}`,
          borderRadius: 2,
          zIndex: isSelected ? 25 : 20,
          boxShadow: `0 0 6px ${annotation.color}40`,
          cursor: isLocked ? "default" : "pointer",
          paddingTop: showToolbar && canEdit ? 40 : 0,
          marginTop: showToolbar && canEdit ? -40 : 0,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleSelect}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {showToolbar && canEdit && (
          <div style={{ position: "relative", height: 0 }}>
            <div
              className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 bg-card/95 border border-border rounded-md px-1.5 py-1 z-40 shadow-lg"
              style={{ bottom: 6, whiteSpace: "nowrap" }}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {!isLocked && (
                <div
                  className="min-w-[28px] min-h-[28px] flex items-center justify-center text-muted-foreground cursor-grab active:cursor-grabbing rounded hover:bg-muted transition-colors"
                  {...toolbarDragProps}
                >
                  <GripVertical className="w-4 h-4" />
                </div>
              )}
              {!isLocked && <div className="w-px h-5 bg-border mx-0.5" />}

              <Popover>
                <PopoverTrigger asChild>
                  <button className="min-w-[28px] min-h-[28px] flex items-center justify-center hover:bg-muted rounded transition-colors" title="Change color">
                    <Palette className="w-4 h-4" style={{ color: annotation.color }} />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" side="top" align="center" sideOffset={8}>
                  <div className="flex flex-wrap gap-1.5 max-w-[160px]">
                    {ANNOTATION_COLORS.map((c) => (
                      <button
                        key={c}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${
                          annotation.color === c ? "border-primary scale-110" : "border-transparent hover:border-border"
                        }`}
                        style={{ background: c }}
                        onClick={() => updateAnnotation.mutate({ id: annotation.id, color: c })}
                      />
                    ))}
                    <div className="flex items-center gap-1 w-full mt-1">
                      <input type="color" className="w-6 h-6 rounded cursor-pointer border-0 p-0" value={annotation.color}
                        onChange={(e) => updateAnnotation.mutate({ id: annotation.id, color: e.target.value })} />
                      <span className="text-[10px] text-muted-foreground font-mono">Custom</span>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <div className="w-px h-5 bg-border mx-0.5" />
              <button className="min-w-[28px] min-h-[28px] flex items-center justify-center hover:bg-muted rounded transition-colors" onClick={handleToggleLock} title={isLocked ? "Unlock" : "Lock"} aria-label={isLocked ? "Unlock" : "Lock"}>
                {isLocked ? <Lock className="w-4 h-4 text-primary" /> : <Unlock className="w-4 h-4 text-muted-foreground" />}
              </button>
              <button className="min-w-[28px] min-h-[28px] flex items-center justify-center hover:bg-destructive/20 rounded transition-colors" onClick={handleDelete} title="Delete" aria-label="Delete annotation">
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── LINE ──
  if (annotation.annotation_type === "line") {
    const x1 = annotation.position_x;
    const y1 = annotation.position_y;
    const x2 = annotation.end_x ?? x1 + 120;
    const y2 = annotation.end_y ?? y1;
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    const w = Math.abs(x2 - x1) || 2;
    const h = Math.abs(y2 - y1) || 2;
    const pad = 16;

    return (
      <div
        ref={containerRef}
        data-annotation
        className={`absolute rounded ${selectionOutline} transition-shadow`}
        style={{
          left: minX - pad,
          top: minY - pad,
          width: w + pad * 2,
          height: h + pad * 2,
          zIndex: isSelected ? 25 : 20,
          cursor: isLocked ? "default" : "pointer",
          paddingTop: showToolbar && canEdit ? 40 : 0,
          marginTop: showToolbar && canEdit ? -40 : 0,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleSelect}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {showToolbar && canEdit && (
          <div style={{ position: "relative", height: 0 }}>
            <div
              className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 bg-card/95 border border-border rounded-md px-1.5 py-1 z-40 shadow-lg"
              style={{ bottom: 6, whiteSpace: "nowrap" }}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {!isLocked && (
                <div
                  className="min-w-[28px] min-h-[28px] flex items-center justify-center text-muted-foreground cursor-grab active:cursor-grabbing rounded hover:bg-muted transition-colors"
                  {...toolbarDragProps}
                >
                  <GripVertical className="w-4 h-4" />
                </div>
              )}
              {!isLocked && <div className="w-px h-5 bg-border mx-0.5" />}

              <Popover>
                <PopoverTrigger asChild>
                  <button className="min-w-[28px] min-h-[28px] flex items-center justify-center hover:bg-muted rounded transition-colors" title="Change color">
                    <Palette className="w-4 h-4" style={{ color: annotation.color }} />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" side="top" align="center" sideOffset={8}>
                  <div className="flex flex-wrap gap-1.5 max-w-[160px]">
                    {ANNOTATION_COLORS.map((c) => (
                      <button
                        key={c}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${
                          annotation.color === c ? "border-primary scale-110" : "border-transparent hover:border-border"
                        }`}
                        style={{ background: c }}
                        onClick={() => updateAnnotation.mutate({ id: annotation.id, color: c })}
                      />
                    ))}
                    <div className="flex items-center gap-1 w-full mt-1">
                      <input type="color" className="w-6 h-6 rounded cursor-pointer border-0 p-0" value={annotation.color}
                        onChange={(e) => updateAnnotation.mutate({ id: annotation.id, color: e.target.value })} />
                      <span className="text-[10px] text-muted-foreground font-mono">Custom</span>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <div className="w-px h-5 bg-border mx-0.5" />
              <button className="min-w-[28px] min-h-[28px] flex items-center justify-center hover:bg-muted rounded transition-colors" onClick={handleToggleLock} title={isLocked ? "Unlock" : "Lock"} aria-label={isLocked ? "Unlock" : "Lock"}>
                {isLocked ? <Lock className="w-4 h-4 text-primary" /> : <Unlock className="w-4 h-4 text-muted-foreground" />}
              </button>
              <button className="min-w-[28px] min-h-[28px] flex items-center justify-center hover:bg-destructive/20 rounded transition-colors" onClick={handleDelete} title="Delete" aria-label="Delete annotation">
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
            </div>
          </div>
        )}
        <svg
          width={w + pad * 2}
          height={h + pad * 2}
          className="absolute pointer-events-none"
          style={{ top: showToolbar && canEdit ? 40 : 0, left: 0 }}
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

/* ─── Resize handle for text ─── */
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
      className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize bg-primary/60 border border-primary rounded-sm hover:bg-primary/80 transition-colors"
      style={{ touchAction: "none" }}
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

/* ─── Annotation Layer (manages selection state) ─── */
export const AnnotationLayer = memo(function AnnotationLayer({
  annotations,
  campaignId,
  userId,
  isGM,
  activeTool,
  scale,
}: AnnotationLayerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Deselect when switching tools
  useEffect(() => {
    if (activeTool) setSelectedId(null);
  }, [activeTool]);

  const handleSelect = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  const handleDeselect = useCallback(() => {
    setSelectedId(null);
  }, []);

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
          isSelected={selectedId === a.id}
          onSelect={handleSelect}
          onDeselect={handleDeselect}
        />
      ))}
    </>
  );
});
