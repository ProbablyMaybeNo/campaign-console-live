

# Mobile Experience Enhancement Plan

## Current State

The mobile dashboard currently shows widgets as small square cards in a 2-column grid. Each card only displays the widget name, an icon, and a brief text hint (e.g. "3 rows", "Tap to view"). Tapping a card opens the full widget in a bottom sheet. The Campaign Directory page uses a desktop table layout that's cramped on small screens.

## What Changes

### 1. Inline Widget Previews (MobileWidgetCard)
Replace the current "icon + tap to view" cards with actual content previews that vary by widget type:

- **Counter**: Already shows the number -- keep as-is but make it more prominent
- **Text**: Show the first 3-4 lines of text content directly in the card
- **Image**: Show a thumbnail of the image
- **Announcements**: Show the latest announcement snippet
- **Table**: Show first 2-3 rows in a compact mini-table
- **Dice Roller**: Show last roll result and a quick-roll button
- **Sticker**: Show the sticker image inline
- **Calendar**: Show next upcoming event date
- **Activity Feed**: Show the latest 1-2 activity items
- **Roll Recorder**: Show last recorded roll
- **Card**: Show a truncated preview of card content

Cards will no longer be forced to `aspect-square` -- they'll auto-size to fit their preview content with a sensible min-height. Tapping still opens the full widget sheet.

### 2. Single-Column Layout Option
Switch from 2-column grid to single-column for content-heavy widgets (text, tables, announcements) so previews have room to breathe. Smaller widgets (counter, dice, sticker) stay in a 2-column sub-grid.

### 3. Campaign Directory Mobile Redesign (Campaigns.tsx)
Replace the desktop table with a mobile-friendly card list on small screens:

- Each campaign becomes a tappable card showing: name, role badge (GM/Player), player count
- Swipe or long-press for actions (archive, delete) instead of tiny icon buttons
- Campaign actions (Create, Join) become a sticky bottom bar instead of buttons below the table
- Remove the double-border frame on mobile (too cramped)
- Single tap opens the campaign directly (no select-then-open pattern)

### 4. Bottom Navigation Bar Improvements
- Add subtle active state indicators when an overlay is open
- Add haptic-style press animations
- Increase icon sizes slightly for better tap targets

### 5. Header Refinements
- Show truncated campaign name in the mobile dashboard header
- Make the role badge more visually distinct

---

## Technical Details

### Files to Create
| File | Purpose |
|---|---|
| `src/components/dashboard/MobileWidgetPreview.tsx` | New component that renders inline previews per widget type |
| `src/components/campaigns/MobileCampaignList.tsx` | Mobile-specific campaign card list layout |

### Files to Modify
| File | Changes |
|---|---|
| `src/components/dashboard/MobileWidgetCard.tsx` | Replace icon+label layout with inline previews using MobileWidgetPreview; remove aspect-square constraint; add smart sizing per widget type |
| `src/components/dashboard/MobileDashboard.tsx` | Switch from uniform 2-col grid to mixed layout (full-width for content widgets, 2-col for compact widgets); show campaign name in header |
| `src/pages/Campaigns.tsx` | Detect mobile and render MobileCampaignList instead of table; single-tap navigation; sticky action bar |
| `src/components/dashboard/MobileGMMenu.tsx` | Minor polish -- slightly larger touch targets |

### Layout Strategy

The widget grid will categorize widgets into two groups:

**Full-width widgets** (single column): text, table, announcements, narrative_table, activity_feed, calendar, roll_recorder, image, map

**Compact widgets** (2-column): counter, dice_roller, sticker, card, player_list

This ensures content-heavy widgets get enough horizontal space for readable inline previews.

### Campaign Directory Mobile Cards

Each card will show:
- Role icon (crown for GM, user for Player) and campaign name
- Player count badge
- Direct tap to navigate (eliminating the select-then-open pattern)
- Archive button for GMs (small icon in corner)
- Join code copy for GMs (long press or secondary action)

