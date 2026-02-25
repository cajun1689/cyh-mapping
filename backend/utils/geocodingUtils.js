const db = require('../db')
const CREATE_TABLE_GEOCODING = `
CREATE TABLE geocoding AS
SELECT listings.guid, listings.full_address, listings.latitude, listings.longitude
FROM listings 
WHERE (full_address <> '') AND (latitude <> '') AND (longitude <> '');`

const readFromGeocodingTable = async () => {
  try {
    const res = await db.query(`SELECT * FROM geocoding WHERE (full_address <> '');`)
    const data = res.rows

    // Data is an array. We need it to be an object with guids as keys
    let geocodingObj = {}

    for (let i=0; i< data.length; i++) { 
      geocodingObj[data[i].guid] = { 
        full_address: data[i].full_address, latitude: data[i].latitude, longitude: data[i].longitude 
      }
    }

    return geocodingObj
  } catch (error) {
    console.log('Geocoding read error: ', error.message)
    return error 
  }
}

const geocodeFromExisting = async (listings) => {
  const prevGeoData = await readFromGeocodingTable()
  return listings.map(listing => {
    // See if we already have coords for this listing
    if (prevGeoData[listing.guid]) {
      let geoListing = prevGeoData[listing.guid]
      // See if the new address matches the old. If not, we'll skip it and geocode it fresh in a later step.
      if (listing.full_address === geoListing.full_address) {
        listing.latitude = geoListing.latitude
        listing.longitude = geoListing.longitude
      }
    }
    return listing
  })
}

// Geocoding table helper functions
const updateGeocodingTable = async (dataObj) => {
  try {
    // Destructuring args this way will throw an error if any are null, which is what we want
    const { guid, full_address, latitude, longitude } = dataObj
    const res = await db.query(`INSERT INTO geocoding VALUES ($1, $2, $3, $4) RETURNING *`, [guid, full_address, latitude, longitude])
    
    res.rows[0] ? true : false
  } catch (error) {
    console.log('Geocoding write error: ', error.message)
    return error 
  }
}

const recreateGeocodingTable = async () => {
  try {
    await db.query('DROP TABLE IF EXISTS geocoding;')
    const res = await db.query(CREATE_TABLE_GEOCODING)
    console.log(res)
    return true
  } catch (error) {
    console.log('recreate Geocoding table error', error.message)
  }
}



module.exports = { readFromGeocodingTable, updateGeocodingTable, geocodeFromExisting, recreateGeocodingTable }