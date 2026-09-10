const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/security');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access Denied: No token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) {
      return res.status(401).json({ error: 'Access Denied: Token invalid or expired.' });
    }
    req.user = decodedUser;
    next();
  });
}

module.exports = authenticateToken;
