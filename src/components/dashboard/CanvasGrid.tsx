import { memo } from "react";

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
      
      {/* Visible boundary border to show canvas limits */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          border: "2px dashed hsl(142 76% 50% / 0.4)",
          borderRadius: "4px",
          boxShadow: "inset 0 0 20px hsl(142 76% 50% / 0.1)",
        }}
      />
      
      {/* Corner markers for emphasis */}
      <div className="absolute top-0 left-0 w-8 h-8 pointer-events-none border-l-2 border-t-2 border-primary/60" />
      <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none border-r-2 border-t-2 border-primary/60" />
      <div className="absolute bottom-0 left-0 w-8 h-8 pointer-events-none border-l-2 border-b-2 border-primary/60" />
      <div className="absolute bottom-0 right-0 w-8 h-8 pointer-events-none border-r-2 border-b-2 border-primary/60" />
    </>
  );
});
