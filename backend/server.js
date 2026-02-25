require('dotenv').config()
const express = require('express')
require('express-async-errors')
const cors = require('cors')
const helmet = require('helmet')
const compression = require('compression')
const cookieParser = require('cookie-parser')
const expressLayouts = require('express-ejs-layouts')
const favicon = require('serve-favicon')
const path = require('path')
const { HELMET, URLENCODED, PORT } = require('./utils/constants')
const { handleUndefinedRoutes } = require('./middleware/routeProtection')
const app = express()

app.set('trust proxy', 1)

app.use(expressLayouts)
app.set('view engine', 'ejs')
app.set('layout', './layouts')
app.use(favicon(path.join(__dirname, 'public', 'img', 'favicon-alt.png')))

/* Middleware */
app.use(cors())
app.use(helmet(HELMET))
app.use(compression())
app.use(express.urlencoded(URLENCODED))
app.use(express.json())
app.use(cookieParser())

/* Passport & Session config */
require('./services/passport') 
require('./services/expressSession')(app)

/* Make site config available to all EJS templates as `site` */
const siteConfig = require('./siteConfig.json')
app.use((req, res, next) => {
  res.locals.site = siteConfig
  next()
})

/* Serve public assets */
app.use(express.static('public'))

/* Routes */
app.use('/api', require('./routes/api'))
app.use('/api-preview', require('./routes/api-preview'))
app.use('/listings', require('./routes/listings'))
app.use('/sponsors', require('./routes/sponsors'))
app.use('/org', require('./routes/org'))
app.use('/auth', require('./routes/loggedOutRoutes'))
app.use('/resource', require('./routes/resourceRoutes'))
app.use('/', require('./routes'))
/* Catch anything else and redirect */
app.get('/*', handleUndefinedRoutes)

/* Custom error handling for all routes */
require('./middleware/handleErrors')(app)

app.listen(PORT, () => console.log(`Server is ready at port ${PORT}`))
