#!/usr/bin/env node
/**
 * CLI script to upload a listings CSV directly to the database.
 * Runs on EC2 (or anywhere with DATABASE_URL) — bypasses the web admin panel.
 *
 * Usage: node scripts/upload-csv.js <path-to-csv>
 *   e.g. node scripts/upload-csv.js ~/cyh-resources-enriched.csv
 *
 * Or via Makefile: make upload-csv
 *   (SCPs the enriched CSV to EC2 and runs this script)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })

const fs = require('fs')
const path = require('path')
const stripBOM = require('strip-bom')
const { parse } = require('papaparse')
const { validate } = require('jsonschema')
const { pool } = require('../db')
const listingsSchema = require('../db/listings.schema.json')
const bareBonesListingsSchema = require('../db/listings.basic.schema.json')
const { PAPA_PARSE } = require('../utils/constants')
const wyoming = require('../utils/stateBoundaries.json').Wyoming
const {
  DROP_TABLE_PREVIEW_LISTINGS,
  CREATE_TABLE_PREVIEW_LISTINGS,
  INSERT_INTO_PREVIEW_LISTINGS,
  promotePreviewListingsToProd,
  createBackupListingTable,
  createMetaEntry,
  addStructuredFilters,
  getInsertValues,
} = require('../utils/listingUtils')
const { recreateGeocodingTable } = require('../utils/geocodingUtils')

const isInState = (lat, long) =>
  lat >= wyoming.min_lat &&
  lat <= wyoming.max_lat &&
  long >= wyoming.min_long &&
  long <= wyoming.max_long

async function main() {
  const csvPath = process.argv[2]
  if (!csvPath) {
    console.error('Usage: node scripts/upload-csv.js <path-to-csv>')
    process.exit(1)
  }

  const resolvedPath = path.resolve(csvPath)
  if (!fs.existsSync(resolvedPath)) {
    console.error(`File not found: ${resolvedPath}`)
    process.exit(1)
  }

  const filename = path.basename(resolvedPath)
  const email = process.env.UPLOAD_EMAIL || 'cli-upload'

  console.log(`Reading ${resolvedPath}...`)
  const csvContent = fs.readFileSync(resolvedPath, 'utf8')
  const listings = parse(stripBOM(csvContent), PAPA_PARSE).data

  if (!listings || listings.length === 0) {
    console.error('No listings found in CSV')
    process.exit(1)
  }

  console.log(`Parsed ${listings.length} listings`)

  // Validate (use bare bones if UPLOAD_SKIP_STRICT=1)
  try {
    if (process.env.UPLOAD_SKIP_STRICT === '1') {
      validate(listings, bareBonesListingsSchema, { throwAll: true })
    } else {
      validate(listings, listingsSchema, { throwAll: true })
    }
    console.log('Validation passed')
  } catch (err) {
    if (err.name === 'Validation Error') {
      const filtered = (err.errors || []).filter(
        (e) => !e.property?.includes('latitude') && !e.property?.includes('longitude')
      )
      if (filtered.length > 0) {
        console.error('Validation errors:', JSON.stringify(filtered, null, 2))
        process.exit(1)
      }
    } else {
      throw err
    }
  }

  const client = await pool.connect()

  try {
    // 1. Drop and recreate preview_listings
    await client.query(DROP_TABLE_PREVIEW_LISTINGS)
    await client.query(CREATE_TABLE_PREVIEW_LISTINGS)
    console.log('Created preview_listings table')

    // 2. Insert each listing
    for (let i = 0; i < listings.length; i++) {
      const listing = listings[i]
      if (listing.latitude && listing.longitude) {
        if (!isInState(parseFloat(listing.latitude), parseFloat(listing.longitude))) {
          continue // Skip out-of-state (matches web upload behavior)
        }
      }
      addStructuredFilters(listing)
      await client.query(INSERT_INTO_PREVIEW_LISTINGS, getInsertValues(listing))
    }
    console.log(`Inserted ${listings.length} rows into preview_listings`)

    // 3. Backup current prod, promote preview to prod
    await createBackupListingTable()
    const success = await promotePreviewListingsToProd(pool)
    if (!success) {
      throw new Error('Failed to promote preview_listings to prod')
    }
    console.log('Promoted to production listings')

    // 4. Recreate geocoding table
    await recreateGeocodingTable()
    console.log('Recreated geocoding table')

    // 5. Audit log
    await createMetaEntry(email, filename)
    console.log('Created meta entry')
  } finally {
    client.release()
  }

  console.log('Done. Listings are live at https://casperyouthhubmap.org')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
