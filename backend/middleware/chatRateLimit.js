const rateLimit = require('express-rate-limit')

module.exports = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "You're sending messages too quickly! Please wait a few minutes and try again.",
    recommendedGuids: [],
    isCrisis: false,
  },
})
