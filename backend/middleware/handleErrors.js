module.exports = app => {
  app.use((error, req, res, next) => {
    console.error('Global error:', error.message, error.stack)
    const message = 'Server error. Please contact your server admin if the problem persists.'
    // API routes expect JSON; page routes expect redirect
    if (req.path.startsWith('/api')) {
      return res.status(500).json({ error: message })
    }
    req.flash('error', message)
    res.redirect(req.originalUrl)
  })
}

