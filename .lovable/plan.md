
# v1 Release Manual Testing Plan

## Campaign Console Application - Comprehensive QA Checklist

This testing plan is designed for manual QA testing before v1 release. Each section contains step-by-step instructions that can be executed by a tester (human or AI agent).

---

## Test Environment Setup

Before testing:
1. Open the application in a modern browser (Chrome/Firefox/Safari)
2. Have access to two different email accounts for multi-user testing
3. Clear browser cache/localStorage for clean state testing
4. Note the preview URL for testing

---

## 1. Authentication System

### 1.1 Sign Up Flow
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/auth` | Login page displays with "CAMPAIGN CONSOLE" title, Swords icon, and login form |
| 2 | Click "Create Account" link | Form switches to show Display Name field |
| 3 | Leave all fields empty and submit | Form shows validation/required field errors |
| 4 | Enter invalid email format | Shows email validation error |
| 5 | Enter valid email, short password | Shows password requirement error |
| 6 | Enter valid email, password, and display name | Account created, redirects to `/campaigns` |

### 1.2 Login Flow
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/auth` | Login form displayed |
| 2 | Enter invalid credentials | Error message: "Invalid login credentials" |
| 3 | Enter valid credentials | Success toast, redirects to `/campaigns` |
| 4 | Refresh page after login | Session persists, still on `/campaigns` |

### 1.3 Logout Flow
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Logout" button | Session ends, redirects to `/auth` |
| 2 | Try to access `/campaigns` directly | Redirects back to `/auth` |

### 1.4 Session Persistence
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login successfully | Navigate to campaigns page |
| 2 | Close browser tab completely | Session should persist |
| 3 | Reopen application | Should still be logged in |

---

## 2. Campaign Management

### 2.1 Create Campaign
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "[ Create ]" button on Campaigns page | Create Campaign modal opens |
| 2 | Leave name empty, try to submit | Submit button disabled or shows error |
| 3 | Enter campaign name only | Create button becomes active |
| 4 | Fill in optional fields (description, points, players) | Fields accept input correctly |
| 5 | Expand "Advanced Settings" | Shows password and color options |
| 6 | Expand "Display Settings" | Shows toggles for Campaign Console display |
| 7 | Submit the form | Campaign created, navigates to campaign dashboard |
| 8 | Verify Campaign Console widget exists | Widget shows campaign name, metadata |

### 2.2 Join Campaign
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login with a different account | Navigate to Campaigns page |
| 2 | Click "[ Join ]" button | Join Campaign modal opens |
| 3 | Enter invalid campaign code | Error: "Campaign not found" |
| 4 | Enter valid campaign code (from GM) | Joins campaign, navigates to dashboard |
| 5 | Join password-protected campaign without password | Prompts for password |
| 6 | Enter correct password | Successfully joins campaign |

### 2.3 Campaign List Display
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/campaigns` | Table shows all user's campaigns |
| 2 | Verify role icons | Crown (GM) for owned, User icon for joined |
| 3 | Single-click a campaign row | Row highlights, "Open" button enables |
| 4 | Double-click a campaign row | Navigates directly to campaign dashboard |
| 5 | Click "Open" with selection | Navigates to selected campaign |
| 6 | Click copy ID button (GM only) | Campaign ID copied to clipboard, toast shown |

### 2.4 Delete Campaign
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select a campaign you own | Row highlighted |
| 2 | Click "[ Remove Campaign ]" | Confirmation modal appears |
| 3 | Cancel deletion | Modal closes, campaign still exists |
| 4 | Confirm deletion | Campaign removed from list |
| 5 | Try to delete campaign you don't own | Button should be disabled |

---

## 3. Campaign Dashboard

### 3.1 Dashboard Loading
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to campaign | Loading spinner shown |
| 2 | Dashboard loads | Campaign Console widget visible at center |
| 3 | Canvas loads at 100% zoom | Scale indicator shows 100% |

### 3.2 Campaign Console Widget
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Verify widget content | Shows campaign name in fantasy font |
| 2 | Check metadata display | Shows ID, players, round, dates, etc. based on settings |
| 3 | Verify no X (close) button | Widget should not be deletable |
| 4 | GM: Verify drag handle (top-left) | GripVertical icon visible |
| 5 | GM: Drag widget | Widget moves, position persists |
| 6 | GM: Verify resize handle (bottom-right) | Maximize2 icon visible |
| 7 | GM: Resize widget | Widget resizes, size persists |

### 3.3 Canvas Controls
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click zoom in (+) button | Canvas zooms in by 15% |
| 2 | Click zoom out (-) button | Canvas zooms out by 15% |
| 3 | Click reset button | Zoom resets to 100% |
| 4 | Click recenter button (crosshair) | View smoothly pans to Campaign Console |
| 5 | Test Ctrl+Plus/Minus | Zoom controls work via keyboard |
| 6 | Test Ctrl+0 | Zoom resets via keyboard |
| 7 | Test mouse wheel on canvas | Should NOT zoom (disabled) |
| 8 | Pan canvas by dragging empty space | Canvas pans smoothly |

### 3.4 Snap to Grid
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Toggle snap-to-grid button | Button shows active state |
| 2 | Drag a widget | Widget snaps to 20px grid |
| 3 | Resize a widget | Size snaps to 20px increments |

---

## 4. Dashboard Widgets

### 4.1 Add Component Modal (GM Only)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click floating + button | Add Component modal opens |
| 2 | Verify all widget types shown | 11 types: Rules Table, Rules Card, Custom Table, Custom Card, Narrative, Counter, Image, Dice Roller, Map, Player List, Calendar |
| 3 | Click widget type that uses Paste Wizard | Paste Wizard overlay opens |
| 4 | Click widget type without Paste Wizard | Configuration form appears |

### 4.2 Counter Widget
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Add Counter widget | Widget appears on canvas |
| 2 | Click + button | Value increments by step |
| 3 | Click - button | Value decrements by step |
| 4 | Click settings (gear) icon | Configuration panel opens |
| 5 | Set min/max/step/label | Settings save correctly |
| 6 | Try to exceed max | Value stays at max |
| 7 | Player view: Verify +/- buttons hidden | Only displays value |

### 4.3 Dice Roller Widget
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Add Dice Roller widget | Widget appears with default 1d6 |
| 2 | Click dice button | Animation plays, result shows |
| 3 | Configure for 2d20 | Shows "2d20" label |
| 4 | Roll 2d20 | Shows 2 individual dice and total |
| 5 | All dice options work | d4, d6, d8, d10, d12, d20, d100 |

### 4.4 Table Widget
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Add Custom Table via Paste Wizard | Table widget created |
| 2 | Click "+ Add Row" | New empty row appears |
| 3 | Click cell to edit | Inline editing activates |
| 4 | Edit cell and press Enter | Value saves |
| 5 | Click "+ Add Column" | New column added |
| 6 | Rename column header | Header updates, data keys migrate |
| 7 | Delete column | Column and data removed |
| 8 | Delete row (trash icon) | Row removed |
| 9 | Scroll long table | Internal scrolling works |

### 4.5 Image Widget
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Add Image widget | Widget appears with placeholder |
| 2 | Paste image URL | Image displays |
| 3 | Upload image file | Image uploads and displays |
| 4 | Test fit modes | Cover/Contain work correctly |

### 4.6 Map Widget
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Add Map widget | Shows live view of campaign map |
| 2 | If no map: Shows message | "No map available" or similar |
| 3 | Upload map via Map overlay | Map widget updates in real-time |
| 4 | Place marker via Map overlay | Marker appears on widget |

### 4.7 Player List Widget
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Add Player List widget | Shows table of campaign players |
| 2 | Configure visible columns | Only selected columns display |
| 3 | Player joins campaign | Widget updates with new player |

### 4.8 Calendar Widget
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Add Calendar widget | Monthly calendar displays |
| 2 | Add event via Schedule overlay | Event appears on calendar |
| 3 | Navigate months | Previous/next month works |

### 4.9 Widget Deletion
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | GM: Click X on regular widget | Confirmation may appear |
| 2 | Confirm deletion | Widget removed |
| 3 | Verify Campaign Console has no X | Cannot delete console |
| 4 | Player: Verify no X buttons | Players cannot delete |

### 4.10 Widget Drag and Resize
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | GM: Drag widget by title bar | Widget moves smoothly |
| 2 | GM: Resize via corner handle | Widget resizes, min size enforced |
| 3 | Changes persist after refresh | Positions saved to database |
| 4 | Player: Cannot drag | Widgets fixed in place |
| 5 | Player: Cannot resize | No resize handles visible |

---

## 5. Sidebar Navigation (GM Only)

### 5.1 Sidebar Visibility
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | GM login: Verify sidebar visible | Left sidebar with navigation items |
| 2 | Click collapse button | Sidebar collapses |
| 3 | "Campaign Control" button appears | Button in main area |
| 4 | Click "Campaign Control" | Sidebar expands |
| 5 | Refresh page | Sidebar state persists |
| 6 | Player login: Verify no sidebar | Only floating settings button |

### 5.2 Navigation Items
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Home" | Closes any open overlay |
| 2 | Click "Components" | Components Manager overlay opens |
| 3 | Click "Players" | Players Manager overlay opens |
| 4 | Click "Rules" | Rules Manager overlay opens |
| 5 | Click "Map" | Map Manager overlay opens |
| 6 | Click "Narrative" | Narrative overlay opens |
| 7 | Click "Messages" | Messages overlay opens |
| 8 | Click "Schedule" | Schedule overlay opens |
| 9 | Click "Settings" | Campaign Settings modal opens |

---

## 6. Overlay Panels

### 6.1 Components Manager (GM Only)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open Components overlay | Lists all dashboard components |
| 2 | View component visibility settings | Shows visibility status |
| 3 | Toggle component visibility | Updates immediately |
| 4 | Delete component from here | Component removed from dashboard |

### 6.2 Players Manager (GM View)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open Players overlay as GM | Shows full player management |
| 2 | View all player details | Name, faction, points visible |
| 3 | Edit player information | Changes save correctly |
| 4 | Remove player from campaign | Player removed |

### 6.3 Players Widget (Player View)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open Players overlay as Player | Shows read-only player list |
| 2 | Cannot edit other players | No edit controls visible |

### 6.4 Rules Manager
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open Rules overlay | Shows existing rules |
| 2 | GM: Click "Rules Table" | Paste Wizard opens |
| 3 | Paste tabular data | AI parses into table |
| 4 | Save rule | Rule appears in list |
| 5 | Click "Add to Dashboard" | Creates linked widget |
| 6 | Edit rule | Opens Rule Editor modal |
| 7 | Delete rule | Rule and linked widgets affected |
| 8 | Search rules | Filter works correctly |
| 9 | Filter by category | Shows matching rules only |

### 6.5 Map Manager
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open Map overlay with no map | Shows upload interface (GM) or message (Player) |
| 2 | GM: Upload map image | Map displays |
| 3 | Switch to Legend tab | Legend editor visible |
| 4 | Add legend item | Item created with color/shape |
| 5 | Switch back to Map tab | Marker palette visible |
| 6 | Select placement mode | Mode indicator updates |
| 7 | Click on map | Marker placed |
| 8 | Set marker as GM-only | Marker hidden from players |
| 9 | Toggle fog region mode | Can draw fog regions |
| 10 | Player view: Verify restricted markers hidden | Only "all" visibility markers show |

### 6.6 Narrative Manager
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open Narrative overlay | Shows existing entries |
| 2 | GM: Click "Add Entry" | Form appears |
| 3 | Enter title and content | Submit button enables |
| 4 | Submit entry | Entry appears in list |
| 5 | Click entry to expand | Shows full content |
| 6 | Player: Can view entries | Entries readable |

### 6.7 Messages
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open Messages overlay | Shows chat history |
| 2 | Type message and send | Message appears immediately |
| 3 | Other user sends message | Message appears in real-time |
| 4 | Verify message timestamps | Times displayed correctly |

### 6.8 Schedule Manager
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open Schedule overlay | Shows rounds and events |
| 2 | GM: Click "Add Round / Event" | Form appears |
| 3 | Toggle between Round and Event type | Form fields update |
| 4 | Set dates using calendar picker | Dates selected correctly |
| 5 | Choose color | Color applied to entry |
| 6 | Set status | Status saved |
| 7 | Edit existing entry | Form populates, updates work |
| 8 | Delete entry | Entry removed |

### 6.9 Campaign Settings (GM Only)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open Settings overlay | Campaign settings modal opens |
| 2 | Edit campaign name | Name updates |
| 3 | Change points limit | Limit updates |
| 4 | Change title/border colors | Colors apply to Campaign Console |
| 5 | Toggle display settings | Console widget updates accordingly |
| 6 | Set/change password | Password protection updates |

---

## 7. Player Settings (Player View)

### 7.1 Access Player Settings
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as player | Navigate to joined campaign |
| 2 | Click floating settings button | Player Settings overlay opens |
| 3 | Or click "My Settings" in sidebar (if visible) | Same overlay opens |

### 7.2 Player Info Section
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Edit player name | Field accepts input |
| 2 | Edit current points | Only numbers accepted |
| 3 | Edit faction/sub-faction | Fields accept input |
| 4 | Add warband link | URL saved |
| 5 | Add additional info | Text area saves content |
| 6 | Click "Save Settings" | Changes persist |
| 7 | Refresh page | Settings still saved |

### 7.3 Player Narrative
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Add Entry" | Form appears |
| 2 | Enter title and content | Entry created |
| 3 | View existing entries | Shows player's own entries |
| 4 | Delete an entry | Confirmation, then removed |

### 7.4 Leave Campaign
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Leave Campaign" button | Confirmation dialog appears |
| 2 | Cancel | Dialog closes |
| 3 | Confirm | Redirects to /campaigns, campaign removed from list |

---

## 8. Role Preview Mode (GM Only)

### 8.1 Toggle Preview Mode
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | GM: Click role badge (blue "Games Master") | Badge changes to green "Player (Preview)" |
| 2 | Toast notification appears | "Previewing as Player" |
| 3 | Sidebar hides GM-only items | "Components" not visible |
| 4 | Floating + button hides | Cannot add components |
| 5 | Widget controls hide | No drag/resize/delete |
| 6 | GM-only markers on map hidden | Only player-visible markers |
| 7 | Click badge again | Returns to GM view |
| 8 | Toast: "Returning to GM view" | Confirmation shown |

---

## 9. Warband Builder

### 9.1 Access Warband Builder
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open Warbands overlay | Warbands list shown |
| 2 | Click "Open Warband Builder" | Navigates to builder page |

### 9.2 Create Warband
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter warband name | Header updates |
| 2 | Select faction | Unit library filters |
| 3 | Select sub-faction | Further filtering |
| 4 | Click unit in library | Unit added to roster |
| 5 | Increase unit quantity | Points update |
| 6 | Verify points tracking | Current/limit/remaining shown |
| 7 | Exceed points limit | Warning styling appears |
| 8 | Click Save | Warband saved, toast shown |

### 9.3 Edit Warband
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select existing warband | Opens in builder |
| 2 | Make changes | "Unsaved changes" indicator |
| 3 | Save | Changes persisted |
| 4 | Delete warband | Confirmation, then removed |

---

## 10. Real-time Features

### 10.1 Multi-user Dashboard Updates
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open campaign in two browsers (GM + Player) | Both see same dashboard |
| 2 | GM adds widget | Player sees widget appear |
| 3 | GM moves widget | Player sees position update |
| 4 | GM edits table data | Player sees data change |
| 5 | GM updates counter | Player sees new value |

### 10.2 Real-time Messages
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Both users open Messages | Chat visible |
| 2 | User 1 sends message | User 2 sees immediately |
| 3 | User 2 replies | User 1 sees immediately |

### 10.3 Map Real-time
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | GM places marker | Player sees marker appear |
| 2 | GM moves marker | Position updates for player |
| 3 | GM reveals fog region | Fog lifts for player |

---

## 11. Error Handling

### 11.1 Network Errors
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Disable network | App shows appropriate loading/error states |
| 2 | Re-enable network | App recovers, data resyncs |

### 11.2 Invalid Routes
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/invalid-route` | 404 page displayed |
| 2 | Navigate to `/campaign/invalid-id` | Error message shown |
| 3 | Access campaign you're not part of | Access denied or error |

### 11.3 Auth Errors
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Let session expire | Redirects to login |
| 2 | Clear cookies mid-session | Redirects to login |

---

## 12. Responsive Design (Mobile/Tablet)

### 12.1 Mobile View
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View on mobile width (375px) | UI adapts appropriately |
| 2 | Sidebar hidden on mobile | Uses mobile navigation |
| 3 | Canvas still functional | Can pan and zoom |
| 4 | Modals/overlays fit screen | Content scrollable |

### 12.2 Tablet View
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View on tablet width (768px) | Sidebar may be visible |
| 2 | Canvas has adequate space | Dashboard usable |

---

## 13. Browser Compatibility

Test all major flows in:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

---

## Test Completion Checklist

| Section | Status |
|---------|--------|
| 1. Authentication | [ ] Pass / [ ] Fail |
| 2. Campaign Management | [ ] Pass / [ ] Fail |
| 3. Campaign Dashboard | [ ] Pass / [ ] Fail |
| 4. Dashboard Widgets | [ ] Pass / [ ] Fail |
| 5. Sidebar Navigation | [ ] Pass / [ ] Fail |
| 6. Overlay Panels | [ ] Pass / [ ] Fail |
| 7. Player Settings | [ ] Pass / [ ] Fail |
| 8. Role Preview Mode | [ ] Pass / [ ] Fail |
| 9. Warband Builder | [ ] Pass / [ ] Fail |
| 10. Real-time Features | [ ] Pass / [ ] Fail |
| 11. Error Handling | [ ] Pass / [ ] Fail |
| 12. Responsive Design | [ ] Pass / [ ] Fail |
| 13. Browser Compatibility | [ ] Pass / [ ] Fail |

---

## Bug Report Template

When issues are found, document with:

```text
**Bug Title**: [Short description]
**Section**: [Test section number]
**Step**: [Step number where issue occurred]
**Expected**: [What should happen]
**Actual**: [What actually happened]
**Severity**: [Critical / High / Medium / Low]
**Browser**: [Browser and version]
**Screenshots**: [If applicable]
```

