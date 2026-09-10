const crypto = require('crypto');
const { PlatformApiKey, AuditLog } = require('../../../models/models');

const STANDARD_SCOPES = [
  'risks:read',
  'risks:write',
  'predictions:read',
  'scenarios:read',
  'decisions:read',
  'decisions:write',
  'optimization:run',
  'executive:read',
  'alerts:read',
  'workflows:read'
];

class ApiKeyService {
  async createApiKey(user, data = {}) {
    const rawSecret = `esg_live_${crypto.randomBytes(16).toString('hex')}`;
    const hashedKey = crypto.createHash('sha256').update(rawSecret).digest('hex');
    const keyId = `key_${crypto.randomBytes(6).toString('hex')}`;
    const prefix = rawSecret.slice(0, 15) + '...';
    const now = new Date().toISOString();

    const requestedScopes = Array.isArray(data.scopes) && data.scopes.length > 0 
      ? data.scopes.filter(s => STANDARD_SCOPES.includes(s))
      : ['risks:read', 'predictions:read', 'executive:read'];

    const record = await PlatformApiKey.create({
      keyId,
      organizationId: user.organizationId,
      name: data.name || 'Default Developer API Key',
      prefix,
      hashedKey,
      scopes: requestedScopes,
      rateLimit: data.rateLimit || 60,
      status: 'ACTIVE',
      lastUsedAt: null,
      createdAt: now
    });

    await AuditLog.create({
      organizationId: user.organizationId,
      user: user.email || user.name || 'Admin',
      userId: user.id || user._id?.toString(),
      action: 'API_KEY_CREATED',
      module: 'DeveloperPlatform',
      recordId: keyId,
      newValue: 'ACTIVE',
      metadata: { prefix, scopes: requestedScopes },
      timestamp: now
    });

    // Return the rawSecret ONLY on creation
    return {
      keyId: record.keyId,
      name: record.name,
      prefix: record.prefix,
      apiKey: rawSecret, // Full plaintext key returned once
      scopes: record.scopes,
      rateLimit: record.rateLimit,
      status: record.status,
      createdAt: record.createdAt
    };
  }

  async listApiKeys(user) {
    return await PlatformApiKey.find({ 
      organizationId: user.organizationId 
    }).select('-hashedKey').sort({ createdAt: -1 });
  }

  async revokeApiKey(user, keyId) {
    const key = await PlatformApiKey.findOne({ 
      keyId, 
      organizationId: user.organizationId 
    });
    if (!key) {
      const err = new Error(`API Key ${keyId} not found`);
      err.status = 404;
      throw err;
    }

    key.status = 'REVOKED';
    await key.save();

    await AuditLog.create({
      organizationId: user.organizationId,
      user: user.email || user.name || 'Admin',
      userId: user.id || user._id?.toString(),
      action: 'API_KEY_REVOKED',
      module: 'DeveloperPlatform',
      recordId: keyId,
      newValue: 'REVOKED',
      timestamp: new Date().toISOString()
    });

    return { success: true, message: `API Key ${keyId} revoked successfully` };
  }

  async verifyApiKey(rawKey, requiredScope = null) {
    if (!rawKey || typeof rawKey !== 'string') return null;

    const cleanKey = rawKey.replace(/^Bearer\s+/i, '').trim();
    const hash = crypto.createHash('sha256').update(cleanKey).digest('hex');

    const keyRecord = await PlatformApiKey.findOne({ 
      hashedKey: hash, 
      status: 'ACTIVE' 
    });

    if (!keyRecord) return null;

    if (requiredScope && !keyRecord.scopes.includes(requiredScope) && !keyRecord.scopes.includes('*')) {
      const scopeErr = new Error(`API key missing required scope '${requiredScope}'`);
      scopeErr.status = 403;
      throw scopeErr;
    }

    // Update last used timestamp
    keyRecord.lastUsedAt = new Date().toISOString();
    await keyRecord.save();

    return keyRecord;
  }
}

module.exports = new ApiKeyService();
