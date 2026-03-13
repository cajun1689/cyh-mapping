#!/usr/bin/env node
/**
 * Backfill building images for listings. Prefers Google Places photos (building/sign)
 * over Street View. Uses Street View with heading toward building when no Places photos.
 *
 * Usage: node scripts/backfill-street-view.js
 * Or: GOOGLE_API_KEY=xxx make backfill-street-view
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })

const axios = require('axios')
const { pool } = require('../db')

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
const STREET_VIEW_SIZE = '640x400'

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function getPlacesPhotoUrls (listing) {
  if (!GOOGLE_API_KEY) return []
  const query = [listing.full_name, listing.full_address].filter(Boolean).join(', ')
  if (!query.trim()) return []
  try {
    let url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id,photos&key=${GOOGLE_API_KEY}`
    if (listing.latitude && listing.longitude) {
      url += `&locationbias=circle:5000@${listing.latitude},${listing.longitude}`
    }
    const findRes = await axios.get(url, { timeout: 5000 })
    const photos = findRes.data?.candidates?.[0]?.photos || []
    return photos
      .map(p => p?.photo_reference)
      .filter(Boolean)
      .map(ref => `https://maps.googleapis.com/maps/api/place/photo?maxwidth=640&photo_reference=${ref}&key=${GOOGLE_API_KEY}`)
  } catch {
    return []
  }
}

function bearingTo (fromLat, fromLng, toLat, toLng) {
  const dL = (toLng - fromLng) * Math.PI / 180
  const fromLatRad = fromLat * Math.PI / 180
  const toLatRad = toLat * Math.PI / 180
  const y = Math.sin(dL) * Math.cos(toLatRad)
  const x = Math.cos(fromLatRad) * Math.sin(toLatRad) - Math.sin(fromLatRad) * Math.cos(toLatRad) * Math.cos(dL)
  const heading = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
  return Math.round(heading)
}

async function getStreetViewUrl (listing) {
  if (!GOOGLE_API_KEY) return null
  let location = null
  if (listing.latitude && listing.longitude) {
    location = `${listing.latitude},${listing.longitude}`
  } else if (listing.full_address && listing.full_address.trim()) {
    location = encodeURIComponent(listing.full_address.trim())
  }
  if (!location) return null
  try {
    const metaRes = await axios.get(
      `https://maps.googleapis.com/maps/api/streetview/metadata?location=${location}&key=${GOOGLE_API_KEY}`,
      { timeout: 5000 }
    )
    if (metaRes.data?.status !== 'OK') return null
    let url = `https://maps.googleapis.com/maps/api/streetview?size=${STREET_VIEW_SIZE}&location=${location}&key=${GOOGLE_API_KEY}`
    if (listing.latitude && listing.longitude && metaRes.data?.location) {
      const panoLat = metaRes.data.location.lat
      const panoLng = metaRes.data.location.lng
      const heading = bearingTo(panoLat, panoLng, parseFloat(listing.latitude), parseFloat(listing.longitude))
      url += `&heading=${heading}`
    }
    return url
  } catch {
    return null
  }
}

async function getBestImages (listing) {
  const placesUrls = await getPlacesPhotoUrls(listing)
  if (placesUrls.length > 0) return { urls: placesUrls, source: 'places' }
  const streetViewUrl = await getStreetViewUrl(listing)
  if (streetViewUrl) return { urls: [streetViewUrl], source: 'streetview' }
  return null
}

async function main () {
  if (!GOOGLE_API_KEY) {
    console.error('GOOGLE_API_KEY not set in .env')
    process.exit(1)
  }

  const client = await pool.connect()
  try {
    await client.query('ALTER TABLE listings ADD COLUMN IF NOT EXISTS image_url TEXT')
    await client.query('ALTER TABLE listings ADD COLUMN IF NOT EXISTS photo_urls TEXT[]')
    const res = await client.query(
      `SELECT guid, full_name, full_address, latitude, longitude, image_url, photo_urls FROM listings 
       WHERE (full_address IS NOT NULL AND full_address != '') OR (latitude IS NOT NULL AND longitude IS NOT NULL)`
    )
    const listings = res.rows
    const toUpdate = listings.filter(l => !l.image_url || !l.photo_urls?.length || l.image_url?.includes('maps.googleapis.com'))
    console.log(`Found ${listings.length} listings with address. Will update ${toUpdate.length} (skip ${listings.length - toUpdate.length} with custom photos).`)

    let placesCount = 0
    let streetViewCount = 0
    for (let i = 0; i < toUpdate.length; i++) {
      const listing = toUpdate[i]
      process.stdout.write(`  [${i + 1}/${toUpdate.length}] ${listing.full_name?.slice(0, 38)}... `)
      const result = await getBestImages(listing)
      if (result && result.urls.length > 0) {
        await client.query(
          'UPDATE listings SET image_url = $1, photo_urls = $2 WHERE guid = $3',
          [result.urls[0], result.urls, listing.guid]
        )
        if (result.source === 'places') placesCount++
        else streetViewCount++
        process.stdout.write(`${result.source === 'places' ? '📷' : '🗺'} ${result.source} (${result.urls.length}) photos\n`)
      } else {
        if (listing.image_url || listing.photo_urls?.length) {
          await client.query('UPDATE listings SET image_url = NULL, photo_urls = NULL WHERE guid = $1', [listing.guid])
        }
        process.stdout.write('—\n')
      }
      await sleep(400)
    }

    console.log(`\nUpdated ${placesCount} with Places photos, ${streetViewCount} with Street View`)
  } finally {
    client.release()
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
