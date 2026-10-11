const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  quantity: { type: Number, required: true, min: [1, 'Quantity must be at least 1'] },
  orderReference: { type: String, required: true },
  status: { type: String, enum: ['ACTIVE', 'FULFILLED', 'CANCELLED'], default: 'ACTIVE' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Reservation', reservationSchema);
