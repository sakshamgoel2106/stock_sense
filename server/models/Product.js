const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  sku: { type: String, required: true },
  description: { type: String },
  category: { type: String },
  prices: [{
    currency: { type: String, required: true },
    amount: { type: Number, required: true, default: 0 }
  }],
  costPrice: { type: Number, default: 0 },
  leadTimeDays: { type: Number, default: 4 },
  safetyStockDays: { type: Number, default: 3 },
  minOrderQuantity: { type: Number, default: 1 },
  unitOfMeasure: { type: String, default: 'Units' },
  reorderLevel: { type: Number, default: 0 },
  status: { type: String, enum: ['ACTIVE', 'ARCHIVED'], default: 'ACTIVE' },
}, { timestamps: true });

productSchema.index({ owner: 1, sku: 1 }, { unique: true });

module.exports = mongoose.model('Product', productSchema);
