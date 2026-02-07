import type { Modifier } from "@dnd-kit/core";
import { getEventCoordinates } from "@dnd-kit/utilities";

/**
 * Keeps the DragOverlay preview visually anchored near the pointer.
 *
 * Because our drag preview has a fixed, smaller size than many widgets,
 * the default pointer offset (based on the original widget size) can
 * place the preview far to the left/right when grabbing near an edge.
 */
export const snapDragPreviewToCursor: Modifier = ({
  activatorEvent,
  draggingNodeRect,
  transform,
}) => {
  if (!draggingNodeRect || !activatorEvent) return transform;

  const coords = getEventCoordinates(activatorEvent);
  if (!coords) return transform;

  const offsetX = coords.x - draggingNodeRect.left;
  const offsetY = coords.y - draggingNodeRect.top;

  // Desired cursor position *within* the preview (px)
  const desiredX = 28;
  const desiredY = 24;

  return {
    ...transform,
    x: transform.x + offsetX - desiredX,
    y: transform.y + offsetY - desiredY,
  };
};
