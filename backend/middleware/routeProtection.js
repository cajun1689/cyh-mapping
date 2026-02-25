// Middleware to protect routes. Can be mounted on individual routes, or on an app/router object to apply to multiple routes

const ensureLogin = (req, res, next) => req.isAuthenticated() ? next() : res.redirect('/auth/login')

const ensureOwner = (req, res, next) => (req.user.role === 'owner') ? next() : res.redirect('/home')

const ensureNotLoggedIn = (req, res, next) => req.isAuthenticated() ? res.redirect('back') : next()

// Keeps new users on password page until they change their password
const checkRequirePasswordChange = (req, res, next) => {
  // Disabled on logout and POST routes
  req.originalUrl === '/logout' ? next() 
  : req.user?.require_password_reset === true && req.method === 'GET'
  ? res.render('changePassword', { props: { email: req.user.email, message: 'Choose a new secure password to proceed to the site' }}) 
  : next()
}

// Handle wildcard routes based on login status
const handleUndefinedRoutes = (req, res) => req.isAuthenticated() ? res.redirect('/home') : res.redirect('/auth/login')

module.exports = { ensureLogin, ensureOwner, ensureNotLoggedIn, checkRequirePasswordChange, handleUndefinedRoutes }