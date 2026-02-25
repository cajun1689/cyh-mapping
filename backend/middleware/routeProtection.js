// Middleware to protect routes. Can be mounted on individual routes, or on an app/router object to apply to multiple routes

const ensureLogin = (req, res, next) => req.isAuthenticated() ? next() : res.redirect('/auth/login')

const ensureOwner = (req, res, next) => (req.user.role === 'owner') ? next() : res.redirect('/home')

const ensureNotLoggedIn = (req, res, next) => req.isAuthenticated() ? res.redirect('back') : next()

// Restrict org users to their own routes
const ensureNotOrg = (req, res, next) => (req.user?.role === 'org') ? res.redirect('/org/dashboard') : next()

// Only allow org-role users (and owners for testing)
const ensureOrgRole = (req, res, next) => {
  const role = req.user?.role
  if (role === 'org' || role === 'owner') return next()
  return res.redirect('/home')
}

// Keeps new users on password page until they change their password
const checkRequirePasswordChange = (req, res, next) => {
  // Disabled on logout and POST routes
  req.originalUrl === '/logout' ? next() 
  : req.user?.require_password_reset === true && req.method === 'GET'
  ? res.render('changePassword', { props: { email: req.user.email, message: 'Choose a new secure password to proceed to the site' }}) 
  : next()
}

// Handle wildcard routes based on login status
const handleUndefinedRoutes = (req, res) => {
  if (!req.isAuthenticated()) return res.redirect('/auth/login')
  if (req.user?.role === 'org') return res.redirect('/org/dashboard')
  return res.redirect('/home')
}

module.exports = { ensureLogin, ensureOwner, ensureNotLoggedIn, ensureNotOrg, ensureOrgRole, checkRequirePasswordChange, handleUndefinedRoutes }