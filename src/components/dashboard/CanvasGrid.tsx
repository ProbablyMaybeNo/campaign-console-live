import { memo } from "react";

export const CanvasGrid = memo(function CanvasGrid() {
  return (
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
  );
});
