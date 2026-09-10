const mongoose = require('mongoose');
const { Schema } = mongoose;

const CreditTransactionSchema = new Schema({
  projectId: { type: Schema.Types.ObjectId, ref: 'CarbonProject', required: true },
  buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  creditAmount: { type: Number, required: true },
  purchasePrice: { type: Number, required: true }, // USD per credit unit
  status: { type: String, enum: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'COMPLETED'], default: 'PENDING_APPROVAL' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CreditTransaction', CreditTransactionSchema);
