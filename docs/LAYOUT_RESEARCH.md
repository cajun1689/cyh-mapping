# Layout Research — Map Page Padding & Width

## Summary

The side padding and map width changes were not taking effect due to **flexbox stretch** overriding our width. This document explains the layout structure and the fix.

## DOM Structure

```
div#app (flex column, align-items: stretch)
├── header (Segment) — nav menu with .ui.container
├── nav#map-nav (Segment) — search/filters with Form.ui.container
└── main#map-page — cards + map grid
```

## Root Cause

1. **#app** uses `display: flex; flex-direction: column` (Page.css)
2. Default **align-items: stretch** makes flex children fill the full cross-axis width
3. Our `width: 69%` on `#map-page` was **overridden** by stretch — the main was forced to 100% width
4. **Fix:** Add `align-self: center` to the main so it doesn't stretch; then width and margins apply

## Semantic UI Container

- Header nav and map-nav Form use `className="container"` → `.ui.container`
- Semantic UI sets fixed widths per breakpoint:
  - Large (1200px+): 1127px
  - Small monitor (992–1199px): 933px
  - Tablet (768–991px): 723px
- These use `margin-left: auto; margin-right: auto` for centering

## Applied Fix

In Map.css, for desktop (min-width: 768px):

1. **Widen all content** — header, map-nav form, and main to 92% width with 4% side margins
2. **Override stretch** — `align-self: center` on `#app > main#map-page`
3. **Map 50% wider** — grid `1fr 3fr` (25% cards, 75% map)

## Deployment

- **Local:** Run `npm run dev` to see changes (or `npm run build` then `npm start`)
- **Production:** Run `make deploy-frontend` to build and sync to S3; CloudFront cache is invalidated
- **Build note:** Use `NODE_OPTIONS=--openssl-legacy-provider` if Node 17+ causes OpenSSL errors
