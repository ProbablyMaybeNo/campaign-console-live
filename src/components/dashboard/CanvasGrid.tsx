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
            linear-gradient(to right, hsl(142 76% 50% / 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(142 76% 50% / 0.08) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />
    </>
  );
});
