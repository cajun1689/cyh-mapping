# CYH Mapping — Backend

Express.js backend providing the REST API and admin panel for the Casper Youth Hub Resource Map.

Forked from [mapping-action-collective/healthy-transitions-backend](https://github.com/mapping-action-collective/healthy-transitions-backend).

---

## What This Does

1. **Public API** — Serves listing and metadata JSON to the frontend
2. **Admin Panel** — Web interface for staff to upload, preview, and publish resource data
3. **User Auth** — Login system for admin users (Passport.js + bcrypt)
4. **CSV Processing** — Parses and validates uploaded CSV files against a JSON Schema
5. **Geocoding** — Resolves addresses to lat/lon via Google Maps API (optional)

---

## Quick Start

### Prerequisites

- Node.js 20 LTS or later
- PostgreSQL 15+
- A database created and accessible

### Setup

```bash
# Install dependencies
npm install

# Create your environment file
cp .env.example .env
# Edit .env with your database credentials and other settings

# Initialize the database (from the project root)
DB_PASSWORD=yourpassword ADMIN_EMAIL=admin@localhost ADMIN_PASSWORD=admin123 \
  bash ../infra/scripts/setup-db.sh

# Start the server
npm start
```

The server runs at `http://localhost:5050` by default.

### First login

Use the admin credentials you set during database setup. Navigate to `http://localhost:5050` and you'll be redirected to the login page.

---

## API Endpoints

### Public (no auth required)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/listings` | All published listings (filtered to remove null fields) |
| `GET` | `/api/meta` | Aggregated metadata: categories, city counts, keyword counts, resources |

### Preview (no auth, used by frontend preview mode)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api-preview/listings` | Staging listings (before publishing) |
| `GET` | `/api-preview/meta` | Staging metadata |

### Admin (auth required)

| Path | Description |
|------|-------------|
| `/auth/login` | Login page |
| `/home` | Admin dashboard |
| `/listings/upload` | Step 1: Upload CSV |
| `/listings/geocode` | Step 2: Geocode addresses |
| `/listings/preview` | Step 3: Preview on frontend |
| `/listings/update` | Step 4: Publish to live site |
| `/resource/*` | Manage external resource links |
| `/change-password` | Change your password |
| `/add-user` | Add new admin users (owner only) |

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string, e.g. `postgresql://user:pass@localhost:5432/cyh_mapping` |
| `SESSION_SECRET` | Yes | Random string (32+ characters) for signing session cookies |
| `PORT` | No | Server port (default: `5050`) |
| `OWNER_EMAIL` | Yes | Email of the primary admin account |
| `FRONTEND_URL` | Yes | Public URL of the frontend (used for preview links) |
| `BACKEND_URL` | Yes | Public URL of this backend server |
| `GOOGLE_API_KEY` | No | Google Maps Geocoding API key. Without this, geocoding is skipped. |
| `SENDGRID_API_KEY` | No | SendGrid API key for password reset emails. Without this, password resets don't send email. |
| `AIRTABLE_API_KEY` | No | Legacy Airtable integration (not required) |
| `BASE_ID` | No | Legacy Airtable base ID (not required) |

---

## Database

### Connection

The app connects to PostgreSQL via the `DATABASE_URL` environment variable using the `pg` library's connection pool.

### Tables

| Table | Purpose |
|-------|---------|
| `listings` | Production resource listings (what the public sees) |
| `preview_listings` | Staging listings (created during CSV upload, before publishing) |
| `listing_backup` | Automatic backup of previous listings before each publish |
| `staging_user` | Admin user accounts (email, bcrypt password hash) |
| `resource` | External resource links shown on the "More Resources" page |
| `site_meta` | Site content metadata (about text, categories, etc.) |
| `listing` | Historical listing snapshots (JSONB) |
| `meta` | Audit log of listing updates (who, when, file name, count) |
| `session` | Express sessions (auto-created by `connect-pg-simple`) |

### Schema

The CSV validation schema is defined in `db/listings.schema.json`. This is what the admin panel validates uploaded CSV files against.

---

## Data Flow

```
Staff uploads CSV
       │
       ▼
PapaParse parses CSV → validates against JSON Schema
       │
       ▼
Writes rows to `preview_listings` table
       │
       ▼
Staff previews on frontend (via /api-preview/*)
       │
       ▼
Staff clicks "Update"
       │
       ▼
Current `listings` backed up → `preview_listings` promoted to `listings`
       │
       ▼
Frontend reads from /api/listings (live data updated)
```

---

## Categories

Categories and their icons are defined in `apiData/categories.json`. Each listing's `category` field should follow the format `Parent Category: Sub Category` where the parent matches a key in this JSON file.

To add or change categories, edit `apiData/categories.json`. Icons use [Semantic UI icon names](https://semantic-ui.com/elements/icon.html).

---

## Key Directories

| Directory | Contents |
|-----------|----------|
| `routes/` | Express route handlers (API, admin, auth) |
| `views/` | EJS templates for the admin panel |
| `db/` | Database connection and schemas |
| `utils/` | Helper functions (listings, auth, cities, geocoding) |
| `services/` | External service integrations (Passport, email, geocoding) |
| `middleware/` | Auth guards and error handling |
| `apiData/` | Static data files (categories, display config) |

---

## Deployment

The backend is deployed to an EC2 instance via the project's Terraform configuration and Makefile. See the main project `README.md` for full deployment instructions.

To deploy backend changes only:

```bash
# From the project root
make deploy-backend
```

This rsyncs the code to EC2 and restarts PM2.
