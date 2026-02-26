const sendEmail = require('./sendEmail')
const ownerEmail = process.env.OWNER_EMAIL
const fromEmail = 'noreply@casperyouthhubmap.org'

const loginUrl = 'https://casperyouthhubmap.org/auth/login'

async function sendWelcomeEmail({ to, tempPassword }) {
  const hasPassword = !!tempPassword
  return sendEmail({
    to,
    from: fromEmail,
    subject: 'Welcome to the Wyoming Resource Map',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #00897b;">Welcome to the Wyoming Resource Map!</h2>
        <p>An account has been created for you to manage your organization's listing on the Casper Youth Hub Resource Map.</p>
        <h3>Your Login Credentials</h3>
        <table style="border-collapse: collapse; margin: 1em 0;">
          <tr><td style="padding: 4px 12px 4px 0; font-weight: bold;">Email:</td><td>${to}</td></tr>
          ${hasPassword ? `<tr><td style="padding: 4px 12px 4px 0; font-weight: bold;">Temporary Password:</td><td><code>${tempPassword}</code></td></tr>` : ''}
        </table>
        ${!hasPassword ? '<p style="color: #555;">Your password has not changed. Use the password you were previously given, or contact us if you need a reset.</p>' : ''}
        <p><a href="${loginUrl}" style="display: inline-block; padding: 10px 20px; background: #00897b; color: #fff; text-decoration: none; border-radius: 4px;">Log In Now</a></p>
        <h3>What You Can Do</h3>
        <ul>
          <li>View and edit your organization's listing information</li>
          <li>Update contact details, services, hours, and more</li>
          <li>Upload or change your building photo</li>
        </ul>
        ${hasPassword ? '<h3>Important: Change Your Password</h3><p>When you first log in, you\'ll be prompted to choose a new password. Please pick something secure that you\'ll remember.</p>' : ''}
        <hr style="border: none; border-top: 1px solid #ddd; margin: 2em 0;">
        <p style="color: #888; font-size: 0.9em;">If you have questions, reply to this email or contact us at ${ownerEmail}.</p>
      </div>
    `
  })
}

module.exports = sendWelcomeEmail
