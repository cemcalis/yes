const express = require('express');
const router = express.Router();

// Seed uçları devre dışı. SQLite için admin seed endpointini veya seed-sqlite.js scriptini kullanın.
router.use((req, res) => {
  res.status(503).json({
    success: false,
    message: 'Seed uçları devre dışı. Lütfen SQLite için /api/admin/seed veya seed-sqlite.js kullanın.'
  });
});

module.exports = router;
