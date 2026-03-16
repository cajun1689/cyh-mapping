#!/usr/bin/env node
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
/**
 * Data enrichment script: fetches live listings from the API, scrapes organization
 * websites for form-mapped fields, and outputs an enriched CSV for admin upload.
 *
 * Form fields we try to fill (from docs/google-form-questions.md):
 * - program_email, phone_1, website, crisis_line_number
 * - financial_information, eligibility_requirements, intake_instructions
 * - languages_offered, building_description, ADA_accessibility_notes, transit_instructions
 * - facebook_link, instagram_link, tiktok_link, youtube_link, twitter_link, blog_link
 * - description (when empty/short or we find a better one from meta or page content)
 *
 * Run: cd backend && npm run enrich
 * Or:  node scripts/enrich-from-web.js [--api-url URL] [--limit N] [--delay MS]
 *
 * Output: cyh-resources-enriched.csv (review before uploading via admin panel)
 */

const fs = require('fs')
const path = require('path')
const { unparse } = require('papaparse')
const axios = require('axios')
const TABLE_COLUMNS = Object.keys(require('../db/listings.table.schema.json').items.properties)

const API_URL = process.env.API_URL || 'https://casperyouthhubmap.org/api'
const OUTPUT_CSV = path.resolve(__dirname, '../../cyh-resources-enriched.csv')
const DELAY_MS = parseInt(process.env.DELAY_MS || '1500', 10)
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : null
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
const STREET_VIEW_SIZE = '640x400'

const PHONE_REGEX = /\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}|1[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const MAILTO_REGEX = /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi

const FIELDS_TO_ENRICH = [
  'program_email', 'phone_1', 'website', 'crisis_line_number',
  'financial_information', 'eligibility_requirements', 'intake_instructions',
  'languages_offered', 'building_description', 'ADA_accessibility_notes', 'transit_instructions',
  'facebook_link', 'instagram_link', 'tiktok_link', 'youtube_link', 'twitter_link', 'blog_link'
]

const FINANCIAL_PATTERNS = [
  /medicaid\s*(?:accepted|eligible)?/i,
  /medicare\s*(?:accepted|eligible)?/i,
  /sliding\s*(?:fee\s*)?scale/i,
  /free\s*(?:and\s*confidential|services?)?/i,
  /insurance\s*(?:accepted|accepted)?/i,
  /no\s*cost|no-cost/i,
  /low\s*cost|low-cost/i,
  /ohp\s*(?:accepted|eligible)?/i,
  /bcbs|blue\s*cross/i,
  /grant\s*funding/i,
  /payment\s*plan/i,
  /cash\s*rate/i
]

const SOCIAL_PATTERNS = {
  facebook_link: /https?:\/\/(?:www\.)?facebook\.com\/[^\s"']+/g,
  instagram_link: /https?:\/\/(?:www\.)?instagram\.com\/[^\s"']+/g,
  tiktok_link: /https?:\/\/(?:www\.)?tiktok\.com\/[^\s"']+/g,
  youtube_link: /https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/[^\s"']+/g,
  twitter_link: /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[^\s"']+/g,
  blog_link: /https?:\/\/[^\s"']+(?:blog|newsletter)[^\s"']*/gi
}

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function getStreetViewUrl (listing) {
  if (!GOOGLE_API_KEY) return null
  if (listing.image_url) return null // Don't overwrite existing photos
  let location = null
  if (listing.latitude && listing.longitude) {
    location = `${listing.latitude},${listing.longitude}`
  } else if (listing.full_address && listing.full_address.trim()) {
    location = encodeURIComponent(listing.full_address.trim())
  }
  if (!location) return null
  try {
    const metaRes = await axios.get(
      `https://maps.googleapis.com/maps/api/streetview/metadata?location=${location}&key=${GOOGLE_API_KEY}`,
      { timeout: 5000 }
    )
    if (metaRes.data?.status !== 'OK') return null
    const url = `https://maps.googleapis.com/maps/api/streetview?size=${STREET_VIEW_SIZE}&location=${location}&key=${GOOGLE_API_KEY}`
    return url
  } catch {
    return null
  }
}

const PHONE_PLACEHOLDER = /^(555|123|000|111|999)\d{7}$|^1234567890$|^5550100$/

function extractPhones (text) {
  if (!text || typeof text !== 'string') return []
  const matches = text.match(PHONE_REGEX) || []
  const seen = new Set()
  return matches.filter(m => {
    const digits = m.replace(/\D/g, '').slice(-10)
    if (seen.has(digits) || digits.length < 10) return false
    if (PHONE_PLACEHOLDER.test(digits)) return false
    seen.add(digits)
    return true
  })
}

const EMAIL_PLACEHOLDER = /noreply|no-reply|donotreply|@sentry|@domain\.|example\.com|user@|test@|placeholder|sample@|yourname|yourcompany|your@|name@|email@|contact@example|info@domain|@mail\.com|@email\.com|\.(png|jpg|jpeg|gif|svg|woff|woff2|ttf|css|js)$/i

function extractEmails (text) {
  if (!text || typeof text !== 'string') return []
  const mailtos = [...text.matchAll(MAILTO_REGEX)].map(m => m[1].toLowerCase())
  const plain = (text.match(EMAIL_REGEX) || []).map(e => e.toLowerCase())
  const combined = [...new Set([...mailtos, ...plain])]
  return combined.filter(e => !EMAIL_PLACEHOLDER.test(e) && e.includes('.'))
}

const GENERIC_PLACEHOLDER = /lorem\s+ipsum|insert\s+text|add\s+your|coming\s+soon|placeholder\s+text|example\s+text|your\s+text\s+here/i

function extractFinancial (text) {
  if (!text || typeof text !== 'string') return null
  if (GENERIC_PLACEHOLDER.test(text)) return null
  const snippets = []
  for (const re of FINANCIAL_PATTERNS) {
    const m = text.match(re)
    if (m) snippets.push(m[0])
  }
  if (snippets.length === 0) return null
  return [...new Set(snippets)].join('. ')
}

const SOCIAL_PLACEHOLDER = /facebook\.com\/#|instagram\.com\/#|youtube\.com\/#|twitter\.com\/#|tiktok\.com\/#|example\.com|placeholder|your-page|yourprofile/i

function extractSocialLinks (text) {
  const out = {}
  for (const [field, re] of Object.entries(SOCIAL_PATTERNS)) {
    const m = text.match(re)
    if (m) {
      const url = m[0].replace(/['"]/g, '').split(/[\s>)]/)[0]
      if (url && !SOCIAL_PLACEHOLDER.test(url)) out[field] = url
    }
  }
  return out
}

function extractLanguages (text) {
  if (!text || typeof text !== 'string') return null
  const m = text.match(/(?:languages?|spoken|offered|available)[:\s]+([^.]+)/i)
  if (m) {
    const langs = m[1].split(/[,;]|\band\b/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 30)
    if (langs.length > 0) return langs
  }
  if (/\bspanish\b/i.test(text) || /\bespañol\b/i.test(text)) return ['English', 'Spanish']
  return null
}

function extractAccessibility (text) {
  if (!text || typeof text !== 'string') return {}
  const ada = text.match(/(?:accessible|wheelchair|elevator|ramp|ada)[^.]{0,80}/gi)
  const transit = text.match(/(?:transit|bus\s*route|parking|public\s*transport)[^.]{0,80}/gi)
  return {
    ADA_accessibility_notes: ada ? ada[0].trim() : null,
    transit_instructions: transit ? transit[0].trim() : null
  }
}

function extractIntake (text) {
  if (!text || typeof text !== 'string') return null
  if (GENERIC_PLACEHOLDER.test(text)) return null
  const m = text.match(/(?:call\s*to\s*schedule|walk[- ]?in|appointment|intake|how\s*to\s*access|get\s*started)[^.]{0,120}/i)
  return m ? m[0].trim() : null
}

const DESCRIPTION_MIN_LEN = 40
const DESCRIPTION_MAX_LEN = 450

function extractDescription (html) {
  if (!html || typeof html !== 'string') return null
  let desc = null
  const metaDesc = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)
  const ogDesc = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i)
  if (metaDesc && metaDesc[1]) desc = metaDesc[1]
  else if (ogDesc && ogDesc[1]) desc = ogDesc[1]
  if (!desc) {
    const p = html.match(/<p[^>]*>([^<]{80,})<\/p>/i)
    if (p) desc = p[1].replace(/<[^>]+>/g, '')
  }
  if (!desc || typeof desc !== 'string') return null
  desc = desc.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  desc = desc.replace(/\s+/g, ' ').trim()
  if (GENERIC_PLACEHOLDER.test(desc)) return null
  if (desc.length < DESCRIPTION_MIN_LEN) return null
  if (desc.length > DESCRIPTION_MAX_LEN) desc = desc.slice(0, DESCRIPTION_MAX_LEN - 3) + '...'
  return desc
}

function shouldUpdateDescription (existing, extracted) {
  if (!extracted) return false
  const cur = (existing || '').trim()
  if (cur.length < DESCRIPTION_MIN_LEN) return true
  if (GENERIC_PLACEHOLDER.test(cur)) return true
  if (extracted.length >= cur.length * 1.3) return true
  return false
}

async function fetchPage (url) {
  try {
    const res = await axios.get(url, {
      timeout: 10000,
      maxRedirects: 3,
      responseType: 'text',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CYHMappingBot/1.0; +https://casperyouthhubmap.org)' },
      validateStatus: (s) => s < 400
    })
    return typeof res.data === 'string' ? res.data : null
  } catch {
    return null
  }
}

function listingToCsvRow (listing) {
  const row = {}
  for (const col of TABLE_COLUMNS) {
    let v = listing[col]
    if (Array.isArray(v)) v = v.join(',')
    row[col] = v ?? ''
  }
  return row
}

async function enrichListing (listing, index, total) {
  const updates = {}
  const url = listing.website && listing.website.startsWith('http') ? listing.website : null

  if (!url) return listing

  process.stdout.write(`  [${index + 1}/${total}] ${listing.full_name?.slice(0, 40)}... `)
  const html = await fetchPage(url)
  if (!html || typeof html !== 'string' || html.length < 100) {
    process.stdout.write('skip\n')
    return listing
  }

  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')

  const phones = extractPhones(html)
  const emails = extractEmails(html)
  const financial = extractFinancial(text)
  const social = extractSocialLinks(html)
  const langs = extractLanguages(text)
  const { ADA_accessibility_notes, transit_instructions } = extractAccessibility(text)
  const intake = extractIntake(text)
  const description = extractDescription(html)

  if (phones.length > 0 && !listing.phone_1) updates.phone_1 = phones[0]
  if (description && shouldUpdateDescription(listing.description, description)) {
    updates.description = description
  }
  if (emails.length > 0 && !listing.program_email) {
    const valid = emails.filter(e => !/facebook|google|wix|sentry|gravatar|w3\.org|schema\.org/.test(e))
    if (valid.length > 0) updates.program_email = valid[0]
  }
  if (financial && !listing.financial_information) updates.financial_information = financial
  if (langs && !listing.languages_offered) updates.languages_offered = Array.isArray(langs) ? langs : [langs]
  if (intake && !listing.intake_instructions) updates.intake_instructions = intake
  if (ADA_accessibility_notes && !listing.ADA_accessibility_notes) updates.ADA_accessibility_notes = ADA_accessibility_notes
  if (transit_instructions && !listing.transit_instructions) updates.transit_instructions = transit_instructions

  for (const [k, v] of Object.entries(social)) {
    if (v && !listing[k]) updates[k] = v
  }

  const changed = Object.keys(updates).length
  process.stdout.write(changed ? `+${changed} fields\n` : 'no new data\n')

  return { ...listing, ...updates }
}

async function addStreetView (listing, index, total) {
  if (listing.image_url) return listing
  const location = listing.full_address || (listing.latitude && listing.longitude)
  if (!location) return listing
  process.stdout.write(`  [${index + 1}/${total}] Street View ${listing.full_name?.slice(0, 35)}... `)
  const url = await getStreetViewUrl(listing)
  if (url) {
    process.stdout.write('✓\n')
    return { ...listing, image_url: url }
  }
  process.stdout.write('—\n')
  return listing
}

async function main () {
  const args = process.argv.slice(2)
  let apiUrl = API_URL
  let limit = LIMIT
  let delay = DELAY_MS
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--api-url' && args[i + 1]) apiUrl = args[++i]
    else if (args[i] === '--limit' && args[i + 1]) limit = parseInt(args[++i], 10)
    else if (args[i] === '--delay' && args[i + 1]) delay = parseInt(args[++i], 10)
  }

  console.log('Fetching listings from', `${apiUrl}/listings`)
  const res = await axios.get(`${apiUrl}/listings`, { timeout: 15000 })
  let listings = res.data
  if (!Array.isArray(listings)) {
    console.error('API did not return an array')
    process.exit(1)
  }

  if (limit) {
    listings = listings.slice(0, limit)
    console.log(`Limited to ${limit} listings`)
  }

  const withWebsite = listings.filter(l => l.website && l.website.startsWith('http'))
  console.log(`Total: ${listings.length} | With website: ${withWebsite.length}`)
  console.log(`Enriching (delay ${delay}ms)...\n`)

  let enriched = []
  for (let i = 0; i < listings.length; i++) {
    enriched.push(await enrichListing(listings[i], i, listings.length))
    if (i < listings.length - 1) await sleep(delay)
  }

  // Street View / Places auto-photos disabled – only show manually uploaded photos

  const rows = enriched.map(listingToCsvRow)
  const csv = unparse(rows, { header: true })
  fs.writeFileSync(OUTPUT_CSV, csv, 'utf8')

  console.log(`\nWrote ${OUTPUT_CSV}`)
  if (limit) {
    console.log('⚠️  LIMIT was set – output has only', limit, 'listings. Run without LIMIT for full dataset.')
  }
  console.log('Review before uploading via admin panel (Listings > Upload).')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
