const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const controller = require('./controller');
const authenticateToken = require('../../middleware/authenticate');
const enforceTenantScope = require('../../middleware/tenantScope');
const authorizePermission = require('../../middleware/authorize');

const uploadsDir = path.join(__dirname, '../../../../uploads'); // maps root uploads directory
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

router.use(authenticateToken);
router.use(enforceTenantScope);

router.post('/upload', authorizePermission('evidence.upload'), upload.single('file'), controller.upload);
router.get('/', authorizePermission('evidence.read'), controller.list);

module.exports = router;
