const session = require('express-session')
const pgSession = require('connect-pg-simple')(session)
const passport = require('passport')
const flash = require('connect-flash')
const pool = require('../db').pool

module.exports = app => {

  app.use(session({
    store: new pgSession({
      pool: pool, 
      createTableIfMissing: true
    }),
    resave: true,
    saveUninitialized: true,
    secret: process.env.SESSION_SECRET, 
    maxAge: 30 * 24 * 60 * 60
  }))

  app.use(passport.initialize())
  app.use(passport.session())
  // Allows us to show the user error messages via the res.locals.error object
  app.use(flash())
  app.use((req, res, next) => {
    res.locals.error = req.flash('error')
    next()
  })

  app.post('/login', 
  passport.authenticate('local', {
    successRedirect: '/home', 
    failureRedirect: '/auth/login',
    failureFlash: true
  }))
}