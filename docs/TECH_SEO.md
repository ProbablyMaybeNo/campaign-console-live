# Technical SEO — Campaign Console

## Changes Made

| Change | File(s) | Why |
|---|---|---|
| **robots.txt** — block app routes | `public/robots.txt` | Prevents crawlers from wasting budget on authenticated pages |
| **sitemap.xml** — updated domain, removed `/auth`, added `lastmod` | `public/sitemap.xml` | Correct sitemap for indexable pages only |
| **Metadata** — keyword-optimized title, description, canonical | `index.html` | Target "campaign tracker" searches |
| **OG / Twitter cards** — updated to `campaignconsole.xyz` | `index.html` | Correct URLs for social sharing |
| **JSON-LD** — Organization, WebSite, SoftwareApplication, FAQPage | `index.html` | Enables rich results (FAQ snippets, app info) |
| **Preconnect** — API domain | `index.html` | Faster initial load (Core Web Vitals) |
| **noindex hook** — `useNoIndex()` on protected/auth routes | `src/hooks/useNoIndex.ts`, `src/App.tsx` | Ensures app pages are never indexed even if crawled |
| **Landing page expansion** — features, how-it-works, FAQ, footer | `src/pages/Index.tsx` | Gives Google substantive content to index |
| **404 page** — on-brand, helpful links | `src/pages/NotFound.tsx` | Better UX for dead links, reduces soft-404 risk |
| **GSC verification** — placeholder meta tag | `index.html` | Ready for Google Search Console when token is available |
| **GA4** — commented-out stub | `index.html` | Ready to enable by uncommenting + adding measurement ID |

---

## Verification Steps

### Local Testing

```bash
# Check robots.txt
curl https://campaignconsole.xyz/robots.txt

# Check sitemap
curl https://campaignconsole.xyz/sitemap.xml

# Check meta tags (look for <title>, <meta name="description">, canonical, noindex)
curl -s https://campaignconsole.xyz/ | head -100

# Check JSON-LD
curl -s https://campaignconsole.xyz/ | grep -A 50 'application/ld+json'
```

### Google Tools

1. **Rich Results Test** — https://search.google.com/test/rich-results
   - Paste `https://campaignconsole.xyz/`
   - Expect: FAQPage and SoftwareApplication detected

2. **Search Console → URL Inspection**
   - Inspect `https://campaignconsole.xyz/`
   - Expect: "Page can be indexed", canonical matches, no coverage errors

3. **Search Console → Pages Indexing**
   - After a few days, expect `/` as indexed
   - Expect no app routes (`/campaigns`, `/campaign/*`, `/settings`) indexed

### Lighthouse

Target metrics for the landing page:
- **Performance**: ≥ 90
- **SEO**: ≥ 95
- **Best Practices**: ≥ 90
- **Accessibility**: ≥ 90

Run: Chrome DevTools → Lighthouse → Mobile → Generate Report

---

## Manual Steps Checklist

### Google Search Console Setup
1. Go to https://search.google.com/search-console
2. Add property: `https://campaignconsole.xyz`
3. Choose verification method:
   - **Option A (recommended)**: DNS TXT record — add the provided TXT record to your domain DNS
   - **Option B**: HTML meta tag — uncomment the `google-site-verification` meta tag in `index.html` and paste your token
4. After verification, submit sitemap: `https://campaignconsole.xyz/sitemap.xml`

### Google Analytics (GA4)
1. Create a GA4 property at https://analytics.google.com
2. Get the Measurement ID (format: `G-XXXXXXXXXX`)
3. In `index.html`, uncomment the GA4 script block and replace `G-XXXXXXXXXX` with your ID

### Domain Configuration
- Ensure `campaignconsole.xyz` is configured as the primary domain
- Set up 301 redirect from `www.campaignconsole.xyz` → `campaignconsole.xyz` (or vice versa) at DNS/hosting level
- Ensure HTTPS is enforced (handled by Lovable hosting)

---

## Out of Scope (Future Recommendations)

| Item | Impact | Notes |
|---|---|---|
| **SSR / Prerendering** | HIGH | `vite-plugin-prerender` for `/` or migrate marketing pages to Astro |
| **Content marketing / blog** | HIGH | Target long-tail queries like "how to run a wargame campaign" |
| **Backlink outreach** | HIGH | Wargaming subreddits, forums, community discords |
| **Additional public pages** | MEDIUM | Features, Pricing, About — each adds indexable surface area |
| **Image optimization pipeline** | MEDIUM | WebP/AVIF for hero image, responsive srcset |
| **Hreflang tags** | LOW | Only if targeting non-English audiences |
