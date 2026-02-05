# UI/UX & Performance Audit Report

**Date:** February 5, 2026  
**Application:** Campaign Console  
**Scope:** Full application audit covering performance, accessibility, UI consistency, and developer experience

---

## Executive Summary

Campaign Console is a well-architected React application with a sophisticated infinite canvas dashboard. Previous optimization passes have addressed major performance bottlenecks. This audit identifies **remaining issues** and provides **prioritized recommendations**.

| Category | Status | Priority Items |
|----------|--------|----------------|
| Performance | ⚠️ Good with issues | 2 critical, 3 moderate |
| Accessibility | ⚠️ Partial | 3 critical, 4 moderate |
| UI Consistency | ✅ Good | 2 moderate |
| Error Handling | ⚠️ Needs work | 2 critical |
| Developer Experience | ✅ Good | 1 moderate |

---

## 1. Performance Issues

### 🔴 CRITICAL: React Ref Warning in ActivityFeedWidget

**Observed:** Console warning about function components receiving refs
```
Warning: Function components cannot be given refs. 
Check the render method of `ActivityFeedWidget`.
```

**Root Cause:** `VirtualizedActivityList` is a function component inside `ActivityFeedWidget` that receives a ref from the Dialog component (likely through composition).

**Impact:** 
- Development console noise
- Potential issues with focus management in virtualized list
- May cause re-renders when React attempts ref forwarding

**Fix:** Wrap `VirtualizedActivityList` with `React.forwardRef()`:
```tsx
const VirtualizedActivityList = React.forwardRef<HTMLDivElement, Props>(
  ({ activities, compactMode, enabledCount }, ref) => {
    // ... existing implementation
  }
);
```

**Effort:** Low (15 min)

---

### 🔴 CRITICAL: Tailwind CDN in Production

**Observed:** Console warning:
```
cdn.tailwindcss.com should not be used in production
```

**Impact:** 
- Significantly slower CSS processing
- No tree-shaking of unused styles
- Larger payload than compiled CSS
- Blocks rendering until CDN responds

**Root Cause:** Unknown source loading Tailwind CDN. This is NOT from the main app (which uses PostCSS correctly).

**Investigation:** Check `index.html` and any third-party scripts for CDN references.

**Fix:** Remove any `<script src="https://cdn.tailwindcss.com">` tags.

**Effort:** Low (10 min)

---

### 🟡 MODERATE: Activity Feed Makes 6 Parallel Queries

**Observed:** `ActivityFeedWidget` queryFn makes 6 sequential `supabase.from()` calls:
- `campaign_players`
- `messages`
- `warbands`
- `schedule_entries`
- `narrative_events`
- `battle_reports`

**Impact:**
- Network waterfall on initial load
- Repeated pattern when any toggle changes
- staleTime of 30s is reasonable but queries still stack

**Recommendations:**
1. Create a single edge function `get-activity-feed` that aggregates all sources server-side
2. Alternatively, use `Promise.all()` to parallelize (already happening due to sequential but async calls, but server consolidation is better)

**Effort:** Medium (1-2 hours for edge function)

---

### 🟡 MODERATE: Large Widget Count May Cause Layout Thrashing

**Context:** Dashboard can have 10-20+ widgets simultaneously rendered.

**Current Mitigations (Good!):**
- ✅ `requestAnimationFrame` throttling on resize
- ✅ `isAnyDragging`/`isAnyResizing` flags for paint reduction
- ✅ Memoized `DraggableComponent` with custom comparator
- ✅ Virtualized `ActivityFeedWidget`

**Remaining Issue:** All widgets render regardless of viewport visibility.

**Recommendation:** Implement viewport culling - only render widgets that are within or near the visible viewport bounds.

```tsx
const isInViewport = useMemo(() => {
  const viewBounds = getViewportBounds(transform, containerSize);
  return intersects(componentBounds, viewBounds);
}, [transform, containerSize, component]);

if (!isInViewport && !isDragging) {
  return <WidgetPlaceholder />;
}
```

**Effort:** Medium (2-3 hours)

---

### 🟡 MODERATE: No Bundle Size Monitoring

**Observed:** No evidence of bundle analysis in build pipeline.

**Recommendation:** Add bundle analysis to CI:
```json
{
  "scripts": {
    "build:analyze": "ANALYZE=true vite build"
  }
}
```

With `rollup-plugin-visualizer` or similar.

**Effort:** Low (30 min)

---

## 2. Accessibility Issues

### 🔴 CRITICAL: Missing forwardRef on VirtualizedActivityList

**Context:** The virtualized list is a child of Sheet/Dialog which manages focus.

**Impact:** Screen readers and keyboard navigation may not correctly identify the scrollable region.

**Fix:** Add `forwardRef` and ensure `role="list"` on the scrollable container.

---

### 🔴 CRITICAL: Resize Handle Keyboard Accessibility

**Observed:** Resize handle has `role="button"` and `tabIndex={0}` but no keyboard handler.

**Current:**
```tsx
<div
  onMouseDown={handleResizeStart}
  aria-label="Resize widget"
  role="button"
  tabIndex={0}
>
```

**Issue:** Users who tab to this element cannot resize with keyboard.

**Fix Options:**
1. Add `onKeyDown` for arrow keys to resize
2. Or remove `tabIndex={0}` and document that resize is mouse-only (acceptable with clear documentation)

**Recommendation:** Option 2 with tooltip explaining "Drag to resize".

---

### 🔴 CRITICAL: Campaign Error State User Experience

**Observed in context:** Error when campaign not found (`fb6de0cc-a0b9-4a1a-9432-980497d85b41`).

**Current Behavior:** Shows error page with "Back to Campaigns" button.

**Issues:**
- No explanation of why campaign wasn't found
- No automatic recovery attempt
- Could be stale link, deleted campaign, or permission issue

**Recommendations:**
1. Add specific error messages based on error type
2. Auto-redirect after 5s with countdown
3. Log error to error_reports table for debugging

---

### 🟡 MODERATE: Event Type Toggle Labels

**In ActivityFeedWidget settings:**
```tsx
<Label htmlFor={`toggle-${type}`}>
  {eventLabels[type]}
</Label>
```

**Issue:** Label is associated but the switch doesn't announce state change to screen readers.

**Fix:** Ensure Switch component has `aria-describedby` pointing to a live region that announces changes.

---

### 🟡 MODERATE: Canvas Controls Keyboard Navigability

**Observed:** Canvas controls (zoom, snap, recenter) are accessible via keyboard shortcuts but the visual buttons may not all be in tab order.

**Verify:** All `CanvasControls` buttons have proper `tabIndex` and focus states.

---

### 🟡 MODERATE: Color Contrast in Event Type Indicators

**Observed in ActivityFeedWidget:**
```tsx
const eventColors: Record<EventType, string> = {
  player_join: "text-[hsl(142,76%,50%)]",
  message: "text-[hsl(200,100%,65%)]",
  // ...
};
```

**Issue:** These hardcoded HSL values may not meet WCAG AA contrast ratios on the card backgrounds.

**Recommendation:** 
1. Use semantic tokens: `text-primary`, `text-secondary`, etc.
2. Or verify each color meets 4.5:1 contrast ratio against `bg-muted/30`

---

### 🟡 MODERATE: Empty State ARIA

**In VirtualizedActivityList:**
```tsx
{activities.length === 0 && (
  <div className="flex-1 flex items-center justify-center">
    <p className="text-xs">No activity yet</p>
  </div>
)}
```

**Enhancement:** Add `role="status"` and `aria-live="polite"` so screen readers announce when list becomes empty.

---

## 3. UI Consistency Issues

### 🟡 MODERATE: Hardcoded HSL Values in Components

**Observed:** Multiple components use inline HSL instead of semantic tokens:
- `text-[hsl(142,76%,50%)]` - should be `text-primary`
- `text-[hsl(200,100%,65%)]` - should be `text-info` or custom token
- `bg-[hsl(142,76%,50%)]/10` - should be `bg-primary/10`

**Impact:** 
- Theme changes won't apply
- Dark/light mode inconsistencies
- Harder to maintain

**Recommendation:** Create semantic color tokens in `index.css` for event types:
```css
:root {
  --event-player: 142 76% 50%;
  --event-message: 200 100% 65%;
  --event-warband: 45 100% 60%;
  /* etc */
}
```

Then use: `text-[hsl(var(--event-player))]`

---

### 🟡 MODERATE: Inconsistent Compact Mode Spacing

**In VirtualizedActivityList:**
```tsx
className={compactMode ? "p-1.5" : "p-2"}
className={compactMode ? "text-[10px]" : "text-xs"}
```

**Issue:** Hardcoded pixel values and non-standard text sizes.

**Recommendation:** Use design system tokens:
- `text-[10px]` → Create `text-2xs` utility
- `p-1.5` is fine (6px, within 4px grid)

---

## 4. Error Handling Issues

### 🔴 CRITICAL: No Retry on Activity Feed Failure

**Observed:** `useQuery` for activity feed has no `retry` or `onError` configuration.

**Current:**
```tsx
const { data: activities = [], refetch, isLoading } = useQuery({
  queryKey: ["campaign-activity", campaignId, localConfig.enabledEvents],
  queryFn: async (): Promise<ActivityEvent[]> => { ... },
  staleTime: 30000,
});
```

**Issue:** If any supabase query fails, the entire feed shows empty with no error indication.

**Fix:**
```tsx
const { data: activities = [], refetch, isLoading, error, isError } = useQuery({
  queryKey: ["campaign-activity", campaignId, localConfig.enabledEvents],
  queryFn: ...,
  staleTime: 30000,
  retry: 2,
  retryDelay: 1000,
});

if (isError) {
  return <ErrorState message="Failed to load activity" onRetry={refetch} />;
}
```

---

### 🔴 CRITICAL: Realtime Subscription Error Handling

**Observed:**
```tsx
const channel = supabase
  .channel(`activity-${campaignId}`)
  .on('postgres_changes', ..., () => refetch())
  .subscribe();
```

**Issue:** No error handling for subscription failures.

**Fix:**
```tsx
.subscribe((status) => {
  if (status === 'CHANNEL_ERROR') {
    console.error('Realtime subscription failed');
    // Fallback to polling
    intervalRef.current = setInterval(() => refetch(), 30000);
  }
});
```

---

## 5. Recommendations Summary

### Immediate Fixes (< 1 hour total)

| Issue | Effort | Impact |
|-------|--------|--------|
| Fix VirtualizedActivityList forwardRef | 15 min | High |
| Remove Tailwind CDN reference | 10 min | High |
| Add error state to ActivityFeedWidget | 20 min | High |
| Add realtime subscription error handling | 15 min | Medium |

### Short-term Improvements (1-4 hours)

| Issue | Effort | Impact |
|-------|--------|--------|
| Create activity-feed edge function | 2 hrs | Medium |
| Implement viewport culling | 3 hrs | Medium |
| Migrate HSL colors to semantic tokens | 1 hr | Low |

### Long-term Improvements

| Issue | Effort | Impact |
|-------|--------|--------|
| Bundle size monitoring in CI | 30 min | Low |
| Keyboard resize support | 2 hrs | Low |
| Event type color accessibility audit | 1 hr | Medium |

---

## 6. What's Working Well ✅

### Performance
- **Resize jank fixed**: RAF throttling + end-only DB writes
- **Drag smoothness**: Canvas-wide interaction flags reduce paint
- **DOM weight managed**: ActivityFeed virtualization implemented
- **Production build**: Font imports correctly using 400.css entry

### Accessibility
- **IconButton component**: Standardized 48px hit targets
- **ARIA labels**: Present on most icon buttons
- **Design system documented**: `docs/design-system.md` comprehensive
- **Keyboard shortcuts**: Zoom/pan/recenter documented

### UI Consistency
- **SaveIndicator**: Feedback for layout persistence
- **AsyncState components**: LoadingState, EmptyState, ErrorState available
- **Widget chrome**: Consistent header/content/resize pattern

---

## Appendix: Console Errors Observed

```
1. Function components cannot be given refs - ActivityFeedWidget
2. cdn.tailwindcss.com should not be used in production
```

No runtime errors observed. Network requests completing successfully (200 status codes).

---

*Report generated by comprehensive audit of codebase, console logs, and network activity.*
