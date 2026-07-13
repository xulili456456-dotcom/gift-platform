const { Router } = require('express');
const path = require('path');

const router = Router();

router.get('/', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.sendFile(path.join(__dirname, '..', 'views', 'admin.html'));
});

module.exports = router;
