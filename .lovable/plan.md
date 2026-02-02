
# V1 Bug Fixes and Feature Implementation Plan

## Overview
This plan addresses 8 main areas identified during testing: date picker UX, Getting Started modal improvements, FAQ scroll, GM settings cleanup, Player FAB styling, private messaging system, and announcements component.

---

## Phase 1: Quick UI Fixes

### 1.1 Campaign Creation - Date Pickers (CreateCampaignModal.tsx)
**Problem:** Only the calendar icon opens the date picker, not the entire input box.

**Solution:** Replace the native HTML `type="date"` inputs with Popover-based date pickers using the existing Calendar component. This makes the entire trigger area clickable.

**Files to modify:**
- `src/components/campaigns/CreateCampaignModal.tsx`

**Implementation:**
- Import `Popover`, `PopoverTrigger`, `PopoverContent` from ui/popover
- Import `Calendar` from ui/calendar
- Import `CalendarIcon` from lucide-react
- Replace the two `TerminalInput type="date"` fields with Popover-wrapped Calendar components
- Add `pointer-events-auto` class to Calendar as per shadcn guidelines

---

### 1.2 FAQ Overlay Scroll (HelpFAQModal.tsx)
**Problem:** FAQ overlay content not scrollable.

**Analysis:** The file already uses `ScrollArea` component. The issue may be with container height constraints.

**Solution:** Ensure the ScrollArea has proper height constraints by adjusting the flex container setup.

**Files to modify:**
- `src/components/help/HelpFAQModal.tsx`

**Implementation:**
- Add `overflow-hidden` to the dialog content
- Ensure `ScrollArea` has `overflow-y-auto` and proper `max-height` constraints
- Verify `data-scrollable="true"` attribute is present

---

### 1.3 Remove Advanced Section from Campaign Settings (CampaignSettingsModal.tsx)
**Problem:** The "Advanced" tab shows Rules Repository functionality that isn't implemented.

**Solution:** Remove the "Advanced" tab entirely from the settings modal.

**Files to modify:**
- `src/components/campaigns/CampaignSettingsModal.tsx`

**Implementation:**
- Remove the "Advanced" TabsTrigger from the TabsList (line 229-232)
- Remove the Advanced TabsContent block (lines 478-557)
- Remove unused imports: `GitBranch`, `RefreshCw`
- Remove repo-related state variables and handlers

---

## Phase 2: Getting Started Modal Updates

### 2.1 Update Step Instructions (GettingStartedModal.tsx)
**Files to modify:**
- `src/components/help/GettingStartedModal.tsx`

**Changes to STEPS array:**

| Step | Current | Updated |
|------|---------|---------|
| #2 (Components) | "Click the + Add Component button..." | Add: Make + icon reference green. Add sentence: "See the ? FAQ for details on each component type. Once created, manage components from the Components menu in the side panel." |
| #3 (Map) | "Upload a map image..." | Update to: "Set up your map using the Map settings in the side panel. Deploy a Map component onto the dashboard via the + component button." |
| #5 (Narrative) | "Use the Narrative panel..." | Update to: "Manage, edit, and create narrative entries via the Narrative menu in the side panel. Add a Narrative tracker component to the dashboard via the + button." |
| #6 (Schedule) | "Add dates in the Schedule panel..." | Update to: "Add, edit, remove, and manage campaign schedule, rounds, events, and dates via the Schedule menu in the side panel. Add a Calendar component containing scheduled dates and rounds via the + button." |
| #7 (Preview) | Current preview step | Add new step: "Want to take part in the campaign as a player? Use the Players panel in the side menu to add yourself as a player." |

---

## Phase 3: Player FAB Styling (Terminal Theme)

### 3.1 Restyle Player Menu (PlayerFAB.tsx)
**Problem:** Player menu items don't match the vintage computer terminal style.

**Solution:** Apply terminal styling with specific neon colors.

**Files to modify:**
- `src/components/dashboard/PlayerFAB.tsx`

**Styling specifications:**
- **Icons:** Bright neon blue (`hsl(200, 100%, 70%)`) with a subtle glow effect
- **Text labels:** Bright neon green (`hsl(142, 76%, 65%)`)
- **+ icon (when open):** Brighter neon red (`hsl(0, 80%, 55%)`) with a pulsing glow
- **Icon placement:** Arrange icons in a symmetrical row layout
- **Background:** Keep card/terminal dark background

**Implementation:**
- Update the `fabItems` array colors to use neon blue for all icons
- Change label text color to neon green
- Update main FAB button styling for the expanded/red state with glow animation
- Reorganize layout to show icons in a symmetrical row (horizontal) rather than vertical stack when expanded

---

## Phase 4: Private Messaging System

### 4.1 Database Schema Changes
**Current state:** The `messages` table has `author_id`, `campaign_id`, `content`, `priority`, and a `private` boolean column.

**Required additions:**
- Add `recipient_id` column (uuid, nullable, references auth.users)
- Add `is_read` column (boolean, default false)
- Update RLS policies for private message access

**Migration SQL:**
```sql
-- Add recipient_id for direct messages
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS recipient_id uuid REFERENCES auth.users(id);

-- Add read status tracking
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;

-- Create index for efficient unread queries
CREATE INDEX IF NOT EXISTS idx_messages_recipient_unread 
ON public.messages(recipient_id, is_read) WHERE is_read = false;

-- Update RLS policy for private messages
DROP POLICY IF EXISTS "Campaign members can view messages" ON public.messages;

CREATE POLICY "View messages" ON public.messages
FOR SELECT USING (
  -- Public campaign messages (no recipient)
  (recipient_id IS NULL AND (
    EXISTS (SELECT 1 FROM campaign_players WHERE campaign_id = messages.campaign_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM campaigns WHERE id = messages.campaign_id AND owner_id = auth.uid())
  ))
  OR
  -- Private messages (sender or recipient)
  (recipient_id IS NOT NULL AND (author_id = auth.uid() OR recipient_id = auth.uid()))
);

-- Allow updating read status
CREATE POLICY "Recipients can mark messages read" ON public.messages
FOR UPDATE USING (recipient_id = auth.uid())
WITH CHECK (recipient_id = auth.uid());
```

### 4.2 Create Player Messages Overlay Component
**New file:** `src/components/players/PlayerMessagesOverlay.tsx`

**Features:**
- Inbox-style list of private messages grouped by conversation
- Message compose area with @ mention autocomplete
- Real-time updates via Supabase subscription
- Mark as read functionality

### 4.3 Create @ Mention Input Component
**New file:** `src/components/ui/MentionInput.tsx`

**Features:**
- Text input that detects @ character
- Shows dropdown of campaign players when @ is typed
- Inserts selected player name and stores recipient_id
- Terminal-styled dropdown matching app theme

### 4.4 Add Unread Message Indicator to Player Dashboard
**Files to modify:**
- `src/components/dashboard/PlayerFAB.tsx`

**Implementation:**
- Add state for tracking unread private messages
- Query messages where `recipient_id = auth.uid() AND is_read = false`
- Display neon red mail icon in top-left corner when unread count > 0
- Subscribe to realtime changes for immediate updates
- Clear indicator when messages overlay is opened

### 4.5 Create usePlayerMessages Hook
**New file:** `src/hooks/usePlayerMessages.ts`

**Features:**
- Fetch private messages for current user
- Send private messages with @ mention support
- Mark messages as read
- Subscribe to realtime updates
- Track unread count

---

## Phase 5: Announcements Component

### 5.1 Create Announcements Widget
**New file:** `src/components/dashboard/widgets/AnnouncementsWidget.tsx`

**Features:**
- Notice board display for GM announcements
- List of announcements with title, content, timestamp
- Priority badges (normal, important, urgent)
- Terminal-styled appearance

### 5.2 Create GM Announcement Composer
**Integrated within widget or as modal**

**Features:**
- Title and content fields
- Checkbox: "Also send as message to players"
- When checked, show player selection:
  - "All players" toggle
  - OR @ mention input to select specific players
- Submit creates announcement AND sends private messages to selected recipients

### 5.3 Add Announcements to AddComponentModal
**Files to modify:**
- `src/components/dashboard/AddComponentModal.tsx`

**Implementation:**
- Add new component type to COMPONENT_TYPES array:
```typescript
{ 
  type: "announcements", 
  label: "Announcements", 
  icon: Megaphone, 
  description: "GM notice board for campaign announcements" 
}
```

### 5.4 Messages Widget Removal
**Note:** Per user request, if messages are now private, the existing MessagesWidget (which shows campaign-wide messages) should be deprecated or repurposed for announcements only.

**Decision:** Convert existing MessagesWidget to display only public announcements (messages with `recipient_id = null`). Private messages go through the new PlayerMessagesOverlay.

---

## Phase 6: Overlay Registration

### 6.1 Add Player Messages to Overlay System
**Files to modify:**
- `src/hooks/useOverlayState.ts` - Add "player-messages" to OverlayType
- `src/components/dashboard/CampaignOverlays.tsx` - Route to PlayerMessagesOverlay
- `src/components/dashboard/PlayerFAB.tsx` - Update messages item to open player-messages overlay

---

## Technical Summary

### New Files to Create:
1. `src/components/players/PlayerMessagesOverlay.tsx`
2. `src/components/ui/MentionInput.tsx`
3. `src/hooks/usePlayerMessages.ts`
4. `src/components/dashboard/widgets/AnnouncementsWidget.tsx`

### Files to Modify:
1. `src/components/campaigns/CreateCampaignModal.tsx` - Date pickers
2. `src/components/help/HelpFAQModal.tsx` - Scroll fix
3. `src/components/campaigns/CampaignSettingsModal.tsx` - Remove Advanced tab
4. `src/components/help/GettingStartedModal.tsx` - Step text updates
5. `src/components/dashboard/PlayerFAB.tsx` - Terminal styling + mail indicator
6. `src/components/dashboard/AddComponentModal.tsx` - Add Announcements type
7. `src/components/dashboard/CampaignOverlays.tsx` - Route new overlays
8. `src/hooks/useOverlayState.ts` - Add overlay type
9. `src/components/dashboard/widgets/MessagesWidget.tsx` - Repurpose for announcements

### Database Migration:
- Add `recipient_id` column to messages table
- Add `is_read` column to messages table
- Update RLS policies for private message access
- Add UPDATE policy for marking messages read

---

## Implementation Order
1. Quick UI fixes (date pickers, FAQ scroll, remove Advanced tab)
2. Getting Started modal text updates
3. Player FAB terminal styling
4. Database migration for messaging
5. Player messages hook and overlay
6. Mention input component
7. Unread indicator integration
8. Announcements widget
9. Testing and refinement
