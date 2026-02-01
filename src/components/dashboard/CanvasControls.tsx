import { ZoomIn, ZoomOut, Maximize2, Crosshair, Grid3X3, HelpCircle } from "lucide-react";
import { TerminalButton } from "@/components/ui/TerminalButton";
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
  snapToGrid: boolean;
  onToggleSnap: () => void;
}

export function CanvasControls({ 
  scale, 
  onZoomIn, 
  onZoomOut, 
  onReset, 
  onRecenter,
  snapToGrid,
  onToggleSnap,
}: CanvasControlsProps) {
  return (
    <TooltipProvider>
      <div 
        className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-card/90 backdrop-blur-sm border-2 border-[hsl(142,76%,65%)] rounded px-2 py-1" 
        style={{ boxShadow: '0 0 15px hsl(142 76% 50% / 0.3)' }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <TerminalButton variant="ghost" size="sm" onClick={onZoomOut}>
              <ZoomOut className="w-4 h-4 text-white" />
            </TerminalButton>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Zoom out (Ctrl + -)</p>
          </TooltipContent>
        </Tooltip>

        <span className="text-xs font-mono text-white/80 min-w-[50px] text-center">
          {Math.round(scale * 100)}%
        </span>

        <Tooltip>
          <TooltipTrigger asChild>
            <TerminalButton variant="ghost" size="sm" onClick={onZoomIn}>
              <ZoomIn className="w-4 h-4 text-white" />
            </TerminalButton>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Zoom in (Ctrl + +)</p>
          </TooltipContent>
        </Tooltip>

        <div className="w-px h-4 bg-[hsl(142,76%,50%)]/30" />

        <Tooltip>
          <TooltipTrigger asChild>
            <TerminalButton variant="ghost" size="sm" onClick={onRecenter}>
              <Crosshair className="w-4 h-4 text-white" />
            </TerminalButton>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Recenter on Campaign Console (Home)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <TerminalButton variant="ghost" size="sm" onClick={onReset}>
              <Maximize2 className="w-4 h-4 text-white" />
            </TerminalButton>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Reset zoom (Ctrl + 0)</p>
          </TooltipContent>
        </Tooltip>

        <div className="w-px h-4 bg-[hsl(142,76%,50%)]/30" />

        <Tooltip>
          <TooltipTrigger asChild>
            <TerminalButton 
              variant="ghost" 
              size="sm" 
              onClick={onToggleSnap}
              className={snapToGrid ? "bg-[hsl(142,76%,50%)]/20" : ""}
            >
              <Grid3X3 className={`w-4 h-4 ${snapToGrid ? "text-[hsl(142,76%,50%)]" : "text-white"}`} />
            </TerminalButton>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Snap to grid {snapToGrid ? "(ON)" : "(OFF)"}</p>
          </TooltipContent>
        </Tooltip>

        <div className="w-px h-4 bg-[hsl(142,76%,50%)]/30" />

        <Tooltip>
          <TooltipTrigger asChild>
            <TerminalButton variant="ghost" size="sm" className="opacity-70">
              <HelpCircle className="w-4 h-4 text-white" />
            </TerminalButton>
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
