const router = require('express').Router()
const { OpenAI } = require('openai')
const db = require('../db')
const {
  buildSystemPrompt,
  detectCrisis,
  validateResponse,
  filterValidGuids,
  CRISIS_RESPONSE,
} = require('../utils/chatContext')

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

const MAX_HISTORY = 10
const LISTING_CACHE_TTL = 5 * 60 * 1000
let listingCache = { data: null, validGuids: null, systemPrompt: null, ts: 0 }

async function getListingsAndPrompt() {
  if (listingCache.data && Date.now() - listingCache.ts < LISTING_CACHE_TTL) {
    return listingCache
  }

  const result = await db.query('SELECT * FROM listings')
  const listings = result?.rows || []
  const validGuids = listings.map(l => l.guid)
  const systemPrompt = buildSystemPrompt(listings)

  listingCache = { data: listings, validGuids, systemPrompt, ts: Date.now() }
  return listingCache
}

router.post('/', async (req, res) => {
  try {
    const { message, history = [], latitude, longitude } = req.body

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' })
    }

    if (message.trim().length > 1000) {
      return res.status(400).json({ error: 'Message too long (max 1000 characters)' })
    }

    if (detectCrisis(message)) {
      return res.json(CRISIS_RESPONSE)
    }

    const { validGuids, systemPrompt } = await getListingsAndPrompt()

    const trimmedHistory = history.slice(-MAX_HISTORY).map(h => ({
      role: h.role === 'assistant' ? 'assistant' : 'user',
      content: String(h.content).slice(0, 1000),
    }))

    let userContent = message.trim()
    if (typeof latitude === 'number' && typeof longitude === 'number' &&
        isFinite(latitude) && isFinite(longitude)) {
      userContent += `\n[User GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}]`
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...trimmedHistory,
      { role: 'user', content: userContent },
    ]

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices?.[0]?.message?.content || '{}'

    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = { message: raw, guids: [], crisis: false }
    }

    const responseMessage = parsed.message || "I'm not sure how to help with that. Could you tell me more about what kind of support you're looking for?"
    const guids = Array.isArray(parsed.guids) ? filterValidGuids(parsed.guids, validGuids) : []
    const isCrisis = parsed.crisis === true

    if (!validateResponse(responseMessage, validGuids)) {
      return res.json({
        message: "I want to make sure you get the right help. I can help you find resources and services in Wyoming — could you tell me more about what you're looking for?",
        recommendedGuids: [],
        isCrisis: false,
      })
    }

    if (isCrisis) {
      return res.json(CRISIS_RESPONSE)
    }

    return res.json({
      message: responseMessage,
      recommendedGuids: guids,
      isCrisis: false,
    })
  } catch (error) {
    console.error('Chat API error:', error.message)

    if (error?.status === 429) {
      return res.status(429).json({
        message: "I'm getting a lot of questions right now! Please try again in a moment.",
        recommendedGuids: [],
        isCrisis: false,
      })
    }

    return res.status(500).json({
      message: "Sorry, I'm having trouble right now. Please try again in a moment, or use the map to browse resources directly.",
      recommendedGuids: [],
      isCrisis: false,
    })
  }
})

module.exports = router
