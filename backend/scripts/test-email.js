#!/usr/bin/env node
/** Quick test: send one email and log full result/error */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
const sendEmail = require('../services/sendEmail')

async function main() {
  const to = process.argv[2] || 'andrea.covert@caspercollege.edu'
  console.log('Sending test email to', to, '...')
  try {
    const result = await sendEmail({
      to,
      from: 'mail@casperyouthhubmap.org',
      subject: 'Test from Wyoming Resource Map',
      html: '<p>This is a test. If you received this, email is working.</p>'
    })
    console.log('Result:', JSON.stringify(result, null, 2))
    console.log('Success:', !!(result && result.accepted && result.accepted[0]))
  } catch (err) {
    console.error('Caught:', err)
  }
}
main()
