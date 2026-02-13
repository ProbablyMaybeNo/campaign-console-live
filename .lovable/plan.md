

## Revamp Campaign Limit Modal + Add Archive Button to Campaign Table

This plan covers two things you asked for: (1) rewriting the Campaign Limit Modal with better copy, a subscriber interest button, and a secondary "interest" popup, and (2) adding an Archive/Restore button directly to each campaign row in the directory table.

---

### 1. Rewrite the Campaign Limit Modal

**Updated content flow:**

- **Title**: "Campaign Limit Reached" (keep existing)
- **Body**: Explain the free-tier limit, how to archive (via the new Archive button on the table or Campaign Settings), that archived campaigns persist indefinitely and can be restored anytime, and the 10-archive limit for created campaigns. Mention that players can join unlimited campaigns for free.
- **"Become a Subscriber" button**: Opens a secondary "Coming Soon" dialog
- **"Close" or "Got it" button**: Dismisses the modal

**Secondary "Coming Soon" dialog:**
- Thanks the user for their interest
- Mentions the planned ~$2.99/mo subscription tier with increased limits and exclusive features
- Includes a link to the Discord server (https://discord.gg/PmMn3NVt)
- "Close" button to dismiss

This will be implemented as internal state within the `CampaignLimitModal` component (a `showComingSoon` boolean toggling between the two views, or a nested dialog).

---

### 2. Add Archive/Restore Button to Campaign Table Rows

Currently, archiving is only accessible from Campaign Settings inside the dashboard. We will add a small Archive (or Restore, for archived tab) icon button directly on each campaign row in the directory table, visible only for campaigns the user owns (GM role).

**For the button row at the bottom of the table** -- rather than adding more buttons to the already-crowded bottom row, the archive action will be an inline icon button on each table row (similar to the existing Copy ID button). This keeps the table clean and makes the action contextual to each campaign.

---

### Technical Details

**Files to modify:**

1. **`src/components/campaigns/CampaignLimitModal.tsx`**
   - Rewrite the modal body with the new copy
   - Add a `showComingSoon` state for the secondary popup
   - Replace the "Archive a Campaign" button with a "Become a Subscriber" button that toggles the coming-soon view
   - Add the coming-soon content with Discord link
   - Keep a "Close" / "Got it" button to dismiss

2. **`src/pages/Campaigns.tsx`**
   - Add an inline Archive/Restore icon button on each campaign table row (only for GM-owned campaigns)
   - Wire it to the existing `archiveCampaign` mutation (already imported but unused in the action buttons)
   - Show `Archive` icon on active tab rows, `ArchiveRestore` icon on archived tab rows
   - Add a tooltip explaining the action

No database or backend changes needed -- the archive mutation and `is_archived` column already exist.

