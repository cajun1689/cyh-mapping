/**
 * AI-powered tag suggestion from listing descriptions.
 * Uses OpenAI to extract service_delivery, insurance_keywords, and other tags.
 */

const { OpenAI } = require('openai')
const { INSURANCE_KEYWORDS } = require('../utils/filterConstants')

let openai = null
function getOpenAI() {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set')
    }
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return openai
}

const SERVICE_DELIVERY_OPTIONS = ['In-Person', 'Online', 'Telehealth']

const SYSTEM_PROMPT = `You analyze resource listings for youth mental health and support services. Extract structured tags from the description.

Return a JSON object with these exact keys:
- service_delivery: array of strings. Use ONLY these values: "In-Person", "Online", "Telehealth". A listing can have multiple (e.g. both In-Person and Telehealth). If the description mentions in-person visits, office visits, walk-in, or physical location, include "In-Person". If it mentions telehealth, virtual, video, phone sessions, remote, include "Telehealth". If it mentions online-only, web-based, no in-person, include "Online". Default to ["In-Person"] if unclear.
- insurance_keywords: array of strings. Extract insurance types mentioned. Use these canonical values when applicable: Medicaid, Medicare, Private Insurance, OHP, TriCare, BCBS, Cigna, Accepts Uninsured. Only include values explicitly mentioned or strongly implied.
- keywords: array of strings. Other relevant tags: Faith-Based (if faith/religious), Free, Sliding Scale, Crisis, 24/7, Bilingual, etc. Keep it short (max 5-8 tags). Only include what is clearly stated.

Be conservative. Only suggest tags that are clearly supported by the text. Return valid JSON only, no markdown.`

/**
 * Suggest tags from a listing description.
 * @param {string} description - The listing description text
 * @returns {Promise<{ service_delivery: string[], insurance_keywords: string[], keywords: string[] }>}
 */
async function suggestTagsFromDescription(description) {
  if (!description || typeof description !== 'string') {
    return { service_delivery: ['In-Person'], insurance_keywords: [], keywords: [] }
  }

  const text = description.trim().slice(0, 3000) // limit input size
  if (!text) return { service_delivery: ['In-Person'], insurance_keywords: [], keywords: [] }

  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Extract tags from this description:\n\n${text}` },
    ],
    temperature: 0.3,
    max_tokens: 400,
  })

  const content = completion.choices?.[0]?.message?.content?.trim()
  if (!content) return { service_delivery: ['In-Person'], insurance_keywords: [], keywords: [] }

  // Parse JSON (strip markdown code blocks if present)
  let parsed
  try {
    const cleaned = content.replace(/^```json?\s*|\s*```$/g, '').trim()
    parsed = JSON.parse(cleaned)
  } catch (e) {
    console.warn('AI tagging: failed to parse response', e.message)
    return { service_delivery: ['In-Person'], insurance_keywords: [], keywords: [] }
  }

  // Validate and normalize
  let service_delivery = Array.isArray(parsed.service_delivery)
    ? parsed.service_delivery
        .filter((s) => typeof s === 'string' && SERVICE_DELIVERY_OPTIONS.includes(s))
        .filter((v, i, a) => a.indexOf(v) === i)
    : ['In-Person']
  if (service_delivery.length === 0) service_delivery = ['In-Person']

  const insurance_keywords = Array.isArray(parsed.insurance_keywords)
    ? parsed.insurance_keywords
        .filter((s) => typeof s === 'string' && INSURANCE_KEYWORDS.includes(s))
        .filter((v, i, a) => a.indexOf(v) === i)
    : []

  const keywords = Array.isArray(parsed.keywords)
    ? parsed.keywords.filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim()).slice(0, 10)
    : []

  return { service_delivery, insurance_keywords, keywords }
}

module.exports = { suggestTagsFromDescription }
