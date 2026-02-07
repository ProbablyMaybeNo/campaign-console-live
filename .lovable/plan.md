
# Full-Size Drag Preview Implementation

## Overview
Replace the current compact drag preview (fixed 200x80px) with a full-size ghost outline that matches the actual widget dimensions. This will help users visualize exactly how much space the widget will occupy at the drop location.

## Approach
Instead of rendering the full widget content (which would cause performance issues), we'll render a **ghost outline** that:
- Matches the exact width and height of the widget being dragged
- Shows just the header bar (icon + name) for context
- Uses a semi-transparent appearance with a dashed border
- Scales with the current canvas zoom level for accurate placement visualization

This gives users spatial awareness without the rendering cost of the full widget internals.

## Visual Design
```text
┌─────────────────────────────────────┐
│ ⊞ Widget Name                       │  ← Colored header bar
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤
│                                     │
│         (semi-transparent           │
│          background)                │
│                                     │
│                                     │
└─────────────────────────────────────┘
```

- Dashed neon green border (2px)
- Header bar with icon and widget name
- Body area with 40% opacity background
- Subtle backdrop blur for polish

---

## Technical Details

### 1. Update WidgetDragPreview.tsx
**Changes:**
- Accept `scale` prop to adjust preview size based on zoom level
- Use `component.width` and `component.height` for overlay mode dimensions
- Render a simplified "ghost" layout:
  - Header bar with icon and widget name (similar to real widget)
  - Empty body with dashed border and translucent fill
- Apply Framer Motion animations for smooth entrance/exit

### 2. Update dragOverlayModifiers.ts
**Changes:**
- Modify `snapDragPreviewToCursor` to work with variable-size previews
- Calculate offset based on the grab point within the original widget
- Preserve the relative grab position so the preview doesn't "jump"
- Account for the scaled dimensions when determining cursor anchor point

### 3. Update InfiniteCanvas.tsx
**Changes:**
- Pass `scale` to `WidgetDragPreview` via the DragOverlay
- Pass the component's actual dimensions for the preview to use
- Ensure the modifier receives accurate size information for positioning

### 4. Performance Optimizations
- Use `contain: layout paint` on the preview container
- Keep the preview DOM minimal (header + empty body only)
- No heavy child components (maps, tables, etc.) in the preview
- Use CSS `will-change: transform` during drag for GPU acceleration

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/dashboard/WidgetDragPreview.tsx` | Accept scale prop, use actual widget dimensions, render ghost layout |
| `src/components/dashboard/dragOverlayModifiers.ts` | Update modifier to handle variable-size previews with grab-point preservation |
| `src/components/dashboard/InfiniteCanvas.tsx` | Pass scale to the DragOverlay preview component |

---

## Expected Behavior
1. User begins dragging a widget
2. A full-size ghost outline appears under the cursor
3. The ghost matches the widget's exact dimensions (scaled to current zoom)
4. The grab point is preserved (cursor stays where user grabbed)
5. Ghost snaps to grid positions as user moves
6. On drop, widget lands exactly where the ghost was shown
