const router = require('express').Router()
const { pool } = require('../db')
const { ensureLogin, ensureOwner, checkRequirePasswordChange } = require('../middleware/routeProtection')
const sendWelcomeEmail = require('../services/welcomeEmail')

router.use(ensureLogin)
router.use(checkRequirePasswordChange)
router.use(ensureOwner)

router.get('/manage', async (req, res) => {
  try {
    const usersResult = await pool.query(`
      SELECT u.id, u.email, u.role,
        COALESCE(json_agg(json_build_object('guid', l.guid, 'full_name', l.full_name, 'city', l.city))
          FILTER (WHERE l.guid IS NOT NULL), '[]') AS assigned_listings
      FROM staging_user u
      LEFT JOIN listings l ON l.managed_by = u.id
      GROUP BY u.id
      ORDER BY u.role, u.email
    `)
    const allListings = await pool.query('SELECT guid, full_name, city FROM listings ORDER BY full_name')
    res.render('users/manage', {
      props: {
        activeNavTab: 'users',
        users: usersResult.rows,
        allListings: allListings.rows,
        currentUserId: req.user.id,
        message: req.flash('message')[0] || null
      }
    })
  } catch (error) {
    console.error('Error loading users:', error.message)
    req.flash('message', 'Error loading users.')
    res.redirect('/home')
  }
})

router.post('/delete/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (id === req.user.id) {
      req.flash('message', 'You cannot delete your own account.')
      return res.redirect('/users/manage')
    }
    await pool.query('UPDATE listings SET managed_by = NULL WHERE managed_by = $1', [id])
    await pool.query('DELETE FROM staging_user WHERE id = $1', [id])
    req.flash('message', 'User deleted.')
    res.redirect('/users/manage')
  } catch (error) {
    console.error('Error deleting user:', error.message)
    req.flash('message', 'Error deleting user.')
    res.redirect('/users/manage')
  }
})

router.post('/role/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const newRole = req.body.role
    if (id === req.user.id) {
      req.flash('message', 'You cannot change your own role.')
      return res.redirect('/users/manage')
    }
    if (!['user', 'org', 'owner'].includes(newRole)) {
      req.flash('message', 'Invalid role.')
      return res.redirect('/users/manage')
    }
    await pool.query('UPDATE staging_user SET role = $1 WHERE id = $2', [newRole, id])
    if (newRole !== 'org') {
      await pool.query('UPDATE listings SET managed_by = NULL WHERE managed_by = $1', [id])
    }
    req.flash('message', 'Role updated.')
    res.redirect('/users/manage')
  } catch (error) {
    console.error('Error updating role:', error.message)
    req.flash('message', 'Error updating role.')
    res.redirect('/users/manage')
  }
})

router.post('/assign/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const guids = req.body.listing_guids || []
    const guidArray = Array.isArray(guids) ? guids : [guids]

    await pool.query('UPDATE listings SET managed_by = NULL WHERE managed_by = $1', [id])

    for (const guid of guidArray) {
      if (guid) {
        await pool.query('UPDATE listings SET managed_by = $1 WHERE guid = $2', [id, parseInt(guid, 10)])
      }
    }
    req.flash('message', 'Listing assignments updated.')
    res.redirect('/users/manage')
  } catch (error) {
    console.error('Error assigning listings:', error.message)
    req.flash('message', 'Error updating assignments.')
    res.redirect('/users/manage')
  }
})

router.post('/resend-welcome/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const result = await pool.query('SELECT email, role FROM staging_user WHERE id = $1', [id])
    if (!result.rows.length) {
      req.flash('message', 'User not found.')
      return res.redirect('/users/manage')
    }
    const user = result.rows[0]
    console.log(`Sending welcome email to ${user.email}...`)
    const emailResult = await sendWelcomeEmail({ to: user.email })
    console.log(`Welcome email result:`, emailResult ? 'sent' : 'failed (no result)')
    req.flash('message', `Welcome email resent to ${user.email}.`)
    res.redirect('/users/manage')
  } catch (error) {
    console.error('Error resending welcome email:', error.message)
    req.flash('message', 'Failed to send email. Check SendGrid configuration.')
    res.redirect('/users/manage')
  }
})

module.exports = router
