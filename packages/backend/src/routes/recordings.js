const express = require('express');
const path = require('path');
const { writeFile, mkdir } = require('fs/promises');

const router = express.Router();

const uploadsDir = path.join(__dirname, '../../uploads');
// Ensure uploads directory exists
mkdir(uploadsDir, { recursive: true }).catch(() => {});

function sanitizeName(name) {
  return name.replace(/[^a-zA-Z0-9_.-]/g, '');
}

router.post('/recordings', async (req, res) => {
  const { name, data } = req.body || {};

  if (typeof name !== 'string' || typeof data !== 'string') {
    return res.status(400).json({ error: 'Invalid file data' });
  }

  const safeName = sanitizeName(name);
  if (!safeName || safeName !== name) {
    return res.status(400).json({ error: 'Invalid file name' });
  }

  const filePath = path.join(uploadsDir, safeName);
  const resolvedUploads = path.resolve(uploadsDir) + path.sep;
  const resolvedPath = path.resolve(filePath);

  if (!resolvedPath.startsWith(resolvedUploads)) {
    return res.status(400).json({ error: 'Invalid file name' });
  }

  try {
    await writeFile(resolvedPath, data);
    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: 'Failed to save recording' });
  }
});

module.exports = router;


