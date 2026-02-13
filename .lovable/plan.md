
# SEO Implementation Plan (Excluding HIGH Effort Items)

All changes below are LOW or MEDIUM effort. The only excluded item is **prerendering/SSR** (HIGH effort).

---

## Changes Overview

### 1. Update `public/robots.txt`
**Priority: HIGH | Effort: LOW**

- Block authenticated app routes (`/campaigns`, `/campaign/`, `/settings`, `/admin/`)
- Update sitemap URL to `campaignconsole.xyz`

### 2. Update `public/sitemap.xml`
**Priority: HIGH | Effort: LOW**

- Remove `/auth` (login page shouldn't be indexed)
- Update domain from `campaign-console.lovable.app` to `campaignconsole.xyz`
- Add `lastmod` date to the homepage entry
- Keep only `/` for now

### 3. Update `index.html` Metadata
**Priority: HIGH | Effort: LOW**

- Update title to target "campaign tracker" keyword
- Rewrite meta description to include "campaign tracker"
- Update canonical URL to `campaignconsole.xyz`
- Update all OG and Twitter card URLs to `campaignconsole.xyz`
- Add "campaign tracker" to keywords
- Add Google Search Console verification meta tag (placeholder for user to fill in)
- Add preconnect hints for the backend API domain
- Expand JSON-LD with Organization and WebSite schemas alongside existing SoftwareApplication
- Add GA4 script stub gated by a placeholder measurement ID

### 4. Create `src/hooks/useNoIndex.ts` (new file)
**Priority: HIGH | Effort: LOW**

A small hook that injects `<meta name="robots" content="noindex, nofollow">` into the document head. Used on protected routes.

### 5. Update `src/App.tsx`
**Priority: HIGH | Effort: LOW**

- Import and call `useNoIndex()` inside `ProtectedRoute` and `AuthRoute` components so all authenticated/login pages get noindex tags.

### 6. Expand Landing Page -- `src/pages/Index.tsx`
**Priority: HIGH | Effort: MEDIUM**

Add substantive content for Google to index. This is the biggest single change:
- **Features grid**: 6 feature cards (Battles, Maps, Warbands, Narrative, Scheduling, Dice/Rules) with icons and short descriptions
- **How It Works**: 3-step section (Create Campaign, Invite Players, Track Everything)
- **Mini FAQ**: 3-4 common questions with answers (helps with long-tail keywords and potential FAQ rich results)
- **Footer**: Links to auth, and credits/version info
- All styled consistently with the existing terminal/military theme

### 7. Improve 404 Page -- `src/pages/NotFound.tsx`
**Priority: LOW | Effort: LOW**

- Add on-brand styling consistent with the terminal theme
- Add more helpful navigation links (Home, Login)

### 8. Create `docs/TECH_SEO.md` (new file)
**Priority: MEDIUM | Effort: LOW**

Documentation covering:
- What was changed and why
- How to verify in Google Search Console
- Manual steps checklist (domain verification, sitemap submission)
- Local testing commands (curl for robots.txt, sitemap, view-source for meta tags)
- Lighthouse target metrics

---

## Technical Details

### Files to Create
| File | Purpose |
|---|---|
| `src/hooks/useNoIndex.ts` | Hook to inject noindex meta tag on protected routes |
| `docs/TECH_SEO.md` | SEO documentation and validation plan |

### Files to Modify
| File | Changes |
|---|---|
| `public/robots.txt` | Block app routes, update sitemap URL |
| `public/sitemap.xml` | Remove /auth, update domain, add lastmod |
| `index.html` | Metadata, canonical, OG tags, JSON-LD, GSC verification, preconnect, GA4 stub |
| `src/App.tsx` | Add useNoIndex() to ProtectedRoute and AuthRoute |
| `src/pages/Index.tsx` | Add features grid, how-it-works, FAQ, footer sections |
| `src/pages/NotFound.tsx` | Improved styling and navigation links |

### Domain Note
All URLs will be updated to `campaignconsole.xyz`. If the custom domain is not yet configured, these will need updating once it is -- but having them set correctly now ensures SEO is ready the moment DNS is pointed.
