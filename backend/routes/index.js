const router = require('express').Router()
const { createUser, updatePassword } = require('../utils/authUtils')
const { ensureLogin, ensureOwner, ensureNotOrg, checkRequirePasswordChange } = require('../middleware/routeProtection')
const { getLastUpdate } = require('../utils/listingUtils')
const { pool } = require('../db')
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
      // If org role, assign selected listings to this user
      if (role === 'org' && listingGuids.length > 0) {
        const userId = query.user.id
        const guids = Array.isArray(listingGuids) ? listingGuids : [listingGuids]
        for (const guid of guids) {
          await pool.query('UPDATE listings SET managed_by = $1 WHERE guid = $2', [userId, parseInt(guid, 10)])
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
