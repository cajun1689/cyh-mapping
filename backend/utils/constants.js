const SCHEMA = require('../db/listings.schema.json')

module.exports = {
  PORT: process.env.PORT || 5050,
  URLENCODED: { extended: false },
  PAPA_PARSE: {
    header: true,
    dynamicTyping: true,
    transformHeader: (header) => header.includes(" ") ? header.toLowerCase().split(" ").join("_") : header.toLowerCase(),
    transform: (value, column) =>
      value.trim() === "" ? undefined
    // Note: line 12 below fixed one bug, but caused another. Will create an issue with details.
    // : SCHEMA.items.properties[column]?.type === 'string' ? `${value}`
    : SCHEMA.items.properties[column]?.type === 'array' ? value.trim().split(',')
    : value.trim(),
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
      },
    },
  },
}
