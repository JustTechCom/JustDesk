const express = require('express');
const fs = require('fs');
const path = require('path');
const { apiLimiter } = require('../middleware/rateLimit');

const router = express.Router();
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

router.post('/recordings', apiLimiter, async (req, res) => {
  try {
    const { name, data } = req.body || {};
    if (!name || !data) {
      return res.status(400).json({ error: 'Missing recording data' });
    }
    const filePath = path.join(uploadsDir, name);
    const buffer = Buffer.from(data, 'base64');
    await fs.promises.writeFile(filePath, buffer);
    res.json({ success: true, file: name });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save recording' });
  }
});

module.exports = router;
