const mongoose = require('mongoose');
const { Schema } = mongoose;

const EnvironmentalRecordSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  facilityId: { type: Schema.Types.ObjectId, ref: 'Facility', required: true, index: true },
  moduleType: { type: String, enum: ['Energy', 'GHG', 'Water', 'Biodiversity', 'Waste', 'Pollution'], required: true, index: true },
  reportingPeriod: { type: String, enum: ['Monthly', 'Quarterly', 'Yearly'], required: true },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  
  // Specific Module Payload
  dataPayload: { type: Schema.Types.Mixed, required: true },
  
  // Quality & Verification Metadata
  dataQuality: { type: String, enum: ['Actual', 'Estimated', 'Calculated'], default: 'Actual' },
  verificationStatus: { type: String, enum: ['DRAFT', 'SUBMITTED', 'EVIDENCE_REVIEW', 'VERIFICATION', 'VERIFIED', 'CORRECTION_REQUIRED', 'REJECTED'], default: 'DRAFT' },
  assignedVerifier: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  evidenceFiles: [{ type: Schema.Types.ObjectId, ref: 'Evidence' }],
  
  isArchived: { type: Boolean, default: false }, // Soft delete flag
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

EnvironmentalRecordSchema.index({ organizationId: 1, moduleType: 1, isArchived: 1 });
EnvironmentalRecordSchema.index({ facilityId: 1, reportingPeriod: 1 });

module.exports = mongoose.models.EnvironmentalRecord || mongoose.model('EnvironmentalRecord', EnvironmentalRecordSchema);
