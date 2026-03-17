#!/usr/bin/env node
/**
 * Add contact_name, contact_email, contact_phone, office_entrance_image_url, internal_directions
 * to listings table if missing. Run on EC2: node scripts/run-migration-add-point-person.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })

const fs = require('fs')
const path = require('path')
const { pool } = require('../db')

const MIGRATION = path.join(__dirname, '../migrations/add-point-person-and-office-fields.sql')

async function main() {
  const sql = fs.readFileSync(MIGRATION, 'utf8')
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'))

  for (const stmt of statements) {
    if (!stmt) continue
    try {
      await pool.query(stmt + ';')
      const match = stmt.match(/ADD COLUMN IF NOT EXISTS (\w+)/)
      console.log(`Added column: ${match ? match[1] : 'unknown'}`)
    } catch (err) {
      console.warn('Statement failed:', err.message)
    }
  }
  console.log('Migration complete.')
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
