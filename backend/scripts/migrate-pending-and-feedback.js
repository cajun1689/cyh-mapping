/**
 * Migration: Add pending_submissions and feedback_responses tables
 * Run: node backend/scripts/migrate-pending-and-feedback.js
 */

const db = require('../db')

async function run() {
  const client = await db.pool.connect()
  try {
    console.log('Adding pending_submissions and feedback_responses tables...')

    await client.query(`
      CREATE TABLE IF NOT EXISTS pending_submissions (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        status VARCHAR(20) DEFAULT 'pending',
        submitted_by_email TEXT,
        full_name TEXT,
        parent_organization TEXT,
        category TEXT,
        description TEXT,
        contact_name TEXT,
        contact_email TEXT,
        contact_phone TEXT,
        phone_1 TEXT,
        crisis_line_number TEXT,
        website TEXT,
        program_email TEXT,
        full_address TEXT,
        city TEXT,
        service_type TEXT,
        age_group TEXT,
        keywords TEXT,
        service_delivery TEXT,
        min_age INTEGER,
        max_age INTEGER,
        eligibility_requirements TEXT,
        financial_information TEXT,
        intake_instructions TEXT,
        languages_offered TEXT,
        internal_directions TEXT,
        image_url TEXT,
        office_entrance_image_url TEXT,
        faith_based BOOLEAN DEFAULT false,
        raw_payload JSONB
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS feedback_responses (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        intent VARCHAR(64),
        listing_ref TEXT,
        message TEXT,
        bug_details TEXT,
        resource_name_url TEXT,
        resource_additional TEXT,
        raw_payload JSONB
      )
    `)

    console.log('Migration complete.')
  } finally {
    client.release()
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
