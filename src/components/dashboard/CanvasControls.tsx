import { ZoomIn, ZoomOut, Maximize2, Crosshair, HelpCircle } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { SaveIndicator, SaveStatus } from "@/components/ui/SaveIndicator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CanvasControlsProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onRecenter: () => void;
  saveStatus?: SaveStatus;
  onRetry?: () => void;
}

export function CanvasControls({ 
  scale, 
  onZoomIn, 
  onZoomOut, 
  onReset, 
  onRecenter,
  saveStatus = "idle",
  onRetry,
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
