const mongoose = require('mongoose');
const { Schema } = mongoose;

const RoleSchema = new Schema({
  name: { type: String, required: true, unique: true, index: true }, // e.g. "ENTERPRISE_USER"
  description: { type: String, required: true },
  permissions: [{ type: String, ref: 'Permission' }] // Array of Permission codes
});

module.exports = mongoose.models.Role || mongoose.model('Role', RoleSchema);
