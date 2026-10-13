const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  sku: { type: String, default: '' },
  quantity: { type: Number, required: true, min: [1, 'Quantity must be at least 1'] },
  unitPrice: { type: Number, required: true, min: [0, 'Unit price cannot be negative'] },
  taxRate: { type: Number, default: 18 }, // GST slab (0, 5, 12, 18, 28)
  taxAmount: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  lineTotal: { type: Number, required: true }
});

const paymentRecordSchema = new mongoose.Schema({
  receiptNumber: { type: String, required: true },
  amount: { type: Number, required: true, min: [0.01, 'Payment amount must be greater than 0'] },
  paymentDate: { type: Date, default: Date.now },
  paymentMethod: {
    type: String,
    enum: ['UPI', 'BANK_TRANSFER', 'CASH', 'CREDIT_CARD', 'NET_BANKING', 'CHEQUE', 'DEMAND_DRAFT', 'PENDING'],
    default: 'UPI'
  },
  transactionReference: { type: String, default: '' },
  bankName: { type: String, default: '' },
  payerDetails: { type: String, default: '' }, // e.g. VPA or Depositor Name / Acc
  notes: { type: String, default: '' },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: {
    type: String,
    enum: ['SUCCESS', 'PENDING_CLEARANCE', 'BOUNCED', 'REFUNDED'],
    default: 'SUCCESS'
  }
}, { timestamps: true });

const invoiceSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  invoiceNumber: { type: String, required: true, uppercase: true, trim: true },
  invoiceDate: { type: Date, default: Date.now },
  dueDate: { type: Date },
  // strictly for DELIVERY operations; internal TRANSFERS cannot be billed
  operation: { type: mongoose.Schema.Types.ObjectId, ref: 'Operation' },
  sourceWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
  customer: {
    name: { type: String, required: [true, 'Customer name is required'], trim: true },
    email: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    gstin: { type: String, trim: true, uppercase: true, default: '' },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      pincode: { type: String, default: '' },
      country: { type: String, default: 'India' }
    }
  },
  items: [invoiceItemSchema],
  subtotal: { type: Number, required: true, min: 0 },
  taxBreakdown: {
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 }
  },
  isInterState: { type: Boolean, default: false },
  shippingCharge: { type: Number, default: 0 },
  discountTotal: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR' },
  status: {
    type: String,
    enum: ['DRAFT', 'SENT', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED'],
    default: 'DRAFT'
  },
  paidAmount: { type: Number, default: 0 },
  paymentMethod: {
    type: String,
    enum: ['UPI', 'BANK_TRANSFER', 'CASH', 'CREDIT_CARD', 'NET_BANKING', 'CHEQUE', 'DEMAND_DRAFT', 'PENDING'],
    default: 'PENDING'
  },
  paymentReference: { type: String, default: '' },
  paymentDate: { type: Date },
  payments: [paymentRecordSchema],
  notes: { type: String, default: 'Thank you for choosing us for your fulfillment needs.' },
  terms: { type: String, default: 'Payment due within 15 days of invoice date. Goods dispatched are insured as per standard carrier terms.' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

invoiceSchema.index({ company: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ company: 1, status: 1 });
invoiceSchema.index({ company: 1, invoiceDate: -1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
