/* This file has been manually created, and is for reference only */
/* To create or manipulate Postgres tables, checkout PG Admin or PSQL as ways to get started */
/* Heroku also has a CLI for interacting with Postgres. The command you need is in .env */

/* Contains data related to the production data set */
CREATE TABLE IF NOT EXISTS staging_meta (
  test_field character varying(256)
);

INSERT INTO staging_meta (test_field) VALUES ('test');

CREATE TABLE IF NOT EXISTS staging_user (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255),
  refresh_token VARCHAR(255),
  require_password_reset BOOLEAN DEFAULT false
);

-- For reference 
CREATE TABLE geocoding AS
SELECT listings.guid, listings.full_address, listings.latitude, listings.longitude
FROM listings 
WHERE (full_address <> '') AND (latitude <> '') AND (longitude <> '');

-- listing archive to save previous site data 
CREATE TABLE listing_archive (
	date TIMESTAMPTZ NOT NULL DEFAULT NOW() PRIMARY KEY,
	data JSON,
	notes JSON
);

CREATE TABLE IF NOT EXISTS resource_preview (
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  link TEXT NOT NULL
);

CREATE TABLE resource AS SELECT * FROM resource_preview;

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

-- run manually first time 
CREATE TABLE listing (
  id SERIAL PRIMARY KEY,
  date TIMESTAMPTZ DEFAULT NOW(),
  email VARCHAR(180), 
  preview_listing JSONB,
  listing JSONB
);