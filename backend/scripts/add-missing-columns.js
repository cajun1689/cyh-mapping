#!/usr/bin/env node
/**
 * Add missing columns to listings table (e.g. after CSV upload recreates it).
 * Usage: node scripts/add-missing-columns.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })

const { pool } = require('../db')

const COLUMNS = [
  ['age_group', 'TEXT DEFAULT \'Youth and Adult\''],
  ['managed_by', 'INTEGER'],
]

async function main () {
  for (const [col, def] of COLUMNS) {
    try {
      await pool.query(`ALTER TABLE listings ADD COLUMN IF NOT EXISTS ${col} ${def}`)
      console.log(`Added column listings.${col}`)
    } catch (err) {
      console.warn(`Column ${col}:`, err.message)
    }
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
