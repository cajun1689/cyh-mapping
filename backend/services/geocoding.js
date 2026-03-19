const API_KEY = process.env.GOOGLE_API_KEY
const axios = require('axios')
const wyoming = require('../utils/stateBoundaries.json').Wyoming
const isInState = (lat, long) => ((lat >= wyoming.min_lat && lat <= wyoming.max_lat) && (long >= wyoming.min_long && long <= wyoming.max_long))

const geocodeListing = async (address) => {
  if (!address || !API_KEY) return null
  try {
    const queryString = encodeURIComponent(address)
    const res = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json?address=${queryString}&key=${API_KEY}`)
    const results = res.data?.results
    if (!results || results.length === 0) return null
    const first = results[0]
    const latitude = first.geometry?.location?.lat
    const longitude = first.geometry?.location?.lng
    if (latitude == null || longitude == null) return null
    if (isInState(latitude, longitude)) {
      return { latitude, longitude }
    }
    return null
  } catch (error) {
    console.error('geocodeListing error:', error.message)
    return null
  }
}


// this function accepts json listings and returns them, formatted for leaflet use
// export function formatListings(listings) {
//   listings = listings.filter(listing => isInWestOregon(listing.latitude, listing.longitude) || (!listing.latitude && !listing.longitude))
//   return listings.map(({latitude, longitude, ...listing}) => ({coords: [latitude, longitude], ...listing}))
// }

// router.get('/test', async (req, res, next) => {
//   try {
//     let listings = await db.query('SELECT * FROM listings')
//     if (listings?.rows) {
//       listings = listings.rows
//       // Just do the first 5 for testing
//       // listings = listings.filter((listing, index) => index <= 5)
//       const test1 = await geocodeListing(listings[0])
//       console.log(test1)
//       // const test24 = await geocodeListing(listings[24])
//       // console.log('test1', test1)
//       // console.log('test24', test24)
//     }
//   } catch (error) {
//     console.log(error.message)
//     return next(error)
//   }
// })


module.exports = { geocodeListing }