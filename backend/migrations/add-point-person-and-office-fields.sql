-- Add Point Person (internal contact) and office entrance fields
-- These may be missing if DB was created from older schema or CSV import

ALTER TABLE listings ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS office_entrance_image_url TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS internal_directions TEXT;
