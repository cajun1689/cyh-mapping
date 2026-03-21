#!/usr/bin/env node
/**
 * Export all listings to a spreadsheet CSV for data review/fill-in tracking.
 * Includes: name, website, phone, description, tags, and all other fields.
 * Adds status columns (✓/empty) for key optional fields.
 *
 * Usage: node scripts/export-org-spreadsheet.js [output-path]
 *   Default output: org-data-spreadsheet.csv
 *
 * Data source: API (if API_URL env) or cyh-resources-enriched.csv
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })

const fs = require('fs')
const path = require('path')
const stripBOM = require('strip-bom')
const { parse, unparse } = require('papaparse')
const axios = require('axios')

const API_URL = process.env.API_URL || 'https://casperyouthhubmap.org/api'
const DEFAULT_CSV = path.resolve(__dirname, '../../cyh-resources-enriched.csv')
const DEFAULT_OUTPUT = path.resolve(__dirname, '../../org-data-spreadsheet.csv')

const FIELDS_TO_TRACK = [
  'website',
  'phone_1',
  'program_email',
  'full_address',
  'services_provided',
  'keywords',
  'cost_keywords',
  'service_delivery',
  'insurance_keywords',
  'parental_consent_required',
  'financial_information',
  'eligibility_requirements',
  'intake_instructions',
  'languages_offered',
  'image_url',
  'facebook_link',
  'instagram_link',
]

function hasValue(val) {
  if (val == null) return false
  if (Array.isArray(val)) return val.length > 0 && val.some(v => hasValue(v))
  const s = String(val).trim()
  return s.length > 0 && s !== 'null' && s !== 'undefined'
}

function toDisplay(val) {
  if (val == null || val === '') return ''
  if (Array.isArray(val)) return val.join('; ')
  return String(val)
}

function buildRow(listing) {
  const r = listing
  // Status columns first for key fields, then needs
  const needs = []
  for (const field of FIELDS_TO_TRACK) {
    if (!hasValue(r[field]) && ['website', 'phone_1', 'program_email', 'full_address', 'services_provided', 'keywords'].includes(field)) {
      needs.push(field.replace(/_/g, ' '))
    }
  }
  const row = {
    guid: r.guid,
    full_name: r.full_name || '',
    parent_organization: r.parent_organization || '',
    category: r.category || '',
    website: toDisplay(r.website),
    phone_1: toDisplay(r.phone_1),
    phone_label_1: toDisplay(r.phone_label_1),
    phone_2: toDisplay(r.phone_2),
    program_email: toDisplay(r.program_email),
    full_address: toDisplay(r.full_address),
    city: toDisplay(r.city),
    description: toDisplay(r.description),
    keywords: toDisplay(r.keywords),
    services_provided: toDisplay(r.services_provided),
    cost_keywords: toDisplay(r.cost_keywords),
    service_delivery: toDisplay(r.service_delivery),
    insurance_keywords: toDisplay(r.insurance_keywords),
    parental_consent_required: toDisplay(r.parental_consent_required),
    financial_information: toDisplay(r.financial_information),
    eligibility_requirements: toDisplay(r.eligibility_requirements),
    intake_instructions: toDisplay(r.intake_instructions),
    languages_offered: toDisplay(r.languages_offered),
    min_age: toDisplay(r.min_age),
    max_age: toDisplay(r.max_age),
    crisis_line_number: toDisplay(r.crisis_line_number),
    facebook_link: toDisplay(r.facebook_link),
    instagram_link: toDisplay(r.instagram_link),
    twitter_link: toDisplay(r.twitter_link),
    youtube_link: toDisplay(r.youtube_link),
    building_description: toDisplay(r.building_description),
    ADA_accessibility_notes: toDisplay(r.ADA_accessibility_notes),
    transit_instructions: toDisplay(r.transit_instructions),
    image_url: toDisplay(r.image_url) ? 'Yes' : '',
    agency_verified: toDisplay(r.agency_verified),
    date_agency_verified: toDisplay(r.date_agency_verified),
  }

  // Status columns: ✓ if filled, empty if not
  for (const field of FIELDS_TO_TRACK) {
    row[`${field}_status`] = hasValue(r[field]) ? '✓' : ''
  }
  row.needs = needs.join(', ')

  return row
}

async function fetchFromApi() {
  try {
    const res = await axios.get(`${API_URL}/listings`, { timeout: 15000 })
    return Array.isArray(res.data) ? res.data : []
  } catch (err) {
    console.warn('API fetch failed:', err.message)
    return null
  }
}

async function fetchFromCsv() {
  if (!fs.existsSync(DEFAULT_CSV)) return null
  const content = fs.readFileSync(DEFAULT_CSV, 'utf8')
  const parsed = parse(stripBOM(content), {
    header: true,
    skipEmptyLines: true,
    transform: (value, col) => {
      const t = (value || '').trim()
      if (t === '') return undefined
      if (col === 'keywords' || col === 'services_provided' || col === 'cost_keywords' || col === 'service_delivery' || col === 'insurance_keywords' || col === 'languages_offered') {
        return t.split(',').map(s => s.trim()).filter(Boolean)
      }
      return t
    },
  })
  return parsed.data || []
}

async function main() {
  const outputPath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_OUTPUT

  let listings = await fetchFromApi()
  if (!listings || listings.length === 0) {
    console.log('Fetching from CSV...')
    listings = await fetchFromCsv()
  }
  if (!listings || listings.length === 0) {
    console.error('No listings found. Set API_URL or ensure cyh-resources-enriched.csv exists.')
    process.exit(1)
  }

  console.log(`Exporting ${listings.length} listings...`)

  const rows = listings.map(buildRow)
  const csv = unparse(rows, { header: true })

  fs.writeFileSync(outputPath, csv, 'utf8')
  console.log(`Wrote ${outputPath}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
