# Campaign Console Design System

This document defines the UI/UX standards for Campaign Console to ensure consistency across all components and prevent regressions.

---

## 1. Spacing Scale

Based on 4px base unit. Use Tailwind classes:

| Token | Value | Tailwind Class |
|-------|-------|----------------|
| xs    | 4px   | `p-1`, `gap-1` |
| sm    | 8px   | `p-2`, `gap-2` |
| md    | 12px  | `p-3`, `gap-3` |
| lg    | 16px  | `p-4`, `gap-4` |
| xl    | 24px  | `p-6`, `gap-6` |
| 2xl   | 32px  | `p-8`, `gap-8` |

**Widget Chrome:**
- Widget header: `px-3 py-2`
- Widget content: `p-3`
- Inter-widget gap on canvas: handled by absolute positioning

---

## 2. Typography Scale

| Element | Class | Description |
|---------|-------|-------------|
| Page title | `text-3xl font-bold uppercase tracking-widest` | Main page headings |
| Section title | `text-lg font-semibold` | Modal titles, section headers |
| Widget title | `text-xs font-mono uppercase tracking-wider` | Widget header text |
| Body | `text-sm` | Default body text |
| Small/Meta | `text-xs text-muted-foreground` | Timestamps, labels |
| Mono/Code | `font-mono text-xs` | IDs, technical values |

**Font Families:**
- UI/Body: `font-mono` (IBM Plex Mono)
- Display: Augusta, Old London (campaign-specific theming)

---

## 3. Button Variants

### Standard Button (`Button` from shadcn)
Use for general-purpose actions outside the terminal aesthetic.

### Terminal Button (`TerminalButton`)
Use for primary interactions within the terminal-themed UI.

| Variant | Usage |
|---------|-------|
| `default` | Primary actions (Create, Submit, Save) |
| `secondary` | Secondary actions (Join, View) |
| `destructive` | Destructive actions (Delete, Remove) |
| `outline` | Tertiary actions (Cancel, Open) |
| `ghost` | Inline/subtle actions (Edit icons, toggles) |
| `link` | Text links with underline |

### Icon Button (`IconButton`)
**REQUIRED** for all icon-only controls.

| Size | Hit Target | Usage |
|------|------------|-------|
| `default` | 48×48px | Dialog close, widget actions |
| `md` | 40×40px | Compact toolbars |
| `sm` | 32×32px | Minimum (inline actions only) |

**Rules:**
- Every icon button MUST have `aria-label`
- Use `IconButton` component, not raw `<button>`
- Icon size remains 16-20px visually, hit target is larger

---

## 4. Hit Targets

**Minimum interactive target: 48×48px** for primary controls.

| Control | Target Size | Implementation |
|---------|-------------|----------------|
| Dialog close X | 48×48px | `IconButton` wrapper |
| Widget delete X | 48×48px | `IconButton` in header |
| Resize handle | 32×32px | Invisible padding around icon |
| Table row actions | 48×48px | `IconButton` |
| Footer icons | 48×48px | Padding wrapper |

For smaller visual elements, use invisible padding to extend the hit area while preserving visual design.

---

## 5. Form & Validation Patterns

### Input Fields
```tsx
<TerminalInput
  label="Campaign Name"
  placeholder="Enter name..."
  error={errors.name?.message}
/>
```

### Validation States
- Error: Red border + `text-destructive` message below
- Success: Green border (transient, 2s)
- Loading: Disabled state + spinner

### Required Fields
- Mark with `*` next to label
- Provide inline error messages, not just toast

---

## 6. Modal Patterns

### Structure
```tsx
<Dialog>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Modal Title</DialogTitle>
      <DialogDescription>Optional description</DialogDescription>
    </DialogHeader>
    {/* Body content */}
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Behavior
- Focus trap: automatic via Radix
- Escape to close: enabled
- Close button: top-right, 48px hit target
- Backdrop click: closes by default

---

## 7. Widget Header/Chrome Rules

### Standard Widget
```
┌──────────────────────────────────────┐
│ 🎲 [GRIP] Widget Name         [X]   │  ← Header (draggable for GM)
├──────────────────────────────────────┤
│                                      │
│     Widget Content                   │  ← Content area
│                                      │
└────────────────────────────────[↘]──┘  ← Resize handle (GM only)
```

### Header Elements
- Grip icon (GM only): `w-4 h-4`, left side
- Type emoji: 14-16px
- Title: `text-xs font-mono uppercase tracking-wider text-primary`
- Actions (delete): right side, 48px hit target

### Campaign Console Widget
- Minimal chrome (no title bar)
- Corner controls only (grip top-left, resize bottom-right)

---

## 8. Status Colors & Toasts

### Status Colors
| Status | Token | Usage |
|--------|-------|-------|
| Success | `text-primary` / `bg-primary/10` | Saved, Created |
| Warning | `text-warning` / `bg-warning/10` | Unsaved changes |
| Error | `text-destructive` / `bg-destructive/10` | Failed, Error |
| Info | `text-secondary` / `bg-secondary/10` | Hints, updates |

### Toast Configuration
- Position: `top-center`
- Duration: 2-4 seconds (success), persistent (error with action)
- Use `sonner` via `toast()` function

---

## 9. Async States

Every data-loading component must handle:

### Loading
```tsx
<LoadingState text="Loading campaigns..." rows={3} />
```

### Empty
```tsx
<EmptyState
  icon={<Inbox className="w-8 h-8" />}
  title="No campaigns found"
  description="Create a new campaign to get started"
  action={{ label: "Create Campaign", onClick: handleCreate }}
/>
```

### Error
```tsx
<ErrorState
  message="Failed to load data"
  onRetry={refetch}
/>
```

---

## 10. Focus & Keyboard Navigation

### Focus Rings
Standardized focus ring: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`

**Do NOT mix** `ring-1` and `ring-2` randomly. Use `ring-2` consistently.

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| Enter | Open selected item, confirm action |
| Escape | Close modal/dialog |
| Tab | Navigate focusable elements |
| Shift+Tab | Navigate backwards |
| Ctrl+/Cmd+ +/- | Zoom canvas |
| Home | Recenter canvas |

---

## 11. Consistency Rules (Regression Prevention)

1. **Always use semantic tokens** - Never hardcode colors like `text-white` or `bg-black`
2. **Icon buttons need `aria-label`** - Every `IconButton` must describe its action
3. **48px hit targets** - All primary icon controls must meet this standard
4. **Use `IconButton` component** - Don't create ad-hoc icon button styling
5. **Loading states are required** - Every async data fetch needs loading/error handling
6. **Toast position is `top-center`** - Don't override in individual components
7. **Modals use focus trap** - Rely on Radix Dialog, don't disable
8. **Widget headers are consistent** - Follow the chrome template above
9. **Don't mix button systems** - Use `TerminalButton` for terminal UI, `Button` for shadcn default
10. **Resize handles are 32×32 minimum** - Larger hotspot than visual icon

---

## 12. Saved Feedback Pattern

When layout changes persist (drag/resize end):

1. **On commit start**: Optional "Saving..." indicator (brief)
2. **On success**: Show "Saved" with checkmark for 2 seconds
3. **On failure**: Show "Failed - Click to retry" (persistent until dismissed)

Location: `SaveIndicator` component in canvas controls area.

---

## 13. Campaign List Interactions

| Interaction | Action |
|-------------|--------|
| Click row | Select campaign |
| Double-click row | Open campaign immediately |
| Enter key (row selected) | Open campaign |
| Open button | Open selected campaign |

This reduces friction for power users while maintaining explicit button for discovery.
