#!/usr/bin/env node
/**
 * Seed default sponsors (Casper Youth Hub, Unicorn Solutions) with bundled logos.
 * Logos live in public/sponsor-logos/ and are deployed with every frontend build.
 * Run once after DB setup, or to restore default sponsors.
 *
 * Usage: node scripts/seed-sponsors.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })

const { pool } = require('../db')

const DEFAULT_SPONSORS = [
  { name: 'Casper Youth Hub', logo_url: '/sponsor-logos/casper-youth-hub.svg', website_url: 'https://www.casperyouthhub.org', display_order: 1 },
  { name: 'Unicorn Solutions', logo_url: '/sponsor-logos/unicorn-solutions.svg', website_url: 'https://www.unicornsolutions.org', display_order: 2 },
]

async function main () {
  const client = await pool.connect()
  try {
    for (const s of DEFAULT_SPONSORS) {
      const existing = await client.query('SELECT id FROM sponsors WHERE name = $1', [s.name])
      if (existing.rows.length > 0) {
        await client.query(
          'UPDATE sponsors SET logo_url = $2, website_url = $3, display_order = $4 WHERE name = $1',
          [s.name, s.logo_url, s.website_url, s.display_order]
        )
        console.log(`Updated sponsor: ${s.name}`)
      } else {
        await client.query(
          'INSERT INTO sponsors (name, logo_url, website_url, display_order) VALUES ($1, $2, $3, $4)',
          [s.name, s.logo_url, s.website_url, s.display_order]
        )
        console.log(`Seeded sponsor: ${s.name}`)
      }
    }
  } catch (err) {
    if (err.code === '42P01') {
      console.log('Sponsors table does not exist yet. Run after DB setup.')
      return
    }
    throw err
  } finally {
    client.release()
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
