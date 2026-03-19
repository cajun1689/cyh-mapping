#!/usr/bin/env node
/**
 * Resend welcome emails to all org users. Use to test SES after migration
 * or to re-deliver credentials to org admins.
 *
 * Usage: node scripts/resend-welcome-emails.js
 * Or: make resend-welcome-emails
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })

const { pool } = require('../db')
const sendWelcomeEmail = require('../services/welcomeEmail')

async function main () {
  const result = await pool.query(
    "SELECT id, email FROM staging_user WHERE role = 'org' ORDER BY email"
  )
  const users = result.rows

  if (users.length === 0) {
    console.log('No org users found.')
    return
  }

  console.log(`Resending welcome emails to ${users.length} org user(s)...\n`)

  let sent = 0
  let failed = 0

  for (const user of users) {
    process.stdout.write(`${user.email} ... `)
    try {
      const emailResult = await sendWelcomeEmail({ to: user.email })
      const ok = emailResult && (emailResult.messageId || (emailResult.accepted && emailResult.accepted[0]))
      if (ok) {
        console.log('sent')
        sent++
      } else {
        console.log('failed (no result)')
        failed++
      }
    } catch (err) {
      console.log(`failed: ${err.message}`)
      failed++
    }
  }

  console.log(`\nDone. Sent: ${sent}, Failed: ${failed}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
