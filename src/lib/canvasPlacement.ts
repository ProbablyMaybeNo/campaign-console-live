// Bounded canvas configuration - responsive to window size
// Base dimensions are used as minimum values
const BASE_CANVAS_WIDTH = 4000;
const BASE_CANVAS_HEIGHT = 3000;
const MIN_CANVAS_WIDTH = 2000;
const MIN_CANVAS_HEIGHT = 1500;

// Calculate responsive canvas dimensions based on viewport
export function getCanvasDimensions(viewportWidth: number, viewportHeight: number) {
  // Scale canvas to be approximately 3-4x the viewport size
  // This gives room to pan while not being excessively large
  const scaleFactor = 3.5;
  
  const width = Math.max(
    MIN_CANVAS_WIDTH,
    Math.round(Math.max(viewportWidth * scaleFactor, BASE_CANVAS_WIDTH))
  );
  
  const height = Math.max(
    MIN_CANVAS_HEIGHT,
    Math.round(Math.max(viewportHeight * scaleFactor, BASE_CANVAS_HEIGHT))
  );
  
  return { width, height };
}

// Default export for components that need static values (backward compatibility)
export const CANVAS_WIDTH = BASE_CANVAS_WIDTH;
export const CANVAS_HEIGHT = BASE_CANVAS_HEIGHT;
export const CANVAS_CENTER_X = BASE_CANVAS_WIDTH / 2;
export const CANVAS_CENTER_Y = BASE_CANVAS_HEIGHT / 2;

// Padding from canvas edges for spawning
const EDGE_PADDING = 100;

/**
 * Calculate the initial transform to show the top-center of the canvas
 * The Campaign Console should appear at the top of the viewport, centered horizontally
 */
export function getInitialTransform(
  viewportWidth: number,
  viewportHeight: number,
  scale: number = 1.0
) {
  // Position so canvas top-left is at (0,0) initially, then center horizontally
  // We want the horizontal center of the canvas to be at the horizontal center of viewport
  // And we want the TOP of the canvas to be at the TOP of the viewport
  const positionX = viewportWidth / 2 - CANVAS_CENTER_X * scale;
  const positionY = 0; // Canvas top edge at viewport top
  
  return { positionX, positionY, scale };
}

/**
 * Calculate position to center view on a specific component
 */
export function getTransformForComponent(
  viewportWidth: number,
  viewportHeight: number,
  componentX: number,
  componentY: number,
  componentWidth: number,
  componentHeight: number,
  scale: number = 1.0
) {
  // Center horizontally on the component
  const componentCenterX = componentX + componentWidth / 2;
  const positionX = viewportWidth / 2 - componentCenterX * scale;
  
  // Position component near the top of the viewport (with some padding)
  const topPadding = 50;
  const positionY = topPadding - componentY * scale;
  
  return { positionX, positionY, scale };
}

/**
 * Get spawn position for the Campaign Console - at top-center of canvas
 */
export function getConsoleSpawnPosition(width: number, height: number) {
  return {
    position_x: Math.round(CANVAS_CENTER_X - width / 2),
    position_y: EDGE_PADDING,
  };
}

// Default Campaign Console dimensions for calculating spawn area
const CONSOLE_HEIGHT = 180;
const CONSOLE_SPAWN_GAP = 30; // Gap between console and new widgets
const SPAWN_AREA_TOP = EDGE_PADDING + CONSOLE_HEIGHT + CONSOLE_SPAWN_GAP;

/**
 * Get spawn position for a new component, positioned below the Campaign Console
 * with slight random offset to prevent overlap
 */
export function getSpawnPosition(
  width: number,
  height: number,
  offset: { x: number; y: number } = { x: 0, y: 0 }
) {
  // Spawn below the console, centered horizontally
  return {
    position_x: Math.round(CANVAS_CENTER_X - width / 2 + offset.x),
    position_y: Math.round(SPAWN_AREA_TOP + offset.y),
  };
}

/**
 * Clamp the transform to keep the view within canvas bounds
 */
export function clampTransform(
  positionX: number,
  positionY: number,
  scale: number,
  viewportWidth: number,
  viewportHeight: number,
  canvasWidth: number = CANVAS_WIDTH,
  canvasHeight: number = CANVAS_HEIGHT
) {
  const scaledWidth = canvasWidth * scale;
  const scaledHeight = canvasHeight * scale;
  
  // Calculate bounds - don't allow panning to show space outside canvas
  // When zoomed out (canvas smaller than viewport), center it
  // When zoomed in (canvas larger than viewport), allow panning within bounds
  
  let minX: number, maxX: number, minY: number, maxY: number;
  
  if (scaledWidth <= viewportWidth) {
    // Canvas fits in viewport horizontally - center it
    const centered = (viewportWidth - scaledWidth) / 2;
    minX = maxX = centered;
  } else {
    // Canvas larger than viewport - allow panning
    minX = viewportWidth - scaledWidth;
    maxX = 0;
  }
  
  if (scaledHeight <= viewportHeight) {
    // Canvas fits in viewport vertically - center it
    const centered = (viewportHeight - scaledHeight) / 2;
    minY = maxY = centered;
  } else {
    // Canvas larger than viewport - allow panning
    minY = viewportHeight - scaledHeight;
    maxY = 0;
  }
  
  return {
    positionX: Math.max(minX, Math.min(maxX, positionX)),
    positionY: Math.max(minY, Math.min(maxY, positionY)),
  };
}
