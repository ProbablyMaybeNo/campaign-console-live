

# Dashboard Optimization Plan

This plan addresses the current issues with zoom, panning, component creation, resizing, and movement on the infinite canvas dashboard. The goal is to create a smoother, more responsive, and predictable user experience.

## Current Issues Identified

1. **Zoom Drift** - When zooming, the view drifts away from the focal point instead of zooming centered on the current view
2. **Recenter Not Working Reliably** - The auto-center logic fires before components are loaded, or the coordinates calculation is incorrect
3. **Component Spawning Off-Screen** - New campaigns create the Campaign Console at hardcoded coordinates that may not align with initial canvas state
4. **Resize Performance** - Resizing uses raw mouse events without scale compensation, causing jittery behavior at different zoom levels
5. **Drag Latency** - Component position updates trigger full database writes on every drag end, with no optimistic UI
6. **No Debounced Saves** - Every small change triggers an immediate database mutation

## Planned Improvements

### 1. Fix Zoom Centering Behavior
Make zoom in/out buttons zoom toward the center of the current viewport rather than the canvas origin.

**Changes:**
- Update `handleZoomIn` and `handleZoomOut` in `InfiniteCanvas.tsx` to use `zoomToElement` or calculate the viewport center and zoom toward that point
- Use the `centerOnTarget` option or manually compute the new transform to keep the view stable

### 2. Reliable Auto-Center on Initial Load
Ensure the canvas centers on the Campaign Console anchor only after components have fully loaded.

**Changes:**
- Add a `useEffect` that watches for `anchorComponent` to become defined AND the container to be measured
- Use `requestAnimationFrame` to ensure DOM is painted before centering
- Track centering per campaign ID, not just a boolean flag, to handle campaign switching correctly

### 3. Viewport-Aware Component Spawning
Spawn new components at the calculated center of the user's current visible area.

**Changes:**
- Update `CreateCampaignModal.tsx` to seed an initial canvas transform snapshot immediately after navigating to the new campaign
- Alternatively, spawn the Campaign Console at a known "origin" position (e.g., 0,0) and ensure the canvas starts centered there
- Update the initial transform in `TransformWrapper` to match the expected spawn position

### 4. Scale-Compensated Resizing
Fix the resize handle to account for the current zoom level so resizing feels natural at any scale.

**Changes:**
- In `DraggableComponent.tsx`, modify `handleResizeStart` to divide mouse deltas by the current scale
- Pass `scale` as a prop from `InfiniteCanvas` to `DraggableComponent`
- Apply: `deltaX / scale` and `deltaY / scale` when calculating new dimensions

### 5. Optimistic Updates for Drag and Resize
Reduce perceived latency by updating local state immediately and syncing to the database in the background.

**Changes:**
- Implement optimistic updates in `useUpdateComponent` using React Query's `onMutate` to update cache before the server responds
- Add `onError` rollback to restore previous state if the mutation fails
- This eliminates the "snap back" feeling on slow connections

### 6. Debounced Position/Size Saves
Batch rapid changes (e.g., during resize drag) into a single database write.

**Changes:**
- Create a `useDebouncedUpdate` hook that accumulates changes and fires after 300-500ms of inactivity
- Apply to both drag-end position updates and resize operations
- Keeps local state responsive while reducing database writes

### 7. Add Keyboard Navigation Shortcuts
Improve accessibility and power-user experience.

**Changes:**
- Add `Home` key to recenter on Campaign Console
- Add `Spacebar` + drag for panning (standard canvas behavior)
- Document shortcuts in a help tooltip on the controls bar

### 8. Grid Snapping Option
Allow optional snapping to the grid for cleaner layouts.

**Changes:**
- Add a toggle button to `CanvasControls` for snap-to-grid
- When enabled, round final positions to nearest 20px or 40px (grid size)
- Visual indicator when snapping is active

### 9. Improve TransformWrapper Configuration
Fine-tune the zoom/pan library settings for better UX.

**Changes:**
- Enable smooth animations: `smooth: true` on zoom operations
- Configure velocity panning with reduced friction for more natural feel
- Increase step increments from 0.1 to 0.15 for more noticeable zoom changes

## Implementation Order

1. **Phase 1 - Critical Fixes**
   - Fix zoom centering (prevent drift)
   - Fix auto-center reliability
   - Fix viewport-aware spawning for new campaigns

2. **Phase 2 - Performance**
   - Scale-compensated resizing
   - Optimistic updates for mutations
   - Debounced saves

3. **Phase 3 - Polish**
   - Keyboard shortcuts
   - Grid snapping option
   - Animation tuning

---

## Technical Details

### Zoom Centering Fix (InfiniteCanvas.tsx)

```text
Current:
  ref.zoomIn(0.1, 150, "easeOut")

Proposed:
  const container = containerRef.current
  const centerX = container.clientWidth / 2
  const centerY = container.clientHeight / 2
  ref.zoomIn(0.1, 150, "easeOut", centerX, centerY)
```

### Scale-Compensated Resize (DraggableComponent.tsx)

```text
Current:
  const deltaX = e.clientX - resizeRef.current.startX
  const deltaY = e.clientY - resizeRef.current.startY

Proposed:
  const deltaX = (e.clientX - resizeRef.current.startX) / scale
  const deltaY = (e.clientY - resizeRef.current.startY) / scale
```

### Optimistic Update Pattern (useDashboardComponents.ts)

```text
onMutate: async (input) => {
  await queryClient.cancelQueries({ queryKey: ["dashboard-components", campaignId] })
  const previous = queryClient.getQueryData(["dashboard-components", campaignId])
  queryClient.setQueryData(["dashboard-components", campaignId], (old) =>
    old.map(c => c.id === input.id ? { ...c, ...input } : c)
  )
  return { previous }
}

onError: (err, input, context) => {
  queryClient.setQueryData(["dashboard-components", campaignId], context.previous)
}
```

### Auto-Center Timing Fix (InfiniteCanvas.tsx)

```text
// Track which campaign we've centered on
const centeredCampaignRef = useRef<string | null>(null)

useEffect(() => {
  if (!anchorComponent || !containerRef.current) return
  if (centeredCampaignRef.current === campaignId) return

  // Wait for layout to stabilize
  const frame = requestAnimationFrame(() => {
    centeredCampaignRef.current = campaignId
    handleRecenter()
  })

  return () => cancelAnimationFrame(frame)
}, [anchorComponent?.id, campaignId, handleRecenter])
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/InfiniteCanvas.tsx` | Zoom centering, auto-center timing, pass scale to children |
| `src/components/dashboard/DraggableComponent.tsx` | Scale-compensated resize, accept scale prop |
| `src/hooks/useDashboardComponents.ts` | Optimistic updates, debounced mutations |
| `src/components/dashboard/CanvasControls.tsx` | Grid snap toggle, help tooltip |
| `src/components/campaigns/CreateCampaignModal.tsx` | Align spawn position with initial canvas state |
| `src/lib/canvasPlacement.ts` | Improve viewport calculation reliability |

