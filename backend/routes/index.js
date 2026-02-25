const router = require('express').Router()
const { createUser, updatePassword } = require('../utils/authUtils')
const { ensureLogin, ensureOwner, checkRequirePasswordChange } = require('../middleware/routeProtection')
const { getLastUpdate } = require('../utils/listingUtils')
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
  req.user.role === 'owner' ? 
  res.redirect('/add-user') : 
  res.redirect('/change-password')
})

router.get('/change-password', (req, res) => {
  res.render('changePassword', { props: { ownerEmail, email: req.user.email, message: req.flash('message') }})
})

router.get('/add-user', ensureOwner, (req, res) => {
  res.render('addUser', { props: { ownerEmail, message: 'NOTE: This new user will have full access to this Admin App.' }}) 
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
    const { email, password } = req.body

    const query = await createUser({ email, password })

    if (query.success === true) {
      return res.render('addUser', { props: { message: `User created! Please give your new user their credentials. Email: ${email} | Password: ${password}`, ownerEmail }})
    } 
    if (query.success === false) {
      return res.render('addUser', { props: { message: query.message, ownerEmail }})
    }
    return res.render('addUser', { 
      props: { message: 'Something went wrong. Please contact support.', ownerEmail }
    })
  } catch (error) {
    next(error)
  }
})

module.exports = router
