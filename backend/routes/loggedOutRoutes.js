const router = require('express').Router()
const { getUserByEmail, resetPassword } = require('../utils/authUtils')
const bcrypt = require('bcrypt')
const initiatePasswordReset = require('../services/initiatePasswordReset')
const { ensureNotLoggedIn } = require('../middleware/routeProtection')

// File specific variables
const userFriendlyError = 'Something went wrong. Please try again or contact support.'
const layout = 'layouts/loggedOutLayout'

// Auth middleware. Routes below this are accessible to non-authenticated users only
router.use(ensureNotLoggedIn)

router.get('/login', (req, res) => {
  res.render('login', { layout, props: { message: req.flash('message') }})
})

// Renders "Reset your password" view
router.get('/login/reset', async(req, res) => {
  res.render('requestPasswordReset', { layout, props: { message: req.flash('message') }})
})

// Handles password reset request
router.post('/login/reset', async (req, res) => {
  const { email } = req.body
  await initiatePasswordReset(email)
  res.render('requestPasswordReset', { layout, props: { 
    message: 'Password reset email sent. Please check your email for instructions.' 
  }})
})

router.get('/reset-password', async (req, res, next) => {
  try {
    const template = 'passwordResetForm'
    if (!req.query?.token || !req.query?.email) throw new Error(userFriendlyError)

    // Grab reset token and email from url
    const { token, email } = req.query
    // Check to see if we have a user with that email
    const user = await getUserByEmail(email)
    // Temporarily store email in a cookie for the POST route to view
    res.cookie('email', email)

    if (user) {
      const correctToken = await bcrypt.compare(token, user.refresh_token)

      correctToken ? res.render(template, { layout, props: { }})
      : res.render('login', { layout, props: { message: userFriendlyError }})
    } else { 
      res.render('login', { layout, props: { message: userFriendlyError }})
    }
  } catch (error) {
    next(error)
  }
})

router.post('/reset-password', async (req, res) => {
  const { password, confirmPassword } = req.body
  const template = 'passwordResetForm' 
  const email = req.cookies['email']

  /* TODO: add regex validation check to make sure it's a secure password */
  if (password.length < 8) {
    return res.render(template, { layout, props: { message: 'New password must be longer than 8 characters' }})
  }

  if (password !== confirmPassword) {
    return res.render(template, { layout, props: { message: 'New passwords must match' }})
  }

  const passwordUpdated = await resetPassword({ email, password })

  if (passwordUpdated) {
    // Clear temporary email cookie
    res.cookie('email', null)
    req.flash('message', 'Password successfully changed. Please log in.')
    res.redirect('/auth/login')
  } else {
    res.render(template, { layout, props: { message: userFriendlyError }
  })
  }
})

module.exports = router