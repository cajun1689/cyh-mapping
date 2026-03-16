#!/usr/bin/env node
/**
 * Clear image_url and photo_urls for specific listings (bad/placeholder photos).
 * Usage: node scripts/clear-listing-images.js <guid1> [guid2] ...
 * Example: node scripts/clear-listing-images.js 59 137
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })

const { pool } = require('../db')

async function main () {
  const guids = process.argv.slice(2).map(g => parseInt(g, 10)).filter(g => !isNaN(g))
  if (guids.length === 0) {
    console.error('Usage: node scripts/clear-listing-images.js <guid1> [guid2] ...')
    process.exit(1)
  }

  const client = await pool.connect()
  try {
    for (const guid of guids) {
      const res = await client.query(
        'UPDATE listings SET image_url = NULL, photo_urls = NULL WHERE guid = $1 RETURNING full_name',
        [guid]
      )
      if (res.rowCount > 0) {
        console.log(`Cleared images for guid ${guid}: ${res.rows[0].full_name}`)
      } else {
        console.log(`No listing found for guid ${guid}`)
      }
    }
  } finally {
    client.release()
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
