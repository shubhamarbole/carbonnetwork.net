const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  roles: [{ type: String, ref: 'Role' }], // Array of Role names
  facilitiesScope: [{ type: Schema.Types.ObjectId, ref: 'Facility' }], // Empty array represents all organization facilities
  status: { type: String, enum: ['ACTIVE', 'BLOCKED', 'INVITED'], default: 'ACTIVE' },
  refreshToken: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
