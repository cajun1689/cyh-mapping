require('dotenv').config()
const db = require('../db')
const sendEmail = require('./sendEmail')
const crypto = require('crypto')
const bcrypt = require('bcrypt')
const { getUserByEmail } = require('../utils/authUtils')

const updateQuery = `UPDATE staging_user SET refresh_token = $1, require_password_reset = true WHERE email = $2`

const initiatePasswordReset = async (email) => {
  try {
    const emailError = new Error('Please provide a valid email address') 
    if (!email) throw emailError

    const user = await getUserByEmail(email)
    if (user) {
      // Generate reset token
      let resetToken = crypto.randomBytes(32).toString('hex')

      // Hash token
      const hashedToken = await bcrypt.hash(resetToken, 10)
    
      // Save token and set require_password_reset to true
      await db.query(updateQuery, [hashedToken, email])

      const link = `${process.env.SERVER_URL}auth/reset-password?token=${resetToken}&email=${email}`

      const emailOptions = {
        subject: "Password Reset",
        html: "<p>Hello,</p> <p>Someone requested a password reset for the CYH Admin panel. If that was you, <a href=" + link + ">click this link to reset your password</a></p>",
        to: email,
        from: process.env.OWNER_EMAIL
      }
      // Contains an array of successful emails on success
      const sentMail = await sendEmail(emailOptions)
      return sentMail.accepted[0] ? true : false
    }
  } catch (error) {
    console.log(error)
    return error
  }
}

module.exports = initiatePasswordReset