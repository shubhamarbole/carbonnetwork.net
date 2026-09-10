const mongoose = require('mongoose');
const { Schema } = mongoose;

const CarbonProjectSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  facilityId: { type: Schema.Types.ObjectId, ref: 'Facility', required: true },
  registeredCredits: { type: Number, required: true }, // tCO2e offset volume
  creditsAvailable: { type: Number, required: true },
  status: { type: String, enum: ['PENDING_REGISTRATION', 'VERIFIED', 'REJECTED'], default: 'PENDING_REGISTRATION' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.CarbonProject || mongoose.model('CarbonProject', CarbonProjectSchema);
