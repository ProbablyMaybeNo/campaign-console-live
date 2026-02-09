
# Fix: Widget Position Jump on Drop at Non-100% Zoom

## Problem Summary
Widgets are visually "jumping to the right" after drag-and-drop operations, particularly at zoom levels other than 100%. The session replay and network logs confirm that incorrect position values are being calculated and sent to the database, with the widget position overshooting its intended location.

## Root Cause Analysis
After investigating the code and researching known @dnd-kit issues with scaled containers (GitHub issues #50, #1852), the problem stems from a coordinate mismatch between the drag overlay positioning and the drop position calculation:

1. **The DragOverlay renders outside the TransformWrapper** (in viewport coordinates)
2. **The modifier adjusts the overlay position** to preserve the grab point offset
3. **But the `delta` from @dnd-kit remains unchanged** - it represents raw cursor movement
4. **The visual position of the overlay doesn't match** what the position calculation expects

When the modifier subtracts `grabOffsetX/Y` from the transform, it visually moves the overlay. However, on drop, we use the raw `delta` which doesn't account for this adjustment. This creates a mismatch that becomes more pronounced at non-100% zoom levels due to the scaling factor.

## The Fix
We need to ensure the drop position calculation matches what the user visually sees. There are two approaches:

### Approach A: Track the visual drop position directly (Recommended)
Instead of calculating the drop position from `delta`, track where the overlay actually appears on screen and convert that back to canvas coordinates.

### Approach B: Remove the grab-point offset from delta calculation
If the modifier offsets the overlay by `grabOffsetX`, we should add that offset back when calculating the final position.

---

## Implementation Plan

### 1. Update the modifier to expose the grab offset
Modify `createGrabPointPreservingModifier` to also return/store the grab offset values so they can be used in the drop calculation.

**File:** `src/components/dashboard/dragOverlayModifiers.ts`

Changes:
- Create a mechanism to capture the grab offset when drag starts
- Either use a ref/state to store these values, or recalculate them in `handleDragEnd`

### 2. Update handleDragEnd to account for grab offset
The key fix is in `InfiniteCanvas.tsx`. When calculating the new position, we need to account for the fact that the overlay was offset from the cursor.

**File:** `src/components/dashboard/InfiniteCanvas.tsx`

Changes:
- Store the grab offset when drag starts
- In `handleDragEnd`, don't use the raw `delta` directly
- Instead, calculate the overlay's intended canvas position

### 3. Alternative: Use overlay position tracking
A more robust approach is to track where the overlay is actually positioned (in viewport coordinates) and convert that to canvas coordinates.

**File:** `src/components/dashboard/InfiniteCanvas.tsx`

Changes:
- Track the cursor position on drag end
- Calculate the overlay's top-left position (cursor position minus grab offset)
- Convert viewport position to canvas position using scale and pan offset
- Snap to grid and save

---

## Technical Details

### Current buggy flow:
```text
1. Drag starts, grab offset = 200px (into widget)
2. Modifier offsets overlay by -200px (so cursor appears at grab point)
3. User moves cursor 100px right (delta.x = 100)
4. Overlay moves 100px right (cursor still at grab point within overlay)
5. Drop: newX = oldX + (100 / scale) = oldX + 200 (at 50% zoom)
6. But visually, the overlay was at oldX * scale + (cursorX - grabOffset)
7. This mismatch causes the jump
```

### Fixed flow:
```text
1. Drag starts, capture grab offset in viewport coords
2. Modifier positions overlay correctly
3. User drops at cursor position cursorEndX
4. Overlay top-left = cursorEndX - grabOffset
5. Canvas position = (overlayLeft - panX) / scale
6. Snap and save
```

### Code changes (InfiniteCanvas.tsx):

```typescript
// New state to track grab offset
const [grabOffset, setGrabOffset] = useState({ x: 0, y: 0 });

const handleDragStart = useCallback((event: DragStartEvent) => {
  // Calculate grab offset from the event
  const element = document.querySelector(`[data-id="${event.active.id}"]`);
  if (element) {
    const rect = element.getBoundingClientRect();
    const coords = { 
      x: (event.activatorEvent as PointerEvent).clientX,
      y: (event.activatorEvent as PointerEvent).clientY 
    };
    setGrabOffset({
      x: coords.x - rect.left,
      y: coords.y - rect.top
    });
  }
  // ... rest of existing code
}, []);

const handleDragEnd = useCallback((event: DragEndEvent) => {
  const { active, delta } = event;
  // ... existing validation code ...

  // Get the pan offset from TransformWrapper
  const transformState = transformRef.current?.instance?.transformState;
  const panX = transformState?.positionX ?? 0;
  const panY = transformState?.positionY ?? 0;

  // The overlay top-left in viewport coords
  const overlayViewportX = (event.activatorEvent as PointerEvent).clientX + delta.x - grabOffset.x;
  const overlayViewportY = (event.activatorEvent as PointerEvent).clientY + delta.y - grabOffset.y;

  // Convert to canvas coordinates
  const canvasX = (overlayViewportX - panX) / scale;
  const canvasY = (overlayViewportY - panY) / scale;

  // Snap to grid
  const newX = snapPosition(canvasX);
  const newY = snapPosition(canvasY);

  // ... rest of existing code ...
}, [scale, grabOffset, snapPosition, ...]);
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/InfiniteCanvas.tsx` | Track grab offset on drag start, update handleDragEnd to calculate position based on overlay viewport position and pan offset |
| `src/components/dashboard/dragOverlayModifiers.ts` | Potentially simplify or document the relationship between modifier offset and drop calculation |

---

## Testing Checklist
After implementation, test the following scenarios:
- Drag and drop at 100% zoom (should work as before)
- Drag and drop at 50% zoom (no jump to the right)
- Drag and drop at 25% zoom (no jump)
- Drag and drop at 200% zoom (no jump)
- Drag from center of widget vs edge of widget (grab point should be preserved)
- Drag with canvas panned to different positions
- Quick successive drags (no accumulating offset errors)
