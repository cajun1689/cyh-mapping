#!/bin/bash
# -------------------------------------------------------------------
# setup-db.sh
#
# Standalone script to initialize or reset the CYH Mapping database.
# Can be run on the EC2 instance after deployment, or locally for dev.
#
# Usage:
#   ./setup-db.sh                         # uses defaults from .env
#   DB_NAME=mydb DB_PASSWORD=pw ./setup-db.sh  # override via env vars
# -------------------------------------------------------------------
set -euo pipefail

# Load .env if present (for running alongside the backend)
if [ -f "$(dirname "$0")/../.env" ]; then
  set -a
  source "$(dirname "$0")/../.env"
  set +a
fi

# Defaults (override via environment variables)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-cyh_mapping}"
DB_USER="${DB_USER:-cyh_app}"
DB_PASSWORD="${DB_PASSWORD:?DB_PASSWORD must be set}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@localhost}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-changeme}"

export PGPASSWORD="$DB_PASSWORD"
PSQL="psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME"

echo "=== Setting up database: $DB_NAME ==="

# -------------------------------------------------------------------
# Create tables
# -------------------------------------------------------------------
$PSQL <<'EOSQL'
CREATE TABLE IF NOT EXISTS staging_meta (
  test_field character varying(256)
);
INSERT INTO staging_meta (test_field) VALUES ('test') ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS staging_user (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255),
  refresh_token VARCHAR(255),
  require_password_reset BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS listings (
  guid INTEGER,
  full_name TEXT,
  parent_organization TEXT,
  category TEXT NOT NULL,
  description TEXT,
  eligibility_requirements TEXT,
  min_age INTEGER,
  max_age INTEGER,
  services_provided TEXT,
  keywords TEXT,
  website TEXT,
  program_email TEXT,
  full_address TEXT,
  intake_instructions TEXT,
  text_message_instructions TEXT,
  phone_label_1 TEXT,
  phone_1 TEXT,
  phone_1_ext TEXT,
  phone_label_2 TEXT,
  phone_2 TEXT,
  phone_2_ext TEXT,
  crisis_line_label TEXT,
  crisis_line_number TEXT,
  financial_information TEXT,
  languages_offered TEXT,
  building_description TEXT,
  ada_accessibility_notes TEXT,
  transit_instructions TEXT,
  blog_link TEXT,
  twitter_link TEXT,
  facebook_link TEXT,
  youtube_link TEXT,
  instagram_link TEXT,
  tiktok_link TEXT,
  covid_message TEXT,
  city TEXT,
  cost_keywords TEXT,
  agency_verified TEXT,
  date_agency_verified TEXT,
  latitude NUMERIC,
  longitude NUMERIC
);

CREATE TABLE IF NOT EXISTS listing_backup (
  date TIMESTAMPTZ NOT NULL DEFAULT NOW() PRIMARY KEY,
  data JSON,
  notes JSON
);

CREATE TABLE IF NOT EXISTS resource (
  id SERIAL PRIMARY KEY,
  date TIMESTAMPTZ DEFAULT NOW(),
  email VARCHAR(180),
  resource_preview JSONB,
  resource JSONB
);

CREATE TABLE IF NOT EXISTS site_meta (
  id SERIAL PRIMARY KEY,
  date TIMESTAMPTZ DEFAULT NOW(),
  email VARCHAR(180),
  resource_preview JSONB,
  resource JSONB,
  listing_meta_preview JSONB,
  listing_meta JSONB,
  categories_preview JSONB,
  categories JSONB,
  site_text_preview JSONB,
  site_text JSONB
);

CREATE TABLE IF NOT EXISTS listing (
  id SERIAL PRIMARY KEY,
  date TIMESTAMPTZ DEFAULT NOW(),
  email VARCHAR(180),
  preview_listing JSONB,
  listing JSONB
);

CREATE TABLE IF NOT EXISTS meta (
  date TIMESTAMPTZ NOT NULL DEFAULT NOW() PRIMARY KEY,
  email VARCHAR(128) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  listing_count INTEGER
);
EOSQL

echo "=== Tables created ==="

# -------------------------------------------------------------------
# Seed admin user
# -------------------------------------------------------------------
# Requires Node.js (for bcrypt hashing, matching the backend's approach)
if command -v node &> /dev/null; then
  HASHED_PW=$(node -e "
    const bcrypt = require('bcrypt');
    bcrypt.hash('$ADMIN_PASSWORD', 10).then(h => process.stdout.write(h));
  ")
  $PSQL -c "INSERT INTO staging_user (email, password, require_password_reset)
    VALUES ('$ADMIN_EMAIL', '$HASHED_PW', false)
    ON CONFLICT (email) DO UPDATE SET password = '$HASHED_PW';"
  echo "=== Admin user seeded: $ADMIN_EMAIL ==="
else
  echo "WARNING: Node.js not found. Skipping admin user seed."
  echo "Run this script again after installing Node.js, or create the user manually."
fi

# Seed initial meta entry so the admin home page doesn't crash
$PSQL -c "INSERT INTO meta (email, file_name, listing_count)
  VALUES ('$ADMIN_EMAIL', 'initial-setup', 0)
  ON CONFLICT DO NOTHING;"

echo "=== Database setup complete ==="
