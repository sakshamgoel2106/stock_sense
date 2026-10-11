const mongoose = require('mongoose');

const stockLedgerSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  operation: { type: mongoose.Schema.Types.ObjectId, ref: 'Operation' },
  operationType: { type: String, enum: ['RECEIPT', 'DELIVERY', 'TRANSFER', 'ADJUSTMENT'] },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  quantityChange: { type: Number, required: true },
  previousQuantity: { type: Number, required: true },
  newQuantity: { type: Number, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Index for fast query of stock movements
stockLedgerSchema.index({ product: 1, warehouse: 1 });
stockLedgerSchema.index({ operation: 1 });

module.exports = mongoose.model('StockLedger', stockLedgerSchema);
