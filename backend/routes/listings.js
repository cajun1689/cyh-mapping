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
// Json file with max and min valid lat/longs by state
const oregon = require('../utils/stateBoundaries.json').Oregon
const { TABLE_LISTINGS_COLUMNS, DROP_TABLE_PREVIEW_LISTINGS, CREATE_TABLE_PREVIEW_LISTINGS, INSERT_INTO_PREVIEW_LISTINGS, promotePreviewListingsToProd, createBackupListingTable, createMetaEntry, splitCategory, addCity } = require('../utils/listingUtils')
const { geocodeFromExisting, recreateGeocodingTable } = require('../utils/geocodingUtils')
const upload = multer()
const { ensureLogin, checkRequirePasswordChange } = require('../middleware/routeProtection')
const { geocodeListing } = require('../services/geocoding')
const axios = require('axios')
const API_KEY = process.env.GOOGLE_API_KEY

// Make sure the coordinates we receive from the maps API are actually in Oregon. 
const isInOregon = (lat, long) => ((lat >= oregon.min_lat && lat <= oregon.max_lat) && (long >= oregon.min_long && long <= oregon.max_long))
// Filters out outliers that will skew the map view. Running the function below filters out any listing east of Burns, Oregon. We only have 2, and it skews the entire map display, so this is the shortest solution.
const westOregon = { "min_long": -124.566244,	"min_lat": 41.991794,	"max_long": -119.0541,	"max_lat": 46.292035 }
const isInWestOregon = (lat, long) => ((lat >= westOregon.min_lat && lat <= westOregon.max_lat) && (long >= westOregon.min_long && long <= westOregon.max_long))

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
          if (isInWestOregon(listing.latitude, listing.longitude)) {
            addCity(listing)
            await client.query(INSERT_INTO_PREVIEW_LISTINGS, TABLE_LISTINGS_COLUMNS.map(column => listing[column]))
            return
          }
        } else {
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

// Catch all for /listings
router.get('/*', (req, res) => {
  if (req.isAuthenticated()) return res.redirect('/listings/upload')
  res.redirect('/auth/login')
})

module.exports = router