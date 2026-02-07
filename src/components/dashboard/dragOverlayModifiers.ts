import type { Modifier } from "@dnd-kit/core";
import { getEventCoordinates } from "@dnd-kit/utilities";

/**
 * Creates a modifier that keeps the DragOverlay preview visually anchored
 * to the cursor at the same relative grab point as the original widget.
 *
 * For full-size ghost previews, this preserves the user's grab position
 * so the preview doesn't "jump" when dragging starts. The preview appears
 * exactly where the original widget was, maintaining spatial context.
 *
 * @param scale - Current canvas zoom level (used to scale grab offset)
 */
export function createGrabPointPreservingModifier(scale: number): Modifier {
  return ({ activatorEvent, draggingNodeRect, transform }) => {
    if (!draggingNodeRect || !activatorEvent) return transform;

    const coords = getEventCoordinates(activatorEvent);
    if (!coords) return transform;

    // Calculate where the user grabbed within the original widget (viewport px)
    const grabOffsetX = coords.x - draggingNodeRect.left;
    const grabOffsetY = coords.y - draggingNodeRect.top;

    // The DragOverlay preview is scaled to match the canvas zoom.
    // We need to scale the grab offset to match the preview dimensions.
    const scaledGrabOffsetX = grabOffsetX * scale;
    const scaledGrabOffsetY = grabOffsetY * scale;

    // Adjust transform so the cursor stays at the same relative position
    // within the scaled preview as it was in the original widget
    return {
      ...transform,
      x: transform.x + grabOffsetX - scaledGrabOffsetX,
      y: transform.y + grabOffsetY - scaledGrabOffsetY,
    };
  };
}

/**
 * @deprecated Use createGrabPointPreservingModifier for full-size ghost previews
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

  const desiredX = 28;
  const desiredY = 24;

  return {
    ...transform,
    x: transform.x + offsetX - desiredX,
    y: transform.y + offsetY - desiredY,
  };
};
