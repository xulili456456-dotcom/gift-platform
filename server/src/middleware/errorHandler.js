function errorHandler(err, req, res, next) {
  console.error('Unhandled error:', err);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid request format' });
  }

  // PostgreSQL constraint violation error codes
  if (err.code === '23505') { // unique_violation
    return res.status(409).json({ error: 'Data already exists or violates a unique constraint' });
  }
  if (err.code === '23503') { // foreign_key_violation
    return res.status(400).json({ error: 'Related data does not exist' });
  }
  if (err.code && err.code.startsWith('23')) { // integrity_constraint_violation family
    return res.status(409).json({ error: `Constraint violation [${err.code}]: ${err.detail || err.message}` });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
}

module.exports = errorHandler;
