// Bounded canvas configuration
export const CANVAS_WIDTH = 6000;
export const CANVAS_HEIGHT = 4000;
export const CANVAS_CENTER_X = CANVAS_WIDTH / 2;  // 3000
export const CANVAS_CENTER_Y = CANVAS_HEIGHT / 2; // 2000

/**
 * Calculate the initial transform to center the view on the canvas center
 * at a given scale with respect to the viewport size.
 */
export function getInitialTransform(
  viewportWidth: number,
  viewportHeight: number,
  scale: number = 0.5
) {
  // We want the canvas center (3000, 2000) to appear at the viewport center
  // translateX + (CANVAS_CENTER_X * scale) = viewportWidth / 2
  // translateX = viewportWidth / 2 - CANVAS_CENTER_X * scale
  const positionX = viewportWidth / 2 - CANVAS_CENTER_X * scale;
  const positionY = viewportHeight / 2 - CANVAS_CENTER_Y * scale;
  
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
  scale: number = 0.5
) {
  // Center on the component's center point
  const componentCenterX = componentX + componentWidth / 2;
  const componentCenterY = componentY + componentHeight / 2;
  
  const positionX = viewportWidth / 2 - componentCenterX * scale;
  const positionY = viewportHeight / 2 - componentCenterY * scale;
  
  return { positionX, positionY, scale };
}

/**
 * Get spawn position for a new component, centered on the canvas center
 * with optional offset for multiple components
 */
export function getSpawnPosition(
  width: number,
  height: number,
  offset: { x: number; y: number } = { x: 0, y: 0 }
) {
  // Spawn centered on canvas center, adjusted for component size
  return {
    position_x: Math.round(CANVAS_CENTER_X - width / 2 + offset.x),
    position_y: Math.round(CANVAS_CENTER_Y - height / 2 + offset.y),
  };
}
