const mongoose = require('mongoose');

const auditItemSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  countedQuantity: { type: Number, min: 0 },
  systemQuantitySnapshot: { type: Number },
  variance: { type: Number },
  reason: { type: String }, // 'Damage', 'Missing Stock', 'Counting Error', 'Unrecorded Receipt', 'Other'
  explanation: { type: String }
});

const auditSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  status: { 
    type: String, 
    enum: ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'RECOUNT_REQUIRED'], 
    default: 'DRAFT' 
  },
  items: [auditItemSchema],
  countedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  submittedAt: { type: Date },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  rejectionReason: { type: String },
  operationRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Operation' }
}, { timestamps: true });

module.exports = mongoose.model('Audit', auditSchema);
