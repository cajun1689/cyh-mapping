const db = require('../db')
const bcrypt = require('bcrypt')

/* Helper functions for Passport auth */
const getUserById = async id => {
  const res = await db.query(
    'SELECT * FROM staging_user WHERE id = $1', 
    [id]
  )
  if (res) return res.rows[0]
}

const getUserByEmail = async email => {
  const res = await db.query(
    'SELECT * FROM staging_user WHERE email = $1', 
    [email]
  )
  if (res) return res.rows[0]
}

/* User creation */
const hashPassword = async (str) => {
  const hashedPassword = await bcrypt.hash(str, 10)
  return hashedPassword
}

const createUser = async ({ email, password }) => {
  try {
    const existingUser = await getUserByEmail(email)
    if (existingUser) {
      return ({ success: false, message: 'Email already exists' })
    }

    const hashedPassword = await hashPassword(password)
    const user = await db.query(
      'INSERT INTO staging_user (email, password, require_password_reset) VALUES ($1, $2, true) RETURNING *', 
      [email, hashedPassword]
    )
    if (user.rows.length > 0) {
      return { success: true, user: user.rows[0] }
    }
  } catch (error) {
    console.log(error)
    return error.message
  }
}

const updatePassword = async ({ email, password }) => {
  try {
    const hashedPassword = await hashPassword(password)
    const response = await db.query(
      `UPDATE staging_user SET password=$1, require_password_reset=false WHERE email=$2 RETURNING *`,
      [hashedPassword, email])
    if (response) return response.rows[0]
  } catch (error) {
    return (error.message)
  }
}

const resetPassword = async ({ email, password }) => {
  try {
    const hashedPassword = await hashPassword(password)
    const queryString = `UPDATE staging_user SET password=$1, refresh_token = null, require_password_reset = false WHERE email=$2 RETURNING *`
    const response = await db.query(queryString, [hashedPassword, email])
    if (response) return response.rows[0]
  } catch (error) {
    return (error.message)
  }
}

module.exports = { 
  updatePassword,
  resetPassword,
  createUser,
  hashPassword,
  getUserById, 
  getUserByEmail 
}