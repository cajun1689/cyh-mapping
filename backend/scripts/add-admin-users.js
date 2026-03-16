#!/usr/bin/env node
/**
 * Create admin (owner) accounts for seth@casperyouthhub.org and elliottunicornsolutions@gmail.com.
 * Both get full system access (owner role).
 *
 * Usage: node scripts/add-admin-users.js [temp-password]
 *   If no password given, uses ADD_ADMIN_PASSWORD env var, or generates one.
 *
 * Or: make add-admin-users ADD_ADMIN_PASSWORD="YourTempPassword"
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })

const { pool } = require('../db')
const bcrypt = require('bcrypt')
const crypto = require('crypto')

const ADMINS = [
  'seth@casperyouthhub.org',
  'elliottunicornsolutions@gmail.com',
]

async function main () {
  const tempPassword = process.argv[2] || process.env.ADD_ADMIN_PASSWORD || crypto.randomBytes(8).toString('hex')

  const client = await pool.connect()
  try {
    for (const email of ADMINS) {
      const existing = await client.query('SELECT id, role FROM staging_user WHERE email = $1', [email])
      const hashed = await bcrypt.hash(tempPassword, 10)

      if (existing.rows.length > 0) {
        await client.query(
          'UPDATE staging_user SET password = $1, role = $2, require_password_reset = true WHERE email = $3',
          [hashed, 'owner', email]
        )
        console.log(`Updated ${email} → owner (password reset)`)
      } else {
        await client.query(
          'INSERT INTO staging_user (email, password, role, require_password_reset) VALUES ($1, $2, $3, true)',
          [email, hashed, 'owner']
        )
        console.log(`Created ${email} → owner`)
      }
    }
    console.log('\n=== Login at your backend URL (e.g. https://casperyouthhubmap.org) ===')
    console.log('Temporary password:', tempPassword)
    console.log('Both users must change password on first login.')
  } finally {
    client.release()
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
