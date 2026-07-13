function errorHandler(err, req, res, next) {
  console.error('Unhandled error:', err);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: '请求格式错误' });
  }

  if (err.code === 'SQLITE_CONSTRAINT') {
    return res.status(409).json({ error: '数据已存在或不符合约束条件' });
  }

  res.status(err.status || 500).json({
    error: err.message || '服务器内部错误',
  });
}

module.exports = errorHandler;
