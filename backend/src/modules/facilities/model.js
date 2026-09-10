const mongoose = require('mongoose');
const { Schema } = mongoose;

const FacilitySchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  name: { type: String, required: true },
  location: { type: String, required: true },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  floorArea: { type: Number, default: 0 },
  region: { type: String, default: 'Global' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Facility || mongoose.model('Facility', FacilitySchema);
