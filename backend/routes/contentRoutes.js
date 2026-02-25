const router = require('express').Router()
const { ensureLogin, checkRequirePasswordChange } = require('../middleware/routeProtection')
const stripBOM = require('strip-bom')
const { parse } = require('papaparse')
const { PAPA_PARSE_SITE_TEXT } = require('../utils/constants')
const multer = require('multer')
const upload = multer()
// this is called with three arguments: email, fieldName (the field to write to), and payload (the json to write)
const { writeToSiteMeta } = require('../utils/listingMetaUtils')

const userFriendlyError = 'Something went wrong. Please try again or contact support.'

// Protect routes & redirect new users to change their password
router.use(ensureLogin)
router.use(checkRequirePasswordChange)

router.get('/upload', (req, res) => {
  const status = req.session.status = { upload: false, preview: false, update: false }
  res.render('content/upload', { props: { 
    activeTab: 1, status, message: req.flash('message') 
  }})
})

/* ----------- POST ROUTES ----------- */
router.post('/upload', upload.single('siteText'), async (req, res, next) => {
    try {
      req.session.siteTextFilename = req.file.originalname
      req.session.siteTextJson = parse(stripBOM(req.file.buffer.toString()), PAPA_PARSE_SITE_TEXT).data[0]
      console.info(`Site text CSV successfully parsed`)
      
      // Write to postgres
      const email = req.user.email
      const writeSuccess = await writeToSiteMeta({email, fieldName: 'site_text_preview', payload: req.session.siteTextJson})
      if (writeSuccess) {
        req.session.status.upload = true
        const status = req.session.status
        // todo: save the session here
        return res.render('content/upload', { props: { 
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
  const previewURL = `${process.env.FRONTEND_URL}?api=${req.protocol}://${req.headers['x-forwarded-host'] || req.headers.host}/api-preview`
  res.render('content/preview', { props: { 
    activeTab: 3, status, previewURL, message: req.flash('message') 
  }})
})

router.get('/update', (req, res) => {
  const status = req.session.status
  status.preview = true
  res.render('content/update', { props: { 
    activeTab: 4, status, message: req.flash('message') 
  }})
})

router.post('/update', async (req, res, next) => {
  try {
    const email = req.user.email
    const writeSuccess = await writeToSiteMeta({email, fieldName: 'site_text', payload: req.session.siteTextJson})
    if (writeSuccess){
      const status = req.session.status
      status.update = true
      res.render('content/updateSuccess', {
        props: {
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
  res.render('content/updateSuccess', { props: { 
    activeTab: 4, status, message: req.flash('message') 
  }})
})

// Catch all for /content
router.get('/*', (req, res) => {
  if (req.isAuthenticated()) return res.redirect('/content/upload')
  res.redirect('/auth/login')
})

module.exports = router
