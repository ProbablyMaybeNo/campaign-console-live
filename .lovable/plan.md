
# Implementation Plan: Supporter-Gated Features (Phase 2)

This plan continues the implementation from Phase 1 (completed), which established the entitlements system, campaign limits, and archiving. Now we implement the remaining supporter-exclusive features.

## Summary of Changes

| Feature | Status | Implementation |
|---------|--------|----------------|
| Entitlements System | Done | `useEntitlements` hook + `get_user_entitlements` RPC |
| Campaign Limits (1/5) | Done | Server-side enforcement + `CampaignLimitModal` |
| Archive/Restore | Done | `is_archived` column + UI tabs |
| Smart Paste Lock | **To Do** | Gate AI conversion, keep deterministic parsing |
| Dashboard Themes (5) | **To Do** | CSS variables + theme selector |
| Campaign Banner | **To Do** | URL field + display in console |
| Text Widget | **To Do** | New widget type with markdown |
| Sticker Widget | **To Do** | Lucide icon selector widget |

---

## Phase 2A: Smart Paste Lock

### Goal
Lock AI-powered Smart Paste behind Supporter while keeping deterministic parsing (CSV/TSV) available to all.

### Changes

**1. Update Edge Function** (`supabase/functions/convert-text-to-table/index.ts`)
- Add entitlement check after authentication
- Query `get_user_entitlements` for the authenticated user
- Return `403 SUBSCRIPTION_REQUIRED` if `smart_paste_enabled` is false

```text
┌─────────────────────────────────────────────────────────────┐
│                 convert-text-to-table                       │
├─────────────────────────────────────────────────────────────┤
│ 1. Authenticate user (existing)                             │
│ 2. NEW: Call get_user_entitlements(user_id)                │
│ 3. NEW: If !smart_paste_enabled → 403 SUBSCRIPTION_REQUIRED│
│ 4. Process AI conversion (existing)                         │
└─────────────────────────────────────────────────────────────┘
```

**2. Update PasteWizardOverlay** (`src/components/dashboard/PasteWizardOverlay.tsx`)
- Import `useEntitlements` and `isFeatureLocked`
- For "AI Convert" button:
  - If locked: show with `LockedButton` wrapper
  - If unlocked: show normal button
- Keep "Generate" (deterministic parsing) available to all users

**3. Update AddComponentModal** (`src/components/dashboard/AddComponentModal.tsx`)
- Import entitlements hook
- For Rules Table/Rules Card options:
  - Show lock icon overlay when `smart_paste_enabled` is false
  - Allow click but show upgrade prompt when trying to use AI features

---

## Phase 2B: Dashboard Themes (5 Total)

### Goal
Implement 5 themes via CSS variables, selectable per campaign.

### Theme Definitions

| Theme | Background | Panel | Primary | Accent |
|-------|------------|-------|---------|--------|
| **Dark** (default) | `#080808` | `#0d0d0d` | Green `#22c55e` | Cyan |
| **Light** | `#f8f8f8` | `#ffffff` | Blue `#3b82f6` | Indigo |
| **Aquatic** | `#0a1929` | `#0d2137` | Cyan `#06b6d4` | Seafoam |
| **Parchment** | `#f5f0e6` | `#faf8f3` | Brown `#92400e` | Brass |
| **Hazard** | `#0a0a0a` | `#111111` | Neon Green `#39ff14` | Amber |

### Changes

**1. Add Theme CSS Variables** (`src/index.css`)
Add theme classes that override CSS custom properties:

```css
[data-theme="light"] {
  --background: 0 0% 97%;
  --foreground: 0 0% 10%;
  --card: 0 0% 100%;
  --primary: 217 91% 60%;
  /* ... etc */
}

[data-theme="aquatic"] { /* ... */ }
[data-theme="parchment"] { /* ... */ }
[data-theme="hazard"] { /* ... */ }
```

**2. Create Theme Configuration** (`src/lib/themes.ts`)
```typescript
export const THEMES = [
  { id: 'dark', name: 'Dark', icon: Moon, locked: false },
  { id: 'light', name: 'Light', icon: Sun, locked: true },
  { id: 'aquatic', name: 'Aquatic', icon: Waves, locked: true },
  { id: 'parchment', name: 'Parchment', icon: Scroll, locked: true },
  { id: 'hazard', name: 'Hazard', icon: AlertTriangle, locked: true },
];
```

**3. Update CampaignSettingsModal** (`src/components/campaigns/CampaignSettingsModal.tsx`)
- Add Theme selector in Appearance tab
- Use `LockedFeature` wrapper for non-Dark themes when user is not Supporter
- Persist selection to `campaigns.theme_id`

**4. Apply Theme to Dashboard** (`src/pages/CampaignDashboard.tsx`)
- Read `campaign.theme_id` from campaign data
- Apply `data-theme` attribute to dashboard root container
- Only apply if user is Supporter OR theme is "dark"

---

## Phase 2C: Campaign Banner Image

### Goal
Allow Supporters to set a banner image URL displayed in the dashboard header.

### Changes

**1. Database** (already done in Phase 1)
- `campaigns.banner_url` column exists

**2. Update CampaignSettingsModal** (`src/components/campaigns/CampaignSettingsModal.tsx`)
- Add Banner URL input field in Appearance tab
- Wrap with `LockedFeature` for Free users
- Validate URL format before saving

**3. Update CampaignConsoleWidget** (`src/components/dashboard/widgets/CampaignConsoleWidget.tsx`)
- If `campaign.banner_url` is set:
  - Display banner image at top of widget
  - Use `object-cover` with max height
  - Add fallback for broken images

---

## Phase 2D: Text Widget (Supporter)

### Goal
New widget type for plain text or basic markdown notes.

### Changes

**1. Create TextWidget** (`src/components/dashboard/widgets/TextWidget.tsx`)
- Props: `component`, `isGM`, `campaignId`
- Config stores: `{ content: string, showTitle?: boolean }`
- Display: Scrollable text area with basic markdown rendering
- GM can edit inline (like other widgets)

**2. Update AddComponentModal** (`src/components/dashboard/AddComponentModal.tsx`)
- Add "Text" to `COMPONENT_TYPES` array
- Icon: `FileText` from lucide
- Gate with `LockedButton` using `text_widget_enabled` entitlement

**3. Update DraggableComponent** (`src/components/dashboard/DraggableComponent.tsx`)
- Add case for `component_type === "text"` to render `TextWidget`

**4. Update useDashboardComponents** (if needed)
- Ensure Text widget config schema is handled

---

## Phase 2E: Sticker Widget (Supporter)

### Goal
Widget that displays a selectable Lucide icon as a visual marker.

### Changes

**1. Define Sticker Library** (`src/lib/stickerLibrary.ts`)
```typescript
export const STICKER_CATEGORIES = {
  objectives: ['Target', 'Flag', 'Star', 'Trophy'],
  units: ['Sword', 'Shield', 'Users', 'User'],
  terrain: ['Mountain', 'Trees', 'Home', 'Castle'],
  status: ['AlertCircle', 'CheckCircle', 'XCircle', 'Clock'],
  loot: ['Gem', 'Crown', 'Coins', 'Gift'],
  cities: ['Building', 'Church', 'Store', 'Factory'],
  danger: ['Skull', 'Flame', 'Zap', 'AlertTriangle'],
  arrows: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
};
// ~50-80 icons total
```

**2. Create StickerWidget** (`src/components/dashboard/widgets/StickerWidget.tsx`)
- Props: `component`, `isGM`
- Config: `{ icon: string, size: 'sm' | 'md' | 'lg', color?: string }`
- Display: Renders the selected Lucide icon at chosen size
- GM edit mode: Opens icon picker palette

**3. Create StickerPicker** (`src/components/dashboard/StickerPicker.tsx`)
- Grid of categorized icons
- Search/filter functionality
- Size selector (S/M/L)
- Color picker (preset palette)

**4. Update AddComponentModal**
- Add "Sticker" to `COMPONENT_TYPES`
- Icon: `Sticker` from lucide
- Gate with `LockedButton` using `stickers_enabled` entitlement

**5. Update DraggableComponent**
- Add case for `component_type === "sticker"` to render `StickerWidget`

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/convert-text-to-table/index.ts` | Edit | Add entitlement check |
| `src/index.css` | Edit | Add theme CSS variables |
| `src/lib/themes.ts` | Create | Theme configuration |
| `src/lib/stickerLibrary.ts` | Create | Sticker icon library |
| `src/components/dashboard/AddComponentModal.tsx` | Edit | Add Text + Sticker with locks |
| `src/components/dashboard/PasteWizardOverlay.tsx` | Edit | Lock AI Convert button |
| `src/components/campaigns/CampaignSettingsModal.tsx` | Edit | Add theme + banner UI |
| `src/pages/CampaignDashboard.tsx` | Edit | Apply theme attribute |
| `src/components/dashboard/widgets/CampaignConsoleWidget.tsx` | Edit | Display banner |
| `src/components/dashboard/widgets/TextWidget.tsx` | Create | New widget |
| `src/components/dashboard/widgets/StickerWidget.tsx` | Create | New widget |
| `src/components/dashboard/StickerPicker.tsx` | Create | Icon picker UI |
| `src/components/dashboard/DraggableComponent.tsx` | Edit | Add widget cases |

---

## Testing Checklist

### Free User
- [ ] Can access 1 active campaign
- [ ] Can archive/unarchive campaigns
- [ ] Sees locked Smart Paste (AI) with upgrade CTA
- [ ] Can still use deterministic parsing (Generate button)
- [ ] Sees locked themes (only Dark available)
- [ ] Sees locked banner URL field
- [ ] Sees locked Text widget option
- [ ] Sees locked Sticker widget option

### Supporter User
- [ ] Can access up to 5 active campaigns
- [ ] Smart Paste (AI Convert) works
- [ ] Can select any of 5 themes
- [ ] Can set banner URL, image displays
- [ ] Can add Text widgets with content
- [ ] Can add Sticker widgets with icon selection

### No Regressions
- [ ] Existing widgets function normally
- [ ] Title/border color customization works for all users
- [ ] Campaign flows unchanged
- [ ] Player access unchanged
