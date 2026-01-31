import { memo } from "react";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "@/lib/canvasPlacement";

export const CanvasGrid = memo(function CanvasGrid() {
  return (
    <>
      {/* Grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--primary) / 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--primary) / 0.05) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />
      
      {/* Neon green boundary box */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: 0,
          left: 0,
          width: `${CANVAS_WIDTH}px`,
          height: `${CANVAS_HEIGHT}px`,
          border: "2px solid hsl(142 76% 50%)",
          boxShadow: `
            inset 0 0 20px hsl(142 76% 50% / 0.15),
            0 0 20px hsl(142 76% 50% / 0.25)
          `,
          borderRadius: "4px",
        }}
      />
      
      {/* Corner markers for extra visibility */}
      <div className="absolute pointer-events-none" style={{ top: 8, left: 8 }}>
        <div className="text-[10px] font-mono text-[hsl(142,76%,50%)] opacity-60">┌ 0,0</div>
      </div>
      <div className="absolute pointer-events-none" style={{ top: 8, right: CANVAS_WIDTH - 80 }}>
        <div className="text-[10px] font-mono text-[hsl(142,76%,50%)] opacity-60">{CANVAS_WIDTH},0 ┐</div>
      </div>
      <div className="absolute pointer-events-none" style={{ bottom: CANVAS_HEIGHT - 24, left: 8 }}>
        <div className="text-[10px] font-mono text-[hsl(142,76%,50%)] opacity-60">└ 0,{CANVAS_HEIGHT}</div>
      </div>
      <div className="absolute pointer-events-none" style={{ bottom: CANVAS_HEIGHT - 24, right: CANVAS_WIDTH - 100 }}>
        <div className="text-[10px] font-mono text-[hsl(142,76%,50%)] opacity-60">{CANVAS_WIDTH},{CANVAS_HEIGHT} ┘</div>
      </div>
    </>
  );
});
