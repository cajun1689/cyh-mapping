const router = require('express').Router()
const multer = require('multer')
const { pool } = require('../db')
const { ensureLogin, checkRequirePasswordChange, ensureOrgRole } = require('../middleware/routeProtection')
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const axios = require('axios')

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-west-2' })
const S3_BUCKET = 'cyh-mapping-frontend'
const S3_PREFIX = 'listing-images'

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    cb(null, allowed.includes(file.mimetype))
  }
})

async function uploadImageToS3(file, guid) {
  const ext = file.originalname.split('.').pop().toLowerCase()
  const key = `${S3_PREFIX}/${guid}-${Date.now()}.${ext}`
  await s3.send(new PutObjectCommand({
    Bucket: S3_BUCKET, Key: key, Body: file.buffer,
    ContentType: file.mimetype, CacheControl: 'public, max-age=31536000',
  }))
  return `/${key}`
}

const geocodeAddress = async (address) => {
  try {
    const query = encodeURIComponent(address)
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`
    const res = await axios.get(url, { headers: { 'User-Agent': 'CYH-Mapping/1.0' }, timeout: 10000 })
    if (res.data && res.data.length > 0) {
      return { latitude: res.data[0].lat, longitude: res.data[0].lon }
    }
    return null
  } catch { return null }
}

router.use(ensureLogin)
router.use(checkRequirePasswordChange)
router.use(ensureOrgRole)

router.get('/dashboard', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT guid, full_name, parent_organization, category, city, latitude, longitude, age_group FROM listings WHERE managed_by = $1 ORDER BY full_name',
      [req.user.id]
    )
    res.render('org/dashboard', {
      layout: 'layouts/orgLayout',
      props: { activeNavTab: 'org-dashboard', listings: result.rows, message: req.flash('message')[0] || null }
    })
  } catch (error) {
    console.error('Org dashboard error:', error.message)
    res.render('org/dashboard', {
      layout: 'layouts/orgLayout',
      props: { activeNavTab: 'org-dashboard', listings: [], message: null },
      error: 'Failed to load your listings'
    })
  }
})

router.get('/edit/:guid', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM listings WHERE guid = $1 AND managed_by = $2', [req.params.guid, req.user.id])
    if (!result.rows.length) {
      req.flash('message', 'Listing not found or you do not have permission to edit it.')
      return res.redirect('/org/dashboard')
    }
    const existingCategories = await pool.query('SELECT DISTINCT category FROM listings ORDER BY category')
    res.render('org/edit', {
      layout: 'layouts/orgLayout',
      props: { activeNavTab: 'org-dashboard', listing: result.rows[0], categories: existingCategories.rows.map(r => r.category), success: false, error: null }
    })
  } catch (error) {
    console.error('Org edit load error:', error.message)
    req.flash('message', 'Error loading listing')
    res.redirect('/org/dashboard')
  }
})

router.post('/edit/:guid', imageUpload.single('building_image'), async (req, res) => {
  const guid = parseInt(req.params.guid, 10)
  try {
    const ownership = await pool.query('SELECT guid FROM listings WHERE guid = $1 AND managed_by = $2', [guid, req.user.id])
    if (!ownership.rows.length) {
      req.flash('message', 'Permission denied.')
      return res.redirect('/org/dashboard')
    }

    const body = req.body
    let category = (body.category || '').trim()
    if (category === '__custom') category = (body.custom_category || '').trim()

    const updates = {
      full_name: (body.full_name || '').trim(),
      category,
      description: (body.description || '').trim(),
      parent_organization: (body.parent_organization || '').trim() || null,
      phone_1: (body.phone_1 || '').trim() || null,
      crisis_line_number: (body.crisis_line_number || '').trim() || null,
      website: (body.website || '').trim() || null,
      program_email: (body.program_email || '').trim() || null,
      full_address: (body.full_address || '').trim() || null,
      city: (body.city || '').trim() || null,
      min_age: body.min_age ? parseInt(body.min_age, 10) : null,
      max_age: body.max_age ? parseInt(body.max_age, 10) : null,
      eligibility_requirements: (body.eligibility_requirements || '').trim() || null,
      financial_information: (body.financial_information || '').trim() || null,
      intake_instructions: (body.intake_instructions || '').trim() || null,
      contact_name: (body.contact_name || '').trim() || null,
      contact_email: (body.contact_email || '').trim() || null,
      contact_phone: (body.contact_phone || '').trim() || null,
    }

    const kwParts = (body.service_type || 'In-Person').trim().split(',')
    if (body.faith_based) kwParts.push('Faith-Based')
    updates.keywords = `{${kwParts.join(',')}}`
    updates.age_group = (body.age_group || 'Youth and Adult').trim()
    const langs = (body.languages_offered || '').trim()
    updates.languages_offered = langs ? `{${langs}}` : null

    if (body.re_geocode && updates.full_address) {
      const coords = await geocodeAddress(updates.full_address)
      if (coords) {
        updates.latitude = coords.latitude
        updates.longitude = coords.longitude
      }
    }

    if (req.file) updates.image_url = await uploadImageToS3(req.file, guid)
    if (body.remove_image === 'on' && !req.file) updates.image_url = null

    const colInfo = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'listings' ORDER BY ordinal_position`)
    const tableColumns = colInfo.rows.map(r => r.column_name)

    const setClauses = []
    const values = []
    let paramIdx = 1
    for (const col of tableColumns) {
      if (col === 'guid' || col === 'managed_by') continue
      if (updates[col] !== undefined) {
        setClauses.push(`${col} = $${paramIdx}`)
        values.push(updates[col])
        paramIdx++
      }
    }

    values.push(guid)
    values.push(req.user.id)
    const updateQuery = `UPDATE listings SET ${setClauses.join(', ')} WHERE guid = $${paramIdx} AND managed_by = $${paramIdx + 1}`
    await pool.query(updateQuery, values)

    console.info(`Org user ${req.user.email} updated listing [${guid}]`)

    const updated = await pool.query('SELECT * FROM listings WHERE guid = $1', [guid])
    const existingCategories = await pool.query('SELECT DISTINCT category FROM listings ORDER BY category')
    return res.render('org/edit', {
      layout: 'layouts/orgLayout',
      props: { activeNavTab: 'org-dashboard', listing: updated.rows[0], categories: existingCategories.rows.map(r => r.category), success: true, error: null }
    })
  } catch (error) {
    console.error('Org edit error:', error.message)
    const result = await pool.query('SELECT * FROM listings WHERE guid = $1', [guid])
    const existingCategories = await pool.query('SELECT DISTINCT category FROM listings ORDER BY category')
    return res.render('org/edit', {
      layout: 'layouts/orgLayout',
      props: { activeNavTab: 'org-dashboard', listing: result.rows[0] || {}, categories: existingCategories.rows.map(r => r.category), success: false, error: `Failed to save: ${error.message}` }
    })
  }
})

module.exports = router
