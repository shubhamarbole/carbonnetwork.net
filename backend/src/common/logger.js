/**
 * Enterprise Structured JSON Logger with Secret Redaction
 */
const SENSITIVE_KEYS = ['password', 'token', 'secret', 'authorization', 'api_key', 'apikey', 'key', 'refresh_token'];

function maskSecrets(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(maskSecrets);

  const masked = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.some(sk => k.toLowerCase().includes(sk))) {
      masked[k] = '[REDACTED]';
    } else if (v && typeof v === 'object') {
      masked[k] = maskSecrets(v);
    } else {
      masked[k] = v;
    }
  }
  return masked;
}

class StructuredLogger {
  constructor(context = 'App') {
    this.context = context;
  }

  _log(level, message, meta = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      ...maskSecrets(meta)
    };
    console.log(JSON.stringify(entry));
  }

  info(msg, meta) { this._log('INFO', msg, meta); }
  warn(msg, meta) { this._log('WARN', msg, meta); }
  error(msg, meta) { this._log('ERROR', msg, meta); }
  debug(msg, meta) { if (process.env.DEBUG) this._log('DEBUG', msg, meta); }
}

module.exports = StructuredLogger;
