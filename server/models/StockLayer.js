const mongoose = require('mongoose');

const stockLayerSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  operation: { type: mongoose.Schema.Types.ObjectId, ref: 'Operation' },
  originalQuantity: { type: Number, required: true, min: 0 },
  remainingQuantity: { type: Number, required: true, min: 0 },
  unitCost: { type: Number, default: 0 },
  receivedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Index for fast FIFO queries and aging aggregation
stockLayerSchema.index({ product: 1, warehouse: 1, remainingQuantity: 1, receivedAt: 1 });

module.exports = mongoose.model('StockLayer', stockLayerSchema);
