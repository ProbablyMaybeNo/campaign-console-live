import { ZoomIn, ZoomOut, Maximize2, Crosshair } from "lucide-react";
import { TerminalButton } from "@/components/ui/TerminalButton";

interface CanvasControlsProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onRecenter: () => void;
}

export function CanvasControls({ scale, onZoomIn, onZoomOut, onReset, onRecenter }: CanvasControlsProps) {
  return (
    <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-card/90 backdrop-blur-sm border border-primary/20 rounded px-2 py-1">
      <TerminalButton variant="ghost" size="sm" onClick={onZoomOut} title="Zoom out">
        <ZoomOut className="w-4 h-4" />
      </TerminalButton>
      <span className="text-xs font-mono text-muted-foreground min-w-[50px] text-center">
        {Math.round(scale * 100)}%
      </span>
      <TerminalButton variant="ghost" size="sm" onClick={onZoomIn} title="Zoom in">
        <ZoomIn className="w-4 h-4" />
      </TerminalButton>
      <div className="w-px h-4 bg-border" />
      <TerminalButton variant="ghost" size="sm" onClick={onRecenter} title="Recenter on Campaign Console">
        <Crosshair className="w-4 h-4" />
      </TerminalButton>
      <TerminalButton variant="ghost" size="sm" onClick={onReset} title="Reset zoom">
        <Maximize2 className="w-4 h-4" />
      </TerminalButton>
    </div>
  );
}
