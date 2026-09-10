/**
 * Input Sanitization & NoSQL Injection Protection Middleware
 * Strips MongoDB operators ($gt, $ne, $where, etc.) and enforces pagination bounds.
 */
function cleanInput(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(cleanInput);

  const cleaned = {};
  for (const key of Object.keys(obj)) {
    // Reject or strip keys with $ or containing .
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }
    const val = obj[key];
    if (val !== null && typeof val === 'object') {
      // Check if value is an operator injection like { "$ne": 1 }
      const innerKeys = Object.keys(val);
      const hasOperator = innerKeys.some(k => k.startsWith('$'));
      if (hasOperator) {
        // neutralize operator object by extracting string representation or discarding
        cleaned[key] = String(val[innerKeys[0]] || '');
      } else {
        cleaned[key] = cleanInput(val);
      }
    } else {
      cleaned[key] = val;
    }
  }
  return cleaned;
}

function inputSanitizer(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = cleanInput(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = cleanInput(req.query);
    // Enforce safe pagination bounds
    if (req.query.limit !== undefined) {
      const parsed = parseInt(req.query.limit, 10);
      if (!isNaN(parsed)) {
        req.query.limit = Math.min(100, Math.max(1, parsed));
      }
    }
    if (req.query.page !== undefined) {
      const parsed = parseInt(req.query.page, 10);
      if (!isNaN(parsed)) {
        req.query.page = Math.max(1, parsed);
      }
    }
  }
  if (req.params && typeof req.params === 'object') {
    req.params = cleanInput(req.params);
  }
  next();
}

module.exports = inputSanitizer;
