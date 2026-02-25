const router = require('express').Router()
const { ensureLogin, checkRequirePasswordChange } = require('../middleware/routeProtection')
const stripBOM = require('strip-bom')
const { parse } = require('papaparse')
const { PAPA_PARSE_RESOURCE_LINK } = require('../utils/constants')
const multer = require('multer')
const upload = multer()
// this is called with three arguments: email, fieldName (the field to write to), and payload (the json to write)
const { createResourcePreviewEntry, createResourceEntry } = require('../utils/listingMetaUtils')

const userFriendlyError = 'Something went wrong. Please try again or contact support.'

const layout = 'layouts/contentLayout'

// Protect routes & redirect new users to change their password
router.use(ensureLogin)
router.use(checkRequirePasswordChange)

router.get('/upload', (req, res) => {
  const status = req.session.status = { upload: false, preview: false, update: false }
  res.render('resource/upload', { layout, props: { 
    activeTab: 1, activeNavTab: 'resources', status, message: req.flash('message') 
  }})
})

/* ----------- POST ROUTES ----------- */
router.post('/upload', upload.single('siteResources'), async (req, res, next) => {
    try {
      req.session.filename = req.file.originalname
      req.session.resourceJson = parse(stripBOM(req.file.buffer.toString()), PAPA_PARSE_RESOURCE_LINK).data
      console.info(`Site text CSV successfully parsed`)
      
      // Write to postgres
      const email = req.user.email
      console.log('email', email)
      const writeSuccess = await createResourcePreviewEntry({email, payload: req.session.resourceJson})
      if (writeSuccess) {
        req.session.status.upload = true
        const status = req.session.status
        // todo: save the session here
        return res.render('resource/upload', { layout, props: { 
          status, activeTab: 1, message: req.flash('message')
        }})
      }
      else throw new Error(userFriendlyError)
    } catch (error) {
      console.log(error.message)
      next(error)
    }
  }
)

router.get('/preview', (req, res) => {
  const status = req.session.status
  // http://localhost:3000/?api=http://localhost:5050/api-preview#/resources
  const previewURL = `${process.env.FRONTEND_URL}/?api=${process.env.BACKEND_URL}/api-preview#/resources`
  res.render('resource/preview', { layout, props: { 
    layout, activeNavTab: 'resources', activeTab: 2, status, previewURL, message: req.flash('message') 
  }})
})

router.get('/update', (req, res) => {
  const status = req.session.status
  status.preview = true
  res.render('resource/update', {layout, props: { 
    layout, activeNavTab: 'resources', activeTab: 3, status, message: req.flash('message') 
  }})
})

router.post('/update', async (req, res, next) => {
  try {
    const email = req.user.email
    console.log(req.session.siteTextJson)
    const writeSuccess = await createResourceEntry({email, payload: req.session.resourceJson})
    if (writeSuccess){
      const status = req.session.status
      status.update = true
      res.render('resource/updateSuccess', {
       layout, props: {
          activeTab: 4, status, message: req.flash('message') 
        }
      })
    }
  } catch {
    console.log(error.message)
    next(error)
  }  
})

router.get('/updateSuccess', (req, res) => {
  const status = req.session.status
  status.preview = true
  res.render('resource/updateSuccess', { layout, props: { 
    layout, activeNavTab: 'resources', activeTab: 3, status, message: req.flash('message') 
  }})
})

// Catch all for /content
router.get('/*', (req, res) => {
  if (req.isAuthenticated()) return res.redirect('/resources/upload')
  res.redirect('/auth/login')
})

module.exports = router
