const pool = require('../db')
const bcrypt = require('bcrypt')

/* 
 * This fn HARD resets the staging_user table. It will reinitialize the table with ONLY the owner account credentials. 
 * Use with caution.
 * TO CALL: import to an active file and call: hardResetStagingUserTable()
*/

const hardResetStagingUserTable = async () => {
  try {
    // Drop and re-create staging_user table
    await pool.query('DROP TABLE staging_user')
    await pool.query(`CREATE TABLE staging_user (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255),
      role VARCHAR(255) DEFAULT 'user',
      temp_password VARCHAR(255),
      require_password_reset BOOLEAN DEFAULT false
    );`)

    const email = process.env.OWNER_EMAIL
    const password = process.env.OWNER_PASSWORD
    const role = 'owner'
    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await pool.query(`INSERT INTO staging_user (email, password, role) VALUES ($1, $2, $3) RETURNING *`, [email, hashedPassword, role])

    if (user) console.log('Success!', user.rows)

  } catch (error) {
    console.error(error.message)
    return
  }
}

module.exports = { hardResetStagingUserTable }