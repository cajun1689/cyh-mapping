const API_KEY = process.env.GOOGLE_API_KEY
const axios = require('axios')
const wyoming = require('../utils/stateBoundaries.json').Wyoming
const isInState = (lat, long) => ((lat >= wyoming.min_lat && lat <= wyoming.max_lat) && (long >= wyoming.min_long && long <= wyoming.max_long))

const geocodeListing = async (address) => {
  try {
    const queryString = encodeURIComponent(address)

    axios.get(`https://maps.googleapis.com/maps/api/geocode/json?address=${queryString}&key=${API_KEY}`).then(res => {
      const results = res.data.results[0]
      const latitude = results.geometry?.location?.lat
      const longitude = results.geometry?.location?.lng

      if (isInState(latitude, longitude)) return listing
    }).catch(err => console.log(err))

  } catch (error) {
    console.log(error.message)
    return
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