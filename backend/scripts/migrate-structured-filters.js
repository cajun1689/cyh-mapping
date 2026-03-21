#!/usr/bin/env node
/**
 * Migration: Add service_delivery, insurance_keywords, parental_consent_required columns
 * and populate from existing keywords.
 *
 * Run once on production after deploying the schema changes.
 * Usage: node scripts/migrate-structured-filters.js
 *
 * Or via Makefile: make migrate-structured-filters
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })

const { pool } = require('../db')
const { addServiceDelivery, addInsuranceKeywords, addParentalConsent } = require('../utils/listingUtils')

async function main() {
  const client = await pool.connect()

  try {
    // 1. Add columns if they don't exist
    await client.query(`
      ALTER TABLE listings ADD COLUMN IF NOT EXISTS service_delivery TEXT;
      ALTER TABLE listings ADD COLUMN IF NOT EXISTS insurance_keywords TEXT;
      ALTER TABLE listings ADD COLUMN IF NOT EXISTS parental_consent_required BOOLEAN;
    `)
    console.log('Added columns (if not present)')

    // 2. Fetch all listings
    const res = await client.query('SELECT guid, keywords, description FROM listings')
    const listings = res.rows
    console.log(`Processing ${listings.length} listings`)

    let updated = 0
    for (const row of listings) {
      const listing = {
        keywords: row.keywords,
        description: row.description,
      }
      addServiceDelivery(listing)
      addInsuranceKeywords(listing)
      addParentalConsent(listing)

      // Store as JSON array (API ensureArray parses JSON)
      const serviceDeliveryVal = listing.service_delivery?.length
        ? JSON.stringify(listing.service_delivery)
        : null
      const insuranceVal = listing.insurance_keywords?.length
        ? JSON.stringify(listing.insurance_keywords)
        : null
      const parentalVal = listing.parental_consent_required

      await client.query(
        `UPDATE listings SET service_delivery = $1, insurance_keywords = $2, parental_consent_required = $3 WHERE guid = $4`,
        [serviceDeliveryVal, insuranceVal, parentalVal, row.guid]
      )
      updated++
    }

    console.log(`Updated ${updated} listings`)
    console.log('Migration complete.')
  } finally {
    client.release()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
