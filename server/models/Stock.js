const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  quantity: { 
    type: Number, 
    required: true, 
    default: 0,
    min: [0, 'Stock quantity cannot be negative']
  },
  reservedQuantity: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Reserved quantity cannot be negative']
  }
}, { timestamps: true });

// Ensure a product has only one stock record per warehouse
stockSchema.index({ product: 1, warehouse: 1 }, { unique: true });

module.exports = mongoose.model('Stock', stockSchema);
