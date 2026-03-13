const router = require('express').Router()
const db = require('../db')
const categories = require('../apiData/categories.json')

function ensureArray(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try { const p = JSON.parse(val); if (Array.isArray(p)) return p; } catch {}
    return [val];
  }
  return [];
}

function normalizeListing(listing) {
  if (listing.keywords) listing.keywords = ensureArray(listing.keywords);
  if (listing.cost_keywords && !Array.isArray(listing.cost_keywords)) {
    listing.cost_keywords = ensureArray(listing.cost_keywords);
  }
  if (listing.photo_urls != null) {
    if (Array.isArray(listing.photo_urls)) {
      listing.photo_urls = listing.photo_urls.filter(Boolean);
    } else if (typeof listing.photo_urls === 'string') {
      try {
        const p = JSON.parse(listing.photo_urls);
        listing.photo_urls = Array.isArray(p) ? p.filter(Boolean) : listing.photo_urls.split(',').map(s => s.trim()).filter(Boolean);
      } catch {
        listing.photo_urls = listing.photo_urls.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
  }
  return listing;
}

const { getCityCount, getCategoryCount, getKeywordCount, getListing, getResources } = require('../utils/listingMetaUtils')

// Code is similar to "api-preview.js", but they're pulling from different tables and working with different data on different routes
const queryString = 'SELECT * FROM listings'

router.get('/listings', async (req, res) => {
  try {
    const listings = await db.query(queryString)
    if (listings?.rows) return res.json(listings.rows.map(listing => normalizeListing(Object.fromEntries(Object.entries(listing).filter(e => e[1] !== null)))))
    // If there's no listings (but no error) send empty json
    return res.json({})
  } catch (error) {
    // if error - don't crash server, and don't pass the error on. send empty json.
    return res.json({})
  }
})

// Formats certain information to take processing load off the FE
router.get('/meta', async (req, res, next) => {
  try {
    const listings = await db.query(queryString)
    const resources = await getResources() ?? null
    const sponsorResult = await db.query('SELECT name, logo_url, website_url FROM sponsors ORDER BY display_order, id')
    const sponsors = sponsorResult?.rows ?? []
    if (listings?.rows) {
      const listingCities = getCityCount(listings.rows)
      const listingCategories = getCategoryCount(listings.rows)
      const listingKeywords = getKeywordCount(listings.rows)
      return res.json({ listingCategoryIcons: categories, listingCategories, listingCities, listingKeywords, resources, sponsors })
    }
    // If no metadata available
    else return res.json({ sponsors })
  } catch (error) {
    console.log(error.message)
    next(error)
  }
})

module.exports = router
