# Dashboard Performance Optimizations

This document describes the performance optimizations implemented for the Campaign Console dashboard.

## Overview

The dashboard uses an infinite canvas with draggable/resizable widgets. With many widgets and a complex DOM, performance can degrade. These optimizations address the main bottlenecks.

---

## A) Resize Jank Fix (End-Only Persistence)

### Problem
Calling `onResize()` during every `mousemove` triggered React Query cache updates and debounced DB writes on every frame, causing visible stutter.

### Solution
- **Local-only updates during resize**: During active resize, only `localSize` state updates for visuals
- **RAF throttling**: `requestAnimationFrame` batches resize updates to reduce render frequency
- **Single commit on mouseup**: `onResize()` is called exactly once when the user releases the mouse
- **Fixed useMemo side-effect**: Replaced incorrect `useMemo` with `useEffect` for syncing local size

### Files Changed
- `src/components/dashboard/DraggableComponent.tsx`
- `src/components/dashboard/InfiniteCanvas.tsx`

### Verification
1. Open Network tab in DevTools
2. Resize a widget - observe NO network calls during resize
3. Release mouse - observe single DB write
4. Widget should resize smoothly without stutter

---

## B) Drag Smoothness (Paint Cost Reduction)

### Problem
- Heavy box-shadows and glow effects cause expensive repaints during drag
- All widgets repaint when any widget is dragged

### Solution
- **Canvas-wide interaction tracking**: `isAnyDragging` and `isAnyResizing` state in InfiniteCanvas
- **Reduced paint effects during interaction**: Box shadows simplified during drag/resize
- **GPU-accelerated transforms**: `translate3d` and `will-change: transform` hints
- **Optimized memo comparison**: Custom memo function prevents unnecessary re-renders

### Files Changed
- `src/components/dashboard/DraggableComponent.tsx`
- `src/components/dashboard/InfiniteCanvas.tsx`

### Verification
1. Open DevTools Performance panel
2. Drag a widget - observe reduced paint operations
3. Release - full effects restore smoothly

---

## C) DOM Weight Reduction (Virtualization)

### Problem
Dashboard with many widgets could reach ~46k DOM nodes, causing slow interactions.

### Solution
- **Virtualized ActivityFeed**: Uses `@tanstack/react-virtual` to render only visible items
- **Estimated row heights**: 32px compact, 48px normal mode
- **Overscan of 5**: Pre-renders 5 items above/below viewport for smooth scrolling

### Files Changed
- `src/components/dashboard/widgets/ActivityFeedWidget.tsx`

### Verification
1. Open Elements tab in DevTools
2. Scroll through ActivityFeed - observe only ~10-15 items in DOM at once
3. Compare to previous ~50 items always rendered

---

## D) Production Build Fix

### Problem
`@fontsource/unifrakturmaguntia` bare import caused Rollup resolution failure in production build.

### Solution
- Changed to CSS entry path: `@fontsource/unifrakturmaguntia/400.css`

### Files Changed
- `src/main.tsx`

### Verification
```bash
npm run build
# Should complete without errors
```

---

## Architecture Summary

### Drag/Resize Flow

```
User starts drag/resize
        │
        ▼
┌───────────────────────┐
│ setIsAnyDragging(true)│  ← Canvas-wide flag
│ or setIsAnyResizing() │
└───────────────────────┘
        │
        ▼
┌───────────────────────┐
│ All widgets receive   │
│ isAnyDragging prop    │  ← Reduces paint effects
└───────────────────────┘
        │
        ▼
┌───────────────────────┐
│ Active widget updates │
│ localSize/transform   │  ← Visual only, no DB
└───────────────────────┘
        │
        ▼ (mouseup)
┌───────────────────────┐
│ onResize() / dragEnd  │  ← Single commit
│ + flushNow()          │
└───────────────────────┘
        │
        ▼
┌───────────────────────┐
│ setIsAnyDragging(false)│ ← Restore full effects
└───────────────────────┘
```

### Persistence Locations

| Action | When Persisted | Method |
|--------|---------------|--------|
| Drag | mouseup (DragEndEvent) | `debouncedUpdate` + `flushNow()` |
| Resize | mouseup | `onResize()` → `debouncedUpdate` + `flushNow()` |

---

## Performance Metrics

Run after production build to measure:

```bash
npm run build
# Check dist/ for bundle sizes

# Lighthouse audit
npx lighthouse https://your-app-url --output=json
```

Key metrics to track:
- **First Contentful Paint (FCP)**
- **Time to Interactive (TTI)**
- **Total Blocking Time (TBT)**
- **DOM size** (should be < 1500 nodes on empty dashboard)
