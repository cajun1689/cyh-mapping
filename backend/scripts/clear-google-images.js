#!/usr/bin/env node
/**
 * Clear all Google-sourced images (Places, Street View) from listings.
 * Keeps only manually uploaded photos (S3).
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })

const { pool } = require('../db')

const isGoogle = (url) => url && String(url).includes('maps.googleapis.com')

async function main () {
  const client = await pool.connect()
  try {
    // Clear image_url where it's from Google
    const r1 = await client.query(
      `UPDATE listings SET image_url = NULL WHERE image_url LIKE '%maps.googleapis.com%'`
    )
    console.log(`Cleared image_url from ${r1.rowCount} listings`)

    // Filter photo_urls to remove Google URLs (keep manual uploads only)
    const rows = await client.query(
      `SELECT guid, photo_urls FROM listings WHERE photo_urls IS NOT NULL AND photo_urls::text LIKE '%maps.googleapis.com%'`
    )
    let updated = 0
    for (const row of rows.rows) {
      const urls = Array.isArray(row.photo_urls) ? row.photo_urls : []
      const kept = urls.filter(u => !isGoogle(u))
      await client.query(
        'UPDATE listings SET photo_urls = $1 WHERE guid = $2',
        [kept.length > 0 ? kept : null, row.guid]
      )
      updated++
    }
    console.log(`Filtered photo_urls for ${updated} listings`)
  } finally {
    client.release()
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
