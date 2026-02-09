import type { Modifier } from "@dnd-kit/core";
import { getEventCoordinates } from "@dnd-kit/utilities";

/**
 * Creates a modifier that keeps the DragOverlay preview visually anchored
 * to the cursor at the same relative grab point as the original widget.
 *
 * The key insight: `draggingNodeRect` is in viewport pixels but represents
 * the SCALED widget (since TransformComponent applies CSS scale). So when
 * calculating the grab offset within that rect, we're already getting a
 * value in viewport pixels. The overlay is also rendered at scaled size,
 * so no additional scaling of the offset is needed.
 *
 * @param scale - Current canvas zoom level (unused in this corrected version)
 */
export function createGrabPointPreservingModifier(_scale: number): Modifier {
  return ({ activatorEvent, draggingNodeRect, transform }) => {
    if (!draggingNodeRect || !activatorEvent) return transform;

    const coords = getEventCoordinates(activatorEvent);
    if (!coords) return transform;

    // The draggingNodeRect is already in viewport coordinates (scaled by CSS transform).
    // The grab offset is simply how far from the rect's top-left the user clicked,
    // both measured in viewport pixels.
    const grabOffsetX = coords.x - draggingNodeRect.left;
    const grabOffsetY = coords.y - draggingNodeRect.top;

    // The DragOverlay preview is also rendered at the scaled size (width * scale).
    // Since both the grab offset and the preview dimensions are in the same
    // coordinate space (viewport pixels), we need to keep the cursor at the
    // exact same offset within the preview.
    //
    // The default DragOverlay transform positions the overlay's top-left at the
    // cursor position. We adjust by the grab offset so the cursor stays at the
    // same relative position within the preview as it was in the original widget.
    return {
      ...transform,
      x: transform.x - grabOffsetX,
      y: transform.y - grabOffsetY,
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
