/**
 * Public submission routes (no auth required)
 * - POST /api/submit-resource: Resource/org submission → pending_submissions
 * - POST /api/feedback: Feedback form → feedback_responses
 */

const router = require('express').Router()
const multer = require('multer')
const db = require('../db')
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-west-2' })
const S3_BUCKET = 'cyh-mapping-frontend'
const S3_PREFIX = 'listing-images'

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    cb(null, allowed.includes(file.mimetype))
  },
})
const imageUploadFields = imageUpload.fields([
  { name: 'building_image', maxCount: 1 },
  { name: 'office_entrance_image', maxCount: 1 },
])

async function uploadImageToS3(file, prefix) {
  const ext = file.originalname.split('.').pop().toLowerCase()
  const key = `${S3_PREFIX}/pending-${prefix}-${Date.now()}.${ext}`
  await s3.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    CacheControl: 'public, max-age=31536000',
  }))
  return `/${key}`
}

function buildCategoryValue(category, customCategories) {
  let selected = []
  if (Array.isArray(category)) selected = category
  else if (typeof category === 'string') selected = category.split(',').map(s => s.trim()).filter(Boolean)
  const custom = `${customCategories || ''}`.split(/[\n;]+/).map(s => s.trim()).filter(Boolean)
  return [...new Set([...selected, ...custom])].join(' || ')
}

function serviceTypeToDelivery(v) {
  const s = (v || '').trim()
  if (/online/i.test(s) && !/telehealth/i.test(s)) return ['Online']
  if (/telehealth/i.test(s) && !/in-?person/i.test(s)) return ['Telehealth']
  if (/in-?person/i.test(s) && /telehealth/i.test(s)) return ['In-Person', 'Telehealth']
  return ['In-Person']
}

/** Check if a similar resource already exists */
async function findDuplicate(fullName, website, city) {
  const nameNorm = (fullName || '').trim().toLowerCase()
  const webNorm = (website || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
  const cityNorm = (city || '').trim().toLowerCase()

  const rows = await db.query(
    'SELECT guid, full_name, website, city FROM listings'
  )
  for (const r of rows.rows || []) {
    const existingName = (r.full_name || '').trim().toLowerCase()
    const existingWeb = (r.website || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
    const existingCity = (r.city || '').trim().toLowerCase()

    if (existingName && nameNorm && existingName === nameNorm) return { type: 'name', match: r.full_name }
    if (webNorm && existingWeb && existingWeb.includes(webNorm)) return { type: 'website', match: r.website }
    if (webNorm && existingWeb && webNorm.includes(existingWeb)) return { type: 'website', match: r.website }
    if (nameNorm && existingName && existingName.includes(nameNorm)) return { type: 'name', match: r.full_name }
    if (nameNorm && existingName && nameNorm.includes(existingName)) return { type: 'name', match: r.full_name }
  }
  return null
}

router.post('/submit-resource', imageUploadFields, async (req, res) => {
  try {
    const body = req.body || {}
    const full_name = (body.full_name || '').trim()
    const category = buildCategoryValue(body.category, body.custom_categories)
    const description = (body.description || '').trim()
    const website = (body.website || '').trim()
    const city = (body.city || '').trim()

    if (!full_name || !category || !description) {
      return res.status(400).json({ error: 'Name, at least one category, and description are required.' })
    }

    const duplicate = await findDuplicate(full_name, website, city)
    if (duplicate) {
      return res.status(400).json({
        error: 'This resource may already be in our system.',
        code: 'RESOURCE_EXISTS',
        detail: duplicate.type === 'name' ? `We found a listing named "${duplicate.match}"` : `We found a listing with a similar website.`,
      })
    }

    const kwParts = (body.service_type || 'In-Person').trim().split(',')
    if (body.faith_based === 'on' || body.faith_based === true) kwParts.push('Faith-Based')
    const keywords = `{${kwParts.join(',')}}`
    const service_delivery = JSON.stringify(serviceTypeToDelivery(body.service_type))

    let image_url = null
    let office_entrance_image_url = null
    const buildingFile = req.files?.building_image?.[0]
    const officeFile = req.files?.office_entrance_image?.[0]
    const prefix = `sub-${Date.now()}`
    if (buildingFile) image_url = await uploadImageToS3(buildingFile, prefix)
    if (officeFile) office_entrance_image_url = await uploadImageToS3(officeFile, `${prefix}-ent`)

    await db.query(
      `INSERT INTO pending_submissions (
        status, submitted_by_email, full_name, parent_organization, category, description,
        contact_name, contact_email, contact_phone, phone_1, crisis_line_number, website, program_email,
        full_address, city, service_type, age_group, keywords, service_delivery, min_age, max_age,
        eligibility_requirements, financial_information, intake_instructions, languages_offered,
        internal_directions, image_url, office_entrance_image_url, faith_based, raw_payload
      ) VALUES (
        'pending', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29
      )`,
      [
        (body.submitter_email || '').trim() || null,
        full_name,
        (body.parent_organization || '').trim() || null,
        category,
        description,
        (body.contact_name || '').trim() || null,
        (body.contact_email || '').trim() || null,
        (body.contact_phone || '').trim() || null,
        (body.phone_1 || '').trim() || null,
        (body.crisis_line_number || '').trim() || null,
        website || null,
        (body.program_email || '').trim() || null,
        (body.full_address || '').trim() || null,
        city || null,
        (body.service_type || 'In-Person').trim(),
        (body.age_group || 'Youth and Adult').trim(),
        keywords,
        service_delivery,
        body.min_age ? parseInt(body.min_age, 10) : null,
        body.max_age ? parseInt(body.max_age, 10) : null,
        (body.eligibility_requirements || '').trim() || null,
        (body.financial_information || '').trim() || null,
        (body.intake_instructions || '').trim() || null,
        (body.languages_offered || '').trim() || null,
        (body.internal_directions || '').trim() || null,
        image_url,
        office_entrance_image_url,
        body.faith_based === 'on' || body.faith_based === true,
        JSON.stringify({ ...body, _files: req.files ? Object.keys(req.files) : [] }),
      ]
    )

    return res.json({ success: true, message: 'Thank you! Your submission has been received and is pending review. We will contact you if we need more information.' })
  } catch (err) {
    console.error('Submit resource error:', err.message)
    return res.status(500).json({ error: 'Failed to submit. Please try again or contact support.' })
  }
})

router.post('/feedback', async (req, res) => {
  try {
    const body = req.body || {}
    const intent = (body.intent || body.iWantTo || '').trim()
    const message = (body.message || body.feedback || body.iWouldLikeToSay || '').trim()
    const bugDetails = (body.bug_details || body.bugDetails || '').trim()
    const listingRef = (body.listing_ref || body.listingRef || body.urlOrNameOfListing || '').trim()
    const resourceNameUrl = (body.resource_name_url || body.resourceNameUrl || body.nameAndUrlOfResource || '').trim()
    const resourceAdditional = (body.resource_additional || body.resourceAdditional || '').trim()

    await db.query(
      `INSERT INTO feedback_responses (intent, listing_ref, message, bug_details, resource_name_url, resource_additional, raw_payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [intent || null, listingRef || null, message || null, bugDetails || null, resourceNameUrl || null, resourceAdditional || null, JSON.stringify(body)]
    )

    return res.json({ success: true, message: 'Thank you for your feedback!' })
  } catch (err) {
    console.error('Feedback error:', err.message)
    return res.status(500).json({ error: 'Failed to submit feedback. Please try again.' })
  }
})

module.exports = router
