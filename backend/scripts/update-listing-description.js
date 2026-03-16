#!/usr/bin/env node
/**
 * Update description for a specific listing.
 * Usage: node scripts/update-listing-description.js <guid> "<new description>"
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })

const { pool } = require('../db')

async function main () {
  const guid = parseInt(process.argv[2], 10)
  const description = process.argv.slice(3).join(' ').trim()
  if (!guid || isNaN(guid) || !description) {
    console.error('Usage: node scripts/update-listing-description.js <guid> "<description>"')
    process.exit(1)
  }

  const client = await pool.connect()
  try {
    const res = await client.query(
      'UPDATE listings SET description = $1 WHERE guid = $2 RETURNING full_name',
      [description, guid]
    )
    if (res.rowCount > 0) {
      console.log(`Updated description for guid ${guid}: ${res.rows[0].full_name}`)
    } else {
      console.log(`No listing found for guid ${guid}`)
    }
  } finally {
    client.release()
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
