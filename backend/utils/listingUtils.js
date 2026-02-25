const { items: SCHEMA } = require('../db/listings.table.schema.json')
const db = require('../db')
const cities = require('./cities')

/*
 * SQL statements and helper objects
 */

// Only supports very basic use of JSON Schema to define column types
const JSON_TO_SQL_TYPE_MAP = {
  string: 'TEXT',
  number: 'NUMERIC',
  integer: 'INTEGER',
  array: 'TEXT',
  boolean: 'BOOLEAN'
}

const TABLE_LISTINGS_COLUMNS = Object.keys(SCHEMA.properties)
const TABLE_LISTINGS_PARAMETERS = TABLE_LISTINGS_COLUMNS.map((_, index) => `$${index + 1}`)

const DROP_TABLE_PREVIEW_LISTINGS = `
DROP TABLE IF EXISTS preview_listings;
`
const CREATE_TABLE_PREVIEW_LISTINGS = `
CREATE TABLE preview_listings (
  ${Object.entries(SCHEMA.properties).map(([column, { type }]) => [
    column.toLowerCase(), // column name
    JSON_TO_SQL_TYPE_MAP[type], // map schema type to column type
    SCHEMA.required.includes(column) ? 'NOT NULL' : null // column required
  ].filter(Boolean).join(' ')).join(`,
  `)}
);
`

const INSERT_INTO_PREVIEW_LISTINGS = `
INSERT INTO preview_listings (${TABLE_LISTINGS_COLUMNS.join(', ')}) VALUES (${TABLE_LISTINGS_PARAMETERS.join(', ')});
`

const promotePreviewListingsToProd = async (pool) => {
  try {
    // double check that preview_listings exists 
    // at this point the user has been asked to confirm the correctness of their listings 3 times so this is a check for catastrophic errors 
    const previewListingsTableExists = await pool.query('SELECT * FROM preview_listings')

    if (previewListingsTableExists) {
      // drop current prod listings
      await pool.query('DROP TABLE IF EXISTS listings')
      // create new listings table from preview_listings (which have been manually approved & tested by the user at this point in the user flow)
      const success = await pool.query('SELECT * INTO listings FROM preview_listings')
      console.log(success)
      // if it worked, drop preview_listings table
      if (success) {
        // await pool.query('DROP TABLE IF EXISTS preview_listings')
        return true
      } else { 
        return false
      }
    }
  } catch (error) {
    console.error(error)
    return error
  }
}

const CREATE_BACKUP_TRACKING_TABLE = `
  CREATE TABLE IF NOT EXISTS backup_tracking (
    id SERIAL PRIMARY KEY,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    staff_member VARCHAR(128) NOT NULL,
    table_id VARCHAR(128) NOT NULL,
    meta_data JSON
  );
`

const DROP_LISTING_BACKUP_TABLE = `DROP TABLE IF EXISTS listing_backup`
// Clones "listing" into new table called listing_backup
const CREATE_LISTING_BACKUP_TABLE = `CREATE TABLE listing_backup AS SELECT * FROM listings`

// RUN THIS AFTER USER PRESSES THE "UPDATE LISTINGS" BUTTON BEFORE DROPPING THE PREVIOUS LISTINGS TABLE AND CREATING A NEW ONE
const createBackupListingTable = async () => {
  try {
    // Drop existing listing_backup table, if any
    await db.query(DROP_LISTING_BACKUP_TABLE)
    // Clones listings into new listing_backup table
    await db.query(CREATE_LISTING_BACKUP_TABLE)
    return true
  } catch (error) {
    console.log(error.message)
    return false
  }
}

const CREATE_META_TABLE = `CREATE TABLE IF NOT EXISTS meta (
  date TIMESTAMPTZ NOT NULL DEFAULT NOW() PRIMARY KEY,
  email VARCHAR(128) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  listing_count INTEGER
);`

// Create record of update to "listing" table.
// Run this after map has been successfully updated
const createMetaEntry = async (email, fileName) => {
  try {
    await db.query(CREATE_META_TABLE)
    const listingCount = (await db.query('SELECT * FROM listings')).rows.length
    // Create record of the data update that just happened 
    await db.query(`SET timezone = 'PST8PDT'`)
    await db.query('INSERT INTO meta (email, file_name, listing_count) VALUES ($1, $2, $3) RETURNING *', [email, fileName, listingCount])
    return true
  } catch (error) {
    console.log(error.message)
    return false
  }
}

const getLastUpdate = async () => {
  try {
    const lastUpdate = await db.query(`SELECT * FROM meta ORDER BY date DESC`)
    // Return info for most recent update
    if (lastUpdate.rows) return lastUpdate.rows[0]
  } catch (error) {
    console.log(error.message)
    return false
  }
}

/* Utils for processing listings before writing to DB */

// Splits category string in two and adds 2 new fields to listing. This saves work on the FE
const splitCategory = (listing) => {
  if (listing.category?.includes(':')) {
    const [ parentCategory, subCategory ] = listing.category.split(`: `)
    listing.parentCategory = parentCategory
    listing.subCategory = subCategory
    return listing
  }
  return listing
}

// Programatically add "city" column to each listing. Tested [X]
const addCity = (listing) => {
  // I tried to do this programatically with Regex, but there are too many variables with the ways our addresses are formatted. This was the only reasonably sure way to proceed.
  let listingCity;
  cities.forEach((city) => { 
    if (listing.full_address?.includes(city)) { listingCity = city }
  })
  listing.city = listingCity ?? null
  return listing
}


module.exports = { 
  promotePreviewListingsToProd, createBackupListingTable, createMetaEntry, getLastUpdate, splitCategory, addCity,
  TABLE_LISTINGS_COLUMNS, DROP_TABLE_PREVIEW_LISTINGS, CREATE_TABLE_PREVIEW_LISTINGS, INSERT_INTO_PREVIEW_LISTINGS 
}
