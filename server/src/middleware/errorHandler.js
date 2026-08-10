function errorHandler(err, req, res, next) {
  console.error('Unhandled error:', err.message, err.stack?.split('\n').slice(0, 3).join(' | '));

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid request format' });
  }

  // PostgreSQL constraint violations — generic messages, no leak
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Data already exists' });
  }
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Related data not found' });
  }
  if (err.code && err.code.startsWith('23')) {
    return res.status(409).json({ error: 'Data integrity error' });
  }

  // Never expose internal error details to users
  res.status(err.status >= 400 && err.status < 500 ? err.status : 500).json({
    error: err.status >= 400 && err.status < 500 ? (err.message || 'Bad request') : 'Internal server error',
  });
}

module.exports = errorHandler;
