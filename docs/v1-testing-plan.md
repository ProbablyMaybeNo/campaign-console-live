# v1 Release Manual Testing Plan

## Campaign Console Application - Functional QA Checklist

> ⚠️ **IMPORTANT**: This is a **hands-on functional testing guide**. Every test requires actually interacting with the running application through a browser. Tests verify real behavior and data persistence, not just that code exists.

---

## Testing Methodology

### How to Execute Tests
1. **Open the live preview URL** in your browser
2. **Perform each action** by clicking, typing, and interacting with the UI
3. **Observe the result** on screen (not in code)
4. **Verify persistence** by refreshing the page after key actions
5. **Check console** for JavaScript errors after each section

### Test Data to Use
| Purpose | Value |
|---------|-------|
| GM Email | `qa-gm@testcampaign.com` |
| Player Email | `qa-player@testcampaign.com` |
| Password | `TestPassword123!` |
| Campaign Name | `QA Test Campaign v1` |
| Points Limit | `2000` |
| Test Message | `Hello from QA testing!` |

### For AI Agent Testing
- Use `open_browser` tool to start testing session
- Take screenshots at key checkpoints
- Check console logs for errors after major actions
- Use a second browser/incognito for multi-user tests

---

## 1. Authentication System

### 1.1 Sign Up Flow
**Start State**: Logged out, on `/auth` page, localStorage cleared

| Step | Action | Expected Result | Verify By |
|------|--------|-----------------|-----------|
| 1 | Navigate to `/auth` | Login page with "CAMPAIGN CONSOLE" title, Swords icon | Title visible, login form displayed |
| 2 | Click "Create Account" link | Form shows Display Name field | New input field appears |
| 3 | Click submit with empty fields | Validation errors appear | Red error text visible |
| 4 | Type `invalid-email` in email field | Email validation error shown | Error message mentions email format |
| 5 | Enter valid email + password `abc` | Password too short error | Error mentions minimum length |
| 6 | Enter `qa-gm@testcampaign.com`, `TestPassword123!`, `QA Tester` | Account created, redirects to `/campaigns` | URL changes to `/campaigns`, toast shows success |
| 7 | Refresh the page | Still on `/campaigns`, still logged in | Page reloads, campaigns page visible |

**Cleanup**: Keep this account for later tests

### 1.2 Login Flow
**Start State**: Logged out (use different browser or logout first)

| Step | Action | Expected Result | Verify By |
|------|--------|-----------------|-----------|
| 1 | Navigate to `/auth` | Login form displayed | Email and password inputs visible |
| 2 | Enter `wrong@email.com` / `wrongpass` | Error: "Invalid login credentials" | Toast or error message appears |
| 3 | Enter `qa-gm@testcampaign.com` / `TestPassword123!` | Success, redirects to `/campaigns` | URL changes, campaigns list visible |
| 4 | Refresh page | Session persists | Still on `/campaigns` after refresh |

### 1.3 Logout Flow
**Start State**: Logged in

| Step | Action | Expected Result | Verify By |
|------|--------|-----------------|-----------|
| 1 | Click "Logout" button | Session ends, redirects to `/auth` | URL changes to `/auth`, login form visible |
| 2 | Navigate directly to `/campaigns` | Redirects back to `/auth` | URL changes to `/auth` (protected route) |

---

## 2. Campaign Management

### 2.1 Create Campaign
**Start State**: Logged in as GM account, on `/campaigns` page

| Step | Action | Expected Result | Verify By |
|------|--------|-----------------|-----------|
| 1 | Click "[ Create ]" button | Modal opens with title "Create New Campaign" | Modal visible, background dimmed |
| 2 | Try to submit with empty name | Button disabled or shows error | Cannot submit, validation message |
| 3 | Type `QA Test Campaign v1` in Name field | Create button becomes active | Button no longer disabled |
| 4 | Enter description: `Testing campaign for v1 QA` | Text appears in textarea | Description shows |
| 5 | Set Points Limit to `2000` | Field shows 2000 | Input value updates |
| 6 | Click "Create Campaign" | Loading, then redirect to dashboard | URL changes to `/campaign/{id}`, Campaign Console widget visible |
| 7 | Verify Campaign Console shows name | Widget displays "QA Test Campaign v1" | Name visible in fantasy font |
| 8 | Refresh the page | Campaign Console still visible | Data persisted in database |
| 9 | Navigate to `/campaigns` | Campaign appears in list | Row shows campaign name with Crown icon (GM) |

### 2.2 Join Campaign (Second User)
**Start State**: Second browser/incognito, create `qa-player@testcampaign.com` account

| Step | Action | Expected Result | Verify By |
|------|--------|-----------------|-----------|
| 1 | Login as player account | Navigate to `/campaigns` | Campaigns page visible |
| 2 | Click "[ Join ]" button | Join Campaign modal opens | Modal with code input field |
| 3 | Enter `invalid-code-12345` | Error: "Campaign not found" | Error message appears |
| 4 | Get valid join code from GM's campaign | Have the code ready | (GM copies from campaign settings or ID) |
| 5 | Enter valid join code | Joins campaign, redirects to dashboard | URL changes to campaign dashboard |
| 6 | Verify player sees Campaign Console | Widget shows campaign name | Same campaign visible as player |
| 7 | Refresh page | Still on campaign dashboard | Joined state persisted |

### 2.3 Campaign List Display
**Start State**: Logged in with campaigns to view

| Step | Action | Expected Result | Verify By |
|------|--------|-----------------|-----------|
| 1 | Navigate to `/campaigns` | Table shows all campaigns | Campaign rows visible |
| 2 | Check role icons | Crown for owned, User icon for joined | Correct icons per campaign |
| 3 | Single-click a campaign row | Row highlights | Visual highlight/selection |
| 4 | Click "Open" button | Navigates to campaign dashboard | URL changes to `/campaign/{id}` |
| 5 | Go back to `/campaigns`, double-click row | Navigates directly to dashboard | Same as clicking Open |

### 2.4 Delete Campaign
**Start State**: Logged in as GM with a test campaign

| Step | Action | Expected Result | Verify By |
|------|--------|-----------------|-----------|
| 1 | Select a campaign you own | Row highlighted | Selection visible |
| 2 | Click "[ Remove Campaign ]" | Confirmation modal appears | Modal asks "Are you sure?" |
| 3 | Click Cancel | Modal closes | Campaign still in list |
| 4 | Click "[ Remove Campaign ]" again | Confirmation modal | Modal reappears |
| 5 | Confirm deletion | Campaign removed from list | Row disappears, toast confirms |
| 6 | Refresh page | Campaign still gone | Deletion persisted |

---

## 3. Campaign Dashboard

### 3.1 Dashboard Loading
**Start State**: Logged in as GM, navigating to a campaign

| Step | Action | Expected Result | Verify By |
|------|--------|-----------------|-----------|
| 1 | Click on a campaign to open | Loading state shown | Spinner or loading indicator |
| 2 | Dashboard loads | Campaign Console widget visible | Widget with campaign name at center |
| 3 | Check zoom indicator | Shows "100%" | Scale text in canvas controls |

### 3.2 Campaign Console Widget
**Start State**: On campaign dashboard as GM

| Step | Action | Expected Result | Verify By |
|------|--------|-----------------|-----------|
| 1 | Read widget content | Shows campaign name in decorative font | Fantasy/medieval font styling |
| 2 | Check metadata | Shows ID, players, round info based on settings | Metadata rows visible |
| 3 | Look for X (close) button | No close button exists | Widget cannot be deleted |
| 4 | Find drag handle (top-left) | GripVertical icon visible | Grip icon in top-left corner |
| 5 | Drag widget to new position | Widget moves with cursor | Widget follows drag |
| 6 | Release and refresh page | Widget stays in new position | Position persisted to database |
| 7 | Find resize handle (bottom-right) | Maximize2 icon visible | Corner resize icon |
| 8 | Drag to resize widget | Widget size changes | Widget gets larger/smaller |
| 9 | Refresh page | Widget keeps new size | Size persisted |

### 3.3 Canvas Controls
**Start State**: On campaign dashboard

| Step | Action | Expected Result | Verify By |
|------|--------|-----------------|-----------|
| 1 | Click zoom in (+) button | Canvas zooms in | Scale indicator increases (e.g., 115%) |
| 2 | Click zoom out (-) button | Canvas zooms out | Scale indicator decreases |
| 3 | Click reset (1:1) button | Zoom resets to 100% | Scale shows "100%" |
| 4 | Click recenter (crosshair) button | View pans to Campaign Console | Console widget centers in viewport |
| 5 | Use Ctrl+Plus on keyboard | Zooms in | Scale increases |
| 6 | Use Ctrl+0 on keyboard | Resets zoom | Scale returns to 100% |
| 7 | Try mouse wheel scroll on canvas | Should NOT zoom (pans instead or nothing) | Scroll wheel does not change scale |
| 8 | Click and drag on empty canvas area | Canvas pans | View position changes |

### 3.4 Snap to Grid
**Start State**: On dashboard with at least one widget

| Step | Action | Expected Result | Verify By |
|------|--------|-----------------|-----------|
| 1 | Find snap-to-grid toggle button | Grid icon in controls | Button visible |
| 2 | Enable snap-to-grid | Button shows active state | Button highlighted/pressed |
| 3 | Drag a widget | Widget snaps to grid positions | Jumps in 20px increments |
| 4 | Resize a widget | Size snaps to grid | Jumps in 20px increments |

---

## 4. Dashboard Widgets

### 4.1 Add Component Modal (GM Only)
**Start State**: On dashboard as GM

| Step | Action | Expected Result | Verify By |
|------|--------|-----------------|-----------|
| 1 | Click floating + button (bottom-right) | Add Component modal opens | Modal with widget type grid |
| 2 | Count widget types | 11+ types available | Rules Table, Custom Table, Counter, Dice Roller, Image, Map, Player List, Calendar, etc. |
| 3 | Click "Counter" | Widget added to canvas | New Counter widget appears |

### 4.2 Counter Widget - Full Functionality Test
**Start State**: On dashboard as GM

| Step | Action | Expected Result | Verify By |
|------|--------|-----------------|-----------|
| 1 | Add Counter widget via + button | Widget appears with value 0 | Counter shows "0" |
| 2 | Click + button on widget | Value becomes 1 | Display shows "1" |
| 3 | Click + button 4 more times | Value becomes 5 | Display shows "5" |
| 4 | Click - button | Value becomes 4 | Display shows "4" |
| 5 | Refresh the page | Value still shows 4 | Counter value persisted |
| 6 | Click settings (gear) icon | Configuration panel opens | Settings form appears |
| 7 | Set Label to "Round Counter" | Label updates | Label visible above counter |
| 8 | Set Min to 0, Max to 10, Step to 2 | Settings save | Confirm in settings panel |
| 9 | Click + button | Value increases by 2 (to 6) | Step of 2 applied |
| 10 | Keep clicking + until max | Value stops at 10 | Cannot exceed maximum |
| 11 | Refresh page | All settings retained | Label, value, limits persist |

### 4.3 Dice Roller Widget
**Start State**: On dashboard as GM

| Step | Action | Expected Result | Verify By |
|------|--------|-----------------|-----------|
| 1 | Add Dice Roller widget | Widget appears with default d6 | Shows "1d6" label |
| 2 | Click the roll button | Dice animation plays | Visual roll animation |
| 3 | Result displays | Shows a number 1-6 | Result value visible |
| 4 | Open settings, set to 2d20 | Configuration updates | Shows "2d20" label |
| 5 | Roll 2d20 | Shows individual dice + total | Two values and sum displayed |
| 6 | Test all dice types | d4, d6, d8, d10, d12, d20, d100 | Each produces valid range |

### 4.4 Table Widget
**Start State**: On dashboard as GM

| Step | Action | Expected Result | Verify By |
|------|--------|-----------------|-----------|
| 1 | Add Custom Table widget | Table widget created | Empty table appears |
| 2 | Click "+ Add Row" | New row appears | Table has one row |
| 3 | Click a cell | Cell becomes editable | Cursor in cell, can type |
| 4 | Type "Test Value" and press Enter | Value saves | Cell shows "Test Value" |
| 5 | Refresh page | Value persists | "Test Value" still in cell |
| 6 | Click "+ Add Column" | New column added | Table has additional column |
| 7 | Click column header to rename | Header editable | Can change column name |
| 8 | Type "My Column" and confirm | Header updates | Shows "My Column" |
| 9 | Add more rows and data | Table populates | Multiple rows with data |
| 10 | Click row delete (trash) icon | Row removed | Row disappears |
| 11 | Refresh page | Changes persist | Deletions and edits saved |

### 4.5 Widget Deletion
**Start State**: On dashboard as GM with widgets

| Step | Action | Expected Result | Verify By |
|------|--------|-----------------|-----------|
| 1 | Find X button on Counter widget | Close button visible (top-right) | X icon present |
| 2 | Click X button | Widget removed (or confirmation) | Widget disappears |
| 3 | Refresh page | Widget stays deleted | Not restored on refresh |
| 4 | Check Campaign Console | No X button exists | Console is permanent |

### 4.6 Widget Drag and Resize (Persistence Test)
**Start State**: On dashboard as GM with widgets

| Step | Action | Expected Result | Verify By |
|------|--------|-----------------|-----------|
| 1 | Drag a widget to far right of canvas | Widget moves | Widget at new position |
| 2 | Note approximate position | Remember location | Mental note |
| 3 | Refresh page | Widget at same position | Position saved to database |
| 4 | Resize widget to be larger | Widget size changes | Bigger widget |
| 5 | Refresh page | Widget keeps size | Size saved to database |

---

## 5. Sidebar Navigation (GM Only)

### 5.1 Sidebar Visibility
**Start State**: On dashboard as GM

| Step | Action | Expected Result | Verify By |
|------|--------|-----------------|-----------|
| 1 | Verify sidebar visible on left | Navigation sidebar present | Sidebar with menu items |
| 2 | Click collapse button (<<) | Sidebar collapses | Sidebar minimizes |
| 3 | Refresh page | Sidebar stays collapsed | State persisted |
| 4 | Find "Campaign Control" button | Button appears in main area | Expand button visible |
| 5 | Click "Campaign Control" | Sidebar expands | Full sidebar returns |

### 5.2 Navigation Items
**Start State**: On dashboard as GM with sidebar open

| Step | Action | Expected Result | Verify By |
|------|--------|-----------------|-----------|
| 1 | Click "Home" | Any open overlay closes | Clean dashboard view |
| 2 | Click "Components" | Components Manager opens | Overlay with component list |
| 3 | Click "Players" | Players Manager opens | Overlay with player list |
| 4 | Click "Rules" | Rules Manager opens | Overlay with rules list |
| 5 | Click "Map" | Map Manager opens | Map view overlay |
| 6 | Click "Narrative" | Narrative overlay opens | Narrative entries view |
| 7 | Click "Messages" | Messages overlay opens | Chat interface |
| 8 | Click "Schedule" | Schedule overlay opens | Schedule/calendar view |
| 9 | Click "Settings" | Settings modal opens | Campaign settings form |

---

## 6. Overlay Panels - Functional Tests

### 6.1 Rules Manager (Data Persistence Test)
**Start State**: On dashboard as GM, open Rules overlay

| Step | Action | Expected Result | Verify By |
|------|--------|-----------------|-----------|
| 1 | Click "+ Add Rule" or similar button | Rule creation form appears | Input fields visible |
| 2 | Enter Title: "Movement Rules" | Title field populated | Text in field |
| 3 | Enter content/data | Content saved | Data in form |
| 4 | Save the rule | Rule appears in list | New rule row visible |
| 5 | Close overlay and reopen | Rule still in list | Data persisted |
| 6 | Refresh entire page | Rule still exists | Database persistence confirmed |
| 7 | Click to edit the rule | Editor opens with data | Previous data loaded |
| 8 | Modify and save | Changes apply | Updated content visible |
| 9 | Delete the rule | Rule removed from list | Row disappears |
| 10 | Refresh page | Rule stays deleted | Deletion persisted |

### 6.2 Messages (Real-time Test)
**Start State**: Two browsers - GM and Player on same campaign

| Step | Action | Expected Result | Verify By |
|------|--------|-----------------|-----------|
| 1 | Both open Messages overlay | Chat visible in both | Chat interface in each browser |
| 2 | GM types "Hello from GM" and sends | Message appears in GM view | Message in chat |
| 3 | Check Player view | Message appears in Player view | Real-time sync within 2 seconds |
| 4 | Player types "Hello from Player" and sends | Message appears in Player view | Message sent |
| 5 | Check GM view | Message appears in GM view | Real-time sync confirmed |
| 6 | Both refresh pages | All messages still visible | Messages persisted |

### 6.3 Schedule Manager (CRUD Test)
**Start State**: On dashboard as GM, open Schedule overlay

| Step | Action | Expected Result | Verify By |
|------|--------|-----------------|-----------|
| 1 | Click "Add Round / Event" | Form appears | Input fields for entry |
| 2 | Enter Title: "Round 1 - Opening" | Title field populated | Text visible |
| 3 | Select dates | Date pickers work | Dates selected |
| 4 | Choose a color (e.g., blue) | Color applied | Color indicator updates |
| 5 | Save the entry | Entry appears in list/calendar | New entry visible |
| 6 | Refresh page | Entry persists | Data saved |
| 7 | Click to edit entry | Form pre-filled with data | Previous data loaded |
| 8 | Change title to "Round 1 - Modified" | Title updates | New title in field |
| 9 | Save changes | Updated entry visible | Title shows modified |
| 10 | Delete the entry | Entry removed | Disappears from view |
| 11 | Refresh page | Entry stays deleted | Deletion persisted |

---

## 7. Player Settings (Player View)

### 7.1 Player Info Persistence
**Start State**: Logged in as Player, on joined campaign dashboard

| Step | Action | Expected Result | Verify By |
|------|--------|-----------------|-----------|
| 1 | Click floating settings button | Player Settings overlay opens | Form with player fields |
| 2 | Enter Player Name: "QA Test Player" | Field populated | Text visible |
| 3 | Enter Current Points: `500` | Field shows 500 | Number in field |
| 4 | Enter Faction: "Order of the Rose" | Field populated | Text visible |
| 5 | Click "Save Settings" | Success message | Toast or confirmation |
| 6 | Close overlay | Settings panel closes | Back to dashboard |
| 7 | Reopen Player Settings | All data still present | Fields pre-filled |
| 8 | Refresh page and reopen | All data persists | Database save confirmed |

### 7.2 Leave Campaign
**Start State**: Logged in as Player, on joined campaign

| Step | Action | Expected Result | Verify By |
|------|--------|-----------------|-----------|
| 1 | Open Player Settings | Settings overlay | Form visible |
| 2 | Find "Leave Campaign" button | Button visible | Likely at bottom of form |
| 3 | Click "Leave Campaign" | Confirmation dialog | "Are you sure?" prompt |
| 4 | Click Cancel | Dialog closes | Still on campaign |
| 5 | Click "Leave Campaign" again | Confirmation dialog | Prompt reappears |
| 6 | Confirm leaving | Redirects to `/campaigns` | URL changes |
| 7 | Check campaigns list | Campaign no longer shows (or shows as left) | Campaign removed from player's list |

---

## 8. Role Preview Mode (GM Only)

### 8.1 Toggle Preview Mode
**Start State**: On dashboard as GM

| Step | Action | Expected Result | Verify By |
|------|--------|-----------------|-----------|
| 1 | Find role badge (blue "Games Master") | Badge visible in header/sidebar | Blue colored badge |
| 2 | Click the badge | Badge changes to "Player (Preview)" green | Color and text change |
| 3 | Toast notification | "Previewing as Player" | Toast message appears |
| 4 | Check floating + button | Not visible | Cannot add components |
| 5 | Check widget drag handles | Not visible | Cannot drag widgets |
| 6 | Click badge again | Returns to "Games Master" blue | GM view restored |
| 7 | Toast: "Returning to GM view" | Confirmation | Toast message appears |
| 8 | Floating + button reappears | GM controls back | Can add components again |

---

## 9. Error Handling

### 9.1 Invalid Routes
| Step | Action | Expected Result | Verify By |
|------|--------|-----------------|-----------|
| 1 | Navigate to `/some-invalid-route` | 404 page displayed | "Not Found" message |
| 2 | Navigate to `/campaign/00000000-0000-0000-0000-000000000000` | Error or 404 | Campaign not found message |

### 9.2 Auth Protection
**Start State**: Logged out

| Step | Action | Expected Result | Verify By |
|------|--------|-----------------|-----------|
| 1 | Navigate directly to `/campaigns` | Redirects to `/auth` | Login page shown |
| 2 | Navigate to `/campaign/any-id` | Redirects to `/auth` | Login page shown |

---

## 10. Responsive Design

### 10.1 Mobile View (375px width)
| Step | Action | Expected Result | Verify By |
|------|--------|-----------------|-----------|
| 1 | Resize browser to 375px width | UI adapts | Layout changes for mobile |
| 2 | Check sidebar | Should be hidden or hamburger menu | Not taking full width |
| 3 | Pan canvas | Still functional | Can move around |
| 4 | Open a modal | Fits screen, scrollable | Modal content accessible |

### 10.2 Tablet View (768px width)
| Step | Action | Expected Result | Verify By |
|------|--------|-----------------|-----------|
| 1 | Resize browser to 768px | UI adapts | Tablet-appropriate layout |
| 2 | Canvas usable | Adequate space for widgets | Can interact with dashboard |

---

## 11. Supporter Features & Entitlements

### 11.1 Campaign Limits (Free User)
**Start State**: Logged in as Free user (no active subscription)

| Step | Action | Expected Result | Verify By |
|------|--------|-----------------|-----------|
| 1 | Navigate to `/campaigns` | Campaign list visible | Page loads |
| 2 | If no campaigns, create one | Campaign created successfully | First campaign works |
| 3 | Click "[ Create ]" again | Modal shows Campaign Limit reached | "Campaign Limit Reached" title with upgrade CTA |
| 4 | Check modal content | Shows limit of 1 campaign for Free users | Text mentions upgrading for more |
| 5 | Click "Become a Supporter" | Navigates to `/settings` | Settings page with billing tab |

### 11.2 Campaign Archiving
**Start State**: Logged in as Free user with 1 active campaign

| Step | Action | Expected Result | Verify By |
|------|--------|-----------------|-----------|
| 1 | Navigate to `/campaigns` | Shows "Active" tab selected | Tab highlight visible |
| 2 | Select a campaign | Row highlighted | Selection visible |
| 3 | Click "[ Archive ]" button | Confirmation modal appears | "Archive this campaign?" text |
| 4 | Confirm archive | Campaign moves to Archived tab | Row disappears from Active |
| 5 | Click "Archived" tab | Archived campaign visible | Campaign row appears |
| 6 | Can now create new campaign | "[ Create ]" button works | Modal opens (not limit modal) |
| 7 | Select archived campaign | Row highlighted | Selection visible |
| 8 | Click "[ Restore ]" button | Campaign moves back to Active | Appears in Active tab |

### 11.3 Dashboard Themes (Supporter-Gated)
**Start State**: Logged in as GM on campaign dashboard

| Step | Action | Expected Result | Verify By |
|------|--------|-----------------|-----------|
| 1 | Click Settings in sidebar | Campaign Settings modal opens | Modal visible |
| 2 | Click "Appearance" tab | Appearance settings visible | Theme selector shown |
| 3 | **As Free user**: Check theme options | Non-Dark themes show 🔒 lock icon | Lock icons visible |
| 4 | Click locked theme (e.g., Aquatic) | Upgrade prompt or CTA shown | Cannot select locked themes |
| 5 | **As Supporter**: Click Aquatic theme | Theme selected, save button active | Theme option selected |
| 6 | Click "Save Changes" | Dashboard updates with new theme | Colors change (teal/cyan palette) |
| 7 | Refresh page | Theme persists | Aquatic colors still applied |
| 8 | Try Light theme | White/light background applied | UI switches to light mode |
| 9 | Try Parchment theme | Warm beige/brown palette | Vintage aesthetic visible |
| 10 | Try Hazard theme | Neon green terminal style | Bright neon accents |
| 11 | Switch back to Dark | Default dark theme restored | Green accents on dark |

### 11.4 Campaign Banner (Supporter-Gated)
**Start State**: Logged in as GM on campaign dashboard

| Step | Action | Expected Result | Verify By |
|------|--------|-----------------|-----------|
| 1 | Open Campaign Settings → Appearance | Banner URL field visible | Input field for URL |
| 2 | **As Free user**: Check banner field | Shows 🔒 lock with upgrade CTA | Field locked |
| 3 | **As Supporter**: Enter banner URL | Field accepts input | URL typed in |
| 4 | Use URL: `https://picsum.photos/800/200` | Valid image URL entered | Text in field |
| 5 | Save settings | Success message | Toast confirms save |
| 6 | Check Campaign Console widget | Banner image displays at top | Image visible above campaign info |
| 7 | Refresh page | Banner persists | Image still displayed |
| 8 | Enter invalid URL (e.g., "not-a-url") | Validation error or broken image | Error handling works |
| 9 | Clear banner URL and save | Banner removed | No image in console widget |

---

## 12. Text Widget (Supporter-Exclusive)

### 12.1 Add Text Widget
**Start State**: Logged in as GM on campaign dashboard

| Step | Action | Expected Result | Verify By |
|------|--------|-----------------|-----------|
| 1 | Click floating + button | Add Component modal opens | Widget type grid visible |
| 2 | Find "Text" widget option | Text option visible with FileText icon | Option in grid |
| 3 | **As Free user**: Check Text option | Shows 🔒 lock icon | Locked indicator visible |
| 4 | **As Supporter**: Click Text | Text widget added to canvas | New widget appears |
| 5 | Widget shows default content | Empty or placeholder text | Widget body visible |

### 12.2 Edit Text Content
**Start State**: Text widget on canvas as GM

| Step | Action | Expected Result | Verify By |
|------|--------|-----------------|-----------|
| 1 | Find edit (pencil) button on widget | Edit icon visible | Pencil icon in widget |
| 2 | Click edit button | Text area becomes editable | Cursor appears in text area |
| 3 | Type: `# Battle Report\n\nThe forces clashed at dawn.` | Markdown text entered | Text visible in editor |
| 4 | Click Save or click outside | Text saves | Content displayed |
| 5 | Check markdown rendering | Heading renders as H1 | Large bold text for heading |
| 6 | Refresh page | Content persists | Markdown text still there |

### 12.3 Text Widget Visibility
**Start State**: Text widget exists, test with Player account

| Step | Action | Expected Result | Verify By |
|------|--------|-----------------|-----------|
| 1 | **As Player**: Open same campaign | Dashboard loads | Player view active |
| 2 | Check Text widget visibility | Widget visible (if visibility=all) | Widget shown to player |
| 3 | Check for edit controls | No edit button visible | Players cannot edit |

---

## 13. Sticker Widget (Supporter-Exclusive)

### 13.1 Add Sticker Widget
**Start State**: Logged in as GM on campaign dashboard

| Step | Action | Expected Result | Verify By |
|------|--------|-----------------|-----------|
| 1 | Click floating + button | Add Component modal opens | Widget type grid visible |
| 2 | Find "Sticker" widget option | Sticker option visible | Option in grid |
| 3 | **As Free user**: Check Sticker option | Shows 🔒 lock icon | Locked indicator visible |
| 4 | **As Supporter**: Click Sticker | Sticker widget added to canvas | New widget with default icon |
| 5 | Widget shows default sticker | Target icon in medium size | Icon visible in widget |

### 13.2 Customize Sticker
**Start State**: Sticker widget on canvas as GM

| Step | Action | Expected Result | Verify By |
|------|--------|-----------------|-----------|
| 1 | Find edit (pencil) button on widget | Edit icon visible | Pencil icon present |
| 2 | Click edit button | Sticker Picker modal opens | Icon grid with categories |
| 3 | Check categories visible | Objectives, Units, Terrain, Status, etc. | Category tabs or sections |
| 4 | Click "Danger" category | Danger icons shown | Skull, Flame, Zap, etc. |
| 5 | Click Skull icon | Icon selected | Selection indicator |
| 6 | Change size to "Large" | Size selector updates | Large option selected |
| 7 | Change color (if available) | Color picker works | New color applied |
| 8 | Click "Select" or close | Sticker updates | Skull icon now showing |
| 9 | Refresh page | Sticker persists | Same icon, size, color |

### 13.3 Sticker Categories Test
**Start State**: Sticker Picker open

| Step | Action | Expected Result | Verify By |
|------|--------|-----------------|-----------|
| 1 | Check Objectives category | Target, Flag, Star, Trophy icons | Icons visible |
| 2 | Check Units category | Sword, Shield, Users icons | Icons visible |
| 3 | Check Terrain category | Mountain, Trees, Home, Castle icons | Icons visible |
| 4 | Check Cities category | Building, Church, Factory icons | Icons visible |
| 5 | Check Loot category | Gem, Crown, Coins, Gift icons | Icons visible |
| 6 | Check Arrows category | ArrowUp, ArrowDown, etc. | Directional arrows visible |
| 7 | Use search/filter (if available) | Icons filter based on search | Reduced icon list |

---

## 14. Smart Paste Gating

### 14.1 AI Convert Lock (Free User)
**Start State**: Logged in as Free user (GM) on campaign dashboard

| Step | Action | Expected Result | Verify By |
|------|--------|-----------------|-----------|
| 1 | Click floating + button | Add Component modal opens | Modal visible |
| 2 | Click "Rules Table" | Paste Wizard overlay opens | Text input area visible |
| 3 | Paste some rules text | Text appears in input | Content pasted |
| 4 | Find "AI Convert" button | Button may show 🔒 lock | Locked indicator |
| 5 | Click "AI Convert" | Upgrade prompt or 403 error | Cannot use AI conversion |
| 6 | Find "Generate" button | Button available (no lock) | Deterministic parsing available |
| 7 | Click "Generate" | Attempts to parse as CSV/TSV | Basic parsing works |

### 14.2 AI Convert (Supporter User)
**Start State**: Logged in as Supporter (GM) on campaign dashboard

| Step | Action | Expected Result | Verify By |
|------|--------|-----------------|-----------|
| 1 | Open Paste Wizard via Rules Table | Paste Wizard opens | Text input visible |
| 2 | Paste complex rules text | Text in input | Content pasted |
| 3 | Click "AI Convert" | AI processing starts | Loading indicator |
| 4 | Wait for result | Table structure generated | Rows and columns created |
| 5 | Verify AI-parsed content | Intelligent structuring | Not just CSV splitting |

---

## Test Completion Checklist

| Section | Status | Notes |
|---------|--------|-------|
| 1. Authentication | [ ] Pass / [ ] Fail | |
| 2. Campaign Management | [ ] Pass / [ ] Fail | |
| 3. Campaign Dashboard | [ ] Pass / [ ] Fail | |
| 4. Dashboard Widgets | [ ] Pass / [ ] Fail | |
| 5. Sidebar Navigation | [ ] Pass / [ ] Fail | |
| 6. Overlay Panels | [ ] Pass / [ ] Fail | |
| 7. Player Settings | [ ] Pass / [ ] Fail | |
| 8. Role Preview Mode | [ ] Pass / [ ] Fail | |
| 9. Error Handling | [ ] Pass / [ ] Fail | |
| 10. Responsive Design | [ ] Pass / [ ] Fail | |
| 11. Supporter Features | [ ] Pass / [ ] Fail | |
| 12. Text Widget | [ ] Pass / [ ] Fail | |
| 13. Sticker Widget | [ ] Pass / [ ] Fail | |
| 14. Smart Paste Gating | [ ] Pass / [ ] Fail | |

---

## Bug Report Template

```text
**Bug Title**: [Short description]
**Section**: [Test section number]
**Step**: [Step number where issue occurred]
**Expected**: [What should happen]
**Actual**: [What actually happened]
**Data Persisted?**: [Yes/No - did refresh retain data?]
**Console Errors**: [Any JS errors in console?]
**Severity**: [Critical / High / Medium / Low]
**Browser**: [Browser and version]
**Screenshots**: [If applicable]
```

---

## Post-Test Cleanup

After completing all tests:
1. Delete test campaigns created during testing
2. Log out of all test accounts
3. Clear any test data that should not remain
