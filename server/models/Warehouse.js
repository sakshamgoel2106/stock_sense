const mongoose = require('mongoose');

const warehouseSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  code: { type: String, required: true },
  location: { type: String },
  transitLeadTimeDays: { type: Number, default: 1 },
  transferCostPerUnit: { type: Number, default: 2 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

warehouseSchema.index({ owner: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Warehouse', warehouseSchema);
