/**
 * Phase 12 Environment Configuration & Isolation Module
 * Manages clean separation across DEVELOPMENT, STAGING, and PRODUCTION.
 * Enforces zero sharing of production secrets in lower tiers.
 */

const ENVIRONMENT_TIER = (process.env.ENVIRONMENT_TIER || 'STAGING').toUpperCase();

const ENV_TIERS = {
  DEVELOPMENT: 'DEVELOPMENT',
  STAGING: 'STAGING',
  PRODUCTION: 'PRODUCTION'
};

class EnvironmentConfig {
  constructor() {
    this.tier = ENV_TIERS[ENVIRONMENT_TIER] || ENV_TIERS.STAGING;
  }

  isProduction() {
    return this.tier === ENV_TIERS.PRODUCTION;
  }

  isStaging() {
    return this.tier === ENV_TIERS.STAGING;
  }

  isDevelopment() {
    return this.tier === ENV_TIERS.DEVELOPMENT;
  }

  getEnvironmentName() {
    return this.tier;
  }

  getVectorCollectionPrefix() {
    if (this.isProduction()) return 'prod_vectors_';
    if (this.isStaging()) return 'pilot_vectors_';
    return 'dev_vectors_';
  }

  getStoragePrefix() {
    return `storage/${this.tier.toLowerCase()}/`;
  }

  getAuditPrefix() {
    return `[${this.tier}]`;
  }

  validateSecurity() {
    const dbUrl = process.env.MONGODB_URI || process.env.DATABASE_URL || '';
    if (!this.isProduction() && dbUrl.includes('prod-cluster-live-esg')) {
      throw new Error('CRITICAL SECURITY VIOLATION: Production database connection string detected in non-production environment!');
    }
    return {
      tier: this.tier,
      isProduction: this.isProduction(),
      vectorPrefix: this.getVectorCollectionPrefix(),
      storagePrefix: this.getStoragePrefix(),
      securityVerified: true
    };
  }
}

module.exports = new EnvironmentConfig();
