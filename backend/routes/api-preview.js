const router = require('express').Router()
const db = require('../db')
const categories = require('../apiData/categories.json')
const { getCityCount, getCategoryCount, getKeywordCount, getPreviewResources } = require('../utils/listingMetaUtils')
const { getPreviewListing } = require('../utils/listingMetaUtils')

// Code is similar to "api.js", but they're pulling from different tables and working with different data on different routes
const queryString = 'SELECT * FROM preview_listings'

router.get('/listings', async (req, res, next) => {
  try {
    const listings = await db.query(queryString)
    if (listings?.rows) return res.json(listings.rows.map(listing => Object.fromEntries(Object.entries(listing).filter(e => e[1] !== null))))
    // If there's no listings (but no error) send empty json
    return res.json({})
  } catch (error) {
    // if error - don't crash server, and don't pass the error on. send empty json.
    res.json({})
    return next(error)
  }
})

router.get('/meta', async (req, res, next) => {
  try {
    const listings = await db.query(queryString)
    const resources = await getPreviewResources() ?? null
    if (listings?.rows) {
      const listingCities = getCityCount(listings.rows)
      const listingCategories = getCategoryCount(listings.rows)
      const listingKeywords = getKeywordCount(listings.rows)
      return res.json({ listingCategoryIcons: categories, listingCategories, listingCities, listingKeywords, resources })
    }
    // If no metadata available
    else return res.json({})
  } catch (error) {
    console.log(error.message)
    next(error)
  }
})

module.exports = router
