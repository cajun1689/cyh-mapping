// View Google Maps API documentation at: https://developers.google.com/maps/documentation/geocoding/start
const API_KEY = process.env.GOOGLE_API_KEY
const axios = require('axios')

// Filters out outliers that will skew the map view. Running the function below filters out any listing east of Burns, Oregon. We only have 2, and it skews the entire map display, so this is the shortest solution.
const westOregon = { "min_long": -124.566244,	"min_lat": 41.991794,	"max_long": -119.0541,	"max_lat": 46.292035 }
const isInWestOregon = (lat, long) => ((lat >= westOregon.min_lat && lat <= westOregon.max_lat) && (long >= westOregon.min_long && long <= westOregon.max_long))

const geocodeListing = async (address) => {
  try {
    // If there's no address, just skip
    // Otherwise, URI encode the address, and send it to Google geocoding API to get lat/long coords
    const queryString = encodeURIComponent(address)

    axios.get(`https://maps.googleapis.com/maps/api/geocode/json?address=${queryString}&key=${API_KEY}`).then(res => {
      // The results object. See documentation link at top of file for schema 
      const results = res.data.results[0]
      const latitude = results.geometry?.location?.lat
      const longitude = results.geometry?.location?.lng

      if (isInWestOregon(latitude, longitude)) return listing
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