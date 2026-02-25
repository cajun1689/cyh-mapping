const router = require('express').Router()
const { createUser, updatePassword } = require('../utils/authUtils')
const { ensureLogin, ensureOwner, ensureNotOrg, checkRequirePasswordChange } = require('../middleware/routeProtection')
const { getLastUpdate } = require('../utils/listingUtils')
const { pool } = require('../db')
const sendEmail = require('../services/sendEmail')
const ownerEmail = process.env.OWNER_EMAIL

const userFriendlyError = 'Something went wrong. Please try again or contact support.'

router.use(ensureLogin)

router.get('/logout', (req, res) => {
  req.logout()
  req.flash('message', 'You have been logged out')
  res.redirect('/login')
})

// Redirect new users to change their password
router.use(checkRequirePasswordChange)

router.get('/home', async (req, res) => {
  if (req.user?.role === 'org') return res.redirect('/org/dashboard')

  const { date, email } = await getLastUpdate()
  
  res.render('home', { props: { 
    message: req.flash('message'), 
    activeNavTab: 'home',
    updated: { date: `${date.toLocaleString()}`, email: email } 
  }}) 
})

router.get('/guide', (req, res) => {
  res.render('guide', { props: { 
    message: req.flash('message')
  }})
})

router.get('/settings', (req, res) => {
  if (req.user.role === 'owner') return res.redirect('/add-user')
  if (req.user.role === 'org') return res.redirect('/change-password')
  res.redirect('/change-password')
})

router.get('/change-password', (req, res) => {
  const layout = req.user?.role === 'org' ? 'layouts/orgLayout' : 'layouts/index'
  res.render('changePassword', { layout, props: { ownerEmail, email: req.user.email, message: req.flash('message') }})
})

router.get('/add-user', ensureOwner, async (req, res) => {
  const listings = await pool.query('SELECT guid, full_name, city FROM listings ORDER BY full_name')
  res.render('addUser', { props: { ownerEmail, message: 'Create a new admin or organization user.', listings: listings.rows }}) 
})

router.post('/change-password', async (req, res, next) => {
  try {
    const { password, confirmPassword } = req.body
    const { email } = req.user
    const template = 'changePassword' 

    /* TODO: add regex validation check to make sure it's a secure password */
    if (password.length < 8) {
      return res.render(template, { props: { message: 'New password must be longer than 8 characters', email }})
    }

    if (password !== confirmPassword) {
      return res.render(template, { props: { message: 'New passwords must match', email }})
    }

    const newPassword = await updatePassword({ email, password })

    newPassword ? res.render(template, { props: { message: 'Password succesfully changed', email }}) : res.render(template, { props: { message: userFriendlyError, email }})
    
  } catch (error) {
    next(error)
  }
})

router.post('/add-user', ensureOwner, async (req, res) => {
  try {
    const { email, password, role } = req.body
    const listingGuids = req.body.listing_guids || []

    const query = await createUser({ email, password, role: role || 'user' })
    const listings = await pool.query('SELECT guid, full_name, city FROM listings ORDER BY full_name')

    if (query.success === true) {
      if (role === 'org' && listingGuids.length > 0) {
        const userId = query.user.id
        const guids = Array.isArray(listingGuids) ? listingGuids : [listingGuids]
        for (const guid of guids) {
          await pool.query('UPDATE listings SET managed_by = $1 WHERE guid = $2', [userId, parseInt(guid, 10)])
        }
      }

      if (role === 'org') {
        try {
          const loginUrl = 'https://casperyouthhubmap.org/auth/login'
          await sendEmail({
            to: email,
            from: ownerEmail,
            subject: 'Welcome to the Wyoming Resource Map',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #00897b;">Welcome to the Wyoming Resource Map!</h2>
                <p>An account has been created for you to manage your organization's listing on the Casper Youth Hub Resource Map.</p>
                <h3>Your Login Credentials</h3>
                <table style="border-collapse: collapse; margin: 1em 0;">
                  <tr><td style="padding: 4px 12px 4px 0; font-weight: bold;">Email:</td><td>${email}</td></tr>
                  <tr><td style="padding: 4px 12px 4px 0; font-weight: bold;">Temporary Password:</td><td><code>${password}</code></td></tr>
                </table>
                <p><a href="${loginUrl}" style="display: inline-block; padding: 10px 20px; background: #00897b; color: #fff; text-decoration: none; border-radius: 4px;">Log In Now</a></p>
                <h3>What You Can Do</h3>
                <ul>
                  <li>View and edit your organization's listing information</li>
                  <li>Update contact details, services, hours, and more</li>
                  <li>Upload or change your building photo</li>
                </ul>
                <h3>Important: Change Your Password</h3>
                <p>When you first log in, you'll be prompted to choose a new password. Please pick something secure that you'll remember.</p>
                <hr style="border: none; border-top: 1px solid #ddd; margin: 2em 0;">
                <p style="color: #888; font-size: 0.9em;">If you have questions, reply to this email or contact us at ${ownerEmail}.</p>
              </div>
            `
          })
        } catch (emailErr) {
          console.error('Failed to send welcome email:', emailErr.message)
        }
      }

      return res.render('addUser', { props: { message: `User created! Email: ${email} | Password: ${password} | Role: ${role || 'user'}`, ownerEmail, listings: listings.rows }})
    } 
    if (query.success === false) {
      return res.render('addUser', { props: { message: query.message, ownerEmail, listings: listings.rows }})
    }
    return res.render('addUser', { 
      props: { message: 'Something went wrong. Please contact support.', ownerEmail, listings: listings.rows }
    })
  } catch (error) {
    next(error)
  }
})

module.exports = router
