

# Schedule Calendar Enhancement Plan

## Overview
This plan enhances the schedule functionality with a calendar widget for the dashboard and an improved schedule overlay. The calendar displays rounds as colored bars spanning date ranges, with month navigation and real-time sync with schedule entries.

## Database Changes

### Add New Columns to `schedule_entries` Table
The current table lacks fields for date ranges and styling. We need to add:

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `start_date` | `date` | `null` | Round/event start date |
| `end_date` | `date` | `null` | Round/event end date |
| `color` | `text` | `'#3b82f6'` | Display color for calendar bars |
| `entry_type` | `text` | `'round'` | Differentiates rounds from single-day events |

## New Components

### 1. CalendarWidget (`src/components/dashboard/widgets/CalendarWidget.tsx`)

A new dashboard widget displaying a monthly calendar view:

```text
+------------------------------------------+
|  < January 2026 >                        |
+------------------------------------------+
| Mon | Tue | Wed | Thu | Fri | Sat | Sun  |
+------------------------------------------+
|     |     |  1  |  2  |  3  |  4  |  5   |
|     |     |[=== Round 1 ===]|     |      |
|  6  |  7  |  8  |  9  | 10  | 11  | 12   |
|                       |[Event]|          |
| 13  | 14  | 15  | 16  | 17  | 18  | 19   |
|[======== Round 2 ========]|              |
| ...                                      |
+------------------------------------------+
```

**Features:**
- Month navigation arrows (left/right)
- Day cells showing day name abbreviation (Mon, Tue, etc.) and date number
- Colored bars for rounds spanning multiple days
- Single-day event markers
- Click on entry to view details overlay
- Uses React Query with `schedule_entries` query key for live updates

### 2. Enhanced ScheduleWidget (`src/components/dashboard/widgets/ScheduleWidget.tsx`)

Revamp the overlay widget for GM management:

**For Rounds:**
- Title input
- Start date picker
- End date picker  
- Color picker (preset palette of 8 colors)
- Status dropdown

**For Single Events:**
- Title input
- Single date picker
- Color picker (optional)

**Features:**
- Toggle between "Round" and "Event" entry types
- Edit existing entries inline
- Delete entries with confirmation
- Status management (upcoming/in_progress/completed)

## Component Integration

### AddComponentModal Update
Add "Calendar" to `COMPONENT_TYPES`:

```typescript
{ 
  type: "calendar", 
  label: "Calendar", 
  icon: Calendar, 
  description: "Monthly view of rounds and events" 
}
```

### DraggableComponent Update
Add case for `calendar` type to render `CalendarWidget`:

```typescript
case "calendar":
  return <CalendarWidget campaignId={campaignId} isGM={isGM} />;
```

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `schedule_entries` table | Migrate | Add `start_date`, `end_date`, `color`, `entry_type` columns |
| `src/components/dashboard/widgets/CalendarWidget.tsx` | Create | New calendar dashboard widget |
| `src/components/dashboard/widgets/ScheduleWidget.tsx` | Update | Enhanced form with date pickers and color selection |
| `src/components/dashboard/AddComponentModal.tsx` | Update | Add calendar to component types |
| `src/components/dashboard/DraggableComponent.tsx` | Update | Render CalendarWidget for calendar type |
| `src/hooks/useScheduleEntries.ts` | Create | Dedicated hook for schedule CRUD operations |

## Technical Details

### CalendarWidget Implementation

**State Management:**
- `currentMonth: Date` - tracks displayed month
- `selectedEntry: ScheduleEntry | null` - for detail overlay

**Utility Functions:**
- `getDaysInMonth(date: Date)` - returns array of day objects for the month
- `getEntriesForDay(date: Date, entries: ScheduleEntry[])` - filters entries overlapping a given day
- `isDateInRange(date: Date, start: Date, end: Date)` - checks if date falls within range

**Rendering Logic:**
1. Generate 6-week grid for current month (ensures consistent height)
2. For each day cell, render:
   - Day of week abbreviation (Mon-Sun)
   - Date number
   - Entry bars that span from start to end date
3. Use CSS Grid with `grid-template-columns: repeat(7, 1fr)`
4. Entry bars use absolute positioning within cells

### Date Picker Integration
Use the existing Shadcn `Calendar` component wrapped in a `Popover` for date selection, following the pattern documented in the useful context.

### Real-time Updates
Both widgets use React Query with the `["schedule_entries", campaignId]` query key, ensuring mutations in the overlay automatically update the dashboard calendar widget.

### Default Widget Size
```typescript
if (selectedType === "calendar") {
  width = 450;
  height = 400;
}
```

## Color Palette
Preset colors for rounds/events:

| Color | Hex | Use Case |
|-------|-----|----------|
| Blue | `#3b82f6` | Default |
| Green | `#22c55e` | Completed |
| Red | `#ef4444` | Important |
| Yellow | `#eab308` | Warning |
| Purple | `#a855f7` | Special |
| Orange | `#f97316` | Deadline |
| Cyan | `#06b6d4` | Info |
| Pink | `#ec4899` | Event |

