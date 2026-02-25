const router = require('express').Router()
const multer = require('multer')
const stripBOM = require('strip-bom')
const { parse } = require('papaparse')
const { validate } = require('jsonschema')
const fetch = require('node-fetch')
const { pool } = require('../db')
const bareBonesListingsSchema = require('../db/listings.basic.schema.json')
const listingsSchema = require('../db/listings.schema.json')
const { GEOCODER, PAPA_PARSE } = require('../utils/constants')
const sendEmail = require('../services/sendEmail')
const { addCostToListing } = require('../utils/listingMetaUtils')
const wyoming = require('../utils/stateBoundaries.json').Wyoming
const { TABLE_LISTINGS_COLUMNS, DROP_TABLE_PREVIEW_LISTINGS, CREATE_TABLE_PREVIEW_LISTINGS, INSERT_INTO_PREVIEW_LISTINGS, promotePreviewListingsToProd, createBackupListingTable, createMetaEntry, splitCategory, addCity } = require('../utils/listingUtils')
const { geocodeFromExisting, recreateGeocodingTable } = require('../utils/geocodingUtils')
const upload = multer()
const imageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp']
  cb(null, allowed.includes(file.mimetype))
}})
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3')
const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-west-2' })
const S3_BUCKET = 'cyh-mapping-frontend'
const S3_PREFIX = 'listing-images'
const { ensureLogin, checkRequirePasswordChange } = require('../middleware/routeProtection')
const { geocodeListing } = require('../services/geocoding')
const axios = require('axios')
const API_KEY = process.env.GOOGLE_API_KEY

async function uploadImageToS3(file, guid) {
  const ext = file.originalname.split('.').pop().toLowerCase()
  const key = `${S3_PREFIX}/${guid}-${Date.now()}.${ext}`
  await s3.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    CacheControl: 'public, max-age=31536000',
  }))
  return `/${key}`
}

const isInState = (lat, long) => ((lat >= wyoming.min_lat && lat <= wyoming.max_lat) && (long >= wyoming.min_long && long <= wyoming.max_long))

router.use(ensureLogin)
router.use(checkRequirePasswordChange)

/* ----------- GET ROUTES ----------- */

// Step 1
router.get('/upload', (req, res) => {
  // The req.session.status object is used to track which UI Steps are "complete"
  const status = req.session.status = { upload: false, geocodingSuccess: false, preview: false, update: false }
  res.render('listings/upload', { props: { activeTab: 1, status, message: req.flash('message'), activeNavTab: 'listings' }})
})

// Step 2
router.get('/geocode', (req, res) => {
  const status = req.session.status
  res.render('listings/geocode', { props: { activeTab: 2, status, message: req.flash('message'), activeNavTab: 'listings' }})
})

// Step 3
router.get('/preview', (req, res) => {
  const status = req.session.status
  // Reset the number of upload attempts for this round
  if (req.session.uploadAttempts) req.session.uploadAttempts = 0;
  const previewURL = `${process.env.FRONTEND_URL}?api=${process.env.BACKEND_URL}/api-preview`
  res.render('listings/preview', { props: { activeTab: 2, status, previewURL, message: req.flash('message'), activeNavTab: 'listings' }})
})

// Step 4
router.get('/update', (req, res) => {
  const status = req.session.status
  status.preview = true
  res.render('listings/update', { props: { activeTab: 3, status, message: req.flash('message'), activeNavTab: 'listings' }})
})

/* ----------- POST ROUTES ----------- */
router.post('/upload', upload.single('listings'),
  async (req, res, next) => {
    try {
      req.session.filename = req.file.originalname
      // We use this to track how many times they've tried & failed to upload
      // If they try and fail twice, we offer users the option to proceed without validation, but at their own risk.
      req.session.uploadAttempts ? req.session.uploadAttempts += 1 : req.session.uploadAttempts = 1;
      console.log(req.session.uploadAttempts)
      // Parse listings using papaparse. Papaparse automatically throws a named error on error
      // Note: listings are now saved to req.session, because they will then persist across routes.
      req.session.listings = parse(stripBOM(req.file.buffer.toString()), PAPA_PARSE).data
      console.info(`Listings CSV successfully parsed`)
  
      console.log(req.session.listings)
      // Receives input from the "disable data validation" checkbox on the UI. Temporary fix until we work out the bugs with the jsonschema validate() function. 
      // This option is only shown after the user's upload has failed twice, so it's a "break glass in case of emergency" feature.
      if (req.body.disableStrict) {
        // The escape hatch still needs this, or Postgres will throw errors and Express will crash
        validate(req.session.listings, bareBonesListingsSchema, { throwAll: true })
      } else {
        validate(req.session.listings, listingsSchema, { throwAll: true })
      }

      // Upload success
      console.info(`Listings CSV successfully validated`)

      // Write to DB

      const client = await pool.connect()

      await client.query(DROP_TABLE_PREVIEW_LISTINGS)
      console.info(`Table PREVIEW_LISTINGS successfully dropped`)
      
      await client.query(CREATE_TABLE_PREVIEW_LISTINGS)
      console.info(`Table PREVIEW_LISTINGS successfully recreated`)

      const writeToDatabase = async listing => {
        if (listing.latitude && listing.longitude) {
          if (isInState(listing.latitude, listing.longitude)) {
            addCity(listing)
            await client.query(INSERT_INTO_PREVIEW_LISTINGS, TABLE_LISTINGS_COLUMNS.map(column => listing[column]))
            return
          }
        } else {
          addCity(listing)
          await client.query(INSERT_INTO_PREVIEW_LISTINGS, TABLE_LISTINGS_COLUMNS.map(column => listing[column]))
          return
        }
      }

      const listings = req.session.listings
      // Intentionally slow, originally due to API rate limits. 
      for (let i=0; i< listings.length; i++) {
        await writeToDatabase(listings[i])
      }

      client.release()
      console.info(`Table PREVIEW_LISTINGS successfully populated`)

      req.session.status.upload = true
      const status = req.session.status
      return res.status(202).render('listings/upload', { props: { success: true, status, email: req.user.email, activeTab: 1 }})
    } catch (error) {
        switch (error.name) {
          case 'Validation Error': 
            let filteredErrors = [...error.errors]
            filteredErrors = filteredErrors.filter(error => !error.property.includes('latitude') && !error.property.includes('longitude'))
            const status = req.session.status
            const showEscapeHatch = (req.session.uploadAttempts && req.session.uploadAttempts > 1)
            if (filteredErrors?.length > 0) {
              return res.status(422).render('listings/upload', { 
                props: { activeTab: 1, status, showEscapeHatch, listings: req.session.listings }, 
                error: { ...error,  message: `Error: The following listings were not formatted correctly:` }, 
              })
            }
          else return res.status(422).render('listings/upload', { 
            props: { success: true, status, email: req.user.email, activeTab: 1, listings: req.session.listings }
          })   
          case 'CSV Parse Error':
            return res.status(415).render('listings/upload', { 
              props: { activeTab: 1 }, 
              error: { ...error, status, message: `Error: The CSV was not readable` }, 
          })
        }
        next(error)
      }
    }
  )

router.post('/update', async (req, res) => {
  // Create backup of current prod listings
  await createBackupListingTable()
  const success = await promotePreviewListingsToProd(pool)
  if (success) {
    // Drop and recreate the geocoding table with new listings
    const geocodingRes = await recreateGeocodingTable()
    
    if (geocodingRes) {
      // Args: email, fileName
      await createMetaEntry(req.user.email, req.session.filename)
      const status = req.session.status
      status.update = true
      res.render('listings/updateSuccess', { props: { activeTab: 3, status, message: req.flash('message'), activeNavTab: 'listings' }}) 
    }
  } else {
    next(error)
  }  
})

/* ----------- ADD SINGLE LISTING ----------- */

const categories = require('../apiData/categories.json')

const getExistingCategories = async () => {
  try {
    const result = await pool.query('SELECT DISTINCT category FROM listings ORDER BY category')
    return result.rows.map(r => r.category)
  } catch {
    return []
  }
}

const geocodeAddress = async (address) => {
  try {
    const query = encodeURIComponent(address)
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`
    const res = await axios.get(url, { headers: { 'User-Agent': 'CYH-Mapping/1.0' }, timeout: 10000 })
    if (res.data && res.data.length > 0) {
      return { latitude: res.data[0].lat, longitude: res.data[0].lon }
    }
    // Retry without suite numbers
    const cleaned = address.replace(/\s+Suite\s+\S+/i, '').replace(/\s+Ste\s+\S+/i, '')
    if (cleaned !== address) {
      const q2 = encodeURIComponent(cleaned)
      const res2 = await axios.get(`https://nominatim.openstreetmap.org/search?q=${q2}&format=json&limit=1`, { headers: { 'User-Agent': 'CYH-Mapping/1.0' }, timeout: 10000 })
      if (res2.data && res2.data.length > 0) {
        return { latitude: res2.data[0].lat, longitude: res2.data[0].lon }
      }
    }
    return null
  } catch {
    return null
  }
}

router.get('/add', async (req, res) => {
  const existingCategories = await getExistingCategories()
  res.render('listings/add', {
    props: { activeNavTab: 'add-listing', categories: existingCategories, success: false, error: null }
  })
})

router.post('/add', imageUpload.single('building_image'), async (req, res) => {
  try {
    const body = req.body
    const existingCategories = await getExistingCategories()

    const full_name = (body.full_name || '').trim()
    let category = (body.category || '').trim()
    const description = (body.description || '').trim()

    if (category === '__custom') {
      category = (body.custom_category || '').trim()
    }

    if (!full_name || !category || !description) {
      return res.render('listings/add', {
        props: { activeNavTab: 'add-listing', categories: existingCategories, success: false, error: 'Name, category, and description are required.' }
      })
    }

    // Get next guid
    const maxGuid = await pool.query('SELECT COALESCE(MAX(guid), 0) + 1 AS next_guid FROM listings')
    const guid = maxGuid.rows[0].next_guid

    // Build the listing object
    const listing = { guid }
    listing.full_name = full_name
    listing.category = category
    listing.description = description
    listing.parent_organization = (body.parent_organization || '').trim() || null
    listing.phone_1 = (body.phone_1 || '').trim() || null
    listing.crisis_line_number = (body.crisis_line_number || '').trim() || null
    listing.website = (body.website || '').trim() || null
    listing.program_email = (body.program_email || '').trim() || null
    listing.full_address = (body.full_address || '').trim() || null
    listing.city = (body.city || '').trim() || null
    listing.min_age = body.min_age ? parseInt(body.min_age, 10) : null
    listing.max_age = body.max_age ? parseInt(body.max_age, 10) : null
    listing.eligibility_requirements = (body.eligibility_requirements || '').trim() || null
    listing.financial_information = (body.financial_information || '').trim() || null
    listing.intake_instructions = (body.intake_instructions || '').trim() || null

    // Keywords from service type + faith-based flag
    const kwParts = (body.service_type || 'In-Person').trim().split(',')
    if (body.faith_based) kwParts.push('Faith-Based')
    listing.keywords = `{${kwParts.join(',')}}`

    // Languages
    const langs = (body.languages_offered || '').trim()
    listing.languages_offered = langs ? `{${langs}}` : null

    // Auto-geocode the address
    if (listing.full_address) {
      const coords = await geocodeAddress(listing.full_address)
      if (coords) {
        listing.latitude = coords.latitude
        listing.longitude = coords.longitude
      }
    }

    // Upload building image if provided
    if (req.file) {
      listing.image_url = await uploadImageToS3(req.file, listing.guid)
    }

    // Get existing column names from the listings table
    const colInfo = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'listings' ORDER BY ordinal_position`)
    const tableColumns = colInfo.rows.map(r => r.column_name)

    // Only insert columns that exist in the table
    const insertColumns = []
    const insertValues = []
    const insertParams = []
    let paramIdx = 1

    for (const col of tableColumns) {
      if (listing[col] !== undefined) {
        insertColumns.push(col)
        insertValues.push(listing[col])
        insertParams.push(`$${paramIdx}`)
        paramIdx++
      }
    }

    const insertQuery = `INSERT INTO listings (${insertColumns.join(', ')}) VALUES (${insertParams.join(', ')})`
    await pool.query(insertQuery, insertValues)

    console.info(`Listing added: [${guid}] ${full_name} (${category})`)

    return res.render('listings/add', {
      props: { activeNavTab: 'add-listing', categories: await getExistingCategories(), success: true, addedName: full_name, error: null }
    })
  } catch (error) {
    console.error('Error adding listing:', error.message)
    const existingCategories = await getExistingCategories()
    return res.render('listings/add', {
      props: { activeNavTab: 'add-listing', categories: existingCategories, success: false, error: `Failed to add listing: ${error.message}` }
    })
  }
})

/* ----------- MANAGE / EDIT / DELETE LISTINGS ----------- */

router.get('/manage', async (req, res) => {
  try {
    const result = await pool.query('SELECT guid, full_name, parent_organization, category, city, latitude, longitude, keywords FROM listings ORDER BY category, full_name')
    res.render('listings/manage', {
      props: { activeNavTab: 'manage', listings: result.rows, message: req.flash('message')[0] || null }
    })
  } catch (error) {
    console.error('Error loading listings:', error.message)
    res.render('listings/manage', {
      props: { activeNavTab: 'manage', listings: [], message: null },
      error: 'Failed to load listings'
    })
  }
})

router.get('/edit/:guid', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM listings WHERE guid = $1', [req.params.guid])
    if (!result.rows.length) {
      req.flash('message', 'Listing not found')
      return res.redirect('/listings/manage')
    }
    const existingCategories = await getExistingCategories()
    res.render('listings/edit', {
      props: { activeNavTab: 'manage', listing: result.rows[0], categories: existingCategories, success: false, error: null }
    })
  } catch (error) {
    console.error('Error loading listing:', error.message)
    req.flash('message', 'Error loading listing')
    res.redirect('/listings/manage')
  }
})

router.post('/edit/:guid', imageUpload.single('building_image'), async (req, res) => {
  const guid = parseInt(req.params.guid, 10)
  try {
    const body = req.body
    const existingCategories = await getExistingCategories()

    let category = (body.category || '').trim()
    if (category === '__custom') {
      category = (body.custom_category || '').trim()
    }

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
    }

    const kwParts = (body.service_type || 'In-Person').trim().split(',')
    if (body.faith_based) kwParts.push('Faith-Based')
    updates.keywords = `{${kwParts.join(',')}}`

    const langs = (body.languages_offered || '').trim()
    updates.languages_offered = langs ? `{${langs}}` : null

    if (body.re_geocode && updates.full_address) {
      const coords = await geocodeAddress(updates.full_address)
      if (coords) {
        updates.latitude = coords.latitude
        updates.longitude = coords.longitude
      }
    }

    // Upload new building image if provided
    if (req.file) {
      updates.image_url = await uploadImageToS3(req.file, guid)
    }
    // Remove existing image if requested
    if (body.remove_image === 'on' && !req.file) {
      updates.image_url = null
    }

    // Build UPDATE query dynamically from columns that exist in the table
    const colInfo = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'listings' ORDER BY ordinal_position`)
    const tableColumns = colInfo.rows.map(r => r.column_name)

    const setClauses = []
    const values = []
    let paramIdx = 1

    for (const col of tableColumns) {
      if (col === 'guid') continue
      if (updates[col] !== undefined) {
        setClauses.push(`${col} = $${paramIdx}`)
        values.push(updates[col])
        paramIdx++
      }
    }

    values.push(guid)
    const updateQuery = `UPDATE listings SET ${setClauses.join(', ')} WHERE guid = $${paramIdx}`
    await pool.query(updateQuery, values)

    console.info(`Listing updated: [${guid}] ${updates.full_name}`)

    const updated = await pool.query('SELECT * FROM listings WHERE guid = $1', [guid])
    return res.render('listings/edit', {
      props: { activeNavTab: 'manage', listing: updated.rows[0], categories: await getExistingCategories(), success: true, error: null }
    })
  } catch (error) {
    console.error('Error updating listing:', error.message)
    const result = await pool.query('SELECT * FROM listings WHERE guid = $1', [guid])
    const existingCategories = await getExistingCategories()
    return res.render('listings/edit', {
      props: { activeNavTab: 'manage', listing: result.rows[0] || {}, categories: existingCategories, success: false, error: `Failed to save: ${error.message}` }
    })
  }
})

router.post('/delete/:guid', async (req, res) => {
  try {
    const guid = parseInt(req.params.guid, 10)
    const listing = await pool.query('SELECT full_name FROM listings WHERE guid = $1', [guid])
    const name = listing.rows[0]?.full_name || 'Unknown'
    await pool.query('DELETE FROM listings WHERE guid = $1', [guid])
    console.info(`Listing deleted: [${guid}] ${name}`)
    req.flash('message', `"${name}" has been deleted.`)
    res.redirect('/listings/manage')
  } catch (error) {
    console.error('Error deleting listing:', error.message)
    req.flash('message', 'Error deleting listing')
    res.redirect('/listings/manage')
  }
})

// Catch all for /listings
router.get('/*', (req, res) => {
  if (req.isAuthenticated()) return res.redirect('/listings/upload')
  res.redirect('/auth/login')
})

module.exports = router