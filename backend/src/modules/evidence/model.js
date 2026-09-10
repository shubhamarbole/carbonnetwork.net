const mongoose = require('mongoose');
const { Schema } = mongoose;

const EvidenceSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  facilityId: { type: Schema.Types.ObjectId, ref: 'Facility', required: true },
  fileName: { type: String, required: true },
  filePath: { type: String, required: true },
  fileSize: { type: Number, required: true },
  fileType: { type: String, required: true },
  status: { type: String, enum: ['MISSING', 'UPLOADED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'SUPERSEDED'], default: 'UPLOADED' },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  uploadedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Evidence || mongoose.model('Evidence', EvidenceSchema);
