module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || 'environmental-esg-secret-key-98765',
  JWT_ACCESS_EXPIRATION: '24h',
  JWT_REFRESH_EXPIRATION: '7d',
  BCRYPT_SALT_ROUNDS: 10
};
