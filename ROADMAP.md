# CYH Mapping — Modernization Roadmap

> Working document. Check boxes as items are completed.  
> Forked from [mapping-action-collective/healthy-transitions-frontend](https://github.com/mapping-action-collective/healthy-transitions-frontend) (last commit: April 2022).

---

## AWS Architecture (Minimal Cost)

Target: **< $15/month** at low-to-moderate traffic (< $5/month for frontend alone).

The backend is a full Express.js admin application (CSV upload, preview/publish workflow, auth, geocoding) backed by PostgreSQL. It is too complex to rewrite as Lambda functions cost-effectively, so we run it on a small EC2 instance.

```
                  ┌──────────────┐
    Users ──────▶ │  CloudFront  │  (CDN, HTTPS, caching)
                  └──────┬───────┘
                         │
               ┌─────────┴──────────┐
               ▼                    ▼
      ┌────────────────┐   ┌────────────────────┐
      │   S3 Bucket    │   │  EC2 t4g.micro     │
      │ (static site)  │   │  (Express backend   │
      └────────────────┘   │   + admin panel)    │
                           └────────┬────────────┘
                                    │
                           ┌────────┴────────┐
                           │   PostgreSQL    │
                           │  (RDS free tier │
                           │   or on EC2)    │
                           └─────────────────┘
```

### Cost Breakdown (estimated)

| Service | Free Tier (12 months) | After Free Tier |
|---|---|---|
| **S3** (static hosting) | 5 GB storage, 20K GET | ~$0.50/mo |
| **CloudFront** (CDN + HTTPS) | 1 TB transfer, 10M requests/mo | ~$0.50/mo |
| **Route 53** (DNS) | — | $0.50/mo per zone |
| **ACM** (SSL cert) | Always free | $0.00 |
| **EC2 t4g.micro** (backend) | 750 hrs/mo free (12 months) | ~$6/mo |
| **RDS db.t4g.micro** (Postgres) | 750 hrs/mo free (12 months) | ~$12/mo |
| **Total (with free tier)** | | **~$1.50/mo** |
| **Total (after free tier)** | | **~$20/mo** |

**Cost-saving alternatives:**
- Run PostgreSQL directly on the EC2 instance instead of RDS: saves ~$12/mo but you manage backups yourself
- Use a Lightsail instance ($3.50/mo for 512MB) if traffic is very low
- For frontend-only launch: S3 + CloudFront is ~$1-2/month with static JSON data

---

## Phase 0 — Environment & Configuration ✦ DO FIRST
> _Get the project runnable locally before changing anything._

- [ ] **0.1** Create `.env` / `.env.example` with `REACT_APP_API_URL`
- [ ] **0.2** Replace hardcoded Heroku URLs in `src/index.js` with env var
- [ ] **0.3** Add error handling + loading state to `src/index.js` and `src/data.js`
- [ ] **0.4** Decide on backend hosting strategy:
  - [ ] Option A: EC2 t4g.micro + RDS PostgreSQL (recommended — runs existing backend as-is)
  - [ ] Option B: EC2 t4g.micro with PostgreSQL installed on same instance (cheapest long-term)
  - [ ] Option C: Static JSON export to S3 (quickest to get frontend live — no admin panel)
  - [ ] Option D: Lightsail $3.50/mo instance (budget alternative to EC2)
- [ ] **0.5** `npm install` — verify the project builds with current deps
- [ ] **0.6** Remove `console.log(resources)` from `src/App.js`

---

## Phase 1 — Rebranding & Content
> _Make it yours. No code architecture changes yet._

- [ ] **1.1** Update `public/index.html` — title, meta tags, favicon
- [ ] **1.2** Update `src/constants.js`:
  - [ ] `ABOUT_TEXT` — rewrite for CYH
  - [ ] `DISCLAIMER` — remove COVID language, update for current context
  - [ ] `FORMS` — replace Google Form & Airtable links with your own
  - [ ] `CONTRIBUTORS` — update org names, logos, descriptions
  - [ ] `MORE_RESOURCES` — review/update external links
- [ ] **1.3** Update `src/components/Page.js` — nav bar text (org name, site title)
- [ ] **1.4** Update `src/components/About.js`:
  - [ ] Replace embedded Google Doc iframe with your own content
  - [ ] Update logos array
  - [ ] Update attribution text
- [ ] **1.5** Replace hardcoded `oregonyouthresourcemap.com` in `src/components/Map.js` (lines 294-296) with env var or config
- [ ] **1.6** Replace Google Analytics tag `G-491RVW0YDT` with your own (or remove)
- [ ] **1.7** Replace postimg.cc hosted images with self-hosted assets in `/public`
- [ ] **1.8** Update `package.json` name field
- [ ] **1.9** Update `README.md`

---

## Phase 2 — Build Tooling Migration (CRA → Vite)
> _The single most important technical upgrade. CRA is deprecated and won't receive security patches._

- [ ] **2.1** Install Vite and `@vitejs/plugin-react`
- [ ] **2.2** Create `vite.config.js`
- [ ] **2.3** Move `public/index.html` → `index.html` (Vite convention)
- [ ] **2.4** Rename `.js` files to `.jsx` where JSX is used
- [ ] **2.5** Update `package.json` scripts:
  - `"dev": "vite"`
  - `"build": "vite build"`
  - `"preview": "vite preview"`
- [ ] **2.6** Replace `REACT_APP_` env prefix with `VITE_` prefix
- [ ] **2.7** Remove `react-scripts` dependency
- [ ] **2.8** Test build output, verify all pages work
- [ ] **2.9** Update `.gitignore` for Vite (`dist/` instead of `build/`)

---

## Phase 3 — React & Core Dependency Upgrades
> _Upgrade the runtime. Do this after Vite migration so you aren't fighting CRA compatibility._

- [ ] **3.1** Upgrade React 17 → 18
  - [ ] Replace `ReactDOM.render()` with `createRoot()` in `src/index.js`
  - [ ] Test for `StrictMode` double-render issues
- [ ] **3.2** Upgrade `react-router-dom` from `6.0.0-beta.0` → stable `6.x`
  - [ ] Verify all routes, `useSearchParams`, `useNavigate` still work
  - [ ] The beta API is close to stable v6, but test edge cases
- [ ] **3.3** Upgrade `leaflet` 1.7 → 1.9
- [ ] **3.4** Upgrade `react-leaflet` 3.x → 4.x
  - [ ] Replace `react-leaflet-markercluster` (abandoned) with `react-leaflet-cluster`
  - [ ] Update `MarkerClusterGroup` import and usage in `Map.js`
- [ ] **3.5** Upgrade `semantic-ui-react` and `semantic-ui-css` to latest
- [ ] **3.6** Upgrade remaining deps: `papaparse`, `serve`, test libraries
- [ ] **3.7** Run `npm audit fix` and resolve any remaining vulnerabilities

---

## Phase 4 — AWS Deployment Setup
> _Get the static frontend live on AWS._

- [ ] **4.1** Create S3 bucket for static site hosting
  - Bucket policy: public read for `dist/*`
  - Enable static website hosting
- [ ] **4.2** Create CloudFront distribution
  - Origin: S3 bucket
  - Default root object: `index.html`
  - Error page: redirect 403/404 → `/index.html` (SPA routing)
  - Enable gzip/brotli compression
- [ ] **4.3** Register/configure domain in Route 53
  - Create hosted zone
  - Point A record (alias) to CloudFront distribution
- [ ] **4.4** Provision SSL certificate via ACM (us-east-1 region for CloudFront)
  - DNS validation
  - Attach to CloudFront distribution
- [ ] **4.5** Set up CI/CD (GitHub Actions):
  - On push to `main`: `npm run build` → sync `dist/` to S3 → invalidate CloudFront cache
- [ ] **4.6** Create `.env.production` with production API URL
- [ ] **4.7** Test: verify site loads, routing works, HTTPS works, map tiles load

---

## Phase 5 — Backend Deployment on AWS
> _The backend is a full Express.js admin app (CSV upload, preview/publish, auth, geocoding) with PostgreSQL. It lives in the `backend/` directory, cloned from [mapping-action-collective/healthy-transitions-backend](https://github.com/mapping-action-collective/healthy-transitions-backend)._

### 5A. Backend dependency upgrades (do before deploying)
- [ ] **5A.1** Update Node.js engine from 16 (EOL) to **20 LTS** or **22 LTS**
- [ ] **5A.2** Remove deprecated `csurf` package — replace with `csrf-csrf` or `csrf-sync`
- [ ] **5A.3** Update `axios` from 0.26 to 1.x
- [ ] **5A.4** Update `passport` from 0.5 to 0.7 (breaking: `req.logout()` now requires a callback)
- [ ] **5A.5** Update `helmet` from 4.x to latest
- [ ] **5A.6** Replace deprecated `sendgrid` package with `@sendgrid/mail` (or AWS SES for cost savings)
- [ ] **5A.7** Update `express` to latest 4.x for security patches
- [ ] **5A.8** Move `nodemon` from dependencies to devDependencies
- [ ] **5A.9** Update `multer`, `pg`, `bcrypt`, `googleapis` to latest
- [ ] **5A.10** Update `db/index.js` — remove Heroku-specific SSL config and "Heroku Postgres" references
- [ ] **5A.11** Run `npm audit fix` and resolve vulnerabilities

### 5B. Environment variables needed
The backend requires these env vars (create a `backend/.env.example`):
```
DATABASE_URL=postgresql://user:pass@host:5432/dbname
SESSION_SECRET=random-secret-string
SENDGRID_API_KEY=SG.xxx (or AWS SES config)
GOOGLE_API_KEY=xxx (for geocoding addresses)
OWNER_EMAIL=admin@yourdomain.com
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com
AIRTABLE_API_KEY=xxx (optional, only if using Airtable)
BASE_ID=xxx (optional, only if using Airtable)
PORT=5050
```

### 5C. Database setup
- [ ] **5C.1** Provision PostgreSQL (RDS free tier or on EC2)
- [ ] **5C.2** Run `db/db.sql` to create tables (or restore from a dump of the original DB)
- [ ] **5C.3** Create initial admin user: insert into `staging_user` with bcrypt-hashed password
- [ ] **5C.4** Seed initial listing data (CSV upload through admin panel or direct DB import)
- [ ] **5C.5** Populate `categories.json` equivalent data if customizing categories

### 5D. Deploy backend to AWS
- [ ] **5D.1** Launch EC2 t4g.micro (Amazon Linux 2023 or Ubuntu 22.04)
- [ ] **5D.2** Install Node.js 20 LTS, PostgreSQL (if running on same instance), nginx as reverse proxy
- [ ] **5D.3** Clone backend repo, `npm install`, configure `.env`
- [ ] **5D.4** Set up nginx reverse proxy: port 80/443 → localhost:5050
- [ ] **5D.5** Set up SSL via Let's Encrypt (certbot)
- [ ] **5D.6** Set up PM2 or systemd to keep Express running on reboot
- [ ] **5D.7** Configure security group: allow 80, 443, 22 (SSH) only
- [ ] **5D.8** Test: admin login, CSV upload, preview, publish, API endpoints
- [ ] **5D.9** Set up automated DB backups (pg_dump cron job or RDS automated backups)

### 5E. Rebranding the backend
- [ ] **5E.1** Update `views/` EJS templates — change "Healthy Transitions" text
- [ ] **5E.2** Update `apiData/categories.json` — customize categories/icons for CYH
- [ ] **5E.3** Update `views/partials/navbar.ejs` — org name
- [ ] **5E.4** Update `public/styles.css` and favicon
- [ ] **5E.5** Update `package.json` name field

---

## Phase 6 — Code Quality & Longevity
> _Make the codebase maintainable for years to come._

- [ ] **6.1** Add ESLint config (standalone, since CRA's built-in one is gone after Vite migration)
- [ ] **6.2** Add Prettier for consistent formatting
- [ ] **6.3** Fix or remove the broken test in `Page.test.js`
- [ ] **6.4** Add basic smoke tests for each route
- [ ] **6.5** Extract hardcoded strings into a config/constants pattern that's easy to update
- [ ] **6.6** Add PropTypes or migrate to TypeScript for type safety
- [ ] **6.7** Document the `.env` variables, deployment process, and data update workflow in README
- [ ] **6.8** Consider replacing Semantic UI with a more actively maintained library (Mantine, Chakra, etc.) — optional, only if Semantic becomes a blocker

---

## Phase 7 — Future Enhancements (Nice-to-Have)
> _After everything above is solid._

- [ ] **7.1** Geolocation: use the existing `usePosition` hook to sort results by proximity
- [ ] **7.2** PWA support: service worker for offline access (useful for mobile users)
- [ ] **7.3** Accessibility audit (WCAG 2.1 AA)
- [ ] **7.4** Performance: lazy-load map component, code-split routes
- [ ] **7.5** Admin panel: simple auth-gated page to update listings without touching the database directly
- [ ] **7.6** Analytics: set up privacy-respecting analytics (Plausible, Fathom, or self-hosted Umami on Lambda)
- [ ] **7.7** i18n / multilingual support if needed

---

## Decision Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-02-23 | Fork healthy-transitions-frontend as starting point | Proven codebase with map, search, filtering already built |
| 2026-02-23 | Target AWS S3 + CloudFront for frontend hosting | Minimal cost ($1-3/mo), high reliability, global CDN |
| 2026-02-23 | Migrate CRA → Vite | CRA is deprecated, Vite is the modern standard with active maintenance |
| 2026-02-23 | Upgrade to React 18 (not 19) | React 18 is battle-tested and widely supported; 19 can come later |
| 2026-02-23 | Backend: run Express app on EC2 (not rewrite as Lambda) | Admin panel (CSV upload, preview/publish, auth) is too complex for serverless rewrite |
| 2026-02-23 | Backend: keep PostgreSQL (not switch to DynamoDB) | Existing schema, queries, and admin workflows all depend on relational DB |
| 2026-02-23 | Backend: upgrade Node 16 → 20 LTS | Node 16 is EOL since Sept 2023; 20 LTS supported through April 2026 |
| | | |

---

## Notes

- The backend has been cloned into `backend/` within this project
- The original backend repo is at [mapping-action-collective/healthy-transitions-backend](https://github.com/mapping-action-collective/healthy-transitions-backend)
- The frontend expects two API endpoints: `GET /api/listings` and `GET /api/meta`
- The backend also exposes `GET /api-preview/listings` and `GET /api-preview/meta` for the preview workflow
- All frontend branding changes are isolated to `constants.js`, `Page.js`, `About.js`, and `public/index.html`
- Backend branding is in `views/` (EJS templates), `apiData/categories.json`, and `public/`
- The `#` in URLs (HashRouter) is intentional — it avoids server-side routing config and works natively with S3 static hosting
- The backend admin panel workflow: staff login → upload CSV → validate against JSON schema → preview on frontend → publish to production
- PostgreSQL tables of note: `listings` (production), `preview_listings` (staging), `listing_backup`, `staging_user` (auth), `resource`, `site_meta`
- The backend uses Google Maps Geocoding API to resolve addresses to lat/lon coordinates
- Sessions are stored in PostgreSQL via `connect-pg-simple`
