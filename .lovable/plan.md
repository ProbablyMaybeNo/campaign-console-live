

# Automatic Bug Tracking Implementation Plan

## Overview

This plan implements an **automatic error reporting system** that captures JavaScript errors, unhandled promise rejections, and React component crashes as users interact with your app. All errors are stored in your backend database, giving you a centralized bug report you can query to create patch fixes.

---

## What You'll Get

1. **Automatic Error Capture** - Catches all JavaScript errors without users needing to do anything
2. **React Error Boundary** - Graceful crash recovery with user-friendly error screens
3. **Error Reports Table** - Database table storing all error details for your review
4. **Admin View** - Simple page to browse and manage error reports
5. **User Context** - Each error includes who was affected and what they were doing

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                      USER'S BROWSER                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │ Global Error     │    │ React Error      │                   │
│  │ Handler          │    │ Boundary         │                   │
│  │ (window.onerror) │    │ (componentDidCatch)                  │
│  └────────┬─────────┘    └────────┬─────────┘                   │
│           │                       │                              │
│           └───────────┬───────────┘                              │
│                       ▼                                          │
│           ┌──────────────────────┐                               │
│           │  ErrorReporter       │                               │
│           │  Service             │                               │
│           │  - Collects context  │                               │
│           │  - Deduplicates      │                               │
│           │  - Batches if needed │                               │
│           └──────────┬───────────┘                               │
└──────────────────────┼──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LOVABLE CLOUD                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │ error_reports    │    │ RLS Policy:      │                   │
│  │ table            │    │ Anyone can INSERT│                   │
│  │ - error_message  │    │ Admins can READ  │                   │
│  │ - stack_trace    │    └──────────────────┘                   │
│  │ - user_id        │                                           │
│  │ - url/route      │                                           │
│  │ - browser_info   │                                           │
│  │ - timestamp      │                                           │
│  └──────────────────┘                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Step 1: Create Error Reports Database Table

Create a new table to store error reports with the following structure:

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | Primary key |
| `error_message` | text | The error message |
| `stack_trace` | text | Full stack trace |
| `component_stack` | text | React component hierarchy (for React errors) |
| `url` | text | Page URL where error occurred |
| `route` | text | React route path |
| `user_id` | uuid | User who encountered the error (nullable for unauthenticated) |
| `user_agent` | text | Browser/device info |
| `error_type` | text | Category: 'js_error', 'promise_rejection', 'react_boundary' |
| `metadata` | jsonb | Additional context (campaign_id, widget_id, etc.) |
| `status` | text | 'new', 'investigating', 'fixed', 'ignored' |
| `created_at` | timestamp | When the error occurred |
| `occurrence_count` | integer | For deduplication - how many times this error occurred |
| `last_occurred_at` | timestamp | Most recent occurrence |
| `fingerprint` | text | Hash for deduplication |

**RLS Policies:**
- Anyone can INSERT (so errors can be logged even without authentication)
- Only admin users can SELECT, UPDATE, DELETE (to view/manage reports)

---

### Step 2: Create Error Reporter Service

A new utility file `src/lib/errorReporter.ts` that:

- Captures error details (message, stack, user context)
- Generates fingerprints for deduplication
- Sends errors to the database
- Handles rate limiting to prevent spam
- Collects contextual information (current route, user ID, browser info)

---

### Step 3: Create Global Error Boundary Component

A new component `src/components/ErrorBoundary.tsx` that:

- Wraps the entire app to catch React rendering errors
- Shows a friendly error screen instead of a white page
- Automatically reports the error to the database
- Provides a "Try Again" button to recover

---

### Step 4: Set Up Global Error Handlers

Update `src/main.tsx` to:

- Add `window.onerror` handler for uncaught JavaScript errors
- Add `window.onunhandledrejection` handler for promise rejections
- Initialize the error reporter service
- Wrap the App in the ErrorBoundary component

---

### Step 5: Create Error Reports Admin View

A new page `src/pages/ErrorReports.tsx` accessible only to admin users that:

- Lists all error reports with filtering (by status, date, type)
- Shows error details including stack traces
- Allows marking errors as "investigating", "fixed", or "ignored"
- Groups duplicate errors by fingerprint
- Shows occurrence count and affected user count

---

### Step 6: Add Admin Route

Update `src/App.tsx` to:

- Add a protected admin route for `/admin/errors`
- Check for admin role before allowing access

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/errorReporter.ts` | Create | Error reporting service |
| `src/components/ErrorBoundary.tsx` | Create | React error boundary component |
| `src/pages/ErrorReports.tsx` | Create | Admin page for viewing errors |
| `src/main.tsx` | Modify | Add global error handlers and ErrorBoundary |
| `src/App.tsx` | Modify | Add admin route for error reports |
| Database migration | Create | Add `error_reports` table with RLS |

---

## Technical Details

### Error Fingerprinting

To avoid flooding your database with duplicate errors, each error gets a "fingerprint" based on:
- Error message (with variable parts normalized)
- First few lines of stack trace
- Error type

Duplicate errors within a short time window increment the `occurrence_count` instead of creating new rows.

### Rate Limiting

To prevent abuse or infinite error loops:
- Maximum 10 errors per minute per session
- After limit reached, errors are queued and sent in batches
- Console warning shown in development mode

### Context Collection

Each error report includes:
- **User context**: User ID (if logged in), display name
- **Page context**: Current URL, route, campaign ID (if applicable)
- **Device context**: Browser name/version, operating system, screen size
- **App context**: App version (from package.json)

---

## How to Use the Reports

Once implemented, you can:

1. **View reports in the app**: Navigate to `/admin/errors` (requires admin role)
2. **Query directly**: Use the backend SQL editor to run custom queries
3. **Export for analysis**: Download reports as CSV for spreadsheet analysis

### Example Queries

```sql
-- Most common errors in the last 7 days
SELECT error_message, COUNT(*) as count 
FROM error_reports 
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY error_message 
ORDER BY count DESC;

-- Errors affecting the most users
SELECT error_message, COUNT(DISTINCT user_id) as affected_users
FROM error_reports
GROUP BY error_message
ORDER BY affected_users DESC;
```

---

## Security Considerations

- Error reports may contain sensitive data - only admins can view them
- Stack traces might expose file paths - these are already public in minified JS
- User IDs are stored but not exposed publicly
- No personally identifiable information (PII) beyond user_id is captured

---

## Future Enhancements (Optional)

After v1 launch, you could add:
- Email notifications for critical errors
- Slack/Discord integration for real-time alerts
- Source map support for readable stack traces
- Session replay integration for reproduction
- Performance metrics alongside errors

