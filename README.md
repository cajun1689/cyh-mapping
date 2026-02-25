# Casper Youth Hub Resource Map

A web application that displays youth-serving resources, organizations, and services on an interactive map for Wyoming youth ages 11-20.

Built on the [Oregon Youth Resource Map](https://github.com/mapping-action-collective/healthy-transitions-frontend) originally created by the Mapping Action Collective.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Project Structure](#project-structure)
- [Configuration Reference](#configuration-reference)
- [Deploying to AWS](#deploying-to-aws)
- [Managing the Live Site](#managing-the-live-site)
- [Updating Listings Data](#updating-listings-data)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

The Casper Youth Hub Resource Map helps young people ages 11-20 find resources including mental health services, housing, education, food assistance, and more across Wyoming. The map allows users to:

- Browse resources on an interactive map
- Search by keyword, location, category, age, and cost
- Save listings for later reference
- Share direct links to specific resources
- View detailed information including contact details, eligibility, and directions

### How it works

**For the public:** Visit the site, browse or search the map, find resources.

**For administrators:** Log into the admin panel, upload a CSV of resource listings, preview changes on the map, then publish to the live site.

---

## Architecture

The project has three main components:

```
┌─────────────────────────────────┐
│         Frontend (React)        │  ← Static site hosted on S3 + CloudFront
│  Interactive map, search, cards │
└──────────────┬──────────────────┘
               │ GET /api/listings
               │ GET /api/meta
┌──────────────▼──────────────────┐
│     Backend (Express.js)        │  ← Runs on EC2 instance
│  REST API + Admin Panel (EJS)   │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│       PostgreSQL Database       │  ← On the same EC2 instance
│  Listings, users, resources     │
└─────────────────────────────────┘
```

| Component | Tech Stack |
|-----------|-----------|
| Frontend | React 17*, Leaflet, Semantic UI React, React Router |
| Backend | Node.js, Express, EJS templates, Passport.js |
| Database | PostgreSQL 15 |
| Infrastructure | Terraform, AWS (S3, CloudFront, EC2) |

*React version will be upgraded to 18 as part of the modernization roadmap.

---

## Prerequisites

You need the following installed on your machine:

| Tool | Version | Installation |
|------|---------|-------------|
| **Node.js** | 20 LTS or later | [nodejs.org](https://nodejs.org/) or `brew install node` |
| **npm** | 10+ (comes with Node) | Included with Node.js |
| **PostgreSQL** | 15+ | `brew install postgresql@15` |
| **Git** | Any recent version | `brew install git` |

For deployment, you also need:

| Tool | Version | Installation |
|------|---------|-------------|
| **Terraform** | 1.5+ | `brew install terraform` |
| **AWS CLI** | 2.x | `brew install awscli` |
| **GNU Make** | Any (pre-installed on macOS) | Already available |

---

## Local Development

### 1. Clone the repository

```bash
git clone https://github.com/cajun1689/cyh-mapping.git
cd cyh-mapping
```

### 2. Set up the database

Start PostgreSQL and create the database:

```bash
# Start PostgreSQL (if not already running)
brew services start postgresql@15

# Create the database
createdb cyh_mapping

# Run the setup script (creates tables and seeds an admin user)
cd backend
cp .env.example .env
# Edit .env with your local PostgreSQL credentials
npm install
node -e "const bcrypt=require('bcrypt'); bcrypt.hash('admin123',10).then(h=>console.log(h))" > /tmp/hash.txt
psql -d cyh_mapping -c "
  CREATE TABLE IF NOT EXISTS staging_user (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    refresh_token VARCHAR(255),
    require_password_reset BOOLEAN DEFAULT false
  );
  INSERT INTO staging_user (email, password, require_password_reset)
  VALUES ('admin@localhost', '$(cat /tmp/hash.txt)', false)
  ON CONFLICT DO NOTHING;
"
```

Or use the automated setup script:

```bash
DB_PASSWORD=yourpassword ADMIN_EMAIL=admin@localhost ADMIN_PASSWORD=admin123 \
  bash infra/scripts/setup-db.sh
```

### 3. Start the backend

```bash
cd backend
npm install
npm start
```

The backend runs at `http://localhost:5050`. Log into the admin panel with your admin credentials.

### 4. Start the frontend

In a new terminal:

```bash
# From the project root (not backend/)
npm install
npm run dev
```

The frontend runs at `http://localhost:3000` and proxies API calls to the backend.

### 5. Upload some data

1. Go to `http://localhost:5050` and log in
2. Click "Upload" in the navigation
3. Upload a CSV file with listing data (see [CSV Format](#csv-format) below)
4. Preview the data on the map
5. Click "Update" to publish

---

## Project Structure

```
cyh-mapping/
├── public/                    # Static assets (favicon, images)
│   └── index.html             # HTML entry point
├── src/                       # Frontend React source code
│   ├── components/            # React components
│   │   ├── Map.js             # Main map page (search, cards, map)
│   │   ├── Page.js            # Layout wrapper (nav bar)
│   │   ├── About.js           # About page
│   │   ├── Resources.js       # External resources page
│   │   └── SuggestUpdate.js   # Feedback/suggestion forms
│   ├── hooks/                 # Custom React hooks
│   │   ├── useSessionStorage.js
│   │   └── usePosition.js     # Geolocation (not yet active)
│   ├── resources/             # Map marker icons
│   ├── App.js                 # Router and app shell
│   ├── constants.js           # Site text, forms, contributors, resources
│   ├── data.js                # API fetch functions
│   ├── utils.js               # Search, filter, formatting utilities
│   ├── geoUtils.js            # Distance calculations (not yet active)
│   └── index.js               # Entry point (renders React app)
├── backend/                   # Backend Express application
│   ├── routes/                # Express route handlers
│   │   ├── api.js             # Public API (GET /listings, /meta)
│   │   ├── api-preview.js     # Preview API (for staging data)
│   │   ├── listings.js        # Admin: CSV upload/preview/publish
│   │   ├── index.js           # Admin: home, settings, user mgmt
│   │   ├── loggedOutRoutes.js # Login, password reset
│   │   ├── resourceRoutes.js  # Admin: resource link management
│   │   └── contentRoutes.js   # Admin: site text management
│   ├── views/                 # EJS templates for admin panel
│   ├── db/                    # Database schemas and connection
│   │   ├── index.js           # PostgreSQL connection pool
│   │   ├── db.sql             # Reference SQL for table creation
│   │   └── *.schema.json      # JSON Schema for CSV validation
│   ├── utils/                 # Backend utilities
│   │   ├── listingUtils.js    # Listing CRUD and DB operations
│   │   ├── listingMetaUtils.js# Aggregation (cities, categories, keywords)
│   │   ├── authUtils.js       # User auth helpers (bcrypt, CRUD)
│   │   ├── cities.js          # Wyoming city list for geocoding
│   │   ├── constants.js       # Server config (port, CSV parsing)
│   │   └── stateBoundaries.json # Lat/lon bounds for Wyoming
│   ├── services/              # External service integrations
│   │   ├── passport.js        # Authentication strategy
│   │   ├── expressSession.js  # Session config (PostgreSQL store)
│   │   ├── geocoding.js       # Google Maps geocoding
│   │   └── sendEmail.js       # SendGrid email (password resets)
│   ├── middleware/             # Express middleware
│   ├── apiData/               # Static data files
│   │   └── categories.json    # Category names and icons
│   ├── server.js              # Express app entry point
│   └── package.json
├── infra/                     # Terraform infrastructure-as-code
│   ├── main.tf                # AWS provider config
│   ├── variables.tf           # All configurable inputs
│   ├── ec2.tf                 # Backend server instance
│   ├── s3.tf                  # Frontend hosting bucket
│   ├── cloudfront.tf          # CDN distribution
│   ├── network.tf             # Security groups
│   ├── dns.tf                 # Domain + SSL (optional)
│   ├── outputs.tf             # Deployment info outputs
│   ├── terraform.tfvars.example # Example configuration
│   └── scripts/
│       ├── user-data.sh       # EC2 first-boot setup
│       └── setup-db.sh        # Database initialization
├── Makefile                   # Build, deploy, and infra commands
├── ROADMAP.md                 # Modernization plan and task tracker
├── CHANGELOG.md               # Record of all changes
├── .env.example               # Frontend environment variables
├── .gitignore
├── package.json               # Frontend dependencies
└── LICENSE                    # MIT License
```

---

## Configuration Reference

### Frontend environment variables

File: `.env` (or `.env.local` for local dev)

| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Backend API base URL (no trailing slash) | `http://localhost:5050/api` |
| `REACT_APP_SITE_URL` | Your public site URL (used for share links) | `http://localhost:3000` |
| `REACT_APP_GA_ID` | Google Analytics measurement ID (optional) | _(empty = disabled)_ |

> After migrating to Vite, these will change to `VITE_API_URL`, `VITE_SITE_URL`, `VITE_GA_ID`.

### Backend environment variables

File: `backend/.env`

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `SESSION_SECRET` | Random string for session signing (32+ chars) | Yes |
| `PORT` | Server port | No (default: 5050) |
| `OWNER_EMAIL` | Admin contact email | Yes |
| `FRONTEND_URL` | Public frontend URL | Yes |
| `BACKEND_URL` | Backend server URL | Yes |
| `GOOGLE_API_KEY` | Google Maps Geocoding API key | No |
| `SENDGRID_API_KEY` | SendGrid API key for password reset emails | No |
| `AIRTABLE_API_KEY` | Airtable API key (legacy, optional) | No |
| `BASE_ID` | Airtable base ID (legacy, optional) | No |

### Terraform variables

File: `infra/terraform.tfvars`

See `infra/terraform.tfvars.example` for all available variables with descriptions. Key ones:

| Variable | Description |
|----------|-------------|
| `ssh_key_name` | AWS key pair name (create in EC2 console first) |
| `db_password` | PostgreSQL password for production |
| `admin_email` / `admin_password` | Initial admin login credentials |
| `session_secret` | Express session secret |
| `domain_name` | Your domain (optional, leave empty for CloudFront URL) |

---

## Deploying to AWS

### First-time setup

1. **Create an AWS account** at [aws.amazon.com](https://aws.amazon.com)

2. **Create an IAM user** with programmatic access:
   - Go to IAM > Users > Create User
   - Attach the `AdministratorAccess` policy (or a more restricted custom policy)
   - Create an access key under Security Credentials

3. **Create an SSH key pair** in the EC2 console:
   - Go to EC2 > Key Pairs > Create Key Pair
   - Name it (e.g., `cyh-key`)
   - Download the `.pem` file and save it: `chmod 400 ~/cyh-key.pem`

4. **Install tools and configure AWS:**

```bash
brew install terraform awscli
aws configure
# Enter: Access Key ID, Secret Access Key, region (us-west-2), output (json)
```

5. **Configure Terraform variables:**

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
```

### Provision and deploy

```bash
# Provision all AWS infrastructure
make infra

# Build and deploy the application
make deploy
```

Terraform will print the site URL when it finishes. The EC2 instance takes 3-5 minutes to fully bootstrap after creation.

### Check deployment status

```bash
# View all outputs (IPs, URLs)
make status

# SSH into the server to check logs
make ssh
# Once connected:
pm2 logs                    # Application logs
sudo cat /var/log/user-data.log  # Bootstrap log
```

### Set up a custom domain (optional)

If you set `domain_name` in your Terraform variables:

1. Run `make status` to see the Route 53 nameservers
2. Go to your domain registrar and update the nameservers to the ones shown
3. Wait for DNS propagation (can take up to 48 hours)
4. The ACM certificate will auto-validate once DNS propagates

---

## Managing the Live Site

### Deploying code changes

```bash
# Deploy everything (frontend + backend)
make deploy

# Or deploy just one side
make deploy-frontend   # Rebuilds React app, syncs to S3, invalidates CDN cache
make deploy-backend    # Syncs backend code to EC2, restarts the server
```

### Useful commands

```bash
make ssh        # SSH into the backend server
make logs       # Tail the backend application logs
make status     # Show all Terraform outputs (URLs, IPs)
make destroy    # Tear down ALL AWS resources (irreversible!)
```

### Database backups

The EC2 instance automatically runs a daily `pg_dump` and stores compressed backups in `/home/ec2-user/backups/`. Backups older than 30 days are automatically deleted.

To manually back up:

```bash
make ssh
pg_dump -U cyh_app cyh_mapping | gzip > ~/backups/manual-$(date +%Y%m%d).sql.gz
```

To restore from a backup:

```bash
make ssh
gunzip -c ~/backups/20260225.sql.gz | psql -U cyh_app cyh_mapping
```

---

## Updating Listings Data

### CSV Format

The admin panel accepts CSV files with the following columns. Only `guid`, `full_name`, `category`, and `description` are required.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `guid` | integer | Yes | Unique identifier for the listing |
| `full_name` | text | Yes | Name of the program/service |
| `category` | text | Yes | Format: `Parent Category: Sub Category` |
| `description` | text | Yes | Description of the service |
| `parent_organization` | text | No | Parent org name (if different from full_name) |
| `full_address` | text | No | Street address (used for map placement) |
| `city` | text | No | City name |
| `latitude` / `longitude` | number | No | Coordinates (auto-geocoded if missing) |
| `phone_1` | text | No | Primary phone number |
| `phone_label_1` | text | No | Label for primary phone |
| `website` | text | No | Website URL |
| `program_email` | text | No | Contact email |
| `min_age` / `max_age` | integer | No | Age range served |
| `keywords` | text | No | Comma-separated tags (e.g., `LGBTQ+,Housing`) |
| `cost_keywords` | text | No | Comma-separated cost tags (e.g., `Free,OHP`) |
| `eligibility_requirements` | text | No | Who can access this service |
| `financial_information` | text | No | Cost details |
| `intake_instructions` | text | No | How to access the service |
| `languages_offered` | text | No | Comma-separated languages |
| `crisis_line_number` | text | No | Crisis phone number |
| `services_provided` | text | No | Comma-separated list of services |

### Categories

Categories are defined in `backend/apiData/categories.json`. Each listing's `category` field should match the format `Parent: Sub` where `Parent` matches a key in this file. Current categories:

- Basic Needs
- Care & Safety
- Education
- Health & Wellness
- Housing & Shelter
- Mental Health
- Work & Employment
- And more (see `categories.json` for the full list)

### Upload process

1. Log into the admin panel at your backend URL
2. Navigate to "Listings" > "Upload"
3. Select your CSV file and click Upload
4. Review any validation errors and fix your CSV if needed
5. Click through to Preview -- this loads your data on a staging version of the map
6. If everything looks correct, click "Update" to publish to the live site

---

## Contributing

### Making changes

1. Create a new branch: `git checkout -b feature/my-change`
2. Make your changes
3. Test locally (both frontend and backend)
4. Update `CHANGELOG.md` under `[Unreleased]`
5. Commit and push: `git push -u origin feature/my-change`
6. Open a pull request

### Code style

- Frontend: React functional components with hooks
- Backend: Express.js with async/await
- CSS: Plain CSS with Semantic UI utility classes
- No TypeScript (yet -- on the roadmap)

### Key files to know

| If you want to... | Edit this file |
|-------------------|---------------|
| Change site text, disclaimer, or form links | `src/constants.js` |
| Change the nav bar | `src/components/Page.js` |
| Change the about page | `src/components/About.js` |
| Change map behavior or card layout | `src/components/Map.js` |
| Change listing categories or icons | `backend/apiData/categories.json` |
| Change CSV validation rules | `backend/db/listings.schema.json` |
| Change the admin panel UI | `backend/views/` |
| Change AWS infrastructure | `infra/*.tf` |

---

## Modernization Roadmap

This project is being actively modernized. See `ROADMAP.md` for the full plan including:

- Migrating from Create React App to Vite
- Upgrading React 17 to 18
- Updating all dependencies to current versions
- Replacing deprecated packages

---

## License

[MIT License](LICENSE)

Originally created by the [Mapping Action Collective](https://mappingaction.org/).
