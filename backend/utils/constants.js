const SCHEMA = require('../db/listings.schema.json')

module.exports = {
  PORT: process.env.PORT || 5050,
  URLENCODED: { extended: false },
  PAPA_PARSE: {
    header: true,
    dynamicTyping: false,
    skipEmptyLines: true,
    transformHeader: (header) => header.includes(" ") ? header.toLowerCase().split(" ").join("_") : header.toLowerCase(),
    transform: (value, column) => {
      const trimmed = value.trim()
      if (trimmed === "") return undefined
      const schemaType = SCHEMA.items.properties[column]?.type
      if (schemaType === 'integer') return parseInt(trimmed, 10)
      if (schemaType === 'number') return parseFloat(trimmed)
      if (schemaType === 'array') return trimmed.split(',').map(s => s.trim())
      return trimmed
    },
  },
  PAPA_PARSE_SITE_TEXT: {
    header: true,
    dynamicTyping: true,
    transformHeader: (header) => header.includes(" ") ? header.toLowerCase().split(" ").join("_") : header.toLowerCase()
  },
  PAPA_PARSE_RESOURCE_LINK: {
    header: true,
    dynamicTyping: true
  },
  HELMET: {
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'frame-src': [
          'http:',
          'https:',
        ],
        'script-src': ["'self'", "'unsafe-inline'"],
      },
    },
  },
}
