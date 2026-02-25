#!/bin/bash
set -euo pipefail
exec > /var/log/user-data.log 2>&1

echo "=== CYH Mapping: EC2 bootstrap starting ==="

# -------------------------------------------------------------------
# Template variables injected by Terraform
# -------------------------------------------------------------------
DB_HOST="${db_host}"
DB_PORT="${db_port}"
DB_NAME="${db_name}"
DB_PASSWORD="${db_password}"
ADMIN_EMAIL="${admin_email}"
ADMIN_PASSWORD="${admin_password}"
SESSION_SECRET="${session_secret}"
GOOGLE_API_KEY="${google_api_key}"
GITHUB_REPO_URL="${github_repo_url}"
PROJECT_NAME="${project_name}"
BACKEND_PORT="${backend_port}"
DOMAIN_NAME="${domain_name}"

REPO_DIR="/home/ec2-user/repo"
APP_DIR="/home/ec2-user/app"
DATABASE_URL="postgresql://cyh_app:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"

# -------------------------------------------------------------------
# 1. System packages
# -------------------------------------------------------------------
dnf update -y
dnf install -y gcc-c++ make git nginx postgresql15

# -------------------------------------------------------------------
# 2. Node.js 20 LTS
# -------------------------------------------------------------------
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs
npm install -g pm2

# -------------------------------------------------------------------
# 3. Wait for RDS to accept connections
# -------------------------------------------------------------------
echo "Waiting for RDS at $DB_HOST:$DB_PORT..."
for i in $(seq 1 30); do
  if PGPASSWORD="$DB_PASSWORD" psql -U cyh_app -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
    echo "RDS is ready."
    break
  fi
  echo "Attempt $i/30 — RDS not ready yet, waiting 10s..."
  sleep 10
done

# -------------------------------------------------------------------
# 4. Clone repo and install backend dependencies
# -------------------------------------------------------------------
sudo -u ec2-user git clone "$GITHUB_REPO_URL" "$REPO_DIR"
cp -r "$REPO_DIR/backend" "$APP_DIR"
chown -R ec2-user:ec2-user "$APP_DIR"
cd "$APP_DIR"
sudo -u ec2-user npm install --production

# -------------------------------------------------------------------
# 5. Set up database tables and seed admin user
# -------------------------------------------------------------------
PGPASSWORD="$DB_PASSWORD" psql -U cyh_app -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" <<'EOSQL'
CREATE TABLE IF NOT EXISTS staging_meta (
  test_field character varying(256)
);
INSERT INTO staging_meta (test_field) VALUES ('test') ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS staging_user (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255),
  refresh_token VARCHAR(255),
  role VARCHAR(255) DEFAULT 'user',
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
  longitude NUMERIC,
  image_url TEXT,
  age_group TEXT DEFAULT 'Youth and Adult',
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  managed_by INTEGER
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

CREATE TABLE IF NOT EXISTS sponsors (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT NOT NULL,
  website_url TEXT,
  display_order INT DEFAULT 0
);
EOSQL

# Seed admin user (bcrypt hash via Node)
HASHED_PW=$(node -e "const bcrypt = require('bcrypt'); bcrypt.hash('$ADMIN_PASSWORD', 10).then(h => process.stdout.write(h));")
PGPASSWORD="$DB_PASSWORD" psql -U cyh_app -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" \
  -c "INSERT INTO staging_user (email, password, require_password_reset) VALUES ('$ADMIN_EMAIL', '$HASHED_PW', false) ON CONFLICT (email) DO NOTHING;"

PGPASSWORD="$DB_PASSWORD" psql -U cyh_app -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" \
  -c "INSERT INTO meta (email, file_name, listing_count) VALUES ('$ADMIN_EMAIL', 'initial-setup', 0) ON CONFLICT DO NOTHING;"

# -------------------------------------------------------------------
# 6. Write backend .env file
# -------------------------------------------------------------------
cat > "$APP_DIR/.env" <<EOF
DATABASE_URL=$DATABASE_URL
SESSION_SECRET=$SESSION_SECRET
GOOGLE_API_KEY=$GOOGLE_API_KEY
OWNER_EMAIL=$ADMIN_EMAIL
FRONTEND_URL=*
BACKEND_URL=http://localhost:$BACKEND_PORT
PORT=$BACKEND_PORT
NODE_ENV=production
EOF

chown ec2-user:ec2-user "$APP_DIR/.env"

# -------------------------------------------------------------------
# 7. Configure nginx reverse proxy
# -------------------------------------------------------------------
cat > /etc/nginx/conf.d/cyh-backend.conf <<EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        client_max_body_size 10M;
    }
}
EOF

rm -f /etc/nginx/conf.d/default.conf
systemctl enable nginx
systemctl restart nginx

# -------------------------------------------------------------------
# 8. Start backend with PM2
# -------------------------------------------------------------------
cd "$APP_DIR"
sudo -u ec2-user pm2 start server.js --name "$PROJECT_NAME-backend"
sudo -u ec2-user pm2 save
env PATH=$PATH:/usr/bin pm2 startup systemd -u ec2-user --hp /home/ec2-user

echo "=== CYH Mapping: EC2 bootstrap complete ==="
