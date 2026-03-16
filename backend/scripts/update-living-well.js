#!/usr/bin/env node
/**
 * Update Living Well Counseling (guid 31): services, remove free, add searchable terms for chat.
 * Usage: node scripts/update-living-well.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })

const { pool } = require('../db')

const LIVING_WELL_GUID = 31

const SERVICES = [
  'Individual',
  'Family',
  'Couples',
  'Depression',
  'Anxiety / Panic',
  'Life Transitions',
  'Sexual Orientation',
  'Relationship Counseling',
  'Addiction',
  'Trauma / Abuse',
  'Communication',
]

async function main () {
  const client = await pool.connect()
  try {
    const res = await client.query(
      `UPDATE listings SET
        services_provided = $1,
        cost_keywords = $2,
        financial_information = $3,
        keywords = $4
       WHERE guid = $5
       RETURNING full_name, services_provided, cost_keywords, keywords`,
      [
        SERVICES,
        [], // remove Free
        'Fee-based. Private pay and insurance accepted.',
        ['In-Person', ...SERVICES],
        LIVING_WELL_GUID,
      ]
    )
    if (res.rowCount > 0) {
      console.log(`Updated Living Well Counseling (guid ${LIVING_WELL_GUID}):`)
      console.log('  services_provided:', res.rows[0].services_provided?.length, 'items')
      console.log('  cost_keywords: (removed Free)')
      console.log('  financial_information: Fee-based')
      console.log('  keywords: In-Person + services for chat search')
    } else {
      console.log(`No listing found for guid ${LIVING_WELL_GUID}`)
    }
  } finally {
    client.release()
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
