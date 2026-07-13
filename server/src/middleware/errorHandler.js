function errorHandler(err, req, res, next) {
  console.error('Unhandled error:', err);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: '请求格式错误' });
  }

  // PostgreSQL constraint violation error codes
  if (err.code === '23505') { // unique_violation
    return res.status(409).json({ error: '数据已存在或不符合唯一约束条件' });
  }
  if (err.code === '23503') { // foreign_key_violation
    return res.status(400).json({ error: '关联数据不存在' });
  }
  if (err.code && err.code.startsWith('23')) { // integrity_constraint_violation family
    return res.status(409).json({ error: '数据已存在或不符合约束条件' });
  }

  res.status(err.status || 500).json({
    error: err.message || '服务器内部错误',
  });
}

module.exports = errorHandler;
