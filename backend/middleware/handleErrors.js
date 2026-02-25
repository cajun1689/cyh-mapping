module.exports = app => {
  app.use((error, req, res, next) => {
    console.error('Global error:', error.message, error.stack)
    // User friendly error message
    const message = 'Server error. Please contact your server admin if the problem persists.'      
    req.flash('error', message)
    res.redirect(req.originalUrl)
  });
}

