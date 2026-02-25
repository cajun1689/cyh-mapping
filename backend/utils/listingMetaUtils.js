const cities = require('./cities')
const db = require('../db')

const getCategoryCount = (listings) => {
  let listingCategories = {}
  listings.forEach((listing) => {
    const [ parentCategory, subCategory ] = listing.category.split(`: `)
    if (!listingCategories[`${parentCategory}`]) listingCategories[`${parentCategory}`] = {}
    if (!listingCategories[`${parentCategory}`][`${subCategory}`]) listingCategories[`${parentCategory}`][`${subCategory}`] = 1
    else listingCategories[`${parentCategory}`][`${subCategory}`] ++
  })
  return listingCategories
}

const getKeywordCount = listings => {
  let keywordCount = {}
  listings.forEach((listing) => {
    if (listing.keywords) {
      listing.keywords.forEach((keyword) => {
        if (!keywordCount[`${keyword}`]) keywordCount[`${keyword}`] = 1
        else keywordCount[`${keyword}`] ++
      })
    }
  })
  return keywordCount
}

const getParentAgencies = listings => {
  // Returns an array of all unique parent agency names
  let parentAgencies = [...new Set(listings.filter(e => e.parent_organization !== null).map(e => e.parent_organization))]
  let parentAgenciesCount = { uncategorized: {} }
  parentAgencies.forEach(agency => parentAgenciesCount[`${agency}`] = {})

  listings.forEach((listing) => {
    let parentOrg = listing.parent_organization ?? null
    let name = listing.full_name
    if (parentOrg) {
      if (!parentAgenciesCount[`${parentOrg}`][`${name}`]) {
        parentAgenciesCount[`${parentOrg}`][`${name}`] = 1
      } else {
        parentAgenciesCount[`${parentOrg}`][`${name}`] ++
      }
    // If no parent org, put it in "uncategorized"  
    } else {
      if (!parentAgenciesCount.uncategorized[`${name}`]) {
        parentAgenciesCount.uncategorized[`${name}`] = 1
      } else {
        parentAgenciesCount.uncategorized[`${name}`] ++
      }
    } 
  })
  return parentAgenciesCount   
}

const getCityCount = listings => {
  let cityCount = {}
  cities.forEach((e) => cityCount[e] = 0)
    listings.forEach((listing) => {
    cities.forEach((city) => {
      if (listing.city?.toLowerCase() === city.toLowerCase()) {
        cityCount[city] ++
      }
    })
  })
  // Filter out cities with no entries
  return Object.fromEntries(Object.entries(cityCount).filter(([k, v]) => v !== 0))
}

const cost = ["Low Cost", "Free", "OHP", "Accepts Uninsured", "Sliding Scale", "Financial Aid Available"]

const addCostToListing = listing => {
  if (!listing) return
  if (listing.keywords) {
    let keywords = listing.keywords
    // Grab cost-related keywords out of the general keywords array
    const costKeywords = keywords.filter(keyword => cost.includes(keyword))

    // Patch until we fix this in the data. Currently, we have to combine two arrays to get all the right keywords
    // FE is expecting array named "cost"
    if (listing.cost_keywords) {
      // Combine both arrays with no duplicates
      listing.cost_keywords = removeDuplicates(costKeywords, listing.cost_keywords)
    }
    else listing.cost_keywords = costKeywords

    // Remove cost keywords from main keywords array. Eventually, this will be done in the data. For now, this patch works.
    keywords = keywords.filter(keyword => !cost.includes(keyword)) 
    listing.keywords = keywords
    return listing;
  }
  return listing;
}


// Takes two arrays and returns a single combined array with no repeated elements
const removeDuplicates = (arr1, arr2) => {
  let combinedArray = [...arr1, ...arr2]
  return combinedArray.filter((item, index) => combinedArray.indexOf(item) === index)
}

// CREATE TABLE IF NOT EXISTS listing (
//   id SERIAL PRIMARY KEY,
//   date DATE DEFAULT NOW(),
//   email VARCHAR(180), 
//   preview_listing JSONB,
//   listing JSONB
// );



const testJson = require('../services/testListings.json')

const createListingEntry = async (date, email, type, listings) => {
  try {
    if (type === 'preview') {
      const stringifiedListings = JSON.stringify(listings)
      const res = await db.query('INSERT INTO listing (date, email, preview_listing) VALUES ($1, $2, $3) RETURNING *', [date, email, stringifiedListings])
      if (res && res.rows) console.log(res.rows[0]); return;
    }
    if (type === 'listing') {
      const stringifiedListings = JSON.stringify(listings)
      const res = await db.query('INSERT INTO listing (date, email, listing) VALUES ($1, $2, $3) RETURNING *', [date, email, stringifiedListings])
      if (res && res.rows) console.log(res.rows[0]); return;
    }
  } catch (error) {
    console.log(error)
    return
  }
}

// THIS WORKS.
const getPreviewListing = async () => {
  try {
    // Select most recent row with preview data
    const res = await db.query('SELECT * FROM listing WHERE preview_listing IS NOT NULL ORDER BY date DESC FETCH FIRST ROW ONLY')
    if (res && res.rows.length > 0) {
      // Syntax that node pg module uses
      const listings = res.rows[0].preview_listing
      return listings
    }
    else return null
  } catch (error) {
    console.log(error)
    return
  }
}

const getPreviewListingMeta = async () => {
  try {
    // Select most recent row with preview data
    const res = await db.query('SELECT date, email FROM listing WHERE preview_listing IS NOT NULL ORDER BY date DESC FETCH FIRST ROW ONLY')
    if (res && res.rows.length > 0) console.log(res.rows[0])
    else console.log(false)
  } catch (error) {
    console.log(error)
    return
  }
}

const getListingMeta = async () => {
  try {
    // Select most recent row with preview data
    const res = await db.query('SELECT date, email FROM listing WHERE listing IS NOT NULL ORDER BY date DESC FETCH FIRST ROW ONLY')
    if (res && res.rows.length > 0) console.log(res.rows[0])
    else console.log(false)
  } catch (error) {
    console.log(error)
    return
  }
}

const getListing = async () => {
  try {
    // Select most recent row with preview data
    const res = await db.query('SELECT listing FROM listing WHERE listing IS NOT NULL ORDER BY date DESC FETCH FIRST ROW ONLY')
    if (res && res.rows.length > 0) {
      // Syntax that node pg module uses
      const listings = res.rows[0].listing
      return listings
    }
    else return null
  } catch (error) {
    console.log(error)
    return
  }
}

const writeToListing = async () => {
  let date = new Date()
  const res = await createListingEntry(date, email, 'listing', testJson)
  if (res && res.rows) return res.rows
}

const writeToPreviewListing = async () => {
  let date = new Date()
  const res = await createListingEntry(date, email, 'preview', testJson)
  if (res && res.rows) return res.rows
}


const test = async () => {
  try {
    let currentListings = await db.query('SELECT * FROM listings') 
        // Filter out null values
    if (currentListings) {
      currentListings = currentListings.rows.map(listing => Object.fromEntries(Object.entries(listing).filter(e => e[1] !== null)))
      const date = new Date() 
      const stringifiedListings = JSON.stringify(currentListings)
      const res = await db.query('INSERT INTO listing (date, email, preview_listing) VALUES ($1, $2, $3) RETURNING *', [date, 'winterrunion@gmail.com', stringifiedListings])
      if (res && res.rows) {
        console.log(res.rows)
      }
    }    

    else {
      console.log('something went wrong')
      return false
    }
  } catch (error) {
    console.log(error)
    return
  }
}

const writeToSiteMeta = async ({email, fieldName, payload}) => {
  try {
    const createTable = await db.query(`CREATE TABLE IF NOT EXISTS site_meta (
        id SERIAL PRIMARY KEY,
        date TIMESTAMPTZ DEFAULT NOW(),
        email VARCHAR(180),
        resource_preview JSONB,
        resource JSONB,
        listing_meta_preview JSONB,
        listing_meta JSONB,
        categories_preview JSONB,
        categories JSONB,
        site_text_preview JSONB,
        site_text JSONB
      );`);
    if (createTable) {
      const date = new Date()
      const jsonPayload = JSON.stringify(payload)
      const queryString =`INSERT INTO site_meta (date, email, ${fieldName}) VALUES ($1, $2, $3) RETURNING *;`
      const insert = await db.query(queryString, [date, email, jsonPayload])
      // Success. Explanation: if a node pg query is succesful, it sends back data as `res.rows.` If there's at least one row in that array, the query operation was a success.
      if (insert?.rows?.[0]) {
        console.log(insert.rows[0])
        return insert.rows[0]
      }
    }  
    else return null
  } catch (error) {
    console.log(error.message)
    return
  }
}

// site_text: 

const getSiteMeta = async ({preview = false}) => {
  try {
    let queryString 
    if (preview) {
      queryString = 'SELECT site_text_preview FROM site_meta WHERE site_text IS NOT NULL ORDER BY date DESC FETCH FIRST ROW ONLY'
    }
    queryString = 'SELECT site_text FROM site_meta WHERE site_text IS NOT NULL ORDER BY date DESC FETCH FIRST ROW ONLY'
    const siteText = await db.query(queryString)
    // Query success
    if (siteText?.rows?.[0]) {
      const res = siteText.rows[0]
      return res
    }
  else return null
  // else return res.json({ about_text: '', disclaimer: '', footer_disclaimer: '', video_tutorial_link: '', rubric_text: ''})  
  } catch (error) {
    console.log(error.message)
    next(error)
  }
}

const getResources = async (preview = false) => {
  try {
    let queryString 
    if (preview) {
      queryString = 'SELECT resource_preview FROM resource WHERE resource_preview IS NOT NULL ORDER BY date DESC FETCH FIRST ROW ONLY'
    }
    queryString = 'SELECT resource FROM resource WHERE resource IS NOT NULL ORDER BY date DESC FETCH FIRST ROW ONLY'
    const siteText = await db.query(queryString)
    // Query success
    if (siteText?.rows?.[0]) {
      const res = siteText.rows[0].resource
      return res
    }
    else return null
  } catch (error) {
    console.log(error.message)
    return
  }
}

const getPreviewResources = async () => {
  try {
    const queryResult = await db.query('SELECT resource_preview FROM resource WHERE resource_preview IS NOT NULL ORDER BY date DESC FETCH FIRST ROW ONLY')
    // Query success
    if (queryResult?.rows?.[0]) {
      const res = queryResult.rows[0].resource_preview
      return res
    }
    else return null
  } catch (error) {
    console.log(error.message)
    return
  }
}

const createResourceEntry = async ({email, payload}) => {
  try {
    const createTable = await db.query(`CREATE TABLE IF NOT EXISTS resource (
      id SERIAL PRIMARY KEY,
      date TIMESTAMPTZ DEFAULT NOW(),
      email VARCHAR(180),
      resource_preview JSONB,
      resource JSONB
    );`);
    if (createTable) {
      const date = new Date()
      const jsonPayload = JSON.stringify(payload)
      const queryString =`INSERT INTO resource (date, email, resource) VALUES ($1, $2, $3) RETURNING *;`
      const insert = await db.query(queryString, [date, email, jsonPayload])
      // Success. Explanation: if a node pg query is succesful, it sends back data as `res.rows.` If there's at least one row in that array, the query operation was a success.
      if (insert?.rows?.[0]) {
        console.log(insert.rows[0])
        return insert.rows[0]
      }
    }  
    else return null
  } catch (error) {
    console.log(error.message)
    return
  }
}

const createResourcePreviewEntry = async ({email, payload}) => {
  try {
    const createTable = await db.query(`CREATE TABLE IF NOT EXISTS resource (
      id SERIAL PRIMARY KEY,
      date TIMESTAMPTZ DEFAULT NOW(),
      email VARCHAR(180),
      resource_preview JSONB,
      resource JSONB
    );`);
    if (createTable) {
      const date = new Date()
      const jsonPayload = JSON.stringify(payload)
      const queryString =`INSERT INTO resource (date, email, resource_preview) VALUES ($1, $2, $3) RETURNING *;`
      const insert = await db.query(queryString, [date, email, jsonPayload])
      if (insert?.rows?.[0]) {
        console.log(insert.rows[0])
        return insert.rows[0]
      }
    }  
    else return null
  } catch (error) {
    console.log(error.message)
    return
  }
}

// getPreviewListingMeta()
// getPreviewListing()
// getListing()
// test()
// getListingMeta()

module.exports = { 
  getCityCount, getCategoryCount, getKeywordCount, getParentAgencies, addCostToListing, getResources,
  getPreviewListing, getPreviewListingMeta, getListingMeta, getListing, writeToPreviewListing, writeToListing, getSiteMeta, writeToSiteMeta,
  createResourcePreviewEntry, createResourceEntry, getPreviewResources
}