const Airtable = require('airtable');

Airtable.configure({
    endpointUrl: 'https://api.airtable.com',
    apiKey: process.env.AIRTABLE_API_KEY
})
// This is the "ht_data_2021" base
const base = Airtable.base(process.env.BASE_ID)

const readFromProgramTable = (view) => {
  base('program').select({
    maxRecords: 20, view
  }).eachPage(function page(records, fetchNextPage) {
    records.forEach(function(record) {
      console.log(record)
      // Do stuff with the records here. You can log them, write them to our DB, etc. 
      // Note: this API key is read-only, so you can't write to Airtable with this config. You need a different API key with write permissions to do that.
      // console.log('Retrieved', record.get({guid: 'guid', name: 'full name', cat: 'category'}));
    }, function done(err) {
      if (err) { console.error(err); return }
    })
  })
}
// To from "program" table, in the "Clean Data" view, call: readFromProgramTable('Clean Data')
// const readFromProgramCleanData = () => {
//   base('program').select({
//     maxRecords: 20,
//     view: "Clean Data"
//   }).eachPage(function page(records, fetchNextPage) {
//     records.forEach(function(record) {
//       console.log(record)
//       // console.log('Retrieved', record.get({guid: 'guid', name: 'full name', cat: 'category'}));
//     }, function done(err) {
//       if (err) { console.error(err); return }
//     })
//   })
// }

const dropAndRecreateResourcePreview = async () =>{
  try {
    await db.query('DROP TABLE IF EXISTS resource_preview')
    const res = await db.query(`CREATE TABLE IF NOT EXISTS resource_preview (
      name VARCHAR(255) NOT NULL UNIQUE,
      description TEXT NOT NULL,
      link TEXT NOT NULL
    )`)
    console.log(res)
  } catch (error) {
    console.log(error)
    return
  }
}

const dropAndRecreateContentPreview = async () =>{
  try {
    await db.query('DROP TABLE IF EXISTS content_preview')
    const res = await db.query(`CREATE TABLE IF NOT EXISTS content_preview (
      updated TIMESTAMPTZ PRIMARY KEY,
      about TEXT, 
      disclaimer TEXT,
      footer TEXT, 
      video_tutorial TEXT
    )`)
    console.log(res)
  } catch (error) {
    console.log(error)
    return
  }
}

const writeToContentPreview = async () => {
  const res1 = await dropAndRecreateContentPreview()
  if (res1) {
  base("Site Content").select({
    // Selecting the first 3 records in Grid view:
    maxRecords: 4,
    view: "Grid view"
  }).eachPage(function page(records, fetchNextPage) {
    records.forEach(function(record) {
      const about = record.get('about')
      const disclaimer = record.get('disclaimer')
      const footer = record.get('footer')
      const video_tutorial_link = record.get('video_tutorial_link')
      console.log(about, disclaimer, footer, video_tutorial_link)
      // if (about && disclaimer && footer && video_tutorial_link) {
      //   console.log('ok')
      //   db.query('INSERT INTO content_preview (about, disclaimer, footer, video_tutorial_link) VALUES ($1, $2, $3, $4) RETURNING *', [about, disclaimer, footer, video_tutorial_link], (err, res) => {
      //     if (err) { console.log(err); return }
      //     console.log(res.rows)
      //   })
      // } else {
      //   console.log('Missing data')
      // }
      // console.log(title, link, description)
      // console.log('Retrieved', record.get({guid: 'guid', name: 'full name', cat: 'category'}));
    }, function done(err) {
      if (err) { 
        console.error(err); return; 
      }
    });
  })
}
}
writeToContentPreview()

// dropAndRecreateResourcePreview()

// db.query('SELECT * FROM resource_preview', (err, data) => {
//   if (err) { console.log(err); return; }
//   console.log(data.rows)
// })

/* ------- STEPS TO UPDATING RESOURCES
1. Pull from Airtable (code below)
2. In the Airtable call, write it to resource_preview
3. Create preview link and have client review
4. Create button for "actually update the site now please"
------------ */

const writeToResourcePreview = async () => {
  const res1 = await dropAndRecreateResourcePreview()
  if (res1) {
  base('resource_links').select({
    // Selecting the first 3 records in Grid view:
    maxRecords: 5,
    view: "Grid view"
  }).eachPage(function page(records, fetchNextPage) {
    records.forEach(function(record) {
      const name = record.get('name')
      const link = record.get('link')
      const description = record.get('description')
      if (name && link && description) {
        console.log('ok')
        db.query('INSERT INTO resource_preview (name, description, link) VALUES ($1, $2, $3) RETURNING *', [name, description, link], (err, res) => {
          if (err) { console.log(err); return }
          console.log(res.rows)
        })
      } else {
        console.log('Missing data')
      }
      // console.log(title, link, description)
      // console.log('Retrieved', record.get({guid: 'guid', name: 'full name', cat: 'category'}));
    }, function done(err) {
      if (err) { 
        console.error(err); return; 
      }
    });
  })
}
}

const promoteResourceToProd = async () => {
  try {
    let resources = await db.query('SELECT * FROM resource_preview')
    if (resources?.rows) {
      await db.query('DROP TABLE IF EXISTS resource')
      let res = await db.query('CREATE TABLE resource AS SELECT * FROM resource_preview')
      if (res) return true
    } else {
      return false
    }     
  } catch (error) {
    console.error(error)
    return;
  }
}

// promoteResourceToProd()