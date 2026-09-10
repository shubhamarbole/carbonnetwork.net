const mongoose = require('mongoose');
const { Schema } = mongoose;

const OrganizationSchema = new Schema({
  name: { type: String, required: true, unique: true },
  type: { type: String, enum: ['ENTERPRISE', 'MSME', 'INVESTOR', 'STAKEHOLDER', 'SYSTEM'], required: true },
  status: { type: String, enum: ['ACTIVE', 'SUSPENDED', 'PENDING'], default: 'PENDING' },
  subscriptionPlan: { type: String, enum: ['FREE', 'BASIC', 'ENTERPRISE_GOLD', 'UNLIMITED'], default: 'FREE' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Organization || mongoose.model('Organization', OrganizationSchema);
