# Wyoming Youth Resource Map

A web application that displays youth-serving resources, organizations, and services on an interactive map for Wyoming youth ages 11-20. Developed by [Casper Youth Hub](https://www.casperyouthhub.org/) in partnership with [Unicorn Solutions](https://www.unicornsolutions.org).

Built on the [Oregon Youth Resource Map](https://github.com/mapping-action-collective/healthy-transitions-frontend) originally created by the Mapping Action Collective for the [Healthy Transitions](https://www.samhsa.gov/grants/grant-announcements/sm-18-010) program.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Embedding the Map](#embedding-the-map)
- [Sponsor Logos](#sponsor-logos)
- [Organization User Accounts](#organization-user-accounts)
- [Adding New Organizations (Google Form)](#adding-new-organizations-google-form)
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

The Wyoming Youth Resource Map helps young people ages 11-20 find resources including mental health services, housing, education, food assistance, and more across Wyoming. The map allows users to:

- Browse resources on an interactive map
- Search by keyword, location, category, age, and cost
- Filter by age group (Youth, Adult, or both)
- Toggle faith-based organization visibility
- Save listings for later reference
- Share direct links to specific resources
- View detailed information including contact details, eligibility, directions, and building photos
- Embed the map on any website

### How it works

**For the public:** Visit the site, browse or search the map, find resources.

**For administrators:** Log into the admin panel to add/edit/delete individual listings, upload a CSV of resource listings, preview changes on the map, then publish to the live site.

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
│    PostgreSQL Database (RDS)    │  ← Managed AWS RDS instance
│  Listings, users, resources     │  ← Auto backups, 7-day retention
└─────────────────────────────────┘
```

| Component | Tech Stack |
|-----------|-----------|
| Frontend | React 17*, Leaflet, Semantic UI React, React Router |
| Backend | Node.js, Express, EJS templates, Passport.js |
| Database | PostgreSQL 15 (AWS RDS, managed) |
| Infrastructure | Terraform, AWS (S3, CloudFront, EC2, RDS) |

*React version will be upgraded to 18 as part of the modernization roadmap.

---

## Embedding the Map

You can embed the Wyoming Youth Resource Map on any website. There are two methods:

### Method 1: Script Tag (recommended)

Paste this into your HTML wherever you want the map to appear:

```html
<div id="wyrm-map"></div>
<script src="https://casperyouthhubmap.org/embed.js"></script>
```

The map will fill its container's width and render at 600px tall by default.

#### Options

Customize the embed with `data-` attributes on the `<div>`:

| Attribute | Values | Default | Description |
|-----------|--------|---------|-------------|
| `data-filter` | `Youth`, `Adult`, _(omit for all)_ | All | Pre-filter by age group |
| `data-height` | Any number | `600` | Height in pixels |

**Examples:**

```html
<!-- Youth-only resources, 500px tall -->
<div id="wyrm-map" data-filter="Youth" data-height="500"></div>
<script src="https://casperyouthhubmap.org/embed.js"></script>

<!-- Adult-only resources -->
<div id="wyrm-map" data-filter="Adult"></div>
<script src="https://casperyouthhubmap.org/embed.js"></script>

<!-- All resources, 800px tall -->
<div id="wyrm-map" data-height="800"></div>
<script src="https://casperyouthhubmap.org/embed.js"></script>
```

### Method 2: Raw iframe

If your platform doesn't allow external scripts (e.g., some CMS systems), use an iframe directly:

```html
<iframe
  src="https://casperyouthhubmap.org/#/embed"
  width="100%"
  height="600px"
  style="border:none; border-radius:8px;"
  loading="lazy"
  title="Wyoming Resource Map">
</iframe>
```

To pre-filter, add `?age_group=Youth` or `?age_group=Adult` to the URL:

```html
<iframe src="https://casperyouthhubmap.org/#/embed?age_group=Youth" ...></iframe>
```

### Embed Code Generator

Visit [casperyouthhubmap.org/#/embed-code](https://casperyouthhubmap.org/#/embed-code) for an interactive tool that lets you customize settings and copy the embed code with a live preview.

---

## Sponsor Logos

A "Made Possible By" section appears below the map displaying sponsor/partner logos. Sponsors are managed entirely from the admin panel.

### Managing sponsors

1. Log into the admin panel and click **Sponsors** in the nav bar
2. **Add a sponsor:** Fill in the name, optional website URL, and upload a logo image (JPEG, PNG, WebP, or SVG, max 5 MB)
3. **Reorder:** Use the up/down arrow buttons to change display order
4. **Delete:** Click the trash icon and confirm

Logos are stored in S3 under the `sponsor-logos/` prefix and served through CloudFront. The sponsor data is included in the `/api/meta` response, so the frontend picks it up automatically with no extra API call.

The section renders on both the main site and embedded maps, and is hidden automatically when no sponsors exist.

---

## Organization User Accounts

The system supports three user roles:

| Role | Access |
|------|--------|
| **Owner** | Full admin access, can create users and manage all listings |
| **Admin** (`user`) | Full admin access to all listings, uploads, and sponsors |
| **Organization** (`org`) | Can only view and edit listings assigned to them |

### Creating an org user

1. Log in as the owner and go to **Settings** > **Create New User**
2. Enter the org user's email and a temporary password
3. Select **Organization** from the Role dropdown
4. Select one or more listings from the assignment dropdown to link to this user
5. Click Submit -- share the credentials with the org contact

### What org users see

When an org user logs in, they are redirected to `/org/dashboard` which shows only their assigned listings. They see a simplified navbar with just their dashboard, change password, and logout. They can edit all standard listing fields (name, description, contact info, address, photos, etc.) but cannot:

- Access the full admin listing management
- Add or delete listings
- Upload CSV files
- Manage sponsors or other admin features

### Point person fields

Each listing has three internal-only fields for tracking the primary contact:

- **Contact Name** -- the person responsible for this listing
- **Contact Email** -- their email
- **Contact Phone** -- their phone number

These appear on the Add and Edit listing forms in the admin panel under "Point Person (Internal Only)" and are **not** displayed on the public map.

---

## Adding New Organizations (Google Form)

A reference document for building a Google Form intake is available at [`docs/google-form-questions.md`](docs/google-form-questions.md). It contains 35 questions organized into 8 sections:

1. **Point Person / Primary Contact** -- internal contact info (name, title, email, phone)
2. **Organization Information** -- resource name, category, description, service type, age group, faith-based status
3. **Location** -- address, city, building description
4. **Public Contact Information** -- phone, email, website, crisis line
5. **Services & Eligibility** -- age range, eligibility, cost, languages, intake instructions
6. **Social Media** -- Facebook, Instagram, TikTok, YouTube, X, blog
7. **Accessibility** -- ADA notes, transit instructions
8. **Additional Information** -- anything else, opt-in for admin access

### Workflow

1. Organization fills out the Google Form
2. Responses go to a linked Google Sheet
3. Admin reviews the submission
4. Admin creates the listing in the admin panel using the form data
5. If the org requested admin access, admin creates an org user account and assigns the listing to them

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
│   ├── index.html             # HTML entry point
│   └── embed.js               # Embeddable map script (used by third-party sites)
├── src/                       # Frontend React source code
│   ├── components/            # React components
│   │   ├── Map.js             # Main map page (search, cards, map)
│   │   ├── EmbedMap.js        # Embeddable map (no nav, compact UI)
│   │   ├── EmbedCode.js       # Embed code generator page
│   │   ├── Page.js            # Layout wrapper (nav bar)
│   │   ├── About.js           # About page (with hyperlinked partners)
│   │   ├── Resources.js       # External resources page
│   │   └── SuggestUpdate.js   # Feedback/suggestion forms
│   ├── hooks/                 # Custom React hooks
│   │   ├── useSessionStorage.js
│   │   └── usePosition.js     # Geolocation (not yet active)
│   ├── resources/             # Map marker icons
│   ├── siteConfig.json        # Centralized branding, map center, text config
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
│   │   ├── listings.js        # Admin: CSV upload, add/edit/delete, manage
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
│   ├── siteConfig.json        # Backend branding config (admin panel text)
│   ├── server.js              # Express app entry point
│   └── package.json
├── infra/                     # Terraform infrastructure-as-code
│   ├── main.tf                # AWS provider config
│   ├── iam.tf                 # IAM roles (EC2 S3 access for image uploads)
│   ├── variables.tf           # All configurable inputs
│   ├── ec2.tf                 # Backend server instance
│   ├── s3.tf                  # Frontend hosting bucket
│   ├── cloudfront.tf          # CDN distribution
│   ├── network.tf             # Security groups
│   ├── rds.tf                 # Managed PostgreSQL database
│   ├── dns.tf                 # Domain + SSL (optional)
│   ├── outputs.tf             # Deployment info outputs
│   ├── terraform.tfvars.example # Example configuration
│   └── scripts/
│       ├── user-data.sh       # EC2 first-boot setup (connects to RDS)
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

### Site configuration (branding, map center, text)

The files `src/siteConfig.json` (frontend) and `backend/siteConfig.json` (admin panel) centralize all branding and content. You can change the site name, map starting location, about text, logos, and more without editing code.

Key settings in `src/siteConfig.json`:

| Setting | Description | Example |
|---------|-------------|---------|
| `siteName` | Full site name (used in titles, attribution) | `"Wyoming Youth Resource Map"` |
| `siteNameShort` | Short name (nav bar) | `"Wyoming Resource Map"` |
| `organizationName` | Operating organization | `"Casper Youth Hub"` |
| `mapCenter` | Starting lat/lon for the map | `[42.8666, -106.3131]` (Casper, WY) |
| `mapZoom` | Starting zoom level (higher = closer) | `7` |
| `aboutText` | Array of paragraphs for the About page | _(see file)_ |
| `logos` | Logo images shown on the About page | _(see file)_ |

To change the map's starting location (e.g., to center on Cheyenne):

```json
"mapCenter": [41.1400, -104.8202],
"mapZoom": 8
```

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
| `db_password` | PostgreSQL password for the RDS instance |
| `db_instance_class` | RDS instance size (default: `db.t4g.micro`) |
| `admin_email` / `admin_password` | Initial admin login credentials |
| `session_secret` | Express session secret |
| `domain_name` | Your domain (optional, leave empty for CloudFront URL) |

---

## Deploying to AWS

This is a complete, step-by-step guide to go from a fresh AWS account to a running site. Budget about 30 minutes for the first deployment.

### Step 1: Create an AWS account

If you don't already have one:

1. Go to [https://aws.amazon.com](https://aws.amazon.com) and click **Create an AWS Account**
2. Enter your email, choose an account name (e.g., "CYH Mapping")
3. Complete the verification process (phone number, credit card)
4. Select the **Basic Support (Free)** plan
5. Sign in to the [AWS Management Console](https://console.aws.amazon.com)

> **Cost note:** Expect ~$18-25/month (mostly RDS at ~$13/mo + EC2 at ~$4/mo + small CloudFront/S3 costs). During the 12-month free tier period, EC2 and some RDS usage may be covered. You can tear everything down instantly with `make destroy`.

### Step 2: Create an IAM user for deployment

You need an access key so the CLI tools can talk to AWS on your behalf.

1. Go to the [IAM Console](https://console.aws.amazon.com/iam/)
2. In the left sidebar, click **Users**
3. Click **Create user**
4. **User name:** `cyh-deploy`
5. Click **Next**
6. Select **Attach policies directly**
7. Search for and check the box next to **AdministratorAccess**
8. Click **Next**, then **Create user**
9. Click on the user name `cyh-deploy` to open it
10. Click the **Security credentials** tab
11. Scroll to **Access keys** and click **Create access key**
12. Select **Command Line Interface (CLI)**
13. Check the confirmation box at the bottom, click **Next**, then **Create access key**
14. **IMPORTANT:** Copy both values now — you won't see the secret again:
    - **Access key ID** (looks like `AKIAIOSFODNN7EXAMPLE`)
    - **Secret access key** (looks like `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`)

> Keep these safe. Never commit them to Git or share them publicly.

### Step 3: Create an SSH key pair

This lets you SSH into the server for debugging and deployments.

1. Go to the [EC2 Console](https://console.aws.amazon.com/ec2/)
2. **IMPORTANT:** In the top-right corner, make sure your region is set to **US West (Oregon) us-west-2** (or whichever region you plan to use)
3. In the left sidebar, under **Network & Security**, click **Key Pairs**
4. Click **Create key pair**
5. **Name:** `cyh-key`
6. **Key pair type:** RSA
7. **Private key file format:** `.pem`
8. Click **Create key pair**
9. Your browser will download `cyh-key.pem`. Move it to a safe location and set permissions:

```bash
mv ~/Downloads/cyh-key.pem ~/.ssh/cyh-key.pem
chmod 400 ~/.ssh/cyh-key.pem
```

### Step 4: Install command-line tools

On macOS with Homebrew:

```bash
# Install Terraform (infrastructure provisioning) and AWS CLI (AWS commands)
brew install terraform awscli
```

On Linux:

```bash
# AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install

# Terraform
sudo apt-get update && sudo apt-get install -y gnupg software-properties-common
wget -O- https://apt.releases.hashicorp.com/gpg | gpg --dearmor | sudo tee /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt-get install terraform
```

Verify both are installed:

```bash
aws --version       # Should show aws-cli/2.x.x
terraform --version # Should show Terraform v1.5+
```

### Step 5: Configure the AWS CLI

Run the configure command and enter your credentials from Step 2:

```bash
aws configure
```

It will prompt you for four values:

```
AWS Access Key ID [None]: AKIAIOSFODNN7EXAMPLE
AWS Secret Access Key [None]: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
Default region name [None]: us-west-2
Default output format [None]: json
```

Verify it works:

```bash
aws sts get-caller-identity
```

You should see your account ID and user ARN. If you get an error, double-check your access key.

### Step 6: Configure Terraform variables

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
```

Open `terraform.tfvars` in your editor and fill in your values:

```hcl
aws_region       = "us-west-2"           # Must match the region from Step 3
project_name     = "cyh-mapping"
instance_type    = "t4g.micro"
ssh_key_name     = "cyh-key"             # Name from Step 3 (without .pem)
db_password      = "YourStrongPassword"  # Pick a strong password
admin_email      = "you@example.com"     # Your admin login email
admin_password   = "YourAdminPassword"   # Your admin login password
session_secret   = "paste-a-random-string-here"
google_api_key   = ""                    # Optional, for geocoding
domain_name      = ""                    # Leave empty to use CloudFront URL
```

To generate a random session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 7: Provision the infrastructure

From the project root:

```bash
make infra
```

This runs `terraform init` and `terraform apply`. Terraform will show you a plan of everything it will create and ask for confirmation:

```
Plan: 8 to add, 0 to change, 0 to destroy.

Do you want to perform these actions?
  Enter a value: yes
```

Type `yes` and press Enter. This takes 2-5 minutes to create:
- RDS PostgreSQL instance (managed database)
- EC2 instance (backend server)
- S3 bucket (frontend hosting)
- CloudFront distribution (CDN)
- Security groups, Elastic IP
- (If domain_name is set: Route 53 zone, ACM certificate)

When it finishes, it prints your URLs:

```
Outputs:

cloudfront_url = "https://d1234567890.cloudfront.net"
ec2_ip = "54.xxx.xxx.xxx"
ec2_ssh = "ssh ec2-user@54.xxx.xxx.xxx"
site_url = "https://d1234567890.cloudfront.net"
backend_url = "http://54.xxx.xxx.xxx"
```

### Step 8: Wait for server bootstrap

The EC2 instance needs 3-5 minutes after creation to finish installing Node.js, PostgreSQL, nginx, and the backend app. You can monitor progress:

```bash
# SSH into the server (use your key file)
ssh -i ~/.ssh/cyh-key.pem ec2-user@$(cd infra && terraform output -raw ec2_ip)

# Watch the bootstrap log
sudo tail -f /var/log/user-data.log

# You'll see "CYH Mapping: EC2 bootstrap complete" when it's done
# Press Ctrl+C to stop tailing, then type 'exit' to disconnect
```

### Step 9: Deploy the application

Once the server has finished bootstrapping:

```bash
make deploy
```

This builds the React frontend, uploads it to S3, invalidates the CloudFront cache, syncs the backend code to EC2, and restarts the server.

### Step 10: Verify everything works

```bash
# Show all URLs and IPs
make status
```

Check each piece:

1. **Frontend:** Open the `site_url` in your browser — you should see the map (empty, since there's no data yet)
2. **Backend admin:** Open the `backend_url` in your browser — you should see the login page
3. **Log in** with the `admin_email` and `admin_password` from your terraform.tfvars
4. **Upload a test CSV** through the admin panel to populate the map

### Troubleshooting

**"Connection refused" on backend URL:**
The server may still be bootstrapping. Wait a few minutes and try again, or check the bootstrap log:

```bash
make ssh
sudo cat /var/log/user-data.log
```

**"Permission denied" on SSH:**
Make sure you're using the right key file:

```bash
ssh -i ~/.ssh/cyh-key.pem ec2-user@$(cd infra && terraform output -raw ec2_ip)
```

**Frontend shows blank page:**
The API may be unreachable. Check that the backend is running:

```bash
make ssh
pm2 status    # Should show the app as "online"
pm2 logs      # Check for errors
```

**Terraform errors:**
```bash
cd infra
terraform plan    # Shows what Terraform wants to do without applying
terraform apply   # Re-run to retry
```

**Start over completely:**
```bash
make destroy      # Tears down ALL AWS resources
make infra        # Re-provisions everything fresh
make deploy       # Re-deploys the code
```

### Setting up a custom domain (optional)

If you want to use a custom domain (e.g., `map.casperyouthhub.org`):

1. Set `domain_name` in your `terraform.tfvars`:
   ```hcl
   domain_name = "map.casperyouthhub.org"
   ```
2. Run `make infra` — Terraform will create a Route 53 hosted zone and an ACM certificate
3. Run `make status` to see the `route53_nameservers` output (4 nameservers)
4. Go to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)

**If using a subdomain** (like `map.casperyouthhub.org`):
- Add 4 **NS records** for the subdomain, pointing to the Route 53 nameservers:

  | Type | Name | Value |
  |------|------|-------|
  | NS | `map` | `ns-XXXX.awsdns-XX.org` |
  | NS | `map` | `ns-XXXX.awsdns-XX.co.uk` |
  | NS | `map` | `ns-XX.awsdns-XX.com` |
  | NS | `map` | `ns-XXX.awsdns-XX.net` |

**If using a root domain** (like `casperyouthhub.org`):
- Update the domain's nameservers at your registrar to all 4 Route 53 nameservers

5. Wait for DNS propagation (usually 15-30 minutes, up to 48 hours)
6. The ACM certificate will auto-validate once DNS resolves
7. Your site will then be accessible at `https://yourdomain.com`

### Setting up GitHub secrets for CI/CD (optional)

If you want GitHub Actions (or another collaborator) to deploy without sharing your local AWS credentials, store them as GitHub repository secrets.

1. Go to your GitHub repository (e.g., `https://github.com/cajun1689/cyh-mapping`)
2. Click **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret** and add each of the following:

| Secret name | Value | Where to find it |
|-------------|-------|-------------------|
| `AWS_ACCESS_KEY_ID` | Your IAM access key ID | From [Step 2](#step-2-create-an-iam-user-for-deployment) |
| `AWS_SECRET_ACCESS_KEY` | Your IAM secret access key | From [Step 2](#step-2-create-an-iam-user-for-deployment) |
| `AWS_REGION` | `us-west-2` (or your chosen region) | Same region used in terraform.tfvars |
| `SSH_PRIVATE_KEY` | Contents of your `~/.ssh/cyh-key.pem` file | From [Step 3](#step-3-create-an-ssh-key-pair) |

To copy your SSH key into the clipboard (macOS):

```bash
pbcopy < ~/.ssh/cyh-key.pem
```

> **Security note:** Repository secrets are encrypted and only exposed to GitHub Actions workflows. They are not visible to collaborators, forks, or in logs. However, anyone with admin access to the repository can overwrite them. Consider creating a dedicated IAM user with limited permissions for CI/CD instead of reusing your admin credentials.

These secrets can then be referenced in a GitHub Actions workflow (`.github/workflows/deploy.yml`) to automate deployments on push to `main`.

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

AWS RDS automatically creates daily snapshots with **7-day retention**. Backups run during the configured window (03:00-04:00 UTC) with no downtime.

**View backups in the AWS Console:**
1. Go to [RDS Console](https://console.aws.amazon.com/rds/) > **Databases** > `cyh-mapping-db`
2. Click the **Maintenance & backups** tab to see automated snapshots

**Restore from a snapshot** (creates a new RDS instance):
```bash
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier cyh-mapping-db-restored \
  --db-snapshot-identifier <snapshot-id>
```

**Manual backup via pg_dump** (from EC2):
```bash
make ssh
PGPASSWORD='your-db-password' pg_dump -U cyh_app \
  -h $(cd infra && terraform output -raw rds_endpoint | cut -d: -f1) \
  cyh_mapping | gzip > ~/manual-backup-$(date +%Y%m%d).sql.gz
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
| `keywords` | text | No | Comma-separated tags (e.g., `LGBTQ+,Housing,Faith-Based`) |
| `age_group` | text | No | `Youth`, `Adult`, or `Youth and Adult` (default) |
| `image_url` | text | No | URL of a building photo (uploaded via admin panel) |
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
| Change site name, map center, branding | `src/siteConfig.json` |
| Change admin panel branding | `backend/siteConfig.json` |
| Change site text, disclaimer, or form links | `src/constants.js` |
| Change the nav bar | `src/components/Page.js` |
| Change the about page | `src/components/About.js` |
| Change map behavior or card layout | `src/components/Map.js` |
| Change the embeddable map | `src/components/EmbedMap.js` |
| Change the embed script | `public/embed.js` |
| Change listing categories or icons | `backend/apiData/categories.json` |
| Change CSV validation rules | `backend/db/listings.schema.json` |
| Change the admin panel UI | `backend/views/` |
| Change sponsor management | `backend/routes/sponsors.js`, `backend/views/sponsors/` |
| Change org user dashboard/edit | `backend/routes/org.js`, `backend/views/org/` |
| Change user roles or route protection | `backend/middleware/routeProtection.js` |
| Change user creation logic | `backend/utils/authUtils.js` |
| Update the Google Form reference | `docs/google-form-questions.md` |
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
