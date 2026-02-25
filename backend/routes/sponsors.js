const router = require('express').Router()
const multer = require('multer')
const { pool } = require('../db')
const { ensureLogin, checkRequirePasswordChange, ensureNotOrg } = require('../middleware/routeProtection')
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3')

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-west-2' })
const S3_BUCKET = 'cyh-mapping-frontend'
const S3_PREFIX = 'sponsor-logos'

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
    cb(null, allowed.includes(file.mimetype))
  }
})

async function uploadLogoToS3(file, id) {
  const ext = file.originalname.split('.').pop().toLowerCase()
  const key = `${S3_PREFIX}/${id}-${Date.now()}.${ext}`
  await s3.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    CacheControl: 'public, max-age=31536000',
  }))
  return `/${key}`
}

async function deleteLogoFromS3(logoUrl) {
  if (!logoUrl || !logoUrl.startsWith(`/${S3_PREFIX}/`)) return
  const key = logoUrl.slice(1)
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }))
  } catch (err) {
    console.error('Failed to delete sponsor logo from S3:', err.message)
  }
}

router.use(ensureLogin)
router.use(checkRequirePasswordChange)
router.use(ensureNotOrg)

router.get('/manage', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sponsors ORDER BY display_order, id')
    res.render('sponsors/manage', {
      props: { activeNavTab: 'sponsors', sponsors: result.rows, message: req.flash('message')[0] || null }
    })
  } catch (error) {
    console.error('Error loading sponsors:', error.message)
    res.render('sponsors/manage', {
      props: { activeNavTab: 'sponsors', sponsors: [], message: null },
      error: 'Failed to load sponsors'
    })
  }
})

router.post('/add', imageUpload.single('logo'), async (req, res) => {
  try {
    const name = (req.body.name || '').trim()
    const website_url = (req.body.website_url || '').trim() || null

    if (!name || !req.file) {
      req.flash('message', 'Name and logo image are required.')
      return res.redirect('/sponsors/manage')
    }

    const maxOrder = await pool.query('SELECT COALESCE(MAX(display_order), 0) + 1 AS next FROM sponsors')
    const nextOrder = maxOrder.rows[0].next

    const tempId = Date.now()
    const logo_url = await uploadLogoToS3(req.file, tempId)

    await pool.query(
      'INSERT INTO sponsors (name, logo_url, website_url, display_order) VALUES ($1, $2, $3, $4)',
      [name, logo_url, website_url, nextOrder]
    )

    req.flash('message', `"${name}" has been added.`)
    res.redirect('/sponsors/manage')
  } catch (error) {
    console.error('Error adding sponsor:', error.message)
    req.flash('message', `Error: ${error.message}`)
    res.redirect('/sponsors/manage')
  }
})

router.post('/delete/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const result = await pool.query('SELECT name, logo_url FROM sponsors WHERE id = $1', [id])
    if (result.rows.length) {
      await deleteLogoFromS3(result.rows[0].logo_url)
      await pool.query('DELETE FROM sponsors WHERE id = $1', [id])
      req.flash('message', `"${result.rows[0].name}" has been deleted.`)
    }
    res.redirect('/sponsors/manage')
  } catch (error) {
    console.error('Error deleting sponsor:', error.message)
    req.flash('message', 'Error deleting sponsor')
    res.redirect('/sponsors/manage')
  }
})

router.post('/reorder/:id/:direction', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const direction = req.params.direction

    const allSponsors = await pool.query('SELECT id, display_order FROM sponsors ORDER BY display_order, id')
    const rows = allSponsors.rows
    const idx = rows.findIndex(r => r.id === id)

    if (idx < 0) return res.redirect('/sponsors/manage')

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= rows.length) return res.redirect('/sponsors/manage')

    const currentOrder = rows[idx].display_order
    const swapOrder = rows[swapIdx].display_order
    const swapId = rows[swapIdx].id

    await pool.query('UPDATE sponsors SET display_order = $1 WHERE id = $2', [swapOrder, id])
    await pool.query('UPDATE sponsors SET display_order = $1 WHERE id = $2', [currentOrder, swapId])

    res.redirect('/sponsors/manage')
  } catch (error) {
    console.error('Error reordering sponsor:', error.message)
    res.redirect('/sponsors/manage')
  }
})

module.exports = router
