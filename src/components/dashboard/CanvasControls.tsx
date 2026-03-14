import { ZoomIn, ZoomOut, Maximize2, Crosshair, HelpCircle, Type, Minus, Square, Palette } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { SaveIndicator, SaveStatus } from "@/components/ui/SaveIndicator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type AnnotationTool = "text" | "line" | "rectangle" | null;

const ANNOTATION_COLORS = [
  "#22c55e", // green (primary)
  "#3b82f6", // blue
  "#ef4444", // red
  "#eab308", // yellow
  "#8b5cf6", // purple
  "#06b6d4", // cyan
  "#f97316", // orange
  "#ec4899", // pink
  "#ffffff", // white
];

interface CanvasControlsProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onRecenter: () => void;
  saveStatus?: SaveStatus;
  onRetry?: () => void;
  activeTool?: AnnotationTool;
  onToolChange?: (tool: AnnotationTool) => void;
  annotationColor?: string;
  onColorChange?: (color: string) => void;
  canAnnotate?: boolean;
}

export function CanvasControls({ 
  scale, 
  onZoomIn, 
  onZoomOut, 
  onReset, 
  onRecenter,
  saveStatus = "idle",
  onRetry,
  activeTool = null,
  onToolChange,
  annotationColor = "#22c55e",
  onColorChange,
  canAnnotate = false,
}: CanvasControlsProps) {
  return (
    <TooltipProvider>
      <div 
        className="absolute top-4 right-4 z-50 flex items-center gap-1 bg-card/90 backdrop-blur-sm border-2 border-border rounded px-1 py-1" 
        style={{ boxShadow: '0 0 15px hsl(var(--border) / 0.3)' }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Save Status Indicator */}
        <SaveIndicator status={saveStatus} onRetry={onRetry} />
        
        {saveStatus !== "idle" && (
          <div className="w-px h-4 bg-border/30" />
        )}

        {/* Annotation Tools */}
        {canAnnotate && onToolChange && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <IconButton 
                  variant={activeTool === "text" ? "default" : "ghost"} 
                  size="md" 
                  onClick={() => onToolChange(activeTool === "text" ? null : "text")}
                  aria-label="Text tool (T)"
                  className={activeTool === "text" ? "bg-primary/20 text-primary" : ""}
                >
                  <Type className="w-4 h-4 text-card-foreground" />
                </IconButton>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Text tool — click canvas to place (T)</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <IconButton 
                  variant={activeTool === "line" ? "default" : "ghost"} 
                  size="md" 
                  onClick={() => onToolChange(activeTool === "line" ? null : "line")}
                  aria-label="Line tool (L)"
                  className={activeTool === "line" ? "bg-primary/20 text-primary" : ""}
                >
                  <Minus className="w-4 h-4 text-card-foreground" />
                </IconButton>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Line tool — click & drag on canvas (L)</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <IconButton 
                  variant={activeTool === "rectangle" ? "default" : "ghost"} 
                  size="md" 
                  onClick={() => onToolChange(activeTool === "rectangle" ? null : "rectangle")}
                  aria-label="Rectangle tool (R)"
                  className={activeTool === "rectangle" ? "bg-primary/20 text-primary" : ""}
                >
                  <Square className="w-4 h-4 text-card-foreground" />
                </IconButton>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Rectangle tool — click & drag on canvas (R)</p>
              </TooltipContent>
            </Tooltip>

            {/* Color picker */}
            {onColorChange && (
              <Popover>
                <PopoverTrigger asChild>
                  <IconButton variant="ghost" size="md" aria-label="Annotation color">
                    <div
                      className="w-4 h-4 rounded-sm border border-border"
                      style={{ backgroundColor: annotationColor }}
                    />
                  </IconButton>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" side="bottom" align="end">
                  <div className="flex flex-wrap gap-1 max-w-[140px]">
                    {ANNOTATION_COLORS.map((c) => (
                      <button
                        key={c}
                        className={`w-6 h-6 rounded-sm border-2 transition-all ${
                          annotationColor === c ? "border-primary scale-110" : "border-border/50 hover:border-border"
                        }`}
                        style={{ backgroundColor: c }}
                        onClick={() => onColorChange(c)}
                      />
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    <input
                      type="color"
                      value={annotationColor}
                      onChange={(e) => onColorChange(e.target.value)}
                      className="w-6 h-6 cursor-pointer bg-transparent border-0"
                    />
                    <span className="text-[10px] text-muted-foreground font-mono">Custom</span>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            <div className="w-px h-4 bg-border/30" />
          </>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <IconButton 
              variant="ghost" 
              size="md" 
              onClick={onZoomOut}
              aria-label="Zoom out (Ctrl + -)"
            >
              <ZoomOut className="w-4 h-4 text-card-foreground" />
            </IconButton>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Zoom out (Ctrl + -)</p>
          </TooltipContent>
        </Tooltip>

        <span className="text-xs font-mono text-card-foreground/80 min-w-[50px] text-center">
          {Math.round(scale * 100)}%
        </span>

        <Tooltip>
          <TooltipTrigger asChild>
            <IconButton 
              variant="ghost" 
              size="md" 
              onClick={onZoomIn}
              aria-label="Zoom in (Ctrl + +)"
            >
              <ZoomIn className="w-4 h-4 text-card-foreground" />
            </IconButton>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Zoom in (Ctrl + +)</p>
          </TooltipContent>
        </Tooltip>

        <div className="w-px h-4 bg-border/30" />

        <Tooltip>
          <TooltipTrigger asChild>
            <IconButton 
              variant="ghost" 
              size="md" 
              onClick={onRecenter}
              aria-label="Recenter on Campaign Console (Home)"
            >
              <Crosshair className="w-4 h-4 text-card-foreground" />
            </IconButton>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Recenter on Campaign Console (Home)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <IconButton 
              variant="ghost" 
              size="md" 
              onClick={onReset}
              aria-label="Reset zoom (Ctrl + 0)"
            >
              <Maximize2 className="w-4 h-4 text-card-foreground" />
            </IconButton>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Reset zoom (Ctrl + 0)</p>
          </TooltipContent>
        </Tooltip>

        <div className="w-px h-4 bg-border/30" />

        <Tooltip>
          <TooltipTrigger asChild>
            <IconButton 
              variant="ghost" 
              size="md" 
              className="opacity-70"
              aria-label="Keyboard shortcuts help"
            >
              <HelpCircle className="w-4 h-4 text-card-foreground" />
            </IconButton>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-1 text-xs">
              <p className="font-semibold">Keyboard Shortcuts</p>
              <p>Ctrl + Plus: Zoom in</p>
              <p>Ctrl + Minus: Zoom out</p>
              <p>Ctrl + 0: Reset zoom</p>
              <p>Home: Recenter on console</p>
              <p className="pt-1 font-semibold">Annotation Tools</p>
              <p>T: Text tool</p>
              <p>L: Line tool</p>
              <p>R: Rectangle tool</p>
              <p>Esc: Cancel tool</p>
              <p className="pt-1 font-semibold">Mouse</p>
              <p>Click & drag: Pan canvas</p>
              <p>Drag title bar: Move widget</p>
              <p>Corner handle: Resize widget</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
