const passport = require('passport')
const { getUserById, getUserByEmail } = require('../utils/authUtils')
require('dotenv').config
const LocalStrategy = require('passport-local').Strategy
const bcrypt = require ('bcrypt')

passport.serializeUser((user, done) => {
  done(null, user.id)
})

passport.deserializeUser(async (id, done) => {
  try {
    const user = await getUserById(id)
    return done(null, user)
  } catch (error) {
    return done(error)
  }
})

passport.use(
  new LocalStrategy({
    usernameField: 'email'
  },
  async (email, password, done) => {
    try {

      const user = await getUserByEmail(email)

      if (!user) { 
        return done(null, false, { 
          message: 'Invalid credentials' 
        })
      }

      if (!user.password) {
        return done(null, false, { 
          message: 'Invalid credentials' 
        })
      }

      const passwordsMatch = await bcrypt.compare(password, user.password)
      
      if (passwordsMatch) {
        return done(null, user)  
      } else {
        return done(null, false, { message: 'Invalid credentials' })
      }
    } catch (error) {
      return next(error)
    }
  })
)
