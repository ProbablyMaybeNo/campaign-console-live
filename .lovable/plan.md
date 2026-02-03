
# OS-Themed Dashboard Themes Implementation Plan

## Overview

Replace the current 5 supporter themes (Light, Aquatic, Parchment, Hazard) with 9 new iconic OS-inspired themes, add rich preview metadata for the Supporter Hub, and create a visual theme preview card component.

---

## Current State

**Existing Themes:**
- Dark (default, free)
- Light, Aquatic, Parchment, Hazard (supporter-only)

**Files to Modify:**
- `src/index.css` - CSS theme definitions
- `src/lib/themes.ts` - Theme metadata and types
- `src/components/settings/SupporterWelcomeModal.tsx` - Update theme count
- `src/components/campaigns/CampaignSettingsModal.tsx` - Theme selector UI

**New Files:**
- `src/components/supporter/ThemePreviewCard.tsx` - Visual theme preview component

---

## New Theme Lineup

| Theme ID | Name | Visual Style |
|----------|------|--------------|
| `dark` | Dark | Default terminal (free) |
| `win95` | Windows 95 Classic | Teal desktop + gray chrome + navy |
| `mac_platinum` | Mac OS Platinum+ | Platinum + blue + lavender |
| `amiga_workbench` | Amiga Workbench | Deep blue + orange + cyan |
| `vt320_amber` | DEC VT320 Amber | Black + amber phosphor |
| `msdos_vga` | MS-DOS VGA | VGA blue + cyan/magenta/yellow |
| `atari_tos` | Atari ST TOS | Green desktop + neon arcade |
| `nextstep` | NeXTSTEP | Graphite + yellow + cyan |
| `solaris_cde` | Solaris CDE | Warm stone + teal/blue |
| `sgi_irix` | SGI IRIX Indigo | Steel + teal/indigo + orange |

---

## Implementation Steps

### Phase 1: Update Theme Type Definitions

**File: `src/lib/themes.ts`**

Replace the current simple Theme interface with the enhanced ThemeMeta type:

```typescript
export type ThemeId =
  | "dark"
  | "win95"
  | "mac_platinum"
  | "amiga_workbench"
  | "vt320_amber"
  | "msdos_vga"
  | "atari_tos"
  | "nextstep"
  | "solaris_cde"
  | "sgi_irix";

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  tagline: string;
  icon: LucideIcon;
  supporterOnly: boolean;
  preview: {
    background: string;  // HSL format: "h s% l%"
    card: string;
    primary: string;
    secondary: string;
    accent: string;
    border: string;
  };
  fonts: {
    ui: string;
    mono: string;
  };
}
```

Add new icon imports for OS themes:
- `Moon` for Dark
- `Monitor`, `Apple`, `Cpu`, `Terminal`, `HardDrive`, `Gamepad2`, `Square`, `Sun`, `Server` for OS themes

---

### Phase 2: Update CSS Theme Definitions

**File: `src/index.css`**

1. **Remove** existing Light, Aquatic, Parchment, and Hazard theme blocks (lines 141-322)

2. **Add** 9 new OS theme blocks after the `:root` and `.dark` definitions:
   - Windows 95 Classic (`[data-theme="win95"]`)
   - Mac OS Platinum+ (`[data-theme="mac_platinum"]`)
   - Amiga Workbench (`[data-theme="amiga_workbench"]`)
   - DEC VT320 Amber (`[data-theme="vt320_amber"]`)
   - MS-DOS VGA (`[data-theme="msdos_vga"]`)
   - Atari ST TOS (`[data-theme="atari_tos"]`)
   - NeXTSTEP (`[data-theme="nextstep"]`)
   - Solaris CDE (`[data-theme="solaris_cde"]`)
   - SGI IRIX Indigo (`[data-theme="sgi_irix"]`)

Each theme includes all required tokens:
- Core: background, foreground, card, popover
- Intent: primary, secondary, destructive, warning, success
- Glow variants: primary-glow, primary-bright, secondary-glow, etc.
- UI: muted, accent, border, input, ring, radius
- Sidebar: full sidebar token set
- Charts: chart-1 through chart-5
- Fonts: --font-ui and --font-mono

---

### Phase 3: Create Theme Preview Card Component

**New File: `src/components/supporter/ThemePreviewCard.tsx`**

A visual preview component that:
1. Uses nested `data-theme` attribute for accurate color rendering
2. Shows a mini "dashboard snapshot" with:
   - Background color
   - Card with sample text
   - Primary/secondary/accent color swatches
   - Font sample text
3. Displays theme name and tagline
4. Shows "Apply" button for supporters
5. Shows lock icon for non-supporters
6. Highlights currently active theme with ring/checkmark

---

### Phase 4: Update Theme Selector in Campaign Settings

**File: `src/components/campaigns/CampaignSettingsModal.tsx`**

Update the theme grid (lines 380-415):
1. Change from 5-column grid to responsive grid (3 columns on smaller screens)
2. Import `ThemePreviewCard` component
3. Replace simple icon buttons with rich preview cards
4. Each card shows:
   - Mini color swatch preview
   - Theme name and tagline
   - Lock state for non-supporters

---

### Phase 5: Update Supporter Welcome Modal

**File: `src/components/settings/SupporterWelcomeModal.tsx`**

Update the Dashboard Themes feature entry (line 37):

```typescript
{
  icon: Palette,
  title: "Dashboard Themes",
  description: "Choose from 10 unique OS-inspired themes including Windows 95, Mac Platinum, Amiga, VT320 Amber, and more.",
  howToAccess: "Campaign Settings → Appearance → Theme Selector.",
}
```

---

### Phase 6: Font Handling

**Current fonts available:**
- IBM Plex Mono (already imported)
- Uncial Antiqua
- Augusta / Augusta Shadow (local)
- Old London (local)

**New theme fonts:**
All 9 OS themes use `IBM Plex Mono` as the primary font, with system fallbacks:
- `IBM Plex Mono, Tahoma, system-ui` for Win95
- `IBM Plex Mono, system-ui` for Mac/Amiga/Atari/NeXT/Solaris/SGI
- `IBM Plex Mono, ui-monospace` for VT320/MS-DOS

No new font downloads required - all themes use existing IBM Plex Mono with system fallbacks.

---

## Technical Notes

### Theme Application

The current system applies themes via `data-theme` attribute on the dashboard container:
```tsx
<div data-theme={themeId}>
```

CSS selectors like `[data-theme="win95"]` override the `:root` variables within that scope.

### Preview Card Isolation

Theme preview cards use the same `data-theme` attribute locally:
```tsx
<div data-theme={theme.id} className="preview-container">
  {/* Uses theme's actual CSS variables */}
</div>
```

This ensures previews show accurate colors without affecting the rest of the UI.

### Backward Compatibility

Users with existing theme selections (light, aquatic, parchment, hazard) will fall back to "dark" since those theme IDs will no longer exist. The code already handles unknown themes by defaulting to dark:

```typescript
const themeId = campaign?.theme_id || "dark";
```

---

## Files Summary

| File | Action |
|------|--------|
| `src/lib/themes.ts` | Rewrite with new ThemeMeta type and 10 themes |
| `src/index.css` | Remove old themes, add 9 OS themes |
| `src/components/supporter/ThemePreviewCard.tsx` | Create new component |
| `src/components/campaigns/CampaignSettingsModal.tsx` | Update theme selector UI |
| `src/components/settings/SupporterWelcomeModal.tsx` | Update theme count/description |

---

## Visual Preview

```text
┌─────────────────────────────────────────────────┐
│  DASHBOARD THEMES                               │
│  ───────────────────────────────────            │
│                                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ ■ Dark  │ │ ■ Win95 │ │ ■ Mac   │           │
│  │ [████]  │ │ [████]  │ │ [████]  │  ← Color  │
│  │ [████]  │ │ [████]  │ │ [████]  │    swatches│
│  │ Default │ │ Teal+   │ │ Platinum│           │
│  │         │ │ Gray 🔒 │ │ +Blue 🔒│           │
│  └─────────┘ └─────────┘ └─────────┘           │
│                                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ ■ Amiga │ │ ■ VT320 │ │ ■ DOS   │           │
│  │ [████]  │ │ [████]  │ │ [████]  │           │
│  │ [████]  │ │ [████]  │ │ [████]  │           │
│  │ Blue+   │ │ Amber   │ │ VGA     │           │
│  │ Orange🔒│ │ Phosphor│ │ Blue 🔒 │           │
│  └─────────┘ └─────────┘ └─────────┘           │
│                                                 │
│  ... (Atari, NeXT, Solaris, SGI)               │
└─────────────────────────────────────────────────┘
```

Each preview card shows:
- Background color as main card fill
- Primary/secondary color swatches
- Theme name and brief tagline
- Lock icon for non-supporters
- Checkmark/ring for active selection
