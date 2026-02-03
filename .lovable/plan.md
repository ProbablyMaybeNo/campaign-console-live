# Mobile Mode Implementation Plan

## Overview

Implement a responsive mobile experience for Campaign Console that provides full functionality on tablets while offering a streamlined, view-focused experience on phones. The infinite canvas paradigm doesn't translate well to small screens, so phones will use a simplified scrollable card layout with a management FAB for GMs.

---

## Device Breakpoints

| Device | Width | Experience |
|--------|-------|------------|
| Phone | < 768px | Mobile Mode (scrollable cards) |
| Tablet | 768px - 1024px | Full dashboard (InfiniteCanvas) |
| Desktop | > 1024px | Full dashboard (InfiniteCanvas) |

---

## Current State

**Existing responsive logic:**
- `src/hooks/use-mobile.tsx` - Simple `useIsMobile()` hook with 768px breakpoint
- Desktop sidebar hidden on `md:` breakpoint (`hidden md:flex`)
- No dedicated mobile dashboard component exists

**Files to modify:**
- `src/pages/CampaignDashboard.tsx` - Add mobile/tablet routing
- `src/hooks/use-mobile.tsx` - Extend with tablet detection

**New files to create:**
- `src/components/dashboard/MobileDashboard.tsx` - Phone-only scrollable view
- `src/components/dashboard/MobileGMMenu.tsx` - GM quick-action bottom sheet
- `src/components/dashboard/MobileWidgetCard.tsx` - Compact widget renderer

---

## Phase 1: Enhanced Device Detection

**File: `src/hooks/use-mobile.tsx`**

Extend the hook to differentiate phone vs tablet:

```typescript
const PHONE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

export function useDeviceType() {
  const [deviceType, setDeviceType] = useState<'phone' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    const updateDeviceType = () => {
      const width = window.innerWidth;
      if (width < PHONE_BREAKPOINT) {
        setDeviceType('phone');
      } else if (width < TABLET_BREAKPOINT) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
    };
    
    updateDeviceType();
    window.addEventListener('resize', updateDeviceType);
    return () => window.removeEventListener('resize', updateDeviceType);
  }, []);

  return {
    deviceType,
    isPhone: deviceType === 'phone',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop',
    isMobile: deviceType === 'phone', // Keep backward compatibility
  };
}

// Keep original hook for backward compatibility
export function useIsMobile() {
  const { isPhone } = useDeviceType();
  return isPhone;
}
```

---

## Phase 2: Mobile Dashboard Component (Phone Only)

**New File: `src/components/dashboard/MobileDashboard.tsx`**

A vertically-scrollable card layout replacing the infinite canvas on phones:

### Layout Structure

```
┌──────────────────────────────────────┐
│ ← CAMPAIGNS    [Player/GM]  [Logout] │  ← Simplified header
├──────────────────────────────────────┤
│                                      │
│  ┌────────────────────────────────┐  │
│  │     CAMPAIGN CONSOLE HERO      │  │  ← Always first (anchor)
│  │   Campaign name, description,  │  │
│  │   round info, join code, etc.  │  │
│  └────────────────────────────────┘  │
│                                      │
│  ──── WIDGETS ────────────────────   │  ← Section divider
│                                      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│  │ Widget  │ │ Widget  │ │ Widget  │ │  ← Horizontal scroll carousel
│  │   1     │ │   2     │ │   3     │ │
│  └─────────┘ └─────────┘ └─────────┘ │
│         ◀ swipe for more ▶          │
│                                      │
│  ──── QUICK ACCESS ───────────────   │
│                                      │
│  [Rules] [Map] [Schedule] [Messages] │  ← Quick nav buttons
│                                      │
└──────────────────────────────────────┘
         ┌─────────────────┐
         │   ⚡ ACTIONS    │             ← GM FAB (bottom-right)
         └─────────────────┘
```

### Component Hierarchy

```
MobileDashboard
├── MobileHeader (simplified header)
├── ScrollArea (main content)
│   ├── CampaignConsoleCard (hero section, always visible)
│   ├── WidgetCarousel (horizontal scrolling widgets)
│   │   └── MobileWidgetCard[] (compact widget renderers)
│   └── QuickAccessGrid (overlay quick links)
└── MobileGMMenu (FAB + bottom sheet for GMs)
```

### Key Features

1. **Campaign Console Hero** - Full-width card at top showing:
   - Campaign name/description
   - Current round & status
   - Join code (with copy button)
   - GM/Player count

2. **Widget Carousel** - Horizontally scrollable row:
   - Uses `embla-carousel-react` (already installed)
   - Each widget rendered as a compact card
   - Tap to expand into a modal/sheet view
   - Shows widget name + mini preview

3. **Quick Access Grid** - 2x2 or 4-column grid of overlay buttons:
   - Rules, Map, Schedule, Messages
   - Opens the same `CampaignOverlays` as desktop

4. **Read-Only for Players** - No editing, just consumption

---

## Phase 3: Mobile GM Menu (Phone Only)

**New File: `src/components/dashboard/MobileGMMenu.tsx`**

A floating action button that opens a bottom sheet with GM management actions:

### FAB Appearance

```
┌───────────────────┐
│  ⚡ Quick Actions │  ← Rounded pill button
└───────────────────┘
```

- Fixed position: bottom-right (bottom-20 right-4)
- Neon green glow matching app aesthetic
- Pulse animation to draw attention

### Bottom Sheet Contents

When tapped, slides up a sheet with:

```
┌──────────────────────────────────────┐
│ ━━━ drag handle ━━━                  │
├──────────────────────────────────────┤
│ CAMPAIGN MANAGEMENT                  │
│                                      │
│ ┌────────┐ ┌────────┐ ┌────────┐     │
│ │ Add    │ │ Edit   │ │ Players│     │
│ │ Widget │ │ Widgets│ │        │     │
│ └────────┘ └────────┘ └────────┘     │
│                                      │
│ ┌────────┐ ┌────────┐ ┌────────┐     │
│ │Settings│ │ Export │ │ Theme  │     │
│ │        │ │        │ │        │     │
│ └────────┘ └────────┘ └────────┘     │
│                                      │
│ ─────────────────────────────────    │
│ CONTENT                              │
│                                      │
│ ┌────────┐ ┌────────┐ ┌────────┐     │
│ │ Add    │ │ Send   │ │ Add    │     │
│ │ Rule   │ │ Message│ │ Event  │     │
│ └────────┘ └────────┘ └────────┘     │
│                                      │
│         [Copy Join Code]             │
└──────────────────────────────────────┘
```

### Actions Available

**Campaign Management:**
- Add Widget → Opens `AddComponentModal`
- Edit Widgets → Opens a list view to select/edit widgets
- Players → Opens Players overlay
- Settings → Opens Campaign Settings overlay
- Export → Opens Export modal
- Theme → Opens theme picker (for supporters)

**Content:**
- Add Rule → Opens Rules overlay with focus on add
- Send Message → Opens Messages overlay
- Add Event → Opens Narrative overlay with focus on add

**Quick Actions:**
- Copy Join Code → Copies to clipboard with toast

---

## Phase 4: Mobile Widget Card

**New File: `src/components/dashboard/MobileWidgetCard.tsx`**

Compact card representation of each widget for the carousel:

```typescript
interface MobileWidgetCardProps {
  component: DashboardComponent;
  onExpand: () => void;
}
```

### Card Appearance

```
┌─────────────────────┐
│ 📊 Table Widget     │  ← Icon + name
├─────────────────────┤
│                     │
│  [Mini Preview]     │  ← Condensed content preview
│                     │
├─────────────────────┤
│       Tap to view   │  ← Action hint
└─────────────────────┘
```

### Preview Strategies by Widget Type

| Widget Type | Mini Preview |
|-------------|--------------|
| `campaign-console` | *(Not shown in carousel - always hero)* |
| `table` | Row count + first 2 column headers |
| `card` | Title only |
| `counter` | Current value prominently displayed |
| `image` | Thumbnail of image |
| `dice-roller` | Dice icons |
| `text` | First 50 chars truncated |
| `sticker` | The sticker icon |
| `map` | "Map" with icon |
| `schedule` | Next event date |
| `narrative` | Latest entry title |

### Expanded View

When tapped, opens a `Sheet` (using vaul) showing:
- Full widget header
- Scrollable widget content
- Close button

---

## Phase 5: Integration into CampaignDashboard

**File: `src/pages/CampaignDashboard.tsx`**

Update to conditionally render mobile vs desktop:

```tsx
import { useDeviceType } from "@/hooks/use-mobile";
import { MobileDashboard } from "@/components/dashboard/MobileDashboard";

export default function CampaignDashboard() {
  const { isPhone } = useDeviceType();
  
  // ... existing state and logic ...

  // Phone: Use mobile dashboard
  if (isPhone) {
    return (
      <div data-theme={themeId}>
        <MobileDashboard
          campaign={campaign}
          components={visibleComponents}
          isGM={effectiveIsGM}
          campaignId={campaignId!}
          onOpenOverlay={openOverlay}
          onSignOut={signOut}
        />
        
        {/* Overlays still work the same */}
        <CampaignOverlays ... />
        <AddComponentModal ... />
        {/* etc. */}
      </div>
    );
  }

  // Tablet/Desktop: Use infinite canvas
  return (
    <div data-theme={themeId}>
      {/* Existing layout */}
    </div>
  );
}
```

---

## Phase 6: Tablet Optimizations

Tablets (768px-1024px) keep the full `InfiniteCanvas` but with adjustments:

1. **Sidebar** - Auto-collapse by default on tablet (already `hidden md:flex`)
2. **Touch-friendly** - Increase hit targets for resize handles
3. **Zoom controls** - Make slightly larger on touch
4. **FAB** - Position further from edge for thumb reach

Minor CSS adjustments only - no new components needed.

---

## Technical Considerations

### Shared State

Both mobile and desktop views share:
- Campaign data (`useCampaign`)
- Components data (`useDashboardComponents`)
- Overlays (`useOverlayState`)
- Auth state (`useAuth`)

### Real-time Updates

Mobile dashboard must subscribe to the same real-time updates so widgets refresh when GMs make changes on desktop.

### Performance

- Lazy-load widget content in carousel (only render visible + 1 on each side)
- Use `React.memo` on `MobileWidgetCard`
- Virtualize if > 20 widgets (rare case)

### PWA Considerations (Future)

This architecture sets up well for future PWA:
- Mobile view already optimized for standalone mode
- Quick access to core features
- Works offline with cached data (future enhancement)

---

## Files Summary

| File | Action |
|------|--------|
| `src/hooks/use-mobile.tsx` | Extend with `useDeviceType()` |
| `src/components/dashboard/MobileDashboard.tsx` | **Create** - Phone-only view |
| `src/components/dashboard/MobileGMMenu.tsx` | **Create** - GM action FAB + sheet |
| `src/components/dashboard/MobileWidgetCard.tsx` | **Create** - Compact widget card |
| `src/components/dashboard/MobileWidgetSheet.tsx` | **Create** - Expanded widget view |
| `src/pages/CampaignDashboard.tsx` | Modify - Add device routing |

---

## Implementation Order

1. **Phase 1**: Update `use-mobile.tsx` with device detection
2. **Phase 2**: Create `MobileWidgetCard` (reusable component)
3. **Phase 3**: Create `MobileWidgetSheet` (expanded view)
4. **Phase 4**: Create `MobileGMMenu` (FAB + bottom sheet)
5. **Phase 5**: Create `MobileDashboard` (main container)
6. **Phase 6**: Integrate into `CampaignDashboard` with routing
7. **Phase 7**: Tablet touch optimizations (CSS only)
8. **Phase 8**: Testing and polish

---

## Visual Preview

### Phone - Player View
```
┌──────────────────────┐
│ ← CAMPS    Player    │
├──────────────────────┤
│ ┌──────────────────┐ │
│ │  CRUSADE OF     │ │
│ │  THE GOLDEN SUN │ │
│ │  Round 3 of 8   │ │
│ │  🎲 Join: ABC12 │ │
│ └──────────────────┘ │
│                      │
│ ─── WIDGETS ───      │
│ ┌────┐┌────┐┌────┐   │
│ │ 📊 ││ 🎲 ││ 📝 │ ← │
│ └────┘└────┘└────┘   │
│                      │
│ ─── QUICK ACCESS ─── │
│ [📜][🗺️][📅][💬]    │
│                      │
└──────────────────────┘
```

### Phone - GM View
```
┌──────────────────────┐
│ ← CAMPS   GM   [Out] │
├──────────────────────┤
│         ...          │
│   (same as player)   │
│         ...          │
│                      │
│            ┌───────┐ │
│            │⚡ Menu│ │
│            └───────┘ │
└──────────────────────┘
```

### GM Menu Expanded
```
┌──────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━ │
│ CAMPAIGN MANAGEMENT  │
│ [Add][Edit][Players] │
│ [Set][Export][Theme] │
│                      │
│ CONTENT              │
│ [Rule][Msg][Event]   │
│                      │
│   [Copy Join Code]   │
└──────────────────────┘
```

